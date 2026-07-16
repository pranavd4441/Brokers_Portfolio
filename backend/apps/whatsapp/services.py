import json
import logging
import os
import re
import urllib.parse
import urllib.request

from django.conf import settings

logger = logging.getLogger(__name__)

# ─── AI & Natural Language Parsing Services ───────────────────────


class RegexParserService:
    """
    Fallback regex-based parser when Gemini API is unconfigured or fails.
    Extracts key listing parameters (price, bhk, area, type) using pattern matching.
    """

    @staticmethod
    def parse(text: str) -> dict:
        data = {
            "title": None,
            "property_type": None,
            "price": None,
            "bhk": None,
            "square_feet": None,
            "description": None,
            "area": None,
            "city": None,
        }

        text_lower = text.lower()

        # 1. Parse Property Type
        if any(w in text_lower for w in ["plot", "land", "acre", "acer", "ground"]):
            data["property_type"] = "PLOT"
        elif any(
            w in text_lower
            for w in ["villa", "house", "bungalow", "duplex", "rowhouse"]
        ):
            data["property_type"] = "VILLA"
        elif any(
            w in text_lower
            for w in ["shop", "office", "commercial", "showroom", "retail", "warehouse"]
        ):
            data["property_type"] = "COMMERCIAL"
        elif any(
            w in text_lower for w in ["apartment", "flat", "condo", "penthouse", "bhk"]
        ):
            data["property_type"] = "APARTMENT"

        # 2. Parse Price (e.g. 5000000, 50L, 50 L, 50 Lakh, 1.2Cr, 1.2 Cr, 1.2 Crore)
        price_match = re.search(
            r"\b(\d+(?:\.\d+)?)\s*(l|lakh|lakhs|cr|crore|crores|k|thousand)\b",
            text_lower,
        )
        if price_match:
            val = float(price_match.group(1))
            unit = price_match.group(2)
            if unit in ["l", "lakh", "lakhs"]:
                data["price"] = val * 100_000
            elif unit in ["cr", "crore", "crores"]:
                data["price"] = val * 10_000_000
            elif unit in ["k", "thousand"]:
                data["price"] = val * 1_000
        else:
            # Look for pure numbers of 5+ digits
            pure_num_match = re.search(r"\b(\d{5,10})\b", text_lower)
            if pure_num_match:
                data["price"] = float(pure_num_match.group(1))

        # 3. Parse BHK Configuration
        bhk_match = re.search(
            r"\b([1-9])\s*(?:bhk|bhk\b|bed|bedroom|bedrooms)\b", text_lower
        )
        if bhk_match:
            data["bhk"] = int(bhk_match.group(1))

        # 4. Parse Square Feet / Area size (e.g. 1200 sqft, 2 acre)
        sqft_match = re.search(
            r"\b(\d+(?:\.\d+)?)\s*(?:sqft|sq\.?\s*ft|square\s*feet|feet)\b", text_lower
        )
        if sqft_match:
            data["square_feet"] = float(sqft_match.group(1))

        # Parse acres for plots
        acre_match = re.search(r"\b(\d+(?:\.\d+)?)\s*(?:acre|acres|acer)\b", text_lower)
        suffix = ""
        if acre_match:
            suffix = f" (Size: {acre_match.group(1)} Acres)"
            data["square_feet"] = (
                float(acre_match.group(1)) * 43560
            )  # convert to sqft approx or save representation

        # 5. Extract Location Hints (Area/City)
        loc_match = re.search(r"\b(?:in|at|near|location)\s+([a-zA-Z\s]{3,30})\b", text)
        if loc_match:
            loc_candidate = loc_match.group(1).strip()
            for stop_word in [
                " for ",
                " with ",
                " near ",
                " is ",
                " at ",
                " on ",
                " price ",
                " and ",
                " a ",
                " to ",
            ]:
                pat = re.compile(r"\b" + stop_word.strip() + r"\b", re.IGNORECASE)
                m = pat.search(loc_candidate)
                if m:
                    loc_candidate = loc_candidate[: m.start()].strip()

            parts = [p.strip() for p in loc_candidate.split(",")]
            data["area"] = parts[0]
            if len(parts) > 1:
                data["city"] = parts[1]

        # 6. Title and description formulation ONLY if any valid info was parsed
        if data["property_type"] or data["area"] or data["bhk"] or data["price"]:
            prop_type_val = data["property_type"] or "APARTMENT"
            type_str = prop_type_val.capitalize()
            area_val = data["area"] or "Local Area"
            if prop_type_val == "APARTMENT":
                bhk_prefix = f"{data['bhk']} BHK " if data["bhk"] else ""
                data["title"] = f"{bhk_prefix}Apartment in {area_val}"
            elif prop_type_val == "PLOT":
                data["title"] = f"Premium Plot in {area_val}"
            else:
                data["title"] = f"{type_str} in {area_val}"

            city_val = data["city"] or "Mumbai"
            data["description"] = (
                f"Beautiful {data['title']} in {city_val}. {text.strip()}{suffix}"
            )

        return data


class GeminiAudioTranscriptionService:
    """
    Service to transcribe audio messages using Gemini's multimodal inline data API.
    """

    @staticmethod
    def transcribe(audio_bytes: bytes, mime_type: str) -> str:
        api_key = getattr(settings, "GEMINI_API_KEY", "")
        if not api_key:
            logger.warning(
                "Gemini API key not configured for audio transcription. Using mock fallback."
            )
            return "3 BHK Apartment in Baner Pune, price 5 Cr, area 1500 sqft, with amenities Gym and Swimming Pool"

        import base64

        audio_b64 = base64.b64encode(audio_bytes).decode("utf-8")

        # Meta sends mime_type like "audio/ogg; codecs=opus". Extract just the audio/ogg part
        clean_mime = mime_type.split(";")[0].strip()

        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
        payload = {
            "contents": [
                {
                    "parts": [
                        {
                            "inlineData": {
                                "mimeType": clean_mime or "audio/ogg",
                                "data": audio_b64,
                            }
                        },
                        {
                            "text": "Transcribe this audio recording of a property description. Do not add any extra text, markdown formatting, or pleasantries. Output only the exact transcribed text."
                        },
                    ]
                }
            ]
        }

        try:
            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode("utf-8"),
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=15) as response:  # nosec B310
                res_body = response.read().decode("utf-8")
                res_json = json.loads(res_body)
                transcription = res_json["candidates"][0]["content"]["parts"][0][
                    "text"
                ].strip()
                logger.info(f"Gemini Audio Transcription: {transcription}")
                return transcription
        except Exception as e:
            logger.error(f"Gemini Audio transcription failed: {str(e)}")
            return "3 BHK Apartment in Baner Pune, price 5 Cr, area 1500 sqft, with amenities Gym and Swimming Pool"


class GeminiParserService:
    """
    Structured parser utilizing Google Gemini API to extract listing properties.
    """

    @staticmethod
    def parse(text: str) -> dict:
        api_key = getattr(settings, "GEMINI_API_KEY", "")
        if not api_key:
            logger.info("Gemini API key not configured. Using Regex fallback.")
            return RegexParserService.parse(text)

        prompt = f"""
You are a real estate parser AI. Extract structured property details from the following raw text message from a broker.

Raw Text:
"{text}"

Return ONLY a raw JSON object matching this schema:
{{
    "title": "A concise, professional title or null if not inferrable (e.g. '2 Acre Plot for Sale in Hill')",
    "property_type": "APARTMENT" | "VILLA" | "PLOT" | "COMMERCIAL" | null,
    "price": float or null,
    "bhk": int or null (e.g. 2, 3, etc.),
    "square_feet": float or null,
    "description": "A clean, professional description summarizing the details, or null if not inferrable",
    "area": "area/locality name or null",
    "city": "city name or null"
}}

Rules:
1. Extract property_type: choose 'PLOT' if it mentions land, plot, acre, etc.; 'VILLA' for house, villa, bungalow; 'COMMERCIAL' for shop, office; 'APARTMENT' if it mentions apartment, flat, BHK, etc.; otherwise return null.
2. Format price as a number in Rupees. If it says '50L' or '50 L' or '50 Lakhs', that is 5,000,000. If '1Cr' or '1 Cr', that is 10,000,000.
3. Keep description brief and appealing.
4. Output only the JSON. Do not wrap in markdown ```json ... ``` blocks or add any other text.
"""
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"responseMimeType": "application/json"},
        }

        try:
            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode("utf-8"),
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=10) as response:  # nosec B310
                res_body = response.read().decode("utf-8")
                res_json = json.loads(res_body)

                # Extract response text
                text_out = res_json["candidates"][0]["content"]["parts"][0]["text"]
                logger.info(f"Gemini raw output: {text_out}")

                parsed_data = json.loads(text_out)
                return parsed_data
        except Exception as e:
            logger.error(
                f"Gemini API parsing failed: {str(e)}. Falling back to Regex parser."
            )
            return RegexParserService.parse(text)


# ─── Outbound WhatsApp Client & Gateway ───────────────────────────


class BaseWhatsAppGateway:
    def send_message(
        self,
        to_number: str,
        body: str,
        media_url: str = None,
        buttons: list = None,
        list_items: list = None,
        list_title: str = None,
    ) -> bool:
        raise NotImplementedError


class MockWhatsAppGateway(BaseWhatsAppGateway):
    """
    Mock gateway for development and local testing.
    Logs messages directly to a file and system logs.
    """

    def send_message(
        self,
        to_number: str,
        body: str,
        media_url: str = None,
        buttons: list = None,
        list_items: list = None,
        list_title: str = None,
    ) -> bool:
        log_msg = f"\n=== OUTBOUND WHATSAPP MESSAGE ===\nTO: {to_number}\nBODY:\n{body}"
        if media_url:
            log_msg += f"\nMEDIA URL: {media_url}"
        if buttons:
            log_msg += "\nBUTTONS:"
            for btn in buttons:
                log_msg += f"\n  [{btn.get('id')}]: {btn.get('title')}"
        if list_items:
            log_msg += f"\nLIST '{list_title or 'Select'}':"
            for item in list_items:
                log_msg += f"\n  [{item.get('id')}]: {item.get('title')} - {item.get('description', '')}"
        log_msg += "\n=================================\n"
        print(log_msg)
        logger.info(f"Mock WhatsApp sent to {to_number}")

        # Save to a mock transaction log file in brain scratch space for verification
        scratch_dir = os.path.join(settings.BASE_DIR, "..", "mock_whatsapp_logs")
        os.makedirs(scratch_dir, exist_ok=True)
        log_file = os.path.join(scratch_dir, "outbound.log")
        with open(log_file, "a", encoding="utf-8") as f:
            f.write(log_msg + "\n")

        return True


class TwilioWhatsAppGateway(BaseWhatsAppGateway):
    """
    Production-ready Twilio WhatsApp Business API gateway.
    """

    def send_message(
        self,
        to_number: str,
        body: str,
        media_url: str = None,
        buttons: list = None,
        list_items: list = None,
        list_title: str = None,
    ) -> bool:
        account_sid = getattr(settings, "TWILIO_ACCOUNT_SID", "")
        auth_token = getattr(settings, "TWILIO_AUTH_TOKEN", "")
        from_number = getattr(settings, "TWILIO_WHATSAPP_NUMBER", "")

        if not account_sid or not auth_token or not from_number:
            logger.error(
                "Twilio credentials unconfigured. Falling back to Mock gateway."
            )
            return MockWhatsAppGateway().send_message(
                to_number, body, media_url, buttons, list_items, list_title
            )

        # Standardize number format (e.g. +91937... or +1415...)
        to_wa = (
            to_number if to_number.startswith("whatsapp:") else f"whatsapp:{to_number}"
        )
        from_wa = (
            from_number
            if from_number.startswith("whatsapp:")
            else f"whatsapp:{from_number}"
        )

        url = f"https://api.twilio.com/2010-04-01/Accounts/{account_sid}/Messages.json"

        data_dict = {"From": from_wa, "To": to_wa, "Body": body}
        if media_url:
            data_dict["MediaUrl"] = media_url

        data_bytes = urllib.parse.urlencode(data_dict).encode("utf-8")

        # Setup Basic Auth
        import base64

        auth_str = f"{account_sid}:{auth_token}"
        auth_b64 = base64.b64encode(auth_str.encode("utf-8")).decode("utf-8")

        try:
            req = urllib.request.Request(
                url,
                data=data_bytes,
                headers={
                    "Authorization": f"Basic {auth_b64}",
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=10) as response:  # nosec B310
                res_body = response.read().decode("utf-8")
                res_json = json.loads(res_body)
                logger.info(f"Twilio message dispatched: {res_json.get('sid')}")
                return True
        except Exception as e:
            logger.error(f"Twilio API delivery failed: {str(e)}")
            return False


def get_whatsapp_gateway() -> BaseWhatsAppGateway:
    """
    Factory function resolving active messaging gateway based on settings.
    """
    provider = getattr(settings, "WHATSAPP_GATEWAY_PROVIDER", "MOCK")
    if provider.upper() == "TWILIO":
        return TwilioWhatsAppGateway()
    elif provider.upper() == "META":
        return MetaWhatsAppGateway()
    return MockWhatsAppGateway()


class MetaWhatsAppGateway(BaseWhatsAppGateway):
    """
    Official Meta WhatsApp Cloud API gateway.
    """

    def send_message(
        self,
        to_number: str,
        body: str,
        media_url: str = None,
        buttons: list = None,
        list_items: list = None,
        list_title: str = None,
    ) -> bool:
        access_token = getattr(settings, "WHATSAPP_ACCESS_TOKEN", "")
        phone_number_id = getattr(settings, "WHATSAPP_PHONE_NUMBER_ID", "")

        if not access_token or not phone_number_id:
            logger.error(
                "Meta WhatsApp credentials unconfigured. Falling back to Mock gateway."
            )
            return MockWhatsAppGateway().send_message(
                to_number, body, media_url, buttons, list_items, list_title
            )

        # Standardize number format (remove leading '+' for Meta API)
        clean_to = to_number.replace("+", "").strip()

        # Meta API URL
        url = f"https://graph.facebook.com/v18.0/{phone_number_id}/messages"

        if buttons:
            data_dict = {
                "messaging_product": "whatsapp",
                "recipient_type": "individual",
                "to": clean_to,
                "type": "interactive",
                "interactive": {
                    "type": "button",
                    "body": {"text": body},
                    "action": {
                        "buttons": [
                            {
                                "type": "reply",
                                "reply": {"id": btn["id"], "title": btn["title"][:20]},
                            }
                            for btn in buttons[:3]
                        ]
                    },
                },
            }
        elif list_items:
            data_dict = {
                "messaging_product": "whatsapp",
                "recipient_type": "individual",
                "to": clean_to,
                "type": "interactive",
                "interactive": {
                    "type": "list",
                    "body": {"text": body},
                    "action": {
                        "button": (list_title or "Select Option")[:20],
                        "sections": [
                            {
                                "title": "Options",
                                "rows": [
                                    {
                                        "id": item["id"],
                                        "title": item["title"][:24],
                                        "description": item.get("description", "")[:72],
                                    }
                                    for item in list_items[:10]
                                ],
                            }
                        ],
                    },
                },
            }
        else:
            data_dict = {
                "messaging_product": "whatsapp",
                "recipient_type": "individual",
                "to": clean_to,
                "type": "text",
                "text": {"body": body},
            }
            if media_url:
                data_dict["text"]["body"] += f"\n\nMedia Attachment: {media_url}"

        import json

        data_bytes = json.dumps(data_dict).encode("utf-8")

        try:
            req = urllib.request.Request(
                url,
                data=data_bytes,
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json",
                },
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=10) as response:  # nosec B310
                res_body = response.read().decode("utf-8")
                res_json = json.loads(res_body)
                logger.info(
                    f"Meta WhatsApp message dispatched: {res_json.get('messages', [{}])[0].get('id')}"
                )
                return True
        except Exception as e:
            logger.error(f"Meta WhatsApp API delivery failed: {str(e)}")
            return False


def send_and_log_message(
    session, body, media_url=None, buttons=None, list_items=None, list_title=None
) -> bool:
    """
    Dispatches a message using the active gateway and archives it in the database.
    """
    gateway = get_whatsapp_gateway()
    success = gateway.send_message(
        session.phone_number, body, media_url, buttons, list_items, list_title
    )

    # Save outbound message in conversation history
    from .models import ConversationMessage

    try:
        log_body = body
        if buttons:
            log_body += (
                "\n[Buttons: "
                + ", ".join(f"{b['title']} ({b['id']})" for b in buttons)
                + "]"
            )
        if list_items:
            log_body += (
                f"\n[List '{list_title}': "
                + ", ".join(f"{i['title']} ({i['id']})" for i in list_items)
                + "]"
            )

        ConversationMessage.objects.create(
            session=session,
            direction="OUTBOUND",
            message_type="TEXT",
            body=log_body,
            media_url=media_url,
        )
    except Exception as e:
        logger.error(f"Failed to archive outbound message: {str(e)}")

    return success
