"""
seed_dev.py — Development database seeder for PropertyOS.

Populates a fresh development database with realistic sample data covering
all models: Tenant, User, Property, Lead, WhatsApp, Analytics, and Audit.

This command is:
  • Idempotent  — safe to run multiple times without creating duplicates
  • Dev-only    — aborts immediately if DJANGO_ENVIRONMENT is production/staging
  • Explicit    — never called automatically by migrate, startup, or Docker

Usage:
    python manage.py seed_dev

WARNING: Never configure this to run automatically. It must only execute
when explicitly invoked by a developer on a local or CI database.
"""

import hashlib
import os
import random

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.accounts.models import Tenant
from apps.accounts.tenant_context import clear_current_tenant_id, set_current_tenant_id
from apps.analytics.models import AnalyticsEvent
from apps.audit.models import AuditLog
from apps.leads.models import Lead
from apps.properties.models import Property
from apps.whatsapp.models import ConversationMessage, WhatsAppSession

User = get_user_model()

# ---------------------------------------------------------------------------
# Global seed constant — development-only, never used in production paths
# ---------------------------------------------------------------------------
_DEV_PASSWORD = "DevTest@123!"  # nosec B105 — explicit dev credential, not a hardcoded secret

# ---------------------------------------------------------------------------
# Tenant blueprints
# ---------------------------------------------------------------------------
_TENANT_BLUEPRINTS = [
    {
        "name": "Royal Realty",
        "brand_color": "#1a56db",
        "whatsapp_default_number": "+919876543210",
        "subscription_plan": "PROFESSIONAL",
        "listing_expiry_days": 60,
        "logo_url": "/static/demo/royal_realty_logo.png",
    },
    {
        "name": "Nirman Studios",
        "brand_color": "#16c784",
        "whatsapp_default_number": "+918855023247",
        "subscription_plan": "FREE",
        "listing_expiry_days": 30,
        "logo_url": "/static/demo/nirman_studios_logo.png",
    },
    {
        "name": "Horizon Properties",
        "brand_color": "#f59e0b",
        "whatsapp_default_number": "+917700900100",
        "subscription_plan": "ENTERPRISE",
        "listing_expiry_days": 90,
        "logo_url": "/static/demo/horizon_logo.png",
    },
]

# ---------------------------------------------------------------------------
# User blueprints — one per supported RBAC role
# ---------------------------------------------------------------------------
_USER_BLUEPRINTS = [
    {
        "email": "admin@propertyos.dev",
        "name": "Dev Superuser",
        "phone": "+919000000001",
        "role": "OWNER",
        "is_staff": True,
        "is_superuser": True,
        "tenant_name": "Royal Realty",
    },
    {
        "email": "owner@propertyos.dev",
        "name": "Rajesh Mehta",
        "phone": "+919000000002",
        "role": "OWNER",
        "is_staff": False,
        "is_superuser": False,
        "tenant_name": "Royal Realty",
    },
    {
        "email": "agencyadmin@propertyos.dev",
        "name": "Priya Sharma",
        "phone": "+919000000003",
        "role": "ADMIN",
        "is_staff": False,
        "is_superuser": False,
        "tenant_name": "Royal Realty",
    },
    {
        "email": "broker1@propertyos.dev",
        "name": "Arjun Singh",
        "phone": "+919000000004",
        "role": "BROKER",
        "is_staff": False,
        "is_superuser": False,
        "tenant_name": "Royal Realty",
    },
    {
        "email": "broker2@propertyos.dev",
        "name": "Kavita Nair",
        "phone": "+919000000005",
        "role": "BROKER",
        "is_staff": False,
        "is_superuser": False,
        "tenant_name": "Nirman Studios",
    },
    {
        "email": "assistant1@propertyos.dev",
        "name": "Suresh Patil",
        "phone": "+919000000006",
        "role": "ASSISTANT",
        "is_staff": False,
        "is_superuser": False,
        "tenant_name": "Royal Realty",
    },
    {
        "email": "assistant2@propertyos.dev",
        "name": "Meena Desai",
        "phone": "+919000000007",
        "role": "ASSISTANT",
        "is_staff": False,
        "is_superuser": False,
        "tenant_name": "Nirman Studios",
    },
]

# ---------------------------------------------------------------------------
# Property blueprints — realistic Indian real-estate listings
# ---------------------------------------------------------------------------
_PROPERTY_BLUEPRINTS = [
    # ── Royal Realty (Premium Pune) ─────────────────────────────────────────
    {
        "title": "[SEED] Luxurious 3 BHK in Baner",
        "description": (
            "Spacious sun-facing apartment with modular kitchen, Italian marble flooring, "
            "and stunning hill views. Close to Baner-Pashan Link Road. "
            "Society has premium amenities including an Olympic-size swimming pool."
        ),
        "price": 9500000,
        "property_type": "APARTMENT",
        "status": "AVAILABLE",
        "city": "Pune",
        "area": "Baner",
        "bhk": 3,
        "square_feet": 1450,
        "amenities": ["Swimming Pool", "Gym", "24/7 Security", "Parking", "Club House"],
        "tenant_name": "Royal Realty",
    },
    {
        "title": "[SEED] Premium 2 BHK Flat in Wakad",
        "description": (
            "Modern apartment with open kitchen concept and large balcony. "
            "Walking distance to Wakad Phata and Hinjewadi IT hubs. "
            "Ready possession with all paperwork clear."
        ),
        "price": 6800000,
        "property_type": "APARTMENT",
        "status": "AVAILABLE",
        "city": "Pune",
        "area": "Wakad",
        "bhk": 2,
        "square_feet": 1050,
        "amenities": ["Gym", "Parking", "CCTV", "Power Backup"],
        "tenant_name": "Royal Realty",
    },
    {
        "title": "[SEED] Independent Villa in Kothrud",
        "description": (
            "Elegant 4 BHK villa with private garden, terrace, and premium fittings. "
            "Peaceful locality with all amenities nearby. Perfect for families seeking "
            "a premium lifestyle in Pune's most coveted neighborhood."
        ),
        "price": 18500000,
        "property_type": "VILLA",
        "status": "NEGOTIATION",
        "city": "Pune",
        "area": "Kothrud",
        "bhk": 4,
        "square_feet": 2800,
        "amenities": [
            "Private Garden",
            "Terrace",
            "Modular Kitchen",
            "Parking",
            "Solar Panels",
        ],
        "tenant_name": "Royal Realty",
    },
    {
        "title": "[SEED] Corner Plot in Undri",
        "description": (
            "Prime corner plot suitable for villa or apartment construction. "
            "RERA approved. North-East facing. Surrounded by established residential societies. "
            "Clear title with all approvals in place."
        ),
        "price": 4200000,
        "property_type": "PLOT",
        "status": "AVAILABLE",
        "city": "Pune",
        "area": "Undri",
        "bhk": None,
        "square_feet": 2400,
        "amenities": ["Corner Plot", "RERA Approved", "Road Facing", "Clear Title"],
        "tenant_name": "Royal Realty",
    },
    {
        "title": "[SEED] Commercial Office Space in Hinjewadi",
        "description": (
            "Ready-to-move-in Grade-A office space in Rajiv Gandhi Infotech Park Phase 1. "
            "Ideal for IT/ITES companies. High-speed fiber connectivity and dedicated "
            "server room with UPS backup available."
        ),
        "price": 12000000,
        "property_type": "COMMERCIAL",
        "status": "AVAILABLE",
        "city": "Pune",
        "area": "Hinjewadi",
        "bhk": None,
        "square_feet": 1800,
        "amenities": [
            "24/7 Access",
            "Power Backup",
            "Fiber Internet",
            "Conference Room",
            "Cafeteria",
        ],
        "tenant_name": "Royal Realty",
    },
    {
        "title": "[SEED] Penthouse in Kalyani Nagar",
        "description": (
            "Stunning 4 BHK penthouse with 360-degree city views, private splash pool, "
            "and premium imported finishes. This once-in-a-lifetime address is the pinnacle "
            "of luxury living in Pune."
        ),
        "price": 32000000,
        "property_type": "APARTMENT",
        "status": "BOOKED",
        "city": "Pune",
        "area": "Kalyani Nagar",
        "bhk": 4,
        "square_feet": 4200,
        "amenities": [
            "Private Pool",
            "Rooftop Garden",
            "Home Automation",
            "VIP Parking",
            "Concierge",
        ],
        "tenant_name": "Royal Realty",
    },
    {
        "title": "[SEED] Cozy Studio in Shivajinagar",
        "description": (
            "Well-designed studio apartment perfect for working professionals. "
            "Walking distance to Shivajinagar Metro station. Fully furnished option available."
        ),
        "price": 3200000,
        "property_type": "APARTMENT",
        "status": "SOLD",
        "city": "Pune",
        "area": "Shivajinagar",
        "bhk": 1,
        "square_feet": 480,
        "amenities": ["Metro Connectivity", "Security", "Wi-Fi"],
        "tenant_name": "Royal Realty",
    },
    {
        "title": "[SEED] Farm Land in Mulshi",
        "description": (
            "Scenic agricultural land with natural stream, mango orchard, and mountain backdrop. "
            "90 minutes from Pune City. Ideal for a weekend farm stay or eco-resort project."
        ),
        "price": 7500000,
        "property_type": "PLOT",
        "status": "EXPIRED",
        "city": "Pune",
        "area": "Mulshi",
        "bhk": None,
        "square_feet": 43560,
        "amenities": ["Natural Water Source", "Mango Orchard", "Mountain View"],
        "tenant_name": "Royal Realty",
    },
    # ── Nirman Studios (Affordable to Mid-Range) ────────────────────────────
    {
        "title": "[SEED] Spacious 2 BHK in Hadapsar",
        "description": (
            "Freshly constructed 2 BHK with Vastu-compliant layout, semi-furnished kitchen, "
            "and reserved parking. Located in a serene society with 24/7 security."
        ),
        "price": 5200000,
        "property_type": "APARTMENT",
        "status": "AVAILABLE",
        "city": "Pune",
        "area": "Hadapsar",
        "bhk": 2,
        "square_feet": 980,
        "amenities": [
            "Security",
            "Parking",
            "Society Maintenance",
            "Children's Play Area",
        ],
        "tenant_name": "Nirman Studios",
    },
    {
        "title": "[SEED] Budget 1 BHK in Yerawada",
        "description": (
            "Affordable 1 BHK near Sassoon Hospital, ideal for hospital staff or students. "
            "Ready possession with OC received. Society maintenance is only ₹1500/month."
        ),
        "price": 2400000,
        "property_type": "APARTMENT",
        "status": "AVAILABLE",
        "city": "Pune",
        "area": "Yerawada",
        "bhk": 1,
        "square_feet": 540,
        "amenities": ["Security", "Lift", "Power Backup", "OC Received"],
        "tenant_name": "Nirman Studios",
    },
    {
        "title": "[SEED] Residential Plot in Kondhwa",
        "description": (
            "Ready-to-build residential plot in a gated layout with clear title. "
            "Near Kondhwa Main Road with easy access to NIBM and NIBM Annexe."
        ),
        "price": 3100000,
        "property_type": "PLOT",
        "status": "NEGOTIATION",
        "city": "Pune",
        "area": "Kondhwa",
        "bhk": None,
        "square_feet": 1800,
        "amenities": ["Gated Layout", "Clear Title", "Road Access", "NA Plot"],
        "tenant_name": "Nirman Studios",
    },
    {
        "title": "[SEED] Prime Shop in Camp MG Road",
        "description": (
            "Prime commercial shop on MG Road, Camp. High footfall area, ideal for retail "
            "or showroom. Ground floor with excellent road frontage and parking."
        ),
        "price": 8500000,
        "property_type": "COMMERCIAL",
        "status": "AVAILABLE",
        "city": "Pune",
        "area": "Camp",
        "bhk": None,
        "square_feet": 650,
        "amenities": [
            "MG Road Frontage",
            "High Footfall",
            "Storage Room",
            "Air Conditioning",
        ],
        "tenant_name": "Nirman Studios",
    },
    {
        "title": "[SEED] 3 BHK Semi-Furnished in Bhosari",
        "description": (
            "Ready flat near Bhosari MIDC, suited for industrial professionals. "
            "Modular kitchen and wardrobes included. Excellent connectivity to Pimpri-Chinchwad."
        ),
        "price": 5800000,
        "property_type": "APARTMENT",
        "status": "SITE_VISIT",
        "city": "Pune",
        "area": "Bhosari",
        "bhk": 3,
        "square_feet": 1250,
        "amenities": [
            "Modular Kitchen",
            "Wardrobes",
            "Parking",
            "CCTV",
            "Society Hall",
        ],
        "tenant_name": "Nirman Studios",
    },
    {
        "title": "[SEED] Duplex Villa in Wanowrie",
        "description": (
            "Elegant G+1 duplex villa with 3.5 BHK, private terrace, and designer interiors "
            "in a quiet residential lane. Pooja room, servant quarter, and double garage included."
        ),
        "price": 14500000,
        "property_type": "VILLA",
        "status": "SOLD",
        "city": "Pune",
        "area": "Wanowrie",
        "bhk": 4,
        "square_feet": 2200,
        "amenities": [
            "Private Terrace",
            "Designer Interiors",
            "Pooja Room",
            "Servant Quarter",
        ],
        "tenant_name": "Nirman Studios",
    },
    # ── Horizon Properties (Luxury / Enterprise) ────────────────────────────
    {
        "title": "[SEED] Sky Villa in Viman Nagar",
        "description": (
            "Signature sky villa project with world-class finishes, infinity pool, and private lift lobby. "
            "This address redefines luxury living. Delivery Q4 2026."
        ),
        "price": 45000000,
        "property_type": "APARTMENT",
        "status": "AVAILABLE",
        "city": "Pune",
        "area": "Viman Nagar",
        "bhk": 5,
        "square_feet": 6000,
        "amenities": [
            "Infinity Pool",
            "Private Lift",
            "Smart Home",
            "Concierge",
            "Valet Parking",
        ],
        "tenant_name": "Horizon Properties",
    },
    {
        "title": "[SEED] Grade-A IT Office in Magarpatta",
        "description": (
            "LEED Platinum certified Grade-A office in Cybercity Magarpatta. "
            "Ideal for tech companies with 500+ headcount. DG backup, flood lighting, EV charging."
        ),
        "price": 22000000,
        "property_type": "COMMERCIAL",
        "status": "AVAILABLE",
        "city": "Pune",
        "area": "Magarpatta",
        "bhk": None,
        "square_feet": 3500,
        "amenities": [
            "LEED Certified",
            "24x7 Security",
            "Food Court",
            "Helipad",
            "EV Charging",
        ],
        "tenant_name": "Horizon Properties",
    },
    {
        "title": "[SEED] 3 BHK High Rise in Koregaon Park",
        "description": (
            "Prestigious high-rise apartment in the heart of Koregaon Park. "
            "Walking distance to restaurants, cafes, and the iconic Osho Ashram. "
            "Fully furnished option available."
        ),
        "price": 16000000,
        "property_type": "APARTMENT",
        "status": "NEGOTIATION",
        "city": "Pune",
        "area": "Koregaon Park",
        "bhk": 3,
        "square_feet": 1900,
        "amenities": [
            "Swimming Pool",
            "Gym",
            "Club House",
            "24x7 Security",
            "Jogging Track",
        ],
        "tenant_name": "Horizon Properties",
    },
    {
        "title": "[SEED] Lakefront Farmhouse in Lavasa",
        "description": (
            "Sprawling 12,000 sqft farmhouse with private lake frontage, infinity pool, "
            "and mountain views. This ultimate luxury retreat includes a helipad, "
            "tennis court, and private jetty."
        ),
        "price": 85000000,
        "property_type": "VILLA",
        "status": "AVAILABLE",
        "city": "Pune",
        "area": "Lavasa",
        "bhk": 6,
        "square_feet": 12000,
        "amenities": [
            "Lake Frontage",
            "Infinity Pool",
            "Helipad",
            "Tennis Court",
            "Private Jetty",
        ],
        "tenant_name": "Horizon Properties",
    },
    {
        "title": "[SEED] Investment Flat in Balewadi",
        "description": (
            "High-ROI investment flat near Balewadi High Street. Excellent rental potential "
            "with current rental yield of 4.2% PA. Ready possession, OC received."
        ),
        "price": 7200000,
        "property_type": "APARTMENT",
        "status": "BOOKED",
        "city": "Pune",
        "area": "Balewadi",
        "bhk": 2,
        "square_feet": 1100,
        "amenities": ["Gym", "Clubhouse", "Security", "Parking", "OC Received"],
        "tenant_name": "Horizon Properties",
    },
    {
        "title": "[SEED] 1 BHK Rental in Aundh",
        "description": (
            "Fully furnished 1 BHK available for rent near Aundh Depot. "
            "Ideal for IT professionals working at Hinjewadi. "
            "Rent includes maintenance. Available immediately."
        ),
        "price": 18000,
        "property_type": "APARTMENT",
        "status": "AVAILABLE",
        "city": "Pune",
        "area": "Aundh",
        "bhk": 1,
        "square_feet": 520,
        "amenities": ["Furnished", "Wi-Fi", "Security", "Power Backup"],
        "tenant_name": "Horizon Properties",
    },
]

# ---------------------------------------------------------------------------
# Lead blueprints — realistic buyer enquiries
# ---------------------------------------------------------------------------
_LEAD_BLUEPRINTS = [
    {
        "buyer_name": "Aditya Kumar",
        "phone": "+919811001001",
        "email": "aditya.k@gmail.com",
        "status": "NEW",
        "source": "WHATSAPP_CLICK",
        "notes": "Interested in 3 BHK, budget is flexible up to 1 Cr.",
    },
    {
        "buyer_name": "Sneha Joshi",
        "phone": "+919811001002",
        "email": "sneha.j@outlook.com",
        "status": "CONTACTED",
        "source": "PHONE_CLICK",
        "notes": "Called back, wants site visit on Saturday morning.",
    },
    {
        "buyer_name": "Vikram Patel",
        "phone": "+919811001003",
        "email": None,
        "status": "SITE_VISIT",
        "source": "GATED_MODAL",
        "notes": "Site visit scheduled for Saturday 11 AM. Confirmed via WhatsApp.",
    },
    {
        "buyer_name": "Meghna Iyer",
        "phone": "+919811001004",
        "email": "meghna@yahoo.com",
        "status": "NEGOTIATION",
        "source": "WHATSAPP_CLICK",
        "notes": "Offering 9.2 Cr, seller asking 9.5 Cr. Discussing loan preapproval.",
    },
    {
        "buyer_name": "Rahul Verma",
        "phone": "+919811001005",
        "email": "rahul.v@gmail.com",
        "status": "CLOSED",
        "source": "PHONE_CLICK",
        "notes": "Token amount of ₹5L received. Sale agreement scheduled for next week.",
    },
    {
        "buyer_name": "Poonam Shah",
        "phone": "+919811001006",
        "email": None,
        "status": "LOST",
        "source": "GATED_MODAL",
        "notes": "Found a property through another broker in Viman Nagar.",
    },
    {
        "buyer_name": "Sunil Reddy",
        "phone": "+919811001007",
        "email": "sunil.r@gmail.com",
        "status": "NEW",
        "source": "WHATSAPP_CLICK",
        "notes": "Enquired about HDFC home loan availability and approval timeline.",
    },
    {
        "buyer_name": "Ananya Bhatt",
        "phone": "+919811001008",
        "email": "ananya.b@gmail.com",
        "status": "CONTACTED",
        "source": "PHONE_CLICK",
        "notes": "NRI investor based in Dubai. Looking to buy 2+ units as investment.",
    },
    {
        "buyer_name": "Ravi Menon",
        "phone": "+919811001009",
        "email": "ravi.m@hotmail.com",
        "status": "SITE_VISIT",
        "source": "WHATSAPP_CLICK",
        "notes": "Second site visit planned. Brought wife and architect for inspection.",
    },
    {
        "buyer_name": "Divya Saxena",
        "phone": "+919811001010",
        "email": None,
        "status": "NEGOTIATION",
        "source": "GATED_MODAL",
        "notes": "Price negotiation underway. Wants modular wardrobes included in deal.",
    },
    {
        "buyer_name": "Harish Choudhary",
        "phone": "+919811001011",
        "email": "harish@gmail.com",
        "status": "NEW",
        "source": "WHATSAPP_CLICK",
        "notes": "Looking for north-facing unit only. Interested in Baner or Wakad.",
    },
    {
        "buyer_name": "Lakshmi Nair",
        "phone": "+919811001012",
        "email": "lakshmi.n@gmail.com",
        "status": "CLOSED",
        "source": "PHONE_CLICK",
        "notes": "Deal closed successfully. Registration on 22nd. Commission received.",
    },
]

# ---------------------------------------------------------------------------
# WhatsApp conversation samples
# ---------------------------------------------------------------------------
_WA_INBOUND_MSGS = [
    "Hi, I saw your property listing on the portal. Is it still available?",
    "What is the final price? Is there any scope for negotiation?",
    "Can you send me more photos of the kitchen and bathrooms please?",
    "I am very interested in this property. When can I visit?",
    "Is home loan available for this property? Which banks are partnered?",
    "What is the monthly society maintenance charge?",
    "Is there a covered parking spot included with the flat?",
    "When was the society constructed? Is the OC received?",
]

_WA_OUTBOUND_MSGS = [
    "Hello! Yes, the property is available. Let me share the complete brochure with you.",
    "The listed price is our best offer. For serious buyers, we can discuss a small flexibility.",
    "Absolutely! I am sending you a complete high-resolution photo set right now.",
    "We are available for site visits Monday to Saturday, 10 AM to 6 PM. What works for you?",
    "Yes, we have tie-ups with HDFC, SBI, Axis, and ICICI for preferential home loan rates.",
    "The maintenance is ₹3.50 per sqft per month covering all common area upkeep.",
    "Yes, one covered car parking is included. Two-wheeler parking is also available.",
    "The society was completed in 2019 and the OC was received in January 2020.",
]


# ---------------------------------------------------------------------------
# Command class
# ---------------------------------------------------------------------------
class Command(BaseCommand):
    """
    Idempotent development database seeder for PropertyOS.

    Creates realistic sample data for every model in the system.
    Production-safe: aborts if DJANGO_ENVIRONMENT is 'production' or 'staging'.
    """

    help = (
        "Seeds the development database with realistic sample data for E2E testing. "
        "Idempotent — safe to run multiple times. "
        "NEVER executes automatically."
    )

    def handle(self, *args, **options):
        # ── Production safety guard ────────────────────────────────────────
        env = os.getenv("DJANGO_ENVIRONMENT", "development").lower()
        if env in ("production", "staging"):
            raise CommandError(
                f"[seed_dev] Refused to run in '{env}' environment. "
                "This command is strictly for local development and CI only. "
                "Set DJANGO_ENVIRONMENT=development to proceed."
            )

        self.stdout.write("")
        self.stdout.write(
            self.style.WARNING("  +------------------------------------------+")
        )
        self.stdout.write(
            self.style.WARNING("  |   PropertyOS Development Seeder          |")
        )
        self.stdout.write(
            self.style.WARNING("  +------------------------------------------+")
        )
        self.stdout.write(f"  Environment  : {env}")
        self.stdout.write(f"  DB password  : {_DEV_PASSWORD}")
        self.stdout.write("")

        # Counters — track objects created on THIS run only
        stats = {
            "tenants_created": 0,
            "users_created": 0,
            "superusers": 0,
            "owners": 0,
            "admins": 0,
            "brokers": 0,
            "assistants": 0,
            "properties_created": 0,
            "leads_created": 0,
            "wa_sessions_created": 0,
            "wa_messages_created": 0,
            "analytics_created": 0,
            "audit_created": 0,
        }

        with transaction.atomic():
            tenants = self._seed_tenants(stats)
            users = self._seed_users(tenants, stats)
            properties = self._seed_properties(tenants, users, stats)
            self._seed_leads(properties, stats)
            self._seed_whatsapp(tenants, stats)
            self._seed_analytics(properties, stats)
            self._seed_audit(users, properties, stats)

        self._print_report(stats)

    # ── Phase 1: Tenants ─────────────────────────────────────────────────────

    def _seed_tenants(self, stats):
        """
        Create or update the three development agency tenants.
        Uses get_or_create keyed on 'name' for idempotency.
        """
        self.stdout.write(self.style.HTTP_INFO("\n[1/7] Seeding Tenants..."))
        tenants = {}

        for bp in _TENANT_BLUEPRINTS:
            tenant = Tenant.objects.filter(name=bp["name"]).first()
            if tenant:
                created = False
            else:
                tenant = Tenant.objects.create(
                    name=bp["name"],
                    brand_color=bp["brand_color"],
                    whatsapp_default_number=bp["whatsapp_default_number"],
                    subscription_plan=bp["subscription_plan"],
                    listing_expiry_days=bp["listing_expiry_days"],
                    logo_url=bp["logo_url"],
                )
                created = True

            if not created:
                # Refresh mutable fields on every re-run to keep dev data consistent
                tenant.brand_color = bp["brand_color"]
                tenant.whatsapp_default_number = bp["whatsapp_default_number"]
                tenant.subscription_plan = bp["subscription_plan"]
                tenant.listing_expiry_days = bp["listing_expiry_days"]
                tenant.logo_url = bp["logo_url"]
                tenant.save(
                    update_fields=[
                        "brand_color",
                        "whatsapp_default_number",
                        "subscription_plan",
                        "listing_expiry_days",
                        "logo_url",
                    ]
                )

            tenants[bp["name"]] = tenant
            if created:
                stats["tenants_created"] += 1
            verb = "[+] Created" if created else "[o] Reused "
            self.stdout.write(f"  {verb}  Tenant: {bp['name']}")

        return tenants

    # ── Phase 2: Users ───────────────────────────────────────────────────────

    def _seed_users(self, tenants, stats):
        """
        Create or refresh all seven dev users covering every RBAC role.
        Password is always reset to _DEV_PASSWORD on re-runs.
        """
        self.stdout.write(self.style.HTTP_INFO("\n[2/7] Seeding Users..."))
        users = {}

        for bp in _USER_BLUEPRINTS:
            tenant = tenants[bp["tenant_name"]]

            user, created = User.objects.get_or_create(
                email=bp["email"],
                defaults={
                    "name": bp["name"],
                    "phone": bp["phone"],
                    "role": bp["role"],
                    "tenant": tenant,
                    "is_staff": bp["is_staff"],
                    "is_superuser": bp["is_superuser"],
                    "is_active": True,
                    "mfa_enabled": False,
                },
            )

            # Always reset the password so it matches _DEV_PASSWORD after re-runs
            user.set_password(_DEV_PASSWORD)

            if not created:
                # Refresh all mutable fields in case they drifted
                user.name = bp["name"]
                user.phone = bp["phone"]
                user.role = bp["role"]
                user.tenant = tenant
                user.is_staff = bp["is_staff"]
                user.is_superuser = bp["is_superuser"]
                user.is_active = True
                user.mfa_enabled = False

            user.save()

            users[bp["email"]] = user

            if created:
                stats["users_created"] += 1
                role = bp["role"]
                if bp["is_superuser"]:
                    stats["superusers"] += 1
                if role == "OWNER":
                    stats["owners"] += 1
                elif role == "ADMIN":
                    stats["admins"] += 1
                elif role == "BROKER":
                    stats["brokers"] += 1
                elif role == "ASSISTANT":
                    stats["assistants"] += 1

            verb = "[+] Created" if created else "[o] Reused "
            self.stdout.write(f"  {verb}  User: {bp['email']:<38} [{bp['role']}]")

        return users

    # ── Phase 3: Properties ──────────────────────────────────────────────────

    def _seed_properties(self, tenants, users, stats):
        """
        Create or reuse property listings across all three tenants.
        Titles are prefixed with [SEED] for easy identification and cleanup.
        TenantManager context is set per tenant to satisfy FK and soft-filter constraints.
        """
        self.stdout.write(self.style.HTTP_INFO("\n[3/7] Seeding Properties..."))

        # Build per-tenant user index for creator/assignee selection
        tenant_users: dict[str, list] = {}
        for user in users.values():
            tn = user.tenant.name
            tenant_users.setdefault(tn, []).append(user)

        created_properties = []

        for bp in _PROPERTY_BLUEPRINTS:
            tenant = tenants[bp["tenant_name"]]
            available_users = tenant_users.get(bp["tenant_name"], [])
            creator = available_users[0] if available_users else None
            brokers = [u for u in available_users if u.role in ("BROKER", "ADMIN")]
            assignee = brokers[0] if brokers else creator

            # Set tenant context so TenantModel.save() passes FK validation
            token = set_current_tenant_id(str(tenant.id))
            try:
                prop = Property.objects_unfiltered.filter(
                    title=bp["title"], tenant=tenant
                ).first()
                if prop:
                    created = False
                else:
                    prop = Property.objects.create(
                        title=bp["title"],
                        tenant=tenant,
                        description=bp["description"],
                        price=bp["price"],
                        property_type=bp["property_type"],
                        status=bp["status"],
                        city=bp["city"],
                        area=bp["area"],
                        bhk=bp.get("bhk"),
                        square_feet=bp.get("square_feet"),
                        amenities=bp.get("amenities", []),
                        created_by=creator,
                        assigned_to=assignee,
                        location_address=f"{bp['area']}, {bp['city']}, Maharashtra, India",
                    )
                    created = True
            finally:
                clear_current_tenant_id(token)

            created_properties.append(prop)
            if created:
                stats["properties_created"] += 1

            verb = "[+] Created" if created else "[o] Reused "
            self.stdout.write(f"  {verb}  Property: {bp['title'][:55]}")

        return created_properties

    # ── Phase 4: Leads ───────────────────────────────────────────────────────

    def _seed_leads(self, properties, stats):
        """
        Create lead enquiries distributed across the seeded property set.
        Lead.save() auto-increments leads_count on the related property —
        this is intentional and correct behaviour.
        """
        self.stdout.write(self.style.HTTP_INFO("\n[4/7] Seeding Leads..."))

        for idx, lb in enumerate(_LEAD_BLUEPRINTS):
            # Cycle leads across available properties
            prop = properties[idx % len(properties)]
            tenant = prop.tenant

            token = set_current_tenant_id(str(tenant.id))
            try:
                _lead = Lead.objects_unfiltered.filter(
                    buyer_name=lb["buyer_name"], phone=lb["phone"], tenant=tenant
                ).first()
                if _lead:
                    created = False
                else:
                    _lead = Lead.objects.create(
                        buyer_name=lb["buyer_name"],
                        phone=lb["phone"],
                        tenant=tenant,
                        property=prop,
                        source=lb["source"],
                        email=lb.get("email"),
                        status=lb["status"],
                        notes=lb.get("notes", ""),
                    )
                    created = True
            finally:
                clear_current_tenant_id(token)

            if created:
                stats["leads_created"] += 1

            verb = "[+] Created" if created else "[o] Reused "
            self.stdout.write(
                f"  {verb}  Lead: {lb['buyer_name']:<25} -> {prop.title[:40]}"
            )

    # ── Phase 5: WhatsApp ────────────────────────────────────────────────────

    def _seed_whatsapp(self, tenants, stats):
        """
        Seed WhatsApp sessions and conversation messages for tenants
        that have a configured WhatsApp number.
        ConversationMessage.bulk_create bypasses save() by design —
        messages are chat records and do not trigger side-effects.
        """
        self.stdout.write(
            self.style.HTTP_INFO("\n[5/7] Seeding WhatsApp Sessions & Messages...")
        )

        target_messages_per_session = 12

        for tenant in tenants.values():
            wa_number = tenant.whatsapp_default_number
            if not wa_number:
                self.stdout.write(
                    f"  [~] Skipped  Tenant '{tenant.name}' - no WhatsApp number"
                )
                continue

            session, created = WhatsAppSession.objects.get_or_create(
                phone_number=wa_number,
                defaults={
                    "tenant": tenant,
                    "state": "IDLE",
                    "metadata": {
                        "agency": tenant.name,
                        "seeded": True,
                        "seed_version": "1.0",
                    },
                },
            )

            if created:
                stats["wa_sessions_created"] += 1

            # Top up messages only if under the target — idempotent
            existing_count = session.messages.count()
            to_create = max(0, target_messages_per_session - existing_count)

            if to_create > 0:
                new_messages = []
                for j in range(to_create):
                    if j % 2 == 0:
                        new_messages.append(
                            ConversationMessage(
                                session=session,
                                direction="INBOUND",
                                message_type="TEXT",
                                body=_WA_INBOUND_MSGS[j % len(_WA_INBOUND_MSGS)],
                                raw_payload={
                                    "from": wa_number,
                                    "type": "text",
                                    "seeded": True,
                                },
                            )
                        )
                    else:
                        new_messages.append(
                            ConversationMessage(
                                session=session,
                                direction="OUTBOUND",
                                message_type="TEXT",
                                body=_WA_OUTBOUND_MSGS[j % len(_WA_OUTBOUND_MSGS)],
                                raw_payload={
                                    "to": wa_number,
                                    "type": "text",
                                    "seeded": True,
                                },
                            )
                        )
                ConversationMessage.objects.bulk_create(new_messages)
                stats["wa_messages_created"] += len(new_messages)

            verb = "[+] Created" if created else "[o] Reused "
            self.stdout.write(
                f"  {verb}  WA Session: {wa_number} ({tenant.name}) "
                f"- {to_create} messages added"
            )

    # ── Phase 6: Analytics ───────────────────────────────────────────────────

    def _seed_analytics(self, properties, stats):
        """
        Generate analytics events for each seeded property.
        bulk_create is used for performance; views_count is then reconciled
        manually via an UPDATE query for PAGE_VIEW events.
        """
        self.stdout.write(self.style.HTTP_INFO("\n[6/7] Seeding Analytics Events..."))

        event_types = ["PAGE_VIEW", "WHATSAPP_CLICK", "PHONE_CLICK", "IMAGE_VIEW"]
        device_types = ["MOBILE", "DESKTOP", "TABLET"]
        browsers = ["Chrome", "Safari", "Firefox", "Edge", "Samsung Internet"]
        cities = [
            "Mumbai",
            "Pune",
            "Bangalore",
            "Hyderabad",
            "Chennai",
            "Delhi",
            "Ahmedabad",
            "Surat",
            "Nagpur",
            "Nashik",
        ]
        target_per_property = 20

        events_to_create = []

        for prop in properties:
            existing = AnalyticsEvent.objects.filter(property=prop).count()
            to_create = max(0, target_per_property - existing)

            for _ in range(to_create):
                raw_ip = (
                    f"10.{random.randint(0, 255)}.{random.randint(0, 255)}"
                    f".{random.randint(1, 254)}"
                )
                ip_hash = hashlib.sha256(raw_ip.encode()).hexdigest()

                events_to_create.append(
                    AnalyticsEvent(
                        property=prop,
                        event_type=random.choice(event_types),
                        device_type=random.choice(device_types),
                        browser=random.choice(browsers),
                        ip_hash=ip_hash,
                        location_city=random.choice(cities),
                    )
                )

        if events_to_create:
            AnalyticsEvent.objects.bulk_create(events_to_create)
            stats["analytics_created"] += len(events_to_create)

            # Reconcile views_count on each property — bulk_create bypasses save()
            # so the auto-increment hook is not called. Update manually.
            for prop in properties:
                pv_count = AnalyticsEvent.objects.filter(
                    property=prop, event_type="PAGE_VIEW"
                ).count()
                Property.objects_unfiltered.filter(id=prop.id).update(
                    views_count=pv_count
                )

        self.stdout.write(
            f"  [+] Created  {len(events_to_create)} analytics events "
            f"across {len(properties)} properties"
        )

    # ── Phase 7: Audit Logs ──────────────────────────────────────────────────

    def _seed_audit(self, users, properties, stats):
        """
        Generate AuditLog entries for property creation and status changes.
        Uses AuditLog (mutable) via direct ORM — not log_audit_event() —
        because log_audit_event() requires a live request context.
        Existence checks prevent duplicate entries on re-runs.
        """
        self.stdout.write(self.style.HTTP_INFO("\n[7/7] Seeding Audit Log Entries..."))

        # Build a per-tenant actor map (prefer OWNER or ADMIN for audit actor)
        tenant_actors: dict = {}
        for user in users.values():
            tid = str(user.tenant_id)
            existing = tenant_actors.get(tid)
            if not existing or user.role in ("OWNER", "ADMIN"):
                tenant_actors[tid] = user

        created_count = 0

        for prop in properties:
            actor = tenant_actors.get(str(prop.tenant_id))
            if not actor:
                continue

            token = set_current_tenant_id(str(prop.tenant_id))
            try:
                # Seed a CREATE audit entry
                create_exists = AuditLog.objects_unfiltered.filter(
                    model_name="Property",
                    record_id=prop.id,
                    action="CREATE",
                ).exists()

                if not create_exists:
                    AuditLog.objects.create(
                        tenant=prop.tenant,
                        actor=actor,
                        action="CREATE",
                        model_name="Property",
                        record_id=prop.id,
                        changes_payload={
                            "title": prop.title,
                            "price": str(prop.price),
                            "status": prop.status,
                            "seeded": True,
                        },
                    )
                    created_count += 1

                # Seed an UPDATE audit entry for properties that changed status
                if prop.status in ("NEGOTIATION", "BOOKED", "SOLD", "EXPIRED"):
                    update_exists = AuditLog.objects_unfiltered.filter(
                        model_name="Property",
                        record_id=prop.id,
                        action="UPDATE",
                    ).exists()

                    if not update_exists:
                        AuditLog.objects.create(
                            tenant=prop.tenant,
                            actor=actor,
                            action="UPDATE",
                            model_name="Property",
                            record_id=prop.id,
                            changes_payload={
                                "status": {
                                    "old": "AVAILABLE",
                                    "new": prop.status,
                                },
                                "seeded": True,
                            },
                        )
                        created_count += 1

            finally:
                clear_current_tenant_id(token)

        # Seed user-creation audit entries
        for user in users.values():
            actor = tenant_actors.get(str(user.tenant_id))
            if not actor:
                continue

            token = set_current_tenant_id(str(user.tenant_id))
            try:
                exists = AuditLog.objects_unfiltered.filter(
                    model_name="User",
                    record_id=user.id,
                    action="CREATE",
                ).exists()

                if not exists:
                    AuditLog.objects.create(
                        tenant=user.tenant,
                        actor=actor,
                        action="CREATE",
                        model_name="User",
                        record_id=user.id,
                        changes_payload={
                            "email": user.email,
                            "role": user.role,
                            "seeded": True,
                        },
                    )
                    created_count += 1
            finally:
                clear_current_tenant_id(token)

        stats["audit_created"] += created_count
        self.stdout.write(f"  [+] Created  {created_count} audit log entries")

    # ── Final Report ─────────────────────────────────────────────────────────

    def _print_report(self, stats):
        """Print a formatted report of all objects created during this run."""
        divider = "=" * 50

        # Totals from DB for informational display
        total_props = Property.objects_unfiltered.filter(
            title__startswith="[SEED]"
        ).count()
        total_leads = Lead.objects_unfiltered.filter(
            buyer_name__in=[lb["buyer_name"] for lb in _LEAD_BLUEPRINTS]
        ).count()

        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS(divider))
        self.stdout.write(self.style.SUCCESS("  PropertyOS Development Seed Complete"))
        self.stdout.write(self.style.SUCCESS(divider))
        self.stdout.write("")
        self.stdout.write(f"  Tenants Created      : {stats['tenants_created']}")
        self.stdout.write(f"  Users Created        : {stats['users_created']}")
        self.stdout.write(f"      - Superusers     : {stats['superusers']}")
        self.stdout.write(f"      - Owners         : {stats['owners']}")
        self.stdout.write(f"      - Admins         : {stats['admins']}")
        self.stdout.write(f"      - Brokers        : {stats['brokers']}")
        self.stdout.write(f"      - Assistants     : {stats['assistants']}")
        self.stdout.write(f"  Properties Created   : {stats['properties_created']}")
        self.stdout.write(f"  Leads Created        : {stats['leads_created']}")
        self.stdout.write(f"  WA Sessions Created  : {stats['wa_sessions_created']}")
        self.stdout.write(f"  WA Messages Created  : {stats['wa_messages_created']}")
        self.stdout.write(f"  Analytics Events     : {stats['analytics_created']}")
        self.stdout.write(f"  Audit Log Entries    : {stats['audit_created']}")
        self.stdout.write("")
        self.stdout.write(f"  Total seeded properties in DB : {total_props}")
        self.stdout.write(f"  Total seeded leads in DB      : {total_leads}")
        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS(divider))
        self.stdout.write(
            self.style.SUCCESS("  Development Credentials  (password: DevTest@123!)")
        )
        self.stdout.write(self.style.SUCCESS(divider))
        self.stdout.write("")

        creds = [
            ("admin@propertyos.dev", "Superuser", "Royal Realty"),
            ("owner@propertyos.dev", "Owner", "Royal Realty"),
            ("agencyadmin@propertyos.dev", "Admin", "Royal Realty"),
            ("broker1@propertyos.dev", "Broker", "Royal Realty"),
            ("broker2@propertyos.dev", "Broker", "Nirman Studios"),
            ("assistant1@propertyos.dev", "Assistant", "Royal Realty"),
            ("assistant2@propertyos.dev", "Assistant", "Nirman Studios"),
        ]

        for email, role, tenant_name in creds:
            self.stdout.write(f"  {email:<40}  [{role:<12}]  {tenant_name}")

        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS(divider))
        self.stdout.write("")
        self.stdout.write("  Run again to verify idempotency:")
        self.stdout.write("    python manage.py seed_dev")
        self.stdout.write("")
