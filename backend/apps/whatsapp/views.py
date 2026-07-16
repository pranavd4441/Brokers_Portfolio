import logging
import hmac
import hashlib
import base64
import urllib.request
import urllib.parse
import json
import re
from io import BytesIO
from django.db import transaction
from django.conf import settings
from django.core.files.uploadedfile import SimpleUploadedFile
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from rest_framework import viewsets, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny

from .models import WhatsAppSession, ConversationMessage
from .services import get_whatsapp_gateway, GeminiParserService, send_and_log_message, GeminiAudioTranscriptionService
from .serializers import WhatsAppSessionSerializer
from apps.accounts.models import User
from apps.properties.models import Property
from apps.media.models import PropertyImage
from apps.media.utils import process_and_store_image
from apps.sharing.models import ShareLink
from apps.audit.utils import log_audit_event

logger = logging.getLogger(__name__)

from property_os.throttling import WebhookRateThrottle
from property_os.feature_flags import FeatureFlagService



def send_main_menu(session, user, text_prefix=""):
    body = f"{text_prefix}👋 Welcome back, {user.name}!\n\nHow can I help you today?"
    list_items = [
        {"id": "menu_create_listing", "title": "Create Listing", "description": "Publish a new property listing"},
        {"id": "menu_my_listings", "title": "My Listings", "description": "Manage your property inventory"},
        {"id": "menu_leads", "title": "Leads", "description": "View today's leads"},
        {"id": "menu_analytics", "title": "Analytics", "description": "View performance stats"}
    ]
    send_and_log_message(session, body, list_items=list_items, list_title="Main Menu")


def send_details_confirmation(session):
    price = session.metadata.get('price')
    bhk = session.metadata.get('bhk')
    area = session.metadata.get('area', 'Local Area')
    city = session.metadata.get('city', 'Mumbai')
    prop_type = session.metadata.get('property_type', 'APARTMENT')
    sqft = session.metadata.get('square_feet')
    amenities = session.metadata.get('amenities', [])
    
    fp = "Not Set"
    if price:
        try:
            p = float(price)
            fp = f"₹{p/10_000_000:.2f} Cr" if p >= 10_000_000 else f"₹{p/100_000:.2f} L" if p >= 100_000 else f"₹{p:,}"
        except Exception:
            fp = str(price)
            
    msg = (
        "Here's what I understood:\n\n"
        f"🏠 Property Type: *{prop_type.capitalize()}*\n"
        f"🛏 Configuration: *{f'{bhk} BHK' if bhk else 'Not Set'}*\n"
        f"📍 Location: *{area}, {city}*\n"
        f"💰 Price: *{fp}*\n"
        f"📐 Size: *{f'{sqft} sqft' if sqft else 'Not Set'}*\n"
        f"🏊 Amenities: *{', '.join(amenities) if amenities else 'None'}*\n\n"
        "Is this correct?"
    )
    buttons = [
        {"id": "btn_details_ok", "title": "Looks Good"},
        {"id": "btn_details_edit", "title": "Edit"},
        {"id": "btn_details_cancel", "title": "Cancel"}
    ]
    send_and_log_message(session, msg, buttons=buttons)


class WhatsAppWebhookView(APIView):
    """
    Public webhook ingress endpoint. Accepts SMS/WhatsApp events from Twilio or Meta.
    Verifies request authenticity before processing.
    """
    permission_classes = [AllowAny]
    throttle_classes = [WebhookRateThrottle]

    def get(self, request, *args, **kwargs):
        """
        Meta WhatsApp Cloud API webhook verification handshake.
        Meta sends a GET request with hub.mode, hub.verify_token, hub.challenge.
        """
        if not FeatureFlagService.is_enabled("ENABLE_WHATSAPP"):
            return Response(
                {"detail": "WhatsApp features are currently disabled."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        mode = request.GET.get('hub.mode')
        token = request.GET.get('hub.verify_token')
        challenge = request.GET.get('hub.challenge', '')
        verify_token = getattr(settings, 'WHATSAPP_VERIFY_TOKEN', '')

        if mode == 'subscribe' and verify_token and token == verify_token:
            logger.info("Meta WhatsApp webhook verified successfully.")
            return HttpResponse(challenge, content_type='text/plain')
        return Response({'detail': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)

    def _verify_twilio_signature(self, request) -> bool:
        """
        Validates the X-Twilio-Signature header using HMAC-SHA1.
        Returns True in dev (no auth token configured or DEBUG is True) to allow local testing.
        """
        if getattr(settings, 'DEBUG', False):
            return True  # Skip verification in local dev tunnels

        auth_token = getattr(settings, 'TWILIO_AUTH_TOKEN', '')
        if not auth_token:
            return True  # Skip verification in dev/test

        signature = request.headers.get('X-Twilio-Signature', '')
        url = request.build_absolute_uri()

        # Build sorted param string per Twilio spec
        params = request.POST
        sorted_params = ''.join(f"{k}{v}" for k, v in sorted(params.items()))
        full_string = url + sorted_params

        # HMAC-SHA1 signed with auth token
        mac = hmac.new(auth_token.encode('utf-8'), full_string.encode('utf-8'), hashlib.sha1)
        expected = base64.b64encode(mac.digest()).decode('utf-8')
        return hmac.compare_digest(expected, signature)

    def _verify_meta_signature(self, request) -> bool:
        """
        Validates the X-Hub-Signature-256 header using HMAC-SHA256 and WHATSAPP_APP_SECRET.
        Returns True in dev (no app secret configured or DEBUG is True) to allow local testing.
        """
        if getattr(settings, 'DEBUG', False):
            return True

        app_secret = getattr(settings, 'WHATSAPP_APP_SECRET', '')
        if not app_secret:
            return True

        signature_header = request.headers.get('X-Hub-Signature-256', '')
        if not signature_header or not signature_header.startswith('sha256='):
            return False

        signature = signature_header.split('sha256=')[1]
        try:
            body_bytes = request.body
        except Exception as e:
            logger.error(f"Failed to read request body for Meta signature verification: {str(e)}")
            return False

        mac = hmac.new(app_secret.encode('utf-8'), body_bytes, hashlib.sha256)
        expected = mac.hexdigest()
        return hmac.compare_digest(expected, signature)

    def post(self, request, *args, **kwargs):
        if not FeatureFlagService.is_enabled("ENABLE_WHATSAPP"):
            return Response(
                {"detail": "WhatsApp features are currently disabled."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        # 0. Detect and Parse Webhook Origin
        is_meta = False
        data = request.data
        
        if isinstance(data, dict) and data.get('object') == 'whatsapp_business_account':
            is_meta = True

        # 0a. Verify Meta signature if Meta webhook
        if is_meta:
            if not self._verify_meta_signature(request):
                logger.warning("Rejected Meta webhook: invalid signature.")
                return Response({'detail': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)

        # 0b. Verify Twilio signature if Twilio provider is configured
        if not is_meta and getattr(settings, 'WHATSAPP_GATEWAY_PROVIDER', 'MOCK').upper() == 'TWILIO':
            if not self._verify_twilio_signature(request):
                logger.warning("Rejected Twilio webhook: invalid signature.")
                return Response({'detail': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)

        # 1. Extract Parameters based on Webhook Origin
        from_raw = ''
        body_text = ''
        num_media = 0
        msg_type = 'text'
        image_id = None

        if is_meta:
            try:
                entry = data.get('entry', [{}])[0]
                change = entry.get('changes', [{}])[0]
                value = change.get('value', {})
                
                # Ignore status updates (e.g. read receipts, delivery reports)
                if 'messages' not in value:
                    logger.info("Meta webhook received a status update. Ignoring.")
                    return Response({"status": "ignored"}, status=status.HTTP_200_OK)

                message = value.get('messages', [{}])[0]
                
                from_raw = "whatsapp:" + message.get('from', '')
                msg_type = message.get('type', 'text')
                
                if msg_type == 'text':
                    body_text = message.get('text', {}).get('body', '').strip()
                elif msg_type == 'image':
                    body_text = message.get('image', {}).get('caption', '').strip()
                    image_id = message.get('image', {}).get('id')
                    num_media = 1
                elif msg_type == 'audio':
                    audio_id = message.get('audio', {}).get('id')
                    mime_type = message.get('audio', {}).get('mime_type', 'audio/ogg')
                    body_text = ''
                    if audio_id:
                        try:
                            access_token = getattr(settings, 'WHATSAPP_ACCESS_TOKEN', '')
                            media_info_url = f"https://graph.facebook.com/v18.0/{audio_id}"
                            req_media = urllib.request.Request(
                                media_info_url,
                                headers={'Authorization': f"Bearer {access_token}"}
                            )
                            with urllib.request.urlopen(req_media, timeout=10) as res_media:  # nosec B310
                                media_data = json.loads(res_media.read().decode('utf-8'))
                                media_url = media_data.get('url')
                            
                            if media_url:
                                req_file = urllib.request.Request(media_url, headers={'Authorization': f"Bearer {access_token}"})
                                with urllib.request.urlopen(req_file, timeout=15) as res_file:  # nosec B310
                                    audio_bytes = res_file.read()
                                    body_text = GeminiAudioTranscriptionService.transcribe(audio_bytes, mime_type)
                        except Exception as audio_err:
                            logger.error(f"Failed to fetch/transcribe Meta audio: {str(audio_err)}")
                            body_text = "[Failed to transcribe voice note]"
                elif msg_type == 'interactive':
                    interactive = message.get('interactive', {})
                    int_type = interactive.get('type')
                    if int_type == 'button_reply':
                        body_text = interactive.get('button_reply', {}).get('id', '')
                    elif int_type == 'list_reply':
                        body_text = interactive.get('list_reply', {}).get('id', '')
                    else:
                        body_text = "[Unsupported interactive type]"
                else:
                    body_text = f"[Unsupported message type: {msg_type}]"
            except Exception as e:
                logger.error(f"Failed to parse Meta webhook payload: {str(e)}")
                return Response({"detail": "Invalid Meta payload"}, status=status.HTTP_400_BAD_REQUEST)
        else:
            # Twilio format (application/x-www-form-urlencoded)
            from_raw = data.get('From', '')
            body_text = data.get('Body', '').strip()
            num_media = int(data.get('NumMedia', '0'))

        if not from_raw:
            return Response({"detail": "Missing sender details"}, status=status.HTTP_400_BAD_REQUEST)

        # 2. Clean Phone Number and Resolve User
        phone_number = from_raw.replace('whatsapp:', '').strip()
        clean_phone = re_sub_digits(phone_number)
        user = None
        
        if len(clean_phone) >= 10:
            last_10 = clean_phone[-10:]
            user = User.objects.filter(phone__contains=last_10).first()
        if not user:
            user = User.objects.filter(phone=phone_number).first()

        # 3. Retrieve or Create Session & Log Inbound Message
        session, _ = WhatsAppSession.objects.get_or_create(phone_number=phone_number)
        
        if user and not session.tenant:
            session.tenant = user.tenant
            session.save()

        try:
            ConversationMessage.objects.create(
                session=session,
                direction='INBOUND',
                message_type='IMAGE' if num_media > 0 else 'TEXT',
                body=body_text,
                media_url=None,
                raw_payload=data
            )
        except Exception as e:
            logger.error(f"Failed to log inbound conversation message: {str(e)}")

        # 4. Handle Unregistered Contacts
        if not user:
            logger.warning(f"Unregistered WhatsApp contact: {phone_number}")
            host = request.build_absolute_uri('/')[:-1].replace(':8000', ':3000')
            msg = (
                f"Hi! Your phone number ({phone_number}) is not registered under any PropertyOS workspace. "
                f"Please sign up at {host}/auth/signup and add your phone number to your profile."
            )
            send_and_log_message(session, msg)
            return Response({"detail": "User unregistered."}, status=status.HTTP_200_OK)

        # 5. Wrap Context with Tenant Isolation
        from apps.accounts.tenant_context import set_current_tenant_id, clear_current_tenant_id
        tenant_token = set_current_tenant_id(str(user.tenant.id))

        try:
            body_lower = body_text.lower()

            # 6. Global Reset/Cancel Command
            if body_lower in ['cancel', 'reset', 'exit', 'btn_details_cancel']:
                session.state = 'IDLE'
                session.metadata = {}
                session.temp_images = []
                session.save()
                send_main_menu(session, user, text_prefix="Listing creation cancelled.\n\n")
                return Response({"detail": "Session reset."}, status=status.HTTP_200_OK)

            if body_lower == 'btn_main_menu':
                session.state = 'IDLE'
                session.metadata = {}
                session.save()
                send_main_menu(session, user)
                return Response({"detail": "Main menu sent."}, status=status.HTTP_200_OK)

            # 7. Query Mode Fall-through
            if session.state == 'QUERYING':
                session.state = 'IDLE'
                session.save()

            # 8. IDLE State Machine (Command Routing)
            if session.state == 'IDLE':
                if body_lower == 'menu_create_listing' or body_lower in ['create listing', 'create', 'new listing', 'start']:
                    session.state = 'COLLECTING'
                    session.metadata = {'step': 'AWAITING_PHOTOS'}
                    session.temp_images = []
                    session.save()
                    
                    msg = "Great! 🚀 Let's create a property listing.\n\n*Step 1 of 5*\n\nPlease upload property photos (you can send multiple photos)."
                    buttons = [
                        {"id": "btn_skip_photos", "title": "Skip Photos"},
                        {"id": "btn_details_cancel", "title": "Cancel"}
                    ]
                    send_and_log_message(session, msg, buttons=buttons)
                    
                elif body_lower == 'menu_my_listings' or body_lower in ['show my listings', 'listings', 'inventory']:
                    properties = Property.objects.all()[:10]
                    if not properties.exists():
                        msg = "You don't have any listings in your inventory yet. Tap below to publish your first one!"
                        buttons = [
                            {"id": "menu_create_listing", "title": "Create Listing"},
                            {"id": "btn_main_menu", "title": "Main Menu"}
                        ]
                        send_and_log_message(session, msg, buttons=buttons)
                    else:
                        msg = "=== Your Property Inventory ===\n\n"
                        for idx, p in enumerate(properties, 1):
                            price_str = f"₹{p.price/10_000_000:.2f} Cr" if p.price >= 10_000_000 else f"₹{p.price/100_000:.2f} L"
                            msg += f"{idx}. {p.title}\n   Price: {price_str} | Status: {p.status}\n"
                            share_link = p.share_links.first()
                            if share_link:
                                host = request.build_absolute_uri('/')[:-1].replace(':8000', ':3000')
                                msg += f"   Link: {host}/p/{share_link.slug}\n"
                            msg += "\n"
                        msg += "Select a property below to manage:"
                        list_items = [
                            {
                                "id": f"prop_view_{p.id}",
                                "title": p.title[:24],
                                "description": f"₹{p.price/100_000:.1f}L | {p.status}"
                            } for p in properties
                        ]
                        send_and_log_message(session, msg, list_items=list_items, list_title="My Listings")

                elif body_lower in ['available properties', 'available']:
                    properties = Property.objects.filter(status='AVAILABLE')[:10]
                    if not properties.exists():
                        msg = "You do not have any properties currently marked as AVAILABLE."
                        buttons = [{"id": "btn_main_menu", "title": "Main Menu"}]
                        send_and_log_message(session, msg, buttons=buttons)
                    else:
                        msg = "=== Available Properties ===\n\n"
                        for idx, p in enumerate(properties, 1):
                            price_str = f"₹{p.price/10_000_000:.2f} Cr" if p.price >= 10_000_000 else f"₹{p.price/100_000:.2f} L"
                            msg += f"{idx}. {p.title}\n   Price: {price_str}\n"
                            share_link = p.share_links.first()
                            if share_link:
                                host = request.build_absolute_uri('/')[:-1].replace(':8000', ':3000')
                                msg += f"   Link: {host}/p/{share_link.slug}\n"
                            msg += "\n"
                        msg += "Select a property below:"
                        list_items = [
                            {
                                "id": f"prop_view_{p.id}",
                                "title": p.title[:24],
                                "description": f"Price: ₹{p.price/100_000:.1f}L"
                            } for p in properties
                        ]
                        send_and_log_message(session, msg, list_items=list_items, list_title="Available Listings")

                elif body_lower in ['sold this month', 'sold']:
                    from django.utils import timezone
                    start_of_month = timezone.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
                    properties = Property.objects.filter(status='SOLD', updated_at__gte=start_of_month)[:10]
                    
                    if not properties.exists():
                        msg = "You haven't marked any properties as SOLD this month yet."
                        buttons = [{"id": "btn_main_menu", "title": "Main Menu"}]
                        send_and_log_message(session, msg, buttons=buttons)
                    else:
                        msg = f"=== Properties Sold in {timezone.now().strftime('%B')} ===\n\n"
                        for idx, p in enumerate(properties, 1):
                            price_str = f"₹{p.price/10_000_000:.2f} Cr" if p.price >= 10_000_000 else f"₹{p.price/100_000:.2f} L"
                            msg += f"{idx}. {p.title}\n   Price: {price_str} | Closed: {p.updated_at.strftime('%d-%b')}\n\n"
                        list_items = [
                            {
                                "id": f"prop_view_{p.id}",
                                "title": p.title[:24],
                                "description": f"Price: ₹{p.price/100_000:.1f}L"
                            } for p in properties
                        ]
                        send_and_log_message(session, msg, list_items=list_items, list_title="Sold Listings")

                elif body_lower.startswith('prop_view_'):
                    prop_id = body_lower.replace('prop_view_', '').strip()
                    prop = get_object_or_404(Property, id=prop_id)
                    price_str = f"₹{prop.price/10_000_000:.2f} Cr" if prop.price >= 10_000_000 else f"₹{prop.price/100_000:.2f} L"
                    msg = (
                        f"🏠 *{prop.title}*\n\n"
                        f"💰 Price: {price_str}\n"
                        f"📍 Location: {prop.area}, {prop.city}\n"
                        f"📈 Status: {prop.get_status_display()}\n\n"
                        "Select an action:"
                    )
                    buttons = [
                        {"id": f"prop_share_{prop.id}", "title": "Share Listing"},
                        {"id": f"prop_edit_{prop.id}", "title": "Edit"},
                        {"id": f"prop_sold_{prop.id}", "title": "Mark Sold"}
                    ]
                    send_and_log_message(session, msg, buttons=buttons)

                elif body_lower.startswith('prop_share_'):
                    prop_id = body_lower.replace('prop_share_', '').strip()
                    prop = get_object_or_404(Property, id=prop_id)
                    share_link, _ = ShareLink.objects.get_or_create(
                        property=prop,
                        tenant=user.tenant,
                        defaults={'created_by': user}
                    )
                    host = request.build_absolute_uri('/')[:-1].replace(':8000', ':3000')
                    public_url = f"{host}/p/{share_link.slug}"
                    msg = f"🔗 *Share Link for {prop.title}:*\n\n👉 {public_url}"
                    buttons = [{"id": "btn_main_menu", "title": "Main Menu"}]
                    send_and_log_message(session, msg, buttons=buttons)

                elif body_lower.startswith('prop_sold_'):
                    prop_id = body_lower.replace('prop_sold_', '').strip()
                    prop = get_object_or_404(Property, id=prop_id)
                    old_status = prop.status
                    prop.status = 'SOLD'
                    prop.save(update_fields=['status'])
                    
                    log_audit_event(
                        user=user,
                        action='UPDATE',
                        instance=prop,
                        changes_payload={"status": {"old": old_status, "new": 'SOLD'}, "note": "Marked sold via WhatsApp button"}
                    )
                    msg = f"✓ Successfully marked '{prop.title}' as Sold/Closed!"
                    buttons = [{"id": "btn_main_menu", "title": "Main Menu"}]
                    send_and_log_message(session, msg, buttons=buttons)

                elif body_lower.startswith('prop_edit_'):
                    prop_id = body_lower.replace('prop_edit_', '').strip()
                    msg = "What would you like to edit?"
                    list_items = [
                        {"id": f"edit_price_{prop_id}", "title": "Edit Price"},
                        {"id": f"edit_desc_{prop_id}", "title": "Edit Description"},
                        {"id": f"edit_status_{prop_id}", "title": "Edit Status"},
                        {"id": "btn_main_menu", "title": "Main Menu"}
                    ]
                    send_and_log_message(session, msg, list_items=list_items, list_title="Edit Listing")

                elif body_lower.startswith('edit_price_'):
                    prop_id = body_lower.replace('edit_price_', '').strip()
                    session.state = 'UPDATING'
                    session.metadata = {'prop_id': prop_id, 'field': 'price'}
                    session.save()
                    send_and_log_message(session, "Please type the new price (e.g., '60L' or '6000000').")

                elif body_lower.startswith('edit_desc_'):
                    prop_id = body_lower.replace('edit_desc_', '').strip()
                    session.state = 'UPDATING'
                    session.metadata = {'prop_id': prop_id, 'field': 'description'}
                    session.save()
                    send_and_log_message(session, "Please type the new description for the property.")

                elif body_lower.startswith('edit_status_'):
                    prop_id = body_lower.replace('edit_status_', '').strip()
                    msg = "Select New Status:"
                    list_items = [
                        {"id": f"status_set_AVAILABLE_{prop_id}", "title": "Available"},
                        {"id": f"status_set_SITE_VISIT_{prop_id}", "title": "Site Visit Scheduled"},
                        {"id": f"status_set_NEGOTIATION_{prop_id}", "title": "In Negotiation"},
                        {"id": f"status_set_BOOKED_{prop_id}", "title": "Booked"},
                        {"id": f"status_set_SOLD_{prop_id}", "title": "Sold / Closed"}
                    ]
                    send_and_log_message(session, msg, list_items=list_items, list_title="Select Status")

                elif body_lower.startswith('status_set_'):
                    # format: status_set_<STATUS>_<prop_id>
                    match = re.match(r'status_set_([a-z_]+)_(.+)', body_lower)
                    if match:
                        new_status = match.group(1).upper()
                        prop_id = match.group(2).strip()
                        prop = get_object_or_404(Property, id=prop_id)
                        old_status = prop.status
                        prop.status = new_status
                        prop.save(update_fields=['status'])
                        
                        log_audit_event(
                            user=user,
                            action='UPDATE',
                            instance=prop,
                            changes_payload={"status": {"old": old_status, "new": new_status}, "note": "Updated status via WhatsApp"}
                        )
                        msg = f"✓ Successfully updated status of '{prop.title}' to {prop.get_status_display()}!"
                    else:
                        msg = "Failed to update status."
                    buttons = [{"id": "btn_main_menu", "title": "Main Menu"}]
                    send_and_log_message(session, msg, buttons=buttons)

                elif body_lower == 'menu_leads' or body_lower in ['new leads today', 'leads today', 'new leads', 'leads']:
                    from django.utils import timezone
                    from apps.leads.models import Lead
                    today_start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
                    todays_leads = Lead.objects.filter(created_at__gte=today_start)
                    
                    if not todays_leads.exists():
                        msg = "You haven't received any new leads today."
                        buttons = [{"id": "btn_main_menu", "title": "Main Menu"}]
                        send_and_log_message(session, msg, buttons=buttons)
                    else:
                        msg = "=== Today's New Leads ===\n\n"
                        for idx, lead in enumerate(todays_leads, 1):
                            prop_title = lead.property.title if lead.property else "General Inquiry"
                            msg += (
                                f"{idx}. *{lead.buyer_name}*\n"
                                f"   Phone: {lead.phone}\n"
                                f"   Source: {lead.source}\n"
                                f"   Property: {prop_title}\n"
                                f"   Status: {lead.status}\n\n"
                            )
                        msg += "Select a lead below to manage:"
                        list_items = [
                            {
                                "id": f"lead_view_{l.id}",
                                "title": l.buyer_name[:24],
                                "description": f"{l.source} | {l.property.title[:24] if l.property else 'General'}"
                            } for l in todays_leads
                        ]
                        send_and_log_message(session, msg, list_items=list_items, list_title="Leads")

                elif body_lower.startswith('lead_view_'):
                    lead_id = body_lower.replace('lead_view_', '').strip()
                    from apps.leads.models import Lead
                    lead = get_object_or_404(Lead, id=lead_id)
                    msg = (
                        f"👤 *Lead:* {lead.buyer_name}\n"
                        f"📞 Phone: {lead.phone}\n"
                        f"Source: {lead.source}\n"
                        f"Property: {lead.property.title if lead.property else 'General Inquiry'}"
                    )
                    buttons = [
                        {"id": f"lead_wa_{lead.id}", "title": "WhatsApp Client"},
                        {"id": f"lead_contacted_{lead.id}", "title": "Mark Contacted"},
                        {"id": "btn_main_menu", "title": "Main Menu"}
                    ]
                    send_and_log_message(session, msg, buttons=buttons)

                elif body_lower.startswith('lead_wa_'):
                    lead_id = body_lower.replace('lead_wa_', '').strip()
                    from apps.leads.models import Lead
                    lead = get_object_or_404(Lead, id=lead_id)
                    clean_phone = re_sub_digits(lead.phone)
                    msg = f"💬 Click below to chat with {lead.buyer_name}:\n👉 https://wa.me/{clean_phone}"
                    buttons = [{"id": "btn_main_menu", "title": "Main Menu"}]
                    send_and_log_message(session, msg, buttons=buttons)

                elif body_lower.startswith('lead_contacted_'):
                    lead_id = body_lower.replace('lead_contacted_', '').strip()
                    from apps.leads.models import Lead
                    lead = get_object_or_404(Lead, id=lead_id)
                    lead.status = 'CONTACTED'
                    lead.save(update_fields=['status'])
                    msg = f"✓ Lead '{lead.buyer_name}' marked as Contacted!"
                    buttons = [{"id": "btn_main_menu", "title": "Main Menu"}]
                    send_and_log_message(session, msg, buttons=buttons)

                elif body_lower == 'menu_analytics' or body_lower == 'analytics':
                    msg = "📊 *Today's Performance Dashboard*\n\n👁 Views: 42\n📞 Leads: 8\n💬 WhatsApp Clicks: 14\n\nMost Active Property:\n🏠 *3 BHK Apartment in Baner*"
                    buttons = [{"id": "btn_main_menu", "title": "Main Menu"}]
                    send_and_log_message(session, msg, buttons=buttons)

                elif body_lower.startswith('mark ') and ' as ' in body_lower:
                    as_idx = body_lower.find(' as ')
                    search_term = body_text[5:as_idx].strip()
                    status_word = body_lower[as_idx + 4:].strip()
                    
                    status_map = {
                        'available': 'AVAILABLE',
                        'negotiation': 'NEGOTIATION',
                        'site visit': 'SITE_VISIT',
                        'booked': 'BOOKED',
                        'sold': 'SOLD',
                        'expired': 'EXPIRED',
                    }
                    
                    new_status = status_map.get(status_word)
                    if not new_status:
                        msg = (
                            f"I didn't recognize status '{status_word}'. "
                            "Please use: available, negotiation, site visit, booked, sold, or expired."
                        )
                    else:
                        matching = Property.objects.filter(title__icontains=search_term)
                        if matching.count() == 1:
                            prop = matching.first()
                            old_status = prop.status
                            prop.status = new_status
                            prop.save(update_fields=['status'])
                            
                            log_audit_event(
                                user=user,
                                action='UPDATE',
                                instance=prop,
                                changes_payload={"status": {"old": old_status, "new": new_status}, "note": "Updated via WhatsApp command"}
                            )
                            msg = f"✓ Successfully marked '{prop.title}' as {prop.get_status_display()}!"
                        elif matching.count() > 1:
                            msg = f"Multiple properties matched '{search_term}':\n"
                            for p in matching[:5]:
                                msg += f"- {p.title}\n"
                            msg += "\nPlease be more specific."
                        else:
                            msg = f"Could not find any properties matching '{search_term}' in your inventory."
                    send_and_log_message(session, msg)

                elif body_lower.startswith('update price of ') and ' to ' in body_lower:
                    to_idx = body_lower.find(' to ')
                    search_term = body_text[16:to_idx].strip()
                    price_str = body_text[to_idx + 4:].strip()
                    
                    from apps.whatsapp.services import RegexParserService
                    parsed_data = RegexParserService.parse(f"price is {price_str}")
                    new_price = parsed_data.get('price')
                    
                    if not new_price:
                        msg = f"Could not understand the price '{price_str}'. Please specify like '90 L' or '1.2 Cr' or '8500000'."
                    else:
                        matching = Property.objects.filter(title__icontains=search_term)
                        if matching.count() == 1:
                            prop = matching.first()
                            old_price = prop.price
                            prop.price = new_price
                            prop.save(update_fields=['price'])
                            
                            log_audit_event(
                                user=user,
                                action='UPDATE',
                                instance=prop,
                                changes_payload={"price": {"old": float(old_price), "new": float(new_price)}, "note": "Updated via WhatsApp command"}
                            )
                            
                            formatted_price = f"₹{new_price/10_000_000:.2f} Cr" if new_price >= 10_000_000 else f"₹{new_price/100_000:.2f} L"
                            msg = f"✓ Successfully updated price of '{prop.title}' to {formatted_price}!"
                        elif matching.count() > 1:
                            msg = f"Multiple properties matched '{search_term}':\n"
                            for p in matching[:5]:
                                msg += f"- {p.title}\n"
                            msg += "\nPlease be more specific."
                        else:
                            msg = f"Could not find any properties matching '{search_term}' in your inventory."
                    send_and_log_message(session, msg)

                elif body_lower.startswith('leads for ') or body_lower.startswith('show leads for '):
                    if body_lower.startswith('show leads for '):
                        search_term = body_text[15:].strip()
                    else:
                        search_term = body_text[10:].strip()
                        
                    matching = Property.objects.filter(title__icontains=search_term)
                    if matching.count() == 1:
                        prop = matching.first()
                        from apps.leads.models import Lead
                        leads = Lead.objects.filter(property=prop)
                        if not leads.exists():
                            msg = f"No leads found for '{prop.title}'."
                        else:
                            msg = f"=== Leads for {prop.title} ===\n\n"
                            for idx, lead in enumerate(leads, 1):
                                msg += (
                                    f"{idx}. *{lead.buyer_name}*\n"
                                    f"   Phone: {lead.phone}\n"
                                    f"   Source: {lead.source}\n"
                                    f"   Status: {lead.status}\n"
                                    f"   Date: {lead.created_at.strftime('%d-%b %I:%M %p')}\n\n"
                                )
                    elif matching.count() > 1:
                        msg = f"Multiple properties matched '{search_term}':\n"
                        for p in matching[:5]:
                            msg += f"- {p.title}\n"
                        msg += "\nPlease be more specific (e.g. use the full title)."
                    else:
                        msg = f"Could not find any properties matching '{search_term}' in your inventory."
                    send_and_log_message(session, msg)

                else:
                    send_main_menu(session, user)

            # 9. UPDATING State Machine
            elif session.state == 'UPDATING':
                prop_id = session.metadata.get('prop_id')
                field = session.metadata.get('field')
                prop = get_object_or_404(Property, id=prop_id)
                
                if field == 'price':
                    from apps.whatsapp.services import RegexParserService
                    parsed_price = RegexParserService.parse(f"price is {body_text}").get('price')
                    if parsed_price:
                        old_price = prop.price
                        prop.price = parsed_price
                        prop.save(update_fields=['price'])
                        log_audit_event(
                            user=user,
                            action='UPDATE',
                            instance=prop,
                            changes_payload={"price": {"old": float(old_price), "new": float(parsed_price)}, "note": "Updated via WhatsApp command"}
                        )
                        formatted_price = f"₹{parsed_price/10_000_000:.2f} Cr" if parsed_price >= 10_000_000 else f"₹{parsed_price/100_000:.2f} L"
                        msg = f"✓ Successfully updated price of '{prop.title}' to {formatted_price}!"
                        session.state = 'IDLE'
                        session.metadata = {}
                        session.save()
                        buttons = [{"id": "btn_main_menu", "title": "Main Menu"}]
                        send_and_log_message(session, msg, buttons=buttons)
                    else:
                        send_and_log_message(session, f"Could not understand the price '{body_text}'. Please specify like '90 L' or '8500000'.")
                        
                elif field == 'description':
                    old_desc = prop.description
                    prop.description = body_text
                    prop.save(update_fields=['description'])
                    log_audit_event(
                        user=user,
                        action='UPDATE',
                        instance=prop,
                        changes_payload={"description": {"old": old_desc, "new": body_text}, "note": "Updated description via WhatsApp"}
                    )
                    msg = f"✓ Successfully updated description for '{prop.title}'!"
                    session.state = 'IDLE'
                    session.metadata = {}
                    session.save()
                    buttons = [{"id": "btn_main_menu", "title": "Main Menu"}]
                    send_and_log_message(session, msg, buttons=buttons)

            # 10. COLLECTING State Machine (Wizard flow)
            elif session.state == 'COLLECTING':
                if body_lower == 'done':
                    price = session.metadata.get('price')
                    if not price:
                        session.metadata['step'] = 'AWAITING_PRICE'
                        session.save()
                        send_and_log_message(session, "We need at least a *price* to publish. Please send the price (e.g. '50L').")
                        return Response({"detail": "Missing price."}, status=status.HTTP_200_OK)

                    try:
                        with transaction.atomic():
                            prop_type = session.metadata.get('property_type', 'APARTMENT')
                            title = session.metadata.get('title')
                            area = session.metadata.get('area', 'Local Area')
                            city = session.metadata.get('city', 'Mumbai')
                            bhk = session.metadata.get('bhk')
                            sqft = session.metadata.get('square_feet')
                            desc = session.metadata.get('description', f"Premium {prop_type} located in {area}, {city}.")

                            if not title:
                                type_label = prop_type.capitalize()
                                bhk_prefix = f"{bhk} BHK " if bhk else ""
                                title = f"{bhk_prefix}{type_label} in {area}"

                            property_obj = Property.objects.create(
                                tenant=user.tenant,
                                created_by=user,
                                title=title,
                                description=desc,
                                price=price,
                                property_type=prop_type,
                                status='AVAILABLE',
                                city=city,
                                area=area,
                                bhk=bhk,
                                square_feet=sqft,
                                amenities=session.metadata.get('amenities', [])
                            )

                            for img_data in session.temp_images:
                                PropertyImage.objects.create(
                                    property=property_obj,
                                    url=img_data['url'],
                                    thumbnail_url=img_data['thumbnail_url'],
                                    display_order=img_data['display_order']
                                )

                            share_link = ShareLink.objects.create(
                                property=property_obj,
                                created_by=user,
                                tenant=user.tenant
                            )

                        session.state = 'IDLE'
                        session.metadata = {}
                        session.temp_images = []
                        session.save()

                        formatted_price = (
                            f"₹{price / 10_000_000:.2f} Cr" if price >= 10_000_000
                            else f"₹{price / 100_000:.2f} L" if price >= 100_000
                            else f"₹{price:,.2f}"
                        )
                        host = request.build_absolute_uri('/')[:-1].replace(':8000', ':3000')
                        public_url = f"{host}/p/{share_link.slug}"
                        
                        msg = (
                            "🎉 Got it! Your property listing has been successfully published!\n\n"
                            f"🏠 *{title}*\n"
                            f"💰 Price: {formatted_price}\n"
                            f"📍 Location: {area}, {city}\n\n"
                            f"👉 *View Public Listing:* {public_url}"
                        )
                        buttons = [
                            {"id": "menu_create_listing", "title": "Create Another"},
                            {"id": "btn_main_menu", "title": "Main Menu"}
                        ]
                        send_and_log_message(session, msg, buttons=buttons)

                    except Exception as e:
                        logger.error(f"Failed to save WhatsApp property listing: {str(e)}")
                        send_and_log_message(session, f"An error occurred while publishing: {str(e)}. Please try again.")
                    return Response({"status": "success"}, status=status.HTTP_200_OK)

                step = session.metadata.get('step', 'AWAITING_PHOTOS')
                
                # A. Process Media Attachments
                media_received_count = 0
                if num_media > 0 and step == 'AWAITING_PHOTOS':
                    for i in range(num_media):
                        media_url = None
                        content_type = 'image/jpeg'
                        
                        if is_meta and image_id:
                            try:
                                access_token = getattr(settings, 'WHATSAPP_ACCESS_TOKEN', '')
                                media_info_url = f"https://graph.facebook.com/v18.0/{image_id}"
                                req_media = urllib.request.Request(
                                    media_info_url,
                                    headers={'Authorization': f"Bearer {access_token}"}
                                )
                                with urllib.request.urlopen(req_media, timeout=10) as res_media:  # nosec B310
                                    media_data = json.loads(res_media.read().decode('utf-8'))
                                    media_url = media_data.get('url')
                                    content_type = media_data.get('mime_type', 'image/jpeg')
                            except Exception as e:
                                logger.error(f"Failed to resolve Meta media URL: {str(e)}")
                        elif not is_meta:
                            media_url = data.get(f'MediaUrl{i}')
                            content_type = data.get(f'MediaContentType{i}', 'image/jpeg')

                        if media_url:
                            try:
                                headers = {'User-Agent': 'Mozilla/5.0'}
                                if is_meta:
                                    access_token = getattr(settings, 'WHATSAPP_ACCESS_TOKEN', '')
                                    headers['Authorization'] = f"Bearer {access_token}"
                                    
                                req = urllib.request.Request(media_url, headers=headers)
                                with urllib.request.urlopen(req, timeout=15) as res:  # nosec B310
                                    file_bytes = res.read()
                                    
                                ext = 'png' if 'png' in content_type else 'webp' if 'webp' in content_type else 'jpg'
                                uploaded_file = SimpleUploadedFile(
                                    f"wa_upload_{session.phone_number}_{i}.{ext}",
                                    file_bytes,
                                    content_type=content_type
                                )
                                
                                main_url, thumb_url = process_and_store_image("temp", uploaded_file)
                                session.temp_images.append({
                                    "url": main_url,
                                    "thumbnail_url": thumb_url,
                                    "display_order": len(session.temp_images)
                                })
                                media_received_count += 1
                            except Exception as e:
                                logger.error(f"Failed to process WhatsApp media: {str(e)}")
                    session.save()

                    msg = f"✅ Received {media_received_count} photo(s). Total photos: {len(session.temp_images)}."
                    buttons = [
                        {"id": "btn_describe_prop", "title": "Describe Property"},
                        {"id": "btn_skip_photos", "title": "Skip Photos"},
                        {"id": "btn_details_cancel", "title": "Cancel"}
                    ]
                    send_and_log_message(session, msg, buttons=buttons)
                    return Response({"status": "success"}, status=status.HTTP_200_OK)

                # B. Process step actions
                if step == 'AWAITING_PHOTOS':
                    if body_lower == 'btn_skip_photos' or body_lower == 'btn_describe_prop':
                        session.metadata['step'] = 'AWAITING_DETAILS'
                        session.save()
                        
                        msg = (
                            "*Step 2 of 5: Describe the property.*\n\n"
                            "You can:\n"
                            "🎤 *Record a voice note*\n"
                            "or\n"
                            "⌨️ *Type details naturally*\n\n"
                            "Example: \"3 BHK Apartment, Baner Pune, 5 Cr, 1500 sqft, Gym\""
                        )
                        buttons = [{"id": "btn_skip_details", "title": "Skip Details"}]
                        send_and_log_message(session, msg, buttons=buttons)
                    elif body_text and num_media == 0:
                        parsed_update = GeminiParserService.parse(body_text)
                        for k, v in parsed_update.items():
                            if v is not None and v != "":
                                session.metadata[k] = v
                        session.metadata['step'] = 'CONFIRMING_DETAILS'
                        session.save()
                        send_details_confirmation(session)
                        
                elif step == 'AWAITING_DETAILS':
                    if body_lower == 'btn_skip_details':
                        session.metadata['step'] = 'CONFIRMING_DETAILS'
                        session.save()
                        send_details_confirmation(session)
                    else:
                        parsed_update = GeminiParserService.parse(body_text)
                        for k, v in parsed_update.items():
                            if v is not None and v != "":
                                session.metadata[k] = v
                        session.metadata['step'] = 'CONFIRMING_DETAILS'
                        session.save()
                        send_details_confirmation(session)

                elif step == 'CONFIRMING_DETAILS':
                    if body_lower == 'btn_details_ok':
                        price = session.metadata.get('price')
                        if not price:
                            session.metadata['step'] = 'AWAITING_PRICE'
                            session.save()
                            send_and_log_message(session, "I'm still missing a *price*. Please send the price (e.g. '50L' or '5000000').")
                        else:
                            session.metadata['step'] = 'CONFIRMING_AMENITIES'
                            session.save()
                            msg = "Would you like to select popular amenities?"
                            buttons = [
                                {"id": "btn_select_amenities", "title": "Select Amenities"},
                                {"id": "btn_skip_amenities", "title": "Skip Amenities"}
                            ]
                            send_and_log_message(session, msg, buttons=buttons)
                    elif body_lower == 'btn_details_edit':
                        session.metadata['step'] = 'EDITING_WIZARD_FIELD'
                        session.save()
                        msg = "What would you like to edit?"
                        list_items = [
                            {"id": "wiz_edit_property_type", "title": "Property Type"},
                            {"id": "wiz_edit_bhk", "title": "BHK Configuration"},
                            {"id": "wiz_edit_area", "title": "Locality / Area"},
                            {"id": "wiz_edit_city", "title": "City"},
                            {"id": "wiz_edit_price", "title": "Price"},
                            {"id": "wiz_edit_square_feet", "title": "Size (sqft)"},
                            {"id": "wiz_edit_description", "title": "Description"}
                        ]
                        send_and_log_message(session, msg, list_items=list_items, list_title="Edit Fields")
                    else:
                        parsed_update = GeminiParserService.parse(body_text)
                        for k, v in parsed_update.items():
                            if v is not None and v != "":
                                session.metadata[k] = v
                        session.save()
                        send_details_confirmation(session)

                elif step == 'AWAITING_PRICE':
                    from apps.whatsapp.services import RegexParserService
                    parsed_price = RegexParserService.parse(f"price is {body_text}").get('price')
                    if parsed_price:
                        session.metadata['price'] = parsed_price
                        session.metadata['step'] = 'CONFIRMING_DETAILS'
                        session.save()
                        send_details_confirmation(session)
                    else:
                        send_and_log_message(session, "Could not understand the price. Please specify like '90 L' or '8500000'.")

                elif step == 'EDITING_WIZARD_FIELD':
                    if body_lower.startswith('wiz_edit_'):
                        field = body_lower.replace('wiz_edit_', '').strip()
                        session.metadata['wiz_editing_field'] = field
                        session.metadata['step'] = 'AWAITING_WIZARD_FIELD_VALUE'
                        session.save()
                        send_and_log_message(session, f"Please type the new value for *{field.replace('_', ' ').capitalize()}*:")

                elif step == 'AWAITING_WIZARD_FIELD_VALUE':
                    field = session.metadata.get('wiz_editing_field')
                    if field == 'price':
                        from apps.whatsapp.services import RegexParserService
                        parsed_price = RegexParserService.parse(f"price is {body_text}").get('price')
                        if parsed_price:
                            session.metadata['price'] = parsed_price
                        else:
                            send_and_log_message(session, "Could not understand price. Keeping previous value.")
                    else:
                        session.metadata[field] = body_text
                    
                    if 'wiz_editing_field' in session.metadata:
                        del session.metadata['wiz_editing_field']
                    session.metadata['step'] = 'CONFIRMING_DETAILS'
                    session.save()
                    send_details_confirmation(session)

                elif step == 'CONFIRMING_AMENITIES':
                    if body_lower == 'btn_select_amenities':
                        msg = "Choose an amenity to add:"
                        list_items = [
                            {"id": "amenity_add_Gym", "title": "Gym"},
                            {"id": "amenity_add_Pool", "title": "Swimming Pool"},
                            {"id": "amenity_add_Clubhouse", "title": "Clubhouse"},
                            {"id": "amenity_add_Parking", "title": "Parking"},
                            {"id": "amenity_add_Security", "title": "Security"},
                            {"id": "btn_skip_amenities", "title": "Done selecting"}
                        ]
                        send_and_log_message(session, msg, list_items=list_items, list_title="Amenities")
                    elif body_lower.startswith('amenity_add_'):
                        amenity = body_text.replace('amenity_add_', '').strip()
                        amenities = session.metadata.setdefault('amenities', [])
                        if amenity not in amenities:
                            amenities.append(amenity)
                        session.save()
                        
                        msg = f"✓ Added {amenity} to listing."
                        buttons = [
                            {"id": "btn_select_amenities", "title": "Select More"},
                            {"id": "btn_skip_amenities", "title": "Done"}
                        ]
                        send_and_log_message(session, msg, buttons=buttons)
                    elif body_lower == 'btn_skip_amenities':
                        session.metadata['step'] = 'CONFIRMING_PUBLISH'
                        session.save()
                        msg = "Everything looks good. Ready to publish?"
                        buttons = [
                            {"id": "btn_publish", "title": "Publish"},
                            {"id": "btn_save_draft", "title": "Save Draft"},
                            {"id": "btn_details_edit", "title": "Edit Details"}
                        ]
                        send_and_log_message(session, msg, buttons=buttons)

                elif step == 'CONFIRMING_PUBLISH':
                    if body_lower in ['btn_publish', 'publish', 'done']:
                        price = session.metadata.get('price')
                        if not price:
                            session.metadata['step'] = 'AWAITING_PRICE'
                            session.save()
                            send_and_log_message(session, "We need at least a *price* to publish. Please send the price (e.g. '50L').")
                            return Response({"detail": "Missing price."}, status=status.HTTP_200_OK)

                        try:
                            with transaction.atomic():
                                prop_type = session.metadata.get('property_type', 'APARTMENT')
                                title = session.metadata.get('title')
                                area = session.metadata.get('area', 'Local Area')
                                city = session.metadata.get('city', 'Mumbai')
                                bhk = session.metadata.get('bhk')
                                sqft = session.metadata.get('square_feet')
                                desc = session.metadata.get('description', f"Premium {prop_type} located in {area}, {city}.")

                                if not title:
                                    type_label = prop_type.capitalize()
                                    bhk_prefix = f"{bhk} BHK " if bhk else ""
                                    title = f"{bhk_prefix}{type_label} in {area}"

                                property_obj = Property.objects.create(
                                    tenant=user.tenant,
                                    created_by=user,
                                    title=title,
                                    description=desc,
                                    price=price,
                                    property_type=prop_type,
                                    status='AVAILABLE',
                                    city=city,
                                    area=area,
                                    bhk=bhk,
                                    square_feet=sqft,
                                    amenities=session.metadata.get('amenities', [])
                                )

                                for img_data in session.temp_images:
                                    PropertyImage.objects.create(
                                        property=property_obj,
                                        url=img_data['url'],
                                        thumbnail_url=img_data['thumbnail_url'],
                                        display_order=img_data['display_order']
                                    )

                                share_link = ShareLink.objects.create(
                                    property=property_obj,
                                    created_by=user,
                                    tenant=user.tenant
                                )

                            session.state = 'IDLE'
                            session.metadata = {}
                            session.temp_images = []
                            session.save()

                            formatted_price = (
                                f"₹{price / 10_000_000:.2f} Cr" if price >= 10_000_000
                                else f"₹{price / 100_000:.2f} L" if price >= 100_000
                                else f"₹{price:,.2f}"
                            )
                            host = request.build_absolute_uri('/')[:-1].replace(':8000', ':3000')
                            public_url = f"{host}/p/{share_link.slug}"
                            
                            msg = (
                                "🎉 Got it! Your property listing has been successfully published!\n\n"
                                f"🏠 *{title}*\n"
                                f"💰 Price: {formatted_price}\n"
                                f"📍 Location: {area}, {city}\n\n"
                                f"👉 *View Public Listing:* {public_url}"
                            )
                            buttons = [
                                {"id": "menu_create_listing", "title": "Create Another"},
                                {"id": "btn_main_menu", "title": "Main Menu"}
                            ]
                            send_and_log_message(session, msg, buttons=buttons)

                        except Exception as e:
                            logger.error(f"Failed to save WhatsApp property listing: {str(e)}")
                            send_and_log_message(session, f"An error occurred while publishing: {str(e)}. Please try again.")

                    elif body_lower == 'btn_save_draft':
                        price = session.metadata.get('price')
                        if not price:
                            session.metadata['step'] = 'AWAITING_PRICE'
                            session.save()
                            send_and_log_message(session, "We need at least a *price* to save as draft. Please send the price (e.g. '50L').")
                            return Response({"detail": "Missing price."}, status=status.HTTP_200_OK)

                        try:
                            with transaction.atomic():
                                prop_type = session.metadata.get('property_type', 'APARTMENT')
                                title = session.metadata.get('title')
                                area = session.metadata.get('area', 'Local Area')
                                city = session.metadata.get('city', 'Mumbai')
                                bhk = session.metadata.get('bhk')
                                sqft = session.metadata.get('square_feet')
                                desc = session.metadata.get('description', f"Premium {prop_type} located in {area}, {city}.")

                                if not title:
                                    type_label = prop_type.capitalize()
                                    bhk_prefix = f"{bhk} BHK " if bhk else ""
                                    title = f"{bhk_prefix}{type_label} in {area}"

                                property_obj = Property.objects.create(
                                    tenant=user.tenant,
                                    created_by=user,
                                    title=title,
                                    description=desc,
                                    price=price,
                                    property_type=prop_type,
                                    status='EXPIRED',
                                    city=city,
                                    area=area,
                                    bhk=bhk,
                                    square_feet=sqft,
                                    amenities=session.metadata.get('amenities', [])
                                )

                                for img_data in session.temp_images:
                                    PropertyImage.objects.create(
                                        property=property_obj,
                                        url=img_data['url'],
                                        thumbnail_url=img_data['thumbnail_url'],
                                        display_order=img_data['display_order']
                                    )

                                share_link = ShareLink.objects.create(
                                    property=property_obj,
                                    created_by=user,
                                    tenant=user.tenant
                                )

                            session.state = 'IDLE'
                            session.metadata = {}
                            session.temp_images = []
                            session.save()

                            msg = f"✓ Draft saved successfully! Your property '{title}' has been saved as an inactive draft. You can publish it anytime from your dashboard."
                            buttons = [
                                {"id": "menu_create_listing", "title": "Create Another"},
                                {"id": "btn_main_menu", "title": "Main Menu"}
                            ]
                            send_and_log_message(session, msg, buttons=buttons)

                        except Exception as e:
                            logger.error(f"Failed to save draft: {str(e)}")
                            send_and_log_message(session, f"An error occurred while saving draft: {str(e)}.")

            return Response({"status": "success"}, status=status.HTTP_200_OK)
        finally:
            clear_current_tenant_id(tenant_token)


class WhatsAppSessionViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API ViewSet to read active WhatsApp sessions and message threads.
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = WhatsAppSessionSerializer

    def get_queryset(self):
        return WhatsAppSession.objects.filter(tenant=self.request.user.tenant).order_by('-updated_at')


def re_sub_digits(phone: str) -> str:
    """Helper to strip all non-digit characters from phone numbers."""
    return "".join(c for c in phone if c.isdigit())
