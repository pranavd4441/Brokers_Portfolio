# PropertyOS REST API Documentation

This document describes the REST API endpoints exposed by the Django REST Framework backend.

All API requests must be prefixed with `/api`. Authenticated endpoints require a valid JWT token in the `Authorization` header: `Authorization: Bearer <jwt_access_token>`.

---

## 1. Authentication & Accounts

### 1.1. Register Broker Workspace
Creates a new `Tenant` workspace and an `OWNER` user account in a single atomic transaction.
* **URL:** `/api/auth/register/`
* **Method:** `POST`
* **Auth Required:** No
* **Request Body:**
  ```json
  {
    "company_name": "Prime Realtors Ltd",
    "name": "Rajesh Sharma",
    "email": "rajesh@primerealtors.com",
    "password": "secure_password_123"
  }
  ```
* **Success Response (201 Created):**
  ```json
  {
    "id": "u4b77b05-91d9-43fe-80c1-8eed6e523792",
    "name": "Rajesh Sharma",
    "email": "rajesh@primerealtors.com",
    "phone": null,
    "role": "OWNER",
    "tenant": {
      "id": "t4b77b05-91d9-43fe-80c1-8eed6e523792",
      "name": "Prime Realtors Ltd",
      "logo_url": null,
      "brand_color": "#0F172A",
      "whatsapp_default_number": null,
      "subscription_plan": "FREE",
      "created_at": "2026-06-26T01:22:24Z"
    },
    "created_at": "2026-06-26T01:22:24Z"
  }
  ```

### 1.2. Login / Obtain Tokens
Exchange credentials for JWT access and refresh tokens.
* **URL:** `/api/auth/login/`
* **Method:** `POST`
* **Auth Required:** No
* **Request Body:**
  ```json
  {
    "email": "rajesh@primerealtors.com",
    "password": "secure_password_123"
  }
  ```
* **Success Response (200 OK):**
  ```json
  {
    "access": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "u4b77b05-91d9-43fe-80c1-8eed6e523792",
      "name": "Rajesh Sharma",
      "email": "rajesh@primerealtors.com",
      "role": "OWNER",
      "tenant_id": "t4b77b05-91d9-43fe-80c1-8eed6e523792"
    }
  }
  ```

### 1.3. Refresh JWT Token
Exchange a valid refresh token for a new access token.
* **URL:** `/api/auth/token/refresh/`
* **Method:** `POST`
* **Auth Required:** No
* **Request Body:**
  ```json
  {
    "refresh": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
  ```
* **Success Response (200 OK):**
  ```json
  {
    "access": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
  ```

### 1.4. Retrieve Current Profile
Get authenticated broker profile.
* **URL:** `/api/auth/me/`
* **Method:** `GET`
* **Auth Required:** Yes
* **Success Response (200 OK):** Same as the `User` payload returned during registration.

### 1.5. Update Workspace Branding
Modify workspace name, logo, brand accent color, and default WhatsApp number.
* **URL:** `/api/auth/tenant/branding/`
* **Method:** `PATCH` / `PUT`
* **Auth Required:** Yes (Role must be `OWNER` or `ADMIN`)
* **Request Body:**
  ```json
  {
    "name": "Prime Realtors Premium",
    "brand_color": "#10B981",
    "whatsapp_default_number": "919876543210",
    "logo_url": "https://primerealtors.com/logo.png"
  }
  ```
* **Success Response (200 OK):** Returns updated `Tenant` details.

---

## 2. Property Inventory

### 2.1. List Properties
Retrieves all property listings. **Automatically isolated to the active tenant workspace.**
* **URL:** `/api/properties/`
* **Method:** `GET`
* **Auth Required:** Yes
* **Success Response (200 OK):**
  ```json
  [
    {
      "id": "p4b77b05-91d9-43fe-80c1-8eed6e523792",
      "title": "Ultra Modern 3 BHK Penthouse",
      "description": "Premium penthouse in central locality.",
      "price": "12500000.00",
      "property_type": "APARTMENT",
      "status": "AVAILABLE",
      "city": "Pune",
      "area": "Baner",
      "location_address": "Flat 502, Prime Towers",
      "bhk": 3,
      "square_feet": "1850.00",
      "amenities": ["Swimming Pool", "Fitness Gym"],
      "images": [
        {
          "id": "i4b77b05-91d9-43fe-80c1-8eed6e523792",
          "url": "https://storage.googleapis.com/.../main.webp",
          "thumbnail_url": "https://storage.googleapis.com/.../thumb.webp",
          "display_order": 0
        }
      ],
      "created_by": "u4b77b05-91d9-43fe-80c1-8eed6e523792",
      "created_by_name": "Rajesh Sharma",
      "tenant_name": "Prime Realtors Premium",
      "created_at": "2026-06-26T01:22:24Z",
      "updated_at": "2026-06-26T01:22:24Z"
    }
  ]
  ```

### 2.2. Create Property
Add a new property listing to the inventory.
* **URL:** `/api/properties/`
* **Method:** `POST`
* **Auth Required:** Yes
* **Request Body:** Same as the Property structure (excluding `id`, `images`, `created_by`, `created_at`).
* **Success Response (201 Created):** Returns created `Property` object.

### 2.3. Update Property
Update property details.
* **URL:** `/api/properties/{property_id}/`
* **Method:** `PUT` / `PATCH`
* **Auth Required:** Yes
* **Success Response (200 OK):** Returns updated `Property` object. Logs details to `AuditLog`.

### 2.4. Duplicate Property
Clone an existing property listing and duplicate image references.
* **URL:** `/api/properties/{property_id}/duplicate/`
* **Method:** `POST`
* **Auth Required:** Yes
* **Success Response (201 Created):** Returns the newly created property copy. Logs clone event to `AuditLog`.

### 2.5. Upload Property Images
Upload multiple images. Optimizes them to WebP and creates thumbnails.
* **URL:** `/api/properties/{property_id}/images/`
* **Method:** `POST`
* **Query Params:** `async=true|false` (Optional. If `true`, offloads upload task to Celery).
* **Content-Type:** `multipart/form-data`
* **Form Data:**
  * `images`: File binaries (supports multiple)
* **Success Response (201 Created / 202 Accepted):** Returns a list of created `PropertyImage` objects, or a background queue receipt.

---

## 3. Sharing & Public Resolver

### 3.1. Create Share Link
Generate a unique short slug for sharing a property on WhatsApp.
* **URL:** `/api/sharing/links/`
* **Method:** `POST`
* **Auth Required:** Yes
* **Request Body:**
  ```json
  {
    "property": "p4b77b05-91d9-43fe-80c1-8eed6e523792"
  }
  ```
* **Success Response (201 Created):**
  ```json
  {
    "id": "l4b77b05-91d9-43fe-80c1-8eed6e523792",
    "property": "p4b77b05-91d9-43fe-80c1-8eed6e523792",
    "property_title": "Ultra Modern 3 BHK Penthouse",
    "slug": "ultra-modern-3-bhk-penthouse-x7f2a1",
    "expiry": null,
    "full_share_url": "http://localhost/p/ultra-modern-3-bhk-penthouse-x7f2a1",
    "whatsapp_share_text": "%F0%9F%8F%A1%20*Premium%20Property...",
    "created_at": "2026-06-26T01:25:00Z"
  }
  ```

### 3.2. Public Slug Resolver
Resolves a short slug. Returns property details and tenant branding. **Zero Authentication Required.**
* **URL:** `/api/sharing/resolve/{slug}/`
* **Method:** `GET`
* **Auth Required:** No
* **Success Response (200 OK):**
  ```json
  {
    "property": {
      "id": "p4b77b05-91d9-43fe-80c1-8eed6e523792",
      "title": "Ultra Modern 3 BHK Penthouse",
      "description": "...",
      "price": "12500000.00",
      "property_type": "APARTMENT",
      "status": "AVAILABLE",
      "city": "Pune",
      "area": "Baner",
      "location_address": "Flat 502, Prime Towers",
      "bhk": 3,
      "square_feet": "1850.00",
      "amenities": ["Swimming Pool", "Fitness Gym"],
      "images": [...]
    },
    "branding": {
      "id": "t4b77b05-91d9-43fe-80c1-8eed6e523792",
      "name": "Prime Realtors Premium",
      "logo_url": "https://primerealtors.com/logo.png",
      "brand_color": "#10B981",
      "whatsapp_default_number": "919876543210",
      "subscription_plan": "FREE"
    }
  }
  ```

---

## 4. Analytics

### 4.1. Public Event Logger
Logs landing page visits or WhatsApp clicks from prospects. **Zero Authentication Required.**
* **URL:** `/api/analytics/log/`
* **Method:** `POST`
* **Auth Required:** No
* **Request Body:**
  ```json
  {
    "property": "p4b77b05-91d9-43fe-80c1-8eed6e523792",
    "event_type": "PAGE_VIEW"
  }
  ```
  *Event Types: `PAGE_VIEW`, `WHATSAPP_CLICK`, `PHONE_CLICK`, `IMAGE_VIEW`*
* **Success Response (201 Created):**
  ```json
  {
    "detail": "Event logged successfully.",
    "event_id": "e4b77b05-91d9-43fe-80c1-8eed6e523792"
  }
  ```

### 4.2. Broker Metrics Dashboard
Aggregates summary statistics, device distributions, top performing properties, and a 7-day visitor timeseries.
* **URL:** `/api/analytics/dashboard/`
* **Method:** `GET`
* **Auth Required:** Yes
* **Success Response (200 OK):**
  ```json
  {
    "summary": {
      "total_properties": 8,
      "total_views": 1420,
      "whatsapp_clicks": 310,
      "phone_clicks": 85,
      "image_views": 620,
      "total_clicks": 395,
      "conversion_rate": 27.82
    },
    "device_distribution": {
      "MOBILE": 1120,
      "DESKTOP": 240,
      "TABLET": 60
    },
    "top_properties": [
      {
        "id": "p4b77b05-91d9-43fe-80c1-8eed6e523792",
        "title": "Ultra Modern 3 BHK Penthouse",
        "views": 480,
        "price": 12500000.0,
        "status": "AVAILABLE"
      }
    ],
    "performance_chart": [
      {
        "date": "Fri 26 Jun",
        "views": 240,
        "clicks": 68
      }
    ]
  }
  ```
