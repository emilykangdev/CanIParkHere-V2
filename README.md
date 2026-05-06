## Can I Park Here - v2

https://caniparkhere.dev/

This is map-first web app. Given any location in Seattle, you can find the nearest parking signs or garages near you. This repository contains both the backend (Python/FastAPI + geo stack) and the frontend (Next.js + Clerk + PostHog).

### Goals
- Deliver clear, trustworthy parking guidance for a specific point, route, or time window
- Keep the experience fast, mobile-friendly, and reliable
- Maintain a tractable, well-documented data pipeline for parking sign and restriction data

### High-level architecture
- Frontend (web): Next.js app in `my-clerk-app/` with authentication (Clerk), analytics (PostHog), and a chat/map UX for queries.
- Backend (API): FastAPI service in `backend/` exposing spatial and parking rule evaluation endpoints; optional deployment to Fly.io.
- Data layer: GeoJSON/Parquet assets and an ETL toolchain for SDOT street signs and related parking datasets in `backend/data/` and `data/`.

### Repository structure
- `backend/` - FastAPI service, geo utilities, data processing scripts, and infra files
- `my-clerk-app/` - Next.js app with Clerk auth, PostHog integration, and UI components
- `data/` - Raw and unused input datasets for local experimentation

## Backend design

### Tech stack
- Framework: FastAPI
- Geo: Shapely/GeoPandas/pyproj (via requirements), spatial joins and geometry ops
- Services: AWS S3 and Athena, Firebase, OpenAI (for chat/LLM features where applicable)
- Data: Pulled from data provided by the City of Seattle: 
    - I started from this ArcGIS map: [link](https://seattlecitygis.maps.arcgis.com/apps/webappviewer/index.html?id=5814e3f6c7054a40a9b4d175dcbf294b), which combines several parking datasets. Then I clicked the Layer List to see which datasets by toggling them: Parking Facilities, Parking Signs, and eventually I'll also use the Street Parking dataset.
    
- Deployment: Railway in the backend folder

### Key modules (by directory)
- `backend/routes/` - HTTP endpoints
  - `health.py`: liveness/readiness checks
  - `auth.py`: authentication helpers
  - `parking.py`: parking availability and rules lookups
- `backend/services/` - integrations and business logic
  - `parking_service.py`: core rule evaluation and spatial lookups
  - `aws_service.py`, `firebase_service.py`, `openai_service.py`: external integrations
- `backend/geo/` - spatial utilities and scripts
  - `spatial_query_api.py`, `spatial_query_local.py`: query helpers for point-in-polygon/nearest
  - Parquet/GeoJSON conversion tools for performance and reproducibility
- `backend/data/` - data pipeline scripts and versioned outputs (GeoJSON/Parquet)

### Data pipeline (source -> normalized -> performant)
- Ingest SDOT street sign datasets and related parking resources
- Normalize CRS (e.g., EPSG:4326 for web, EPSG:3857 for certain ops)
- De-duplicate and validate features (e.g., sign IDs, coordinates)
- Convert to columnar formats (Parquet) for efficient queries
- Optionally publish to S3 or PostGIS when needed for scale

### API surface (high level)
- `GET /health` - service health
- `POST /parking/check` - input: location + time window; output: allowed/not allowed, max duration, reasons
- `POST /parking/nearby` - discover nearby lots/garages or legal curb segments
- `POST /parking/explain` - optional natural-language explanation of rules applied

### Configuration
- `backend/config/settings.py` sources env vars for credentials and feature flags
- `push_vars_to_fly.sh` assists with deploying secrets/vars to Fly.io

## Frontend design

### Tech stack
- Framework: Next.js (App Router)
- Auth: Clerk
- Analytics/UX: PostHog, custom components
- UI: Tailwind CSS, design system components

### Key areas (by directory)
- `my-clerk-app/src/app/components/` - Map view, chat, history, theme toggle, sidebar, toasts
- `my-clerk-app/src/app/providers/` - PostHog provider
- `my-clerk-app/src/app/lib/` - API clients, helpers, and constants
- `my-clerk-app/src/app/hooks/` - user-centric hooks (e.g., `useUserData`)
- `my-clerk-app/src/middleware.*` - auth/edge middleware

### UX flows (high level)
- Map-first: user drops a pin or shares location -> requests guidance for a time window
- Optional chat: conversational queries ("Can I park here for 2 hours after 6pm?")
- History: recent checks and saved spots

## Security and privacy
- Authentication via Clerk to gate user-specific features
- Secrets managed via environment variables locally and via Fly.io for backend
- PII-minimal: store only what is necessary for features (e.g., saved places, recent checks)

## Observability
- Frontend: PostHog events and feature flags
- Backend: structured logs; hooks for external monitoring on Fly.io

## Environments
- Local: run backend FastAPI and Next.js locally for dev
- Staging/Prod: Fly.io for API; Vercel or similar for frontend

## Local development (short guide)

### Prerequisites
- Python 3.11+, Node.js 18+, `uv` or `pip`, `bun`/`npm`

### Backend
1) Create and activate a virtualenv
2) Install dependencies from `backend/requirements.txt`
3) Run the API: `uvicorn backend.main:app --reload`

### Frontend
1) Install dependencies: `npm install` (inside `my-clerk-app/`)
2) Configure Clerk and PostHog env vars
3) Start: `npm run dev`

## Open questions / decisions to collaborate on
- Parking rule precedence and conflict resolution strategy (e.g., overlapping signs, holiday exceptions)
- Timezone and DST handling for queries spanning midnight
- Offline caching and resiliency for mobile users
- Rate limits and abuse prevention for public endpoints
- Which parts (if any) should move to PostGIS for scale vs. remain in-memory/Parquet

## Roadmap (initial)
- v2.0-alpha: establish stable data pipeline; ship point-in-time check for a single coordinate
- v2.0-beta: add chat explanations, saved history, and nearby alternatives
- v2.1: performance and scale pass (indexing, caching, optional PostGIS)
- v2.2: polishing, accessibility, and expanded city coverage (configurable data sources)

---

If you want changes to this high-level design, comment directly in this README and we will refine before coding.
