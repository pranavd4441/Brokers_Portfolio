# PropertyOS Deployment & Operational Guide

This document describes how to build, run, test, and deploy **PropertyOS** across local, staging, and production environments.

---

## 1. Local Development Quickstart

To run the entire multi-container containerized stack locally:

### 1.1. Setup Environment
Copy the centralized environment template to `.env`:
```bash
cp .env.example .env
```
*(On Windows PowerShell, use: `Copy-Item .env.example .env`)*

By default, the `.env` is configured to run out-of-the-box using the local filesystem fallback for uploads and an in-memory SQLite fallback if the database takes too long to respond (though Docker Compose will handle Postgres and Redis seamlessly).

### 1.2. Spin Up Containers
Launch all services (database, cache, API backend, Next.js frontend, Celery worker, and Nginx reverse proxy):
```bash
docker-compose up --build
```
Once initialized, the services will be routed through the Nginx reverse proxy:
* **Frontend Web App:** `http://localhost` (Next.js 15 App)
* **Backend API Gateway:** `http://localhost/api/` (Django REST API)
* **Django Admin Portal:** `http://localhost/admin/` (Database Admin GUI)

### 1.3. Apply Migrations & Create User
With the containers running, open a new terminal window to apply database schemas and bootstrap an administrator user:
```bash
# 1. Apply Django migrations
docker-compose exec backend python manage.py migrate

# 2. Bootstrap an admin superuser (will create a system tenant automatically)
docker-compose exec backend python manage.py createsuperuser
```

---

## 2. Testing Suite

The backend contains a robust unit test suite verifying tenant-level data isolation, CRUD lifecycle operations, and analytics event captures.

To execute the test suite inside the running container:
```bash
docker-compose exec backend pytest
```
All tests are configured to use a transactional, isolated test database (`--reuse-db` flag applied automatically) to ensure maximum speed.

---

## 3. Production Deployment Guide

For a highly resilient, commercial-grade deployment, we recommend the following multi-tier setup:

### 3.1. Database & Cache Tier
* **PostgreSQL:** Deploy using a managed database service (e.g., AWS RDS, DigitalOcean Managed Databases, or Supabase) with automatic backups enabled. Ensure the `DATABASE_URL` in your production `.env` connects securely over SSL.
* **Redis:** Use a managed Redis instance (e.g., AWS ElastiCache or Upstash Redis) to handle caching, throttles, and Celery broker queues.

### 3.2. Object Storage (Cloudflare R2)
Real estate listings are image-heavy. To minimize hosting costs:
1. Create a Cloudflare account and navigate to **R2 Object Storage**.
2. Create a bucket named `property-os-media`.
3. Generate an **API Token** with Read/Write access permissions, which will provide you with an Access Key ID, Secret Access Key, and an S3 Endpoint URL.
4. Add these credentials to your production `.env` file:
   ```env
   AWS_ACCESS_KEY_ID=your_r2_access_key
   AWS_SECRET_ACCESS_KEY=your_r2_secret_key
   AWS_STORAGE_BUCKET_NAME=property-os-media
   AWS_S3_ENDPOINT_URL=https://<account-id>.r2.cloudflarestorage.com
   ```
The Django backend will automatically detect these credentials and swap out the local filesystem storage driver for the S3/R2 storage driver, uploading WebP optimized images directly with zero egress fee routing.

### 3.3. Application Tier Hosting
* **Self-Hosted VPS (Docker Compose + SSL):**
  * Deploy a Linux VPS (e.g., Ubuntu 22.04 LTS on DigitalOcean, Linode, or AWS EC2).
  * Clone the repository, configure the production `.env`, and run `docker-compose -f docker-compose.prod.yml up -d` (creating a production compose file that strips out hot-reloading volume mounts).
  * Configure Nginx on the host with Let's Encrypt SSL certificates via Certbot:
    ```bash
    sudo apt install certbot python3-certbot-nginx
    sudo certbot --nginx -d propertyos.com
    ```
* **Serverless Next.js Hosting (Vercel) + Containerized Django (Render/Fly.io):**
  * You can deploy the frontend directly on Vercel for ultimate global edge delivery. Point the `NEXT_PUBLIC_API_URL` to your hosted Django backend.
  * Deploy the Django API container and the Celery worker container on Render or Fly.io, connecting them to your managed Postgres and Redis instances.
