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
from .services import get_whatsapp_gateway, GeminiParserService, send_and_log_message
from .serializers import WhatsAppSessionSerializer
from apps.accounts.models import User
from apps.properties.models import Property
from apps.media.models import PropertyImage
from apps.media.utils import process_and_store_image
from apps.sharing.models import ShareLink
from apps.audit.utils import log_audit_event

logger = logging.getLogger(__name__)

class WhatsAppWebhookView(APIView):
    """
    Public webhook ingress endpoint. Accepts SMS/WhatsApp events from Twilio or Meta.
    Verifies request authenticity before processing.
    """
    permission_classes = [AllowAny]

    def get(self, request, *args, **kwargs):
        """
        Meta WhatsApp Cloud API webhook verification handshake.
        Meta sends a GET request with hub.mode, hub.verify_token, hub.challenge.
        """
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
        Returns True in dev (no auth token configured) to allow local testing.
        """
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

    def post(self, request, *args, **kwargs):
        # 0. Detect and Parse Webhook Origin
        is_meta = False
        data = request.data
        
        if isinstance(data, dict) and data.get('object') == 'whatsapp_business_account':
            is_meta = True

        # 0b. Verify Twilio signature if Twilio provider is configured
        if not is_meta and getattr(settings, 'WHATSAPP_GATEWAY_PROVIDER', 'MOCK').upper() == 'TWILIO':
            if not self._verify_twilio_signature(request):
                logger.warning("Rejected webhook: invalid Twilio signature.")
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
                message = value.get('messages', [{}])[0]
                
                from_raw = "whatsapp:" + message.get('from', '')
                msg_type = message.get('type', 'text')
                
                if msg_type == 'text':
                    body_text = message.get('text', {}).get('body', '').strip()
                elif msg_type == 'image':
                    body_text = message.get('image', {}).get('caption', '').strip()
                    image_id = message.get('image', {}).get('id')
                    num_media = 1
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
            msg = (
                f"Hi! Your phone number ({phone_number}) is not registered under any PropertyOS workspace. "
                "Please sign up at http://localhost:3000/auth/signup and add your phone number to your profile."
            )
            send_and_log_message(session, msg)
            return Response({"detail": "User unregistered."}, status=status.HTTP_200_OK)

        # 5. Wrap Context with Tenant Isolation
        from apps.accounts.tenant_context import set_current_tenant_id, clear_current_tenant_id
        tenant_token = set_current_tenant_id(str(user.tenant.id))

        try:
            body_lower = body_text.lower()

            # 6. Global Reset/Cancel Command
            if body_lower in ['cancel', 'reset', 'exit']:
                session.state = 'IDLE'
                session.metadata = {}
                session.temp_images = []
                session.save()
                msg = "Listing creation cancelled. Send 'Create listing' to start over at any time."
                send_and_log_message(session, msg)
                return Response({"detail": "Session reset."}, status=status.HTTP_200_OK)

            # 7. Query Mode Fall-through
            if session.state == 'QUERYING':
                session.state = 'IDLE'
                session.save()

            # 8. IDLE State Machine (Command Routing)
            if session.state == 'IDLE':
                if body_lower in ['create listing', 'create', 'new listing', 'start']:
                    session.state = 'COLLECTING'
                    session.metadata = {}
                    session.temp_images = []
                    session.save()
                    
                    msg = (
                        "Hey! Welcome to PropertyOS.\n\n"
                        "📷 Send me photos of the property in any order.\n"
                        "✍️ Send text details like price, BHK configuration, area, city, and amenities.\n\n"
                        "Type *DONE* when you are ready to publish, or *CANCEL* to discard."
                    )
                    send_and_log_message(session, msg)
                    
                elif body_lower in ['show my listings', 'listings', 'inventory']:
                    session.state = 'QUERYING'
                    session.save()
                    
                    properties = Property.objects.all()[:10]
                    if not properties.exists():
                        msg = "You don't have any listings in your inventory yet. Send 'Create listing' to publish your first one!"
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
                        msg += "Type *reset* or *cancel* to return to the main menu."
                    send_and_log_message(session, msg)

                elif body_lower in ['available properties', 'available']:
                    session.state = 'QUERYING'
                    session.save()
                    
                    properties = Property.objects.filter(status='AVAILABLE')[:10]
                    if not properties.exists():
                        msg = "You do not have any properties currently marked as AVAILABLE."
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
                    send_and_log_message(session, msg)

                elif body_lower in ['sold this month', 'sold']:
                    session.state = 'QUERYING'
                    session.save()
                    
                    from django.utils import timezone
                    start_of_month = timezone.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
                    properties = Property.objects.filter(status='SOLD', updated_at__gte=start_of_month)
                    
                    if not properties.exists():
                        msg = "You haven't marked any properties as SOLD this month yet."
                    else:
                        msg = f"=== Properties Sold This Month ({timezone.now().strftime('%B')}) ===\n\n"
                        for idx, p in enumerate(properties, 1):
                            price_str = f"₹{p.price/10_000_000:.2f} Cr" if p.price >= 10_000_000 else f"₹{p.price/100_000:.2f} L"
                            msg += f"{idx}. {p.title}\n   Price: {price_str} | Closed: {p.updated_at.strftime('%d-%b')}\n\n"
                    send_and_log_message(session, msg)

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
                            
                            # Log audit log
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
                    
                    # Parse price string using RegexParserService
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

                elif body_lower in ['new leads today', 'leads today', 'new leads', 'leads']:
                    session.state = 'QUERYING'
                    session.save()
                    
                    from django.utils import timezone
                    from apps.leads.models import Lead
                    
                    # Since we are inside the tenant context block, Lead.objects automatically filters by tenant
                    today_start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
                    todays_leads = Lead.objects.filter(created_at__gte=today_start)
                    
                    if not todays_leads.exists():
                        msg = "You haven't received any new leads today."
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
                    send_and_log_message(session, msg)

                elif body_lower.startswith('leads for ') or body_lower.startswith('show leads for '):
                    session.state = 'QUERYING'
                    session.save()
                    
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
                    msg = "Welcome to PropertyOS. Send 'Create listing' to publish, or 'listings' to query inventory."
                    send_and_log_message(session, msg)

            # 9. COLLECTING State Machine (Wizard flow)
            elif session.state == 'COLLECTING':
                # A. Process Media Attachments
                media_received_count = 0
                if num_media > 0:
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
                                with urllib.request.urlopen(req_media, timeout=10) as res_media:
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
                                with urllib.request.urlopen(req, timeout=15) as res:
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

                # B. Process text details or done command
                if body_lower == 'done':
                    metadata = session.metadata
                    price = metadata.get('price')
                    
                    if not price:
                        msg = "We need at least a *price* to publish the listing. Please send the price (e.g. 'price 50L' or '5000000') then type DONE."
                        send_and_log_message(session, msg)
                        return Response({"detail": "Missing price."}, status=status.HTTP_200_OK)

                    try:
                        with transaction.atomic():
                            prop_type = metadata.get('property_type', 'APARTMENT')
                            title = metadata.get('title')
                            area = metadata.get('area', 'Local Area')
                            city = metadata.get('city', 'Mumbai')
                            bhk = metadata.get('bhk')
                            sqft = metadata.get('square_feet')
                            desc = metadata.get('description', f"Premium {prop_type} located in {area}, {city}.")

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
                                amenities=metadata.get('amenities', [])
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
                        public_url = f"http://localhost:3000/p/{share_link.slug}"
                        
                        msg = (
                            "Got it! Your property listing has been successfully published 🚀\n\n"
                            f"🏠 *{title}*\n"
                            f"💰 Price: {formatted_price}\n"
                            f"📍 Location: {area}, {city}\n\n"
                            f"👉 *View Public Listing:* {public_url}\n"
                            "👉 *Manage listings & leads:* http://localhost:3000/dashboard"
                        )
                        send_and_log_message(session, msg)

                    except Exception as e:
                        logger.error(f"Failed to save WhatsApp property listing: {str(e)}")
                        msg = f"An error occurred while publishing: {str(e)}. Please try again."
                        send_and_log_message(session, msg)
                else:
                    parsed_update = {}
                    if body_text and not body_lower.startswith('[unsupported'):
                        parsed_update = GeminiParserService.parse(body_text)
                        session.metadata.update(parsed_update)
                        session.save()

                    feedback_msg = []
                    if media_received_count > 0:
                        feedback_msg.append(f"Received {media_received_count} photo(s). Total photos: {len(session.temp_images)}.")
                    
                    if parsed_update:
                        extracted_info = []
                        if 'price' in parsed_update and parsed_update['price']:
                            p = parsed_update['price']
                            fp = f"₹{p/10_000_000:.2f} Cr" if p >= 10_000_000 else f"₹{p/100_000:.2f} L" if p >= 100_000 else f"₹{p:,}"
                            extracted_info.append(f"• Price: *{fp}*")
                        if 'bhk' in parsed_update and parsed_update['bhk']:
                            extracted_info.append(f"• Config: *{parsed_update['bhk']} BHK*")
                        if 'area' in parsed_update and parsed_update['area']:
                            extracted_info.append(f"• Locality: *{parsed_update['area']}*")
                        if 'property_type' in parsed_update:
                            extracted_info.append(f"• Type: *{parsed_update['property_type']}*")
                        
                        if extracted_info:
                            feedback_msg.append("Parsed details:\n" + "\n".join(extracted_info))

                    if not feedback_msg:
                        feedback_msg.append("Received details.")

                    feedback_msg.append("\nSend more photos, text details, or type *DONE* to publish.")
                    send_and_log_message(session, "\n\n".join(feedback_msg))

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
