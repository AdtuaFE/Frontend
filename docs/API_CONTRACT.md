# Adtua — API Contract (for FE integration)

This document is the authoritative reference for connecting a frontend to the backend.
It reflects what is **actually built and running** — not aspirational. Missing endpoints are
explicitly flagged. Verified directly against the current route files and controllers as of
2026-10-04, branch `feat/screens-and-slots` (about to merge into `staging`).

---

## Base URL

```
VITE_API_BASE_URL=https://<your-deployed-backend>
```

All routes are prefixed with `/api`. Full example: `https://api.adtua.com/api/signin`.

---

## Global conventions

### Response envelope
Every response, success or failure, uses this shape:

```json
{ "success": true, "data": { ... } }
{ "success": false, "error": "Human-readable message" }
```

The `data` key holds the payload. Never unwrap one level — always read `response.data.data` if using axios, or `body.data` directly.

A small number of older validation handlers return `{ "success": false, "errors": [...] }` (array, plural) instead of a single `error` string — notably screen/slot creation validation. Handle both shapes defensively on `400`s until this is unified.

### Field casing
All request bodies and response payloads use **snake_case** (`first_name`, `start_date`, etc.). The FE must map to camelCase internally.

### ID type
All entity IDs are **integers** (PostgreSQL bigserial), not UUIDs. Store them as numbers.

### Auth token
Bearer token returned in the response body on sign-in and sign-up. No cookies.
Attach to every protected request:
```
Authorization: Bearer <token>
```
Store in memory or `localStorage`. On any `401` response, clear the token and redirect to `/signin`.

---

## Auth — Signup flow (3 steps)

### Step 1 — Send OTP

```
POST /api/otp/send
```

Body: `{ "email": "user@example.com" }`

Success `200`: `{ "success": true, "message": "Code sent" }`

Errors: `400` missing email, `500` email send failure.

---

### Step 2 — Verify OTP

```
POST /api/otp/verify
```

Body: `{ "email": "user@example.com", "otp": "123456" }`

Success `200`: `{ "success": true, "otp_token": "<30-min token>" }`

Errors: `400` no code exists, `401` wrong code or expired.

Store `otp_token` in memory — it's needed in step 3.

---

### Step 3 — Create account

```
POST /api/signup
```

Body:
```json
{
  "email": "user@example.com",
  "password": "...",
  "first_name": "Honey",
  "last_name": "Patel",
  "phone": "+1 555 000 0000",
  "roles": ["advertiser"],
  "otp_token": "<token from step 2>"
}
```

Notes:
- `roles` array — valid values: `"advertiser"`, `"broadcaster"`. Can be both. Defaults to `["advertiser"]` if omitted.
- `phone` and `last_name` are optional.

Success `201`:
```json
{
  "success": true,
  "data": {
    "user": { "id": 42, "email": "user@example.com", "first_name": "Honey", "last_name": "Patel", "phone": null, "roles": ["advertiser"], "status": "active", "created_at": "..." },
    "token": "<jwt>"
  }
}
```

Errors: `400` OTP missing/invalid/expired or email already taken, `500`.

---

## Auth — Sign in / Sign out / Password reset

```
POST /api/signin          body: { "email", "password" }              -> { user, token }
POST /api/signout         auth required                              -> stateless, client discards token
POST /api/password-reset/request   body: { "email" }                 -> always 200 (no user enumeration)
POST /api/password-reset/reset     body: { "token", "new_password" } -> 400 if token invalid/expired
```

Password reset emails link to `<FRONTEND_URL>/reset-password/<token>`, valid 15 minutes.

---

## Current user

```
GET   /api/user/profile    auth required
PATCH /api/user/profile    auth required, send only fields to update
```

> **Corrected from the previous version of this doc**, which listed `/api/user/me` — that path doesn't exist; the real mount is `/api/user/profile`.

`GET` response, fields merged in based on role:
```json
{
  "success": true,
  "data": {
    "id": 42, "email": "...", "first_name": "...", "last_name": "...", "phone": null,
    "roles": ["advertiser"], "status": "active", "created_at": "...",
    "user_id": 42, "org_name": null, "notes": null
  }
}
```
- Advertiser fields: `user_id`, `org_name`, `notes`
- Broadcaster fields (in addition): `user_id`, `company_name`, `address_line1`, `address_line2`, `city`, `region`, `country`, `postal_code`

`PATCH` accepts any subset of the same fields (broadcaster fields only apply if caller has that role). Returns the full updated profile.

---

## NOT YET BUILT — items from the original FE contract

| Endpoint | Status | Notes |
|---|---|---|
| `GET /auth/google` | ❌ Not built | Not planned near-term |
| `PUT /users/me/onboarding` | ❌ Not built | Use `PATCH /api/user/profile` |
| `POST /users/me/intake` | ❌ Not built | Sequence: `PATCH /user/profile` → `POST /spaces` or `POST /campaigns` |
| `GET /users/me/onboarding-checklist` | ❌ Not built | Hardcode on FE; derive from whether the user has campaigns/spaces |

---

## Spaces

```
GET    /api/spaces/search      public — query: city, space_type, venue_type, indoor_outdoor, is_active
GET    /api/spaces/mine        broadcaster — caller's own spaces
POST   /api/spaces             broadcaster — create
GET    /api/spaces/:id         public
PATCH  /api/spaces/:id         broadcaster
DELETE /api/spaces/:id         broadcaster
```

Create/update body — required: `name`, `space_type`, `display_type`, `city`, `country`, `cpm`. Optional: `description`, `indoor_outdoor`, `venue_type`, `currency`, `file_formats_accepted` (array), `width_px`, `height_px`, `size_label`, `address_line1`, `address_line2`, `region`, `postal_code`, `geo_lat`, `geo_lng`, `est_daily_impressions`, `interests` (array).

Enums:
- `space_type`: `billboard`, `digital_screen`, `window_display`, `poster`, `transit_shelter`, `vehicle_wrap`, `projection`, `other`
- `display_type`: `static`, `digital_led`, `backlit`, `neon`, `projection`, `other`
- `indoor_outdoor`: `indoor`, `outdoor`
- `venue_type`: `shopping_mall`, `gym`, `transit_station`, `restaurant`, `bar`, `office_building`, `street_facing`, `airport`, `hotel`, `cinema`, `stadium`, `university`, `healthcare`, `other`
- `currency`: `USD` only — enforced by a DB check constraint, not just validation. US-only platform; there's no reason to send this field, it defaults to `USD`.

Space object (`cpm`/pricing fields are now mostly historical — see **Screens & Slots** below for how pricing actually works):
```json
{
  "id": 1, "broadcaster_id": 42, "name": "Downtown kiosk", "description": "...",
  "space_type": "digital_screen", "display_type": "digital_led", "indoor_outdoor": "indoor",
  "venue_type": "transit_station", "currency": "USD", "file_formats_accepted": ["image/jpeg"],
  "width_px": 1920, "height_px": 1080, "city": "Austin", "country": "US",
  "cpm": 18.00, "est_daily_impressions": 2400, "is_active": true, "created_at": "..."
}
```

### Space images
```
POST   /api/spaces/:id/images                     broadcaster — multipart/form-data, field "image"
GET    /api/spaces/:id/images                      public
PATCH  /api/spaces/:id/images/:imageId/primary     broadcaster
DELETE /api/spaces/:id/images/:imageId             broadcaster
```

---

## Screens & Slots (replaces the old direct space-slot model)

**This is the headline change since the previous version of this doc.** A space no longer has
slots directly — a space has **screens**, and each screen has its own slots. A broadcaster with
multiple physical displays in one venue configures and prices each independently.

**A space with zero screens is valid** — don't assume `screens` is always non-empty when rendering a space.

### Screens
```
GET    /api/spaces/:id/screens                    public — list a space's screens
POST   /api/spaces/:id/screens                     broadcaster — body: { "label": "Screen 1" }
PATCH  /api/spaces/:id/screens/:screenId           broadcaster — body: { "label"?, "is_active"? }
DELETE /api/spaces/:id/screens/:screenId           broadcaster — deactivates, does not hard-delete
```

`label` is required on create (non-empty string). Screen object: `{ "id", "space_id", "label", "is_active", "created_at" }`.

### Slots (per screen, per day of week)
```
GET    /api/spaces/:id/screens/:screenId/slots                public
POST   /api/spaces/:id/screens/:screenId/slots                 broadcaster
PATCH  /api/spaces/:id/screens/:screenId/slots/:slotId         broadcaster
DELETE /api/spaces/:id/screens/:screenId/slots/:slotId         broadcaster
GET    /api/spaces/:id/screens/:screenId/usage                 auth — ?date=YYYY-MM-DD, defaults to today
```

Create/update body:
```json
{
  "day_of_week": 1,
  "label": "Morning rush",
  "start_time": "08:00:00",
  "end_time": "10:00:00",
  "est_impressions_per_playback": 150,
  "daily_capacity_playbacks": 960,
  "total_price": 100.00
}
```
- `day_of_week`: integer 1–7, **1 = Monday, 7 = Sunday**. Each day is configured independently — up to 3 slots per day is the current product convention (not a hard backend limit).
- Broadcaster sets a flat `total_price` per slot directly — not a CPM calculation. This replaced the earlier CPM-estimate pricing model.
- `400` with `{ "success": false, "errors": [...] }` (array, see note in Global Conventions) on validation failure.

Usage response (`GET .../usage`):
```json
{
  "success": true,
  "data": {
    "screen_id": 5,
    "spot_duration_seconds": 15,
    "date": "2026-10-04",
    "slots": [ { "slot_id": 1, "daily_capacity_playbacks": 960, "allocated": 300, "remaining": 660 } ]
  }
}
```

**Validation errors on booking creation reference slot capacity by day** — the capacity check is now day-by-day across a booking's date range, not a single aggregate check. See **Bookings** below.

---

## Campaigns

```
GET    /api/campaigns             advertiser — caller's own campaigns
POST   /api/campaigns             advertiser — create
GET    /api/campaigns/public      broadcaster — public/active campaigns broadcasters can offer against
GET    /api/campaigns/:id         auth
PUT    /api/campaigns/:id         advertiser — full update
DELETE /api/campaigns/:id         advertiser
PATCH  /api/campaigns/:id/status  advertiser
```

> `GET /api/campaigns/public` is new since the previous version of this doc — it's what powers broadcasters browsing campaigns to send offers against (see **Campaign Offers** below).

Create body:
```json
{
  "name": "Spring launch", "objective": "Drive foot traffic",
  "start_date": "2026-07-01", "end_date": "2026-07-31",
  "total_budget": 2500, "budget_period": "monthly",
  "location": "Austin, TX", "ad_type": "image", "status": "draft"
}
```
`status`: `draft`, `active`, `paused`, `completed`, `archived`.

---

## Campaign offers (broadcaster → advertiser)

```
POST   /api/campaigns/:id/offers           broadcaster
GET    /api/campaigns/:id/offers            auth
PATCH   /api/campaigns/:id/offers/:offerId  auth (advertiser accepts/rejects, broadcaster cancels)
```

Create body — **each space must also specify which slot(s) it's proposing against**, not just a price:
```json
{
  "message": "We'd love to feature your campaign",
  "spaces": [
    {
      "space_id": 1,
      "proposed_price": 850.00,
      "slots": [
        { "slot_id": 10, "daily_playbacks_allocated": 100 }
      ]
    }
  ]
}
```
`slots` must be a non-empty array; each entry needs a valid `slot_id` and `daily_playbacks_allocated` (integer, ≥ 1).

Update body: `{ "status": "accepted" }` — valid: `pending`, `accepted`, `rejected`, `cancelled`.

A broadcaster can also list their own sent offers directly — see **Broadcaster** section below (`GET /api/broadcaster/offers`).

---

## Bookings

```
POST  /api/bookings           advertiser — create
GET   /api/bookings            auth — advertiser sees own, broadcaster sees theirs
GET   /api/bookings/:id        auth
PATCH /api/bookings/:id/status auth, role-gated per transition
```

Create body:
```json
{ "campaign_id": 1, "space_id": 1, "start_date": "2026-07-01", "end_date": "2026-07-31" }
```
Price is computed server-side from the targeted slot(s)' `total_price` — no price field needed from FE.

Success `201`:
```json
{
  "success": true,
  "data": { "id": 1, "campaign_id": 1, "space_id": 1, "broadcaster_id": 7, "status": "pending", "start_date": "2026-07-01", "end_date": "2026-07-31", "agreed_cpm": 18.00, "total_price": 1080.00, "created_at": "..." }
}
```

Errors: `400` — slot capacity exceeded on one or more days in range, campaign not owned by caller, space/screen inactive. Deleting a campaign/space/slot that has existing bookings now returns a clean `409` (not a `500`).

Status transitions:
| From | To | Who |
|---|---|---|
| `pending` | `accepted` | broadcaster |
| `pending` | `rejected` | broadcaster |
| `pending` | `cancelled` | advertiser |
| `accepted` | `cancelled` | advertiser or broadcaster |
| `active` | `cancelled` | advertiser or broadcaster |

Any other transition → `400`. Either party can unilaterally cancel once a booking's accepted or
active — already-played content is never refunded, cancelling just stops further cost. Note:
`accepted → active` and `active → completed` are **not** available through this endpoint at all —
both are exclusively system/cron-driven (date-based, no human actor), not something either party
triggers manually. `pending` requests also auto-expire after a 48h grace period (system-driven,
not an FE action).

---

## Booking assets (creative files)

```
POST   /api/bookings/:id/assets                   auth — multipart/form-data, field "asset"
GET    /api/bookings/:id/assets                    auth
PATCH  /api/bookings/:id/assets/:assetId/archive   auth
PATCH  /api/bookings/:id/assets/:assetId/activate  auth
DELETE /api/bookings/:id/assets/:assetId           auth
```

Asset object: `{ "id", "booking_id", "storage_path", "mime_type", "status", "created_at" }`.

---

## Wallet (new — advertiser-side)

```
GET  /api/wallet                advertiser — current balance
POST /api/wallet/topup          advertiser — body: { "amount": 100.00 }
GET  /api/wallet/transactions   advertiser — history, newest first
```

> **Simulated top-up** — credits the wallet directly, no real Stripe charge yet (see backlog ticket 13). Treat `topup` as real money for UI purposes; the actual charge integration is still to come.

Wallet object: `{ "id", "advertiser_id", "available", "created_at" }` (balance is in `available`).

Transaction object: `{ "id", "wallet_id", "type", "amount", "booking_id", "created_at" }`.

---

## Broadcaster

```
GET   /api/broadcaster/bookings          broadcaster — caller's bookings
GET   /api/broadcaster/bookings/incoming broadcaster — pending requests awaiting action
GET   /api/broadcaster/spaces            broadcaster — caller's spaces
GET   /api/broadcaster/offers            broadcaster — offers the caller has sent
GET   /api/broadcaster/ledger            broadcaster — accrual ledger (earnings)
```

> Corrected 2026-10-05 — the previous version of this doc also listed `GET /api/broadcaster/:id`
> (public profile) and `PATCH /api/broadcaster/profile`, carried over from the old pre-screens
> contract doc without re-checking. Neither exists; `broadcasterRoutes.ts` has exactly the 5
> routes above. A broadcaster's own profile is read/updated through `GET`/`PATCH
> /api/user/profile` (see **Current user** above), same endpoint as everyone else.

> `bookings/incoming`, `spaces`, `offers`, and `ledger` are all new since the previous version of this doc.

---

## Messaging

```
POST /api/messages/threads                   auth — body: { "other_user_id": 7 } — creates or returns existing thread
GET  /api/messages/threads                    auth — all threads for caller
GET  /api/messages/threads/:id/messages       auth — messages in thread, chronological
POST /api/messages/threads/:id/messages       auth — body: { "content": "..." }
POST /api/messages/threads/:id/attachments    auth — multipart/form-data, file attachment on a thread (new)
```

> **Corrected from the previous version of this doc**, which listed `POST /api/messages/thread` (singular, no nesting) and `GET/POST /api/messages/threads/:threadId` directly. The real paths are `/threads` (plural) to create/list, and messages live under the nested `/threads/:id/messages` path.

---

## Reviews

```
GET  /api/reviews    public — query params: ?target_type=broadcaster&reviewee_id=7 (both optional, filters)
POST /api/reviews    auth
```

> **Corrected from the previous version of this doc**, which listed `GET /api/reviews/:userId` as a path param. It's actually `GET /api/reviews` with `reviewee_id` as an optional query param.

Post body: `{ "reviewee_id": 7, "target_type": "broadcaster", "rating": 4, "comment": "..." }`. `target_type`: `space`, `broadcaster`, `advertiser`.

---

## Location

```
GET /api/location/autocomplete    public — query: ?query=<partial address>
```

Proxies Mapbox geocoding for address autocomplete during space creation. New since the previous version of this doc.

---

## Player / device pairing

Device-facing, but relevant to FE for the broadcaster-side pairing flow:

```
POST   /api/player/register                public, no auth — device calls this on boot
POST   /api/player/pair                     broadcaster, authenticated — completes pairing
GET    /api/player/:deviceId                public — device fetches its own current content
POST   /api/player/:deviceId/played         public — device reports a play event
DELETE /api/player/:deviceId                broadcaster — unpair/remove a device
```

`POST /api/player/pair` body: `{ "pairing_code": "123456", "screen_id": 5 }` — pairing targets a **screen**, not a space directly (a space may have multiple screens, each with its own paired device).

---

## Waitlist

```
POST /api/waitlist   public — body: { "email" }
```
Returns `201` on new signup, `200` if already on the list.

---

## Error reference

| HTTP | Meaning |
|---|---|
| `400` | Validation error or bad request — check `error` (or `errors`, see Global Conventions) |
| `401` | Not authenticated — clear token and redirect to `/signin` |
| `403` | Authenticated but wrong role for this endpoint |
| `404` | Resource not found |
| `409` | Conflict (e.g. duplicate booking on same dates) |
| `500` | Server error — show generic message, log `error` field |
