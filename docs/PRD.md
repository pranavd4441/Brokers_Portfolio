# Product Requirement Document (PRD) - PropertyOS

**Version:** 1.0.0  
**Author:** Antigravity (CTO & Product Architect)  
**Status:** Proposal / Planning Mode  

---

## 1. Executive Summary & Vision

**PropertyOS** is a mobile-first, WhatsApp-centric property marketing and inventory management SaaS platform built specifically for real estate brokers. 

The immediate goal is to establish a high-frequency sharing habit among brokers by making it incredibly simple to create beautiful, fast-loading, branded property landing pages and share them instantly via WhatsApp. Over time, this touchpoint will expand into a comprehensive broker operating system—covering acquisition, lead tracking, collaboration, custom branding, and transactional workflows.

### The Problem
* **Friction in Creation:** Brokers spend too much time compiling photos, writing descriptions, and formatting details to share with clients.
* **Unprofessional Presentation:** Properties are often shared as messy, unformatted walls of text and bulk images in WhatsApp chats, which look unprofessional and clog clients' phones.
* **Zero Visibility (The "Black Box"):** Once a broker shares a property link or PDF, they have no idea if the client opened it, which images they viewed, or if they forwarded it to others.
* **Branding Deficit:** Independent brokers struggle to present a premium, unified digital brand without hiring expensive developers.

### The Solution: PropertyOS
* **The <60s Creation Loop:** A mobile-optimized dashboard allowing a broker to upload photos, enter basic details, and generate a premium landing page in under a minute.
* **Branded Public Pages:** Every property gets a gorgeous, fast (<2s load time), zero-auth landing page with a clear Call-to-Action: "Chat on WhatsApp".
* **Real-Time Analytics:** Brokers get notified when a page is viewed, when the WhatsApp CTA is clicked, or when specific photos are browsed.
* **Strict Multi-Tenancy:** A robust architecture where each broker or agency has a secure, isolated workspace.

---

## 2. User Personas

### Persona A: Rajesh "The Hustler" Sharma
* **Role:** Independent Broker (Resale & Rental)
* **Age:** 34
* **Tech Savviness:** High (Uses WhatsApp, Instagram, and local listing portals daily on Android)
* **Pain Points:** 
  * Competes with hundreds of local brokers; needs to stand out.
  * Sends 20+ properties a day to various prospects over WhatsApp; loses track of who is interested in what.
  * Clients ignore his bulk-photo dumps.
* **Success Criteria with PropertyOS:** Can quickly create a premium link while standing in a property, text it to a lead, and see if they opened it within 5 minutes.

### Persona B: Priya "The Agency Lead" Patel
* **Role:** Founder of Landmark Realty (5-broker team)
* **Age:** 42
* **Tech Savviness:** Medium (Uses Excel, Gmail, WhatsApp Business)
* **Pain Points:**
  * No central inventory; brokers in her team sometimes pitch the same client different details or prices.
  * Needs consistent branding (agency logo, unified contact numbers) across all listings.
  * Wants to track team productivity and listing performance.
* **Success Criteria with PropertyOS:** A shared tenant workspace where her team adds listings, all styled with the agency's logo and color palette, with shared inventory visibility.

---

## 3. Core User Workflows & Loops

```
+------------------+     +------------------------+     +-----------------------+
|  1. Acquisition  | --> | 2. Branded Page Gen    | --> | 3. WhatsApp Share     |
|  Broker enters   |     | System creates a fast, |     | One-click mobile link |
|  property details|     | premium landing page   |     | with pre-filled text  |
+------------------+     +------------------------+     +-----------------------+
                                                                    |
                                                                    v
+------------------+     +------------------------+     +-----------------------+
|  6. Status Loop  | <-- | 5. Broker Follow-up    | <-- | 4. Engagement Capture |
|  Broker updates  |     | Actionable insights    |     | Client views page &   |
|  lifecycle status|     | drive next conversation|     | clicks WhatsApp CTA   |
+------------------+     +------------------------+     +-----------------------+
```

### Workflow 1: Property Creation & Media Upload (<60 Seconds)
1. **Trigger:** Broker gets a new listing.
2. **Action:** Opens PropertyOS on mobile, clicks "Add Property".
3. **Form Entry:** Inputs title, price, location, property type (BHK, area), and short description.
4. **Media:** Selects up to 10 images from their phone gallery. Images upload asynchronously to Cloudflare R2/S3, generating optimized webp thumbnails.
5. **Publish:** Broker clicks "Publish". The system generates a short, branded link: `propertyos.com/p/villa-in-baner-123`.

### Workflow 2: One-Click WhatsApp Sharing
1. **Trigger:** Property is published or selected from inventory.
2. **Action:** Broker clicks "Share on WhatsApp".
3. **Modal:** System presents pre-configured templates (e.g., *"Hi! Check out this premium 3 BHK Villa in Baner. Direct details here: propertyos.com/p/villa-in-baner-123"*).
4. **Execution:** Tapping the share button opens WhatsApp on the phone, pre-filling the message and letting the broker select a contact or group.

### Workflow 3: Client Experience & Engagement
1. **Trigger:** Client clicks the shared link.
2. **Landing Page:** Instantly loads (<2s) a high-resolution, beautifully styled single-property page.
   * Prominent hero image with sliding gallery.
   * Quick-glance highlights (BHK, Price, Area, Location).
   * Key details (Description, Amenities).
   * Broker profile card (Logo, name, title).
   * Primary sticky CTA: **"Chat on WhatsApp"** and secondary **"Call Broker"**.
3. **Tracking:** Behind the scenes, the page records a `PAGE_VIEW` event with device information. When the client clicks the WhatsApp CTA, it records a `WHATSAPP_CLICK` event.

### Workflow 4: Dashboard & Analytics Follow-Up
1. **Trigger:** Broker opens the PropertyOS dashboard.
2. **Insights:** Sees total views, unique visitors, and click-through rates (CTR) on their WhatsApp CTAs.
3. **Action:** The broker sees that the "Villa in Baner" link was viewed 14 times in the last hour, but no one clicked the CTA. They decide to lower the price or tweak the description, triggering a real-time update of the landing page.

---

## 4. MVP Functional Scope (Phase 1 - 48 Hours)

To build a **production-grade foundation**, we will implement the following core features:

| Module | Feature | Functional Requirements |
| :--- | :--- | :--- |
| **Accounts & Tenants** | Multi-Tenancy | Every user belongs to a Tenant (company/workspace). Queries are isolated using a tenant filter. |
| | Auth | JWT-based authentication (Email/Password) with an extensible architecture for Phone/OTP auth. |
| | Roles | Enforce roles: `OWNER`, `ADMIN`, `BROKER`, `ASSISTANT`. |
| **Properties** | Inventory CRUD | Create, read, update, delete, duplicate, and archive properties. |
| | Schema | Store Title, Description, Price, Location, City, Area, BHK, Property Type, and Status (`AVAILABLE`, `NEGOTIATION`, `SITE_VISIT`, `BOOKED`, `SOLD`). |
| **Media System** | Cloud Upload | Direct-to-storage or backend-proxied uploads to S3/R2. No storage in DB. |
| | Image Ordering | Support dragging/reordering and generating thumbnails. |
| **Portfolio Engine** | Branded Pages | Beautiful, fast-loading, zero-auth public pages under `/p/[slug]` or `/p/[id]`. |
| | Custom Themes | Support basic tenant-level branding (logo, primary color, contact info). |
| **Sharing System** | Short Links | Generate clean slugs for properties and structured pre-filled WhatsApp share messages. |
| **Analytics Engine** | Event Logging | Capture events: `PAGE_VIEW`, `WHATSAPP_CLICK`, `PHONE_CLICK`, `IMAGE_VIEW`. |
| | Dashboard | Aggregated metrics for brokers (Views, Clicks, Conversion rate). |
| **Audit & Security** | Audit Trail | Log critical state changes (e.g., Price updates, status changes) with actor ID and timestamp. |
| | Tenant Isolation | Strict query-level filters on the backend to prevent cross-tenant data access. |

---

## 5. Non-Functional & Technical Requirements

### 1. Performance (Speed First)
* **Frontend SSR/SSG:** The public property landing page must load in less than 2 seconds on a 3G mobile connection. We will leverage Next.js Server Components and Cloudflare/CDN caching.
* **Optimized Media:** Uploaded images must be converted or optimized to modern formats (e.g., WebP) to minimize bandwidth.
* **Lightweight Client Bundle:** Keep public landing pages dependency-light—no heavy tracking scripts.

### 2. Mobile-First Responsiveness
* Entire dashboard and public portfolio must be fully responsive, focusing heavily on touch targets, gesture controls (swiping image galleries), and layout adaptation on screens from 320px wide up to 4K.

### 3. Strict Security & Data Isolation
* **Tenant Isolation:** Every database query must incorporate a `tenant_id` check. The backend will enforce this via a custom Django manager/middleware to eliminate any possibility of developer oversight leading to data leaks.
* **Secure Auth:** Use HTTP-only cookies or secure local storage for JWT tokens, with short-lived access tokens and secure refresh tokens.
* **API Protection:** Standard rate-limiting on public-facing analytics and landing page endpoints to prevent abuse.

### 4. Enterprise Architecture & Extensibility
* **Modular Codebase:** Highly structured Next.js frontend and Django apps (`accounts`, `properties`, `sharing`, etc.) to allow independent development of features in later phases.
* **AI Readiness:** A structured `AIService` stub to lay the groundwork for automated property descriptions, WhatsApp messages, and listing headlines in Phase 2.

---

## 6. Excluded from MVP (Out of Scope)
* ❌ Public consumer marketplace (no aggregate search across tenants).
* ❌ Complex CRM pipelines, lead pipelines, and Kanban boards (keep it to basic metrics).
* ❌ In-app chat system (we leverage WhatsApp instead).
* ❌ Automated AI chatbot responding to leads.
* ❌ Complex billing integration (stripe/razorpay subscription gates are prepared in database schemas but not integrated with gatekeepers).

---

## 7. Success Metrics for Phase 1
1. **Time-to-Share:** A broker can log in, create a listing with 3 images, and copy the WhatsApp share link in **under 45 seconds**.
2. **Page Load Time:** Public landing page Google Lighthouse Performance Score **>90** on mobile devices.
3. **Data Integrity:** 100% tenant isolation verified by unit tests (no cross-tenant data exposure).
