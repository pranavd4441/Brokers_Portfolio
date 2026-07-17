import os
import urllib.parse

from rest_framework import serializers

from apps.accounts.utils import get_frontend_url
from .models import ShareLink


class ShareLinkSerializer(serializers.ModelSerializer):
    full_share_url = serializers.SerializerMethodField(read_only=True)
    whatsapp_share_text = serializers.SerializerMethodField(read_only=True)
    property_title = serializers.CharField(source="property.title", read_only=True)

    class Meta:
        model = ShareLink
        fields = [
            "id",
            "property",
            "property_title",
            "slug",
            "expiry",
            "full_share_url",
            "whatsapp_share_text",
            "created_at",
        ]
        read_only_fields = ["id", "slug", "created_at"]

    def _get_site_url(self):
        request = self.context.get("request")
        return get_frontend_url(request)

    def get_full_share_url(self, obj):
        site_url = self._get_site_url()
        return f"{site_url}/p/{obj.slug}"


    def get_whatsapp_share_text(self, obj):
        # Construct a beautiful pre-formatted marketing pitch for the broker
        prop = obj.property
        site_url = self._get_site_url()
        full_url = f"{site_url}/p/{obj.slug}"

        # Format the price nicely
        price_val = prop.price
        if price_val >= 10000000:  # 1 Crore+
            formatted_price = f"₹{price_val / 10000000:.2f} Cr"
        elif price_val >= 100000:  # 1 Lakh+
            formatted_price = f"₹{price_val / 100000:.2f} L"
        else:
            formatted_price = f"₹{price_val:,.2f}"

        bhk_str = f"{prop.bhk} BHK " if prop.bhk else ""
        prop_type_label = prop.get_property_type_display()

        message = (
            f"🏡 *Premium Property Alert!*\n\n"
            f"*Title:* {prop.title}\n"
            f"*Details:* {bhk_str}{prop_type_label} in {prop.area}, {prop.city}\n"
            f"*Price:* {formatted_price}\n\n"
            f"📸 View high-res photos, exact location, and direct contact details here:\n"
            f"{full_url}\n\n"
            f"Interested? Let's chat! 💬"
        )

        # Return URL-encoded string so it can be passed directly to WhatsApp's API on the client
        return urllib.parse.quote(message)
