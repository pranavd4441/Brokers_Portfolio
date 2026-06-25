# PropertyOS Long-Term Technical & Product Roadmap

This document outlines the architectural and engineering recommendations for scaling **PropertyOS** from the Phase 1 SaaS foundation into an enterprise-ready real estate broker operating system.

---

## 1. PHASE 2: AI Automation & Engagement Enhancements

### 1.1. AI Content Generation Engine (`AIService`)
In the Phase 1 backend, we structured our folders to support a modular service layout. In Phase 2, we will implement the `AIService` stub:
* **Integration:** Connect to Gemini Pro or OpenAI GPT-4 APIs via standard Python SDKs.
* **Feature A (Smart Descriptions):** Allow brokers to input raw bullet points (e.g., *"3 BHK, Balcony, East facing, high floor, brand new kitchen"*) and output a beautifully formatted, persuasive marketing description.
* **Feature B (Headline Writer):** Generate 5 variations of high-converting listing headlines.
* **Feature C (WhatsApp Pitch Generator):** Generate highly personalized WhatsApp chat templates tailored to the lead's profile (e.g., warm, formal, or investor-focused).

### 1.2. One-Click PDF Brochure Generator
Brokers frequently request PDF brochures to share via email or in non-web chat apps:
* **Architecture:** Implement an asynchronous HTML-to-PDF render engine in a Celery task.
* **Technology:** Use **WeasyPrint** or a headless Chrome instance (via Puppeteer) inside a Docker container.
* **Workflow:** The broker clicks "Download Brochure". The system compiles the property details, injects the tenant's brand color, logo, and photos into a clean HTML template, renders it to a PDF, uploads it to Cloudflare R2, and returns the signed download URL.

### 1.3. Lightweight CRM & Lead Pipelines
Help brokers follow up with leads in a structured way:
* **Models:** Add a `Lead` table (linked to `Tenant` and `Property`) capturing contact info, source (e.g., WhatsApp click), and status.
* **Kanban Board:** Build a highly responsive, drag-and-drop Kanban board in the Next.js dashboard showing columns: `NEW`, `CONTACTED`, `SITE_VISIT`, `NEGOTIATION`, `CLOSED`.

---

## 2. PHASE 3: Enterprise Scale & Network Effects

### 3.1. Tenant Custom Domains
Allow high-tier agency tenants to host their public listings under their own subdomains (e.g., `properties.landmarkrealty.in/villa-baner` instead of `propertyos.com/p/villa-baner`):
* **Routing Tier:** Use **Cloudflare for Platforms (SSL for SaaS)** or an Nginx dynamic proxy layer.
* **Next.js Integration:** Configure Next.js middleware to inspect the incoming `Host` header, resolve the associated `tenant_id` from the database, and rewrite the request path internally to render the branded portfolio page seamlessly.

### 3.2. Columnar Timeseries Analytics (ClickHouse / TimescaleDB)
As public traffic grows to millions of views and clicks, recording events directly in PostgreSQL will lead to high write locks and slower queries:
* **Migration:** Offload analytics events from PostgreSQL to a specialized time-series database.
* **Recommendation:** Use **ClickHouse** (for massive scale columnar analytics) or **TimescaleDB** (a Postgres extension).
* **Buffer Queue:** Implement a Redis-backed stream or Celery batch flusher that aggregates events in memory and writes them to the analytics database in bulk every 10 seconds, reducing PostgreSQL write IOPS to near zero.

### 3.3. Broker Collaboration & Network Marketplace
Provide brokers with a secure marketplace to co-broke properties:
* **Shared Listings:** Allow brokers to flag a listing as "Co-Broke Available" (sharing commission 50/50).
* **Internal Network search:** Other brokers inside the same tenant or within a trusted broker network can search shared listings, generate a client-facing landing page *branded with their own logo*, and pitch it to their client—fostering trust, accelerating transaction loops, and driving massive organic network effects.
