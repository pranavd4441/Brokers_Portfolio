import json
import logging
import urllib.parse
import urllib.request

from django.conf import settings

logger = logging.getLogger(__name__)


class PropertyAIService:
    """
    Service layer utilizing Google Gemini API to write high-converting listing headlines,
    compelling marketing descriptions, and audience-tailored WhatsApp pitches.
    """

    @staticmethod
    def generate(
        raw_notes: str,
        property_type: str = "APARTMENT",
        price: str = None,
        bhk: str = None,
        area: str = None,
        city: str = None,
    ) -> dict:
        api_key = getattr(settings, "GEMINI_API_KEY", "")
        if not api_key:
            logger.info("Gemini API key not configured. Using local template fallback.")
            return PropertyAIService._get_fallback_data(
                raw_notes, property_type, price, bhk, area, city
            )

        # 1. Formulate the prompt
        prompt = f"""
You are a real estate copywriter. Based on the following raw notes and details, generate:
1. A concise, professional title.
2. A compelling, beautifully formatted marketing description.
3. 5 variation headlines for listing platforms.
4. 3 personalized WhatsApp pitch templates:
   - "Warm / Friendly" (emojis, welcoming, great for general leads)
   - "Professional / Formal" (structured, polite, great for high-end corporate clients)
   - "Investor / Fact-focused" (focus on ROI, price, size, specifications, no fluff)
5. 3 short follow-up messages for leads who viewed but did not reply.
6. 4 buyer qualification questions a broker should ask.
7. 3 objection handlers for common real estate objections.
8. 1 recommended next action for the broker.

Raw notes:
"{raw_notes}"

Metadata hints:
- Property Type: {property_type}
- Price: {price}
- BHK: {bhk}
- Area: {area}
- City: {city}

Return ONLY a raw JSON object matching this schema:
{{
    "title": "string",
    "description": "string",
    "headlines": ["string", "string", "string", "string", "string"],
    "whatsapp_pitches": [
        {{
            "type": "Warm / Friendly",
            "text": "string"
        }},
        {{
            "type": "Professional / Formal",
            "text": "string"
        }},
        {{
            "type": "Investor / Fact-focused",
            "text": "string"
        }}
    ],
    "follow_up_messages": ["string", "string", "string"],
    "qualification_questions": ["string", "string", "string", "string"],
    "objection_handlers": [
        {{
            "objection": "string",
            "reply": "string"
        }},
        {{
            "objection": "string",
            "reply": "string"
        }},
        {{
            "objection": "string",
            "reply": "string"
        }}
    ],
    "recommended_next_action": "string"
}}

Ensure all fields are fully populated and text is copywriter-grade, practical for Indian real estate brokers, and ready to paste into WhatsApp. Return only valid JSON. Do not wrap in markdown ```json ... ``` blocks or add any other text.
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
            with urllib.request.urlopen(req, timeout=12) as response:  # nosec B310
                res_body = response.read().decode("utf-8")
                res_json = json.loads(res_body)

                # Extract response text
                text_out = res_json["candidates"][0]["content"]["parts"][0]["text"]
                logger.info(f"Gemini raw output: {text_out}")

                parsed_data = json.loads(text_out)

                # Validate the schema structure
                required_fields = [
                    "title",
                    "description",
                    "headlines",
                    "whatsapp_pitches",
                ]
                if (
                    all(field in parsed_data for field in required_fields)
                    and len(parsed_data.get("whatsapp_pitches", [])) >= 3
                ):
                    fallback = PropertyAIService._get_fallback_data(
                        raw_notes, property_type, price, bhk, area, city
                    )
                    for key, value in fallback.items():
                        parsed_data.setdefault(key, value)
                    return parsed_data
                else:
                    logger.warning("Gemini output missing fields. Falling back.")
                    return PropertyAIService._get_fallback_data(
                        raw_notes, property_type, price, bhk, area, city
                    )

        except Exception as e:
            logger.error(
                f"Gemini API generation failed: {str(e)}. Using fallback system."
            )
            return PropertyAIService._get_fallback_data(
                raw_notes, property_type, price, bhk, area, city
            )

    @staticmethod
    def _get_fallback_data(
        raw_notes: str, property_type: str, price: str, bhk: str, area: str, city: str
    ) -> dict:
        """
        Generates structured response fallback using localized template substitution.
        """
        # Format displays
        bhk_prefix = f"{bhk} BHK " if bhk else ""
        area_str = area or "Prime Area"
        city_str = city or "Mumbai"
        type_str = property_type.replace("_", " ").capitalize()
        price_str = f" @ ₹{price}" if price else ""

        title = f"{bhk_prefix}{type_str} in {area_str}"
        description = (
            f"Beautifully designed {title}, located in the heart of {city_str}. "
            f"This premium property offers excellent value{price_str} and is ideal for families and professionals looking "
            f"for accessibility and premium lifestyle. Key Highlights: {raw_notes}."
        )

        headlines = [
            f"Stunning {bhk_prefix}{type_str} For Sale in {area_str}",
            f"Premium {bhk_prefix}Home in {area_str} - Excellent Deal!",
            f"Spacious {type_str} in {area_str}, {city_str} - Pocket Friendly Price",
            f"Modern Living: {bhk_prefix}{type_str} at {area_str}",
            f"Must-See Investment: {type_str} in Prime {area_str} Location",
        ]

        whatsapp_pitches = [
            {
                "type": "Warm / Friendly",
                "text": (
                    f"🏡 *Premium Listing Alert!* 🏡\n\n"
                    f"Hey! Just listed this stunning *{title}* in *{city_str}*.\n"
                    f"It has spacious rooms, is located near key utilities, and is priced to sell!\n\n"
                    f"📝 *Details:* {raw_notes}\n\n"
                    f"Let me know if you'd like photos or want to schedule a walk-through! 💬"
                ),
            },
            {
                "type": "Professional / Formal",
                "text": (
                    f"Dear Client,\n\n"
                    f"I would like to present a new real estate opportunity: *{title}*.\n"
                    f"This {property_type.lower()} features high-quality finishes, a strategic layout, and is situated in a premium pocket of {area_str}, {city_str}.\n\n"
                    f"Summary: {raw_notes}\n\n"
                    f"Please contact me to receive the official brochure and layout plans.\n"
                    f"Best regards."
                ),
            },
            {
                "type": "Investor / Fact-focused",
                "text": (
                    f"🔥 *Hot Investment Deal: {area_str}* 🔥\n\n"
                    f"- *Property:* {title}\n"
                    f"- *Type:* {type_str}\n"
                    f"- *Price/Value:* {price or 'Ask'}\n"
                    f"- *Highlights:* {raw_notes}\n\n"
                    f"High rental demand / capital appreciation zone. Serious inquiries only. DM for details."
                ),
            },
        ]

        follow_up_messages = [
            (
                f"Hi, just checking if the {title} matched what you are looking for. "
                "Would you like me to share a video walkthrough?"
            ),
            (
                f"This {type_str.lower()} in {area_str} is getting active enquiries. "
                "Would you prefer a weekday or weekend site visit?"
            ),
            (
                "Quick question: are you looking for self-use, rental income, or investment appreciation? "
                "I can suggest the best-fit options accordingly."
            ),
        ]

        qualification_questions = [
            "What is your preferred possession timeline?",
            "Is this for self-use, rental income, or investment?",
            "What budget range should I stay within?",
            "Would you like a video tour before scheduling a site visit?",
        ]

        objection_handlers = [
            {
                "objection": "Price feels high",
                "reply": (
                    "I understand. The value here is mainly the location, layout, and inventory scarcity. "
                    "If you like the property, I can check the best negotiable number before a visit."
                ),
            },
            {
                "objection": "Need time to think",
                "reply": (
                    "Of course. To make comparison easier, I can send 2 similar options with price and area side by side."
                ),
            },
            {
                "objection": "Location is not perfect",
                "reply": (
                    "That makes sense. Tell me your preferred micro-location and commute priority, and I will shortlist closer options."
                ),
            },
        ]

        return {
            "title": title,
            "description": description,
            "headlines": headlines,
            "whatsapp_pitches": whatsapp_pitches,
            "follow_up_messages": follow_up_messages,
            "qualification_questions": qualification_questions,
            "objection_handlers": objection_handlers,
            "recommended_next_action": "Share the warm WhatsApp pitch first, then offer a video tour or two site visit slots.",
        }
