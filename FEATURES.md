# Adtua — Feature Overview - June 2026

Adtua is a marketplace that connects **Advertisers** (brands and agencies looking to place ads) with **Broadcasters** (owners of physical or digital ad spaces). The platform handles discovery, negotiation, booking, and reviews between these two parties.

---

## User Roles

Every account has one or more roles assigned at signup. Each role unlocks a different set of features.

| Role | Who it's for |
|---|---|
| **Advertiser** | Brands or agencies running ad campaigns |
| **Broadcaster** | Owners of ad spaces (billboards, screens, venues) |

A user can hold both roles simultaneously.

---

## Getting an Account

### Waitlist
Before the platform is open, anyone can join the waitlist by submitting their email. Duplicate submissions are handled gracefully.

### Signup (OTP-verified)
Signup is a two-step process to verify email ownership:

1. **Request a code** — Enter your email and receive a 6-digit verification code (valid for 10 minutes).
2. **Verify the code** — Submit the code to receive a short-lived OTP token (valid for 30 minutes).
3. **Create your account** — Submit your name, email, password, chosen role(s), and the OTP token. On success, you receive a JWT and a welcome email is sent.

Password requirements: minimum 8 characters, at least one letter and one number.

### Sign In / Sign Out
Sign in with email and password to receive a JWT. All subsequent authenticated requests use this token in the `Authorization: Bearer <token>` header. Signing out invalidates the session on the client side.

### Password Reset
Forgot your password? Submit your email to receive a reset link (valid for 15 minutes). Follow the link and submit a new password to regain access.

---

## Advertiser Features

### Campaigns
Advertisers manage their advertising activity through **campaigns**. Each campaign defines the budget, dates, and targeting intent.

**What you can do:**
- **Create a campaign** with a name, total budget, start/end dates, objective, location, ad type, and visibility (public or private).
- **List your campaigns** — see all campaigns you own.
- **View a campaign** by ID.
- **Update campaign details** — edit name, budget, dates, location, ad type, visibility.
- **Update campaign status** — move a campaign through its lifecycle: `draft → active → paused → completed → archived`.
- **Delete a campaign**.

Campaigns start as `draft`. Setting one to `active` and `public` makes it visible to broadcasters browsing the marketplace.

### Direct Bookings
Advertisers can book a space directly without going through the offer flow.

**What you can do:**
- **Create a booking** — select a campaign, a space, and a date range. The system validates that the space is active, there are no conflicting bookings for those dates, and calculates the total price from the space's CPM and estimated daily impressions.
- **List your bookings** — see all bookings tied to your campaigns.
- **View a booking** by ID.
- **Cancel a booking**.

A direct booking starts as `pending` and waits for the broadcaster to accept or reject it.

### Booking Creative Assets
Once a booking exists, advertisers (and broadcasters) can upload and manage the ad creatives that will run on the space.

**What you can do:**
- **Upload a creative** — attach an image (JPEG, PNG, WebP, GIF) or video (MP4, MOV) directly to a booking. Max 100 MB per file.
- **Promote a message attachment** — instead of re-uploading, pass the URL of a file already shared in the messaging thread to add it as a booking creative instantly.
- **View all creatives** — list every asset on a booking with its current status. Both the advertiser and broadcaster can view.
- **Archive a creative** — move a creative to the archive when it's no longer running. Archived assets are kept and can be recycled.
- **Re-activate a creative** — bring an archived creative back to active status. Multiple creatives can be active simultaneously (a creative set).
- **Delete a creative** — permanently remove an asset from the booking.

Active assets represent what is currently scheduled to run on the space. Archived assets act as a library of past material that either party can reuse.

### Campaign Offers (receiving)
When broadcasters submit offers on your campaigns, you can:

- **View all offers** on a campaign you own — see which broadcasters are interested, which spaces they're proposing, and at what prices.
- **Accept an offer** — the system automatically creates bookings for every space in the offer at the proposed prices, with status `accepted`.
- **Reject an offer**.

### Reviews
Advertisers can leave reviews for broadcasters or spaces after an engagement.

---

## Broadcaster Features

### Spaces (Inventory Management)
Broadcasters manage their ad inventory as **spaces** — physical or digital locations where ads can be displayed.

**What you can do:**
- **Create a space** with details: name, description, type (digital/physical), display type, city, country, coordinates, dimensions, interests/categories, CPM rate, and estimated daily impressions.
- **List your spaces** via the broadcaster dashboard or the `/spaces/mine` endpoint.
- **View any space** by ID (public, no login required).
- **Update a space** — edit any field. Only the owning broadcaster can do this.
- **Delete a space**.

### Space Images
Broadcasters can upload photos of their spaces to give advertisers a clear picture of the physical or digital location.

**What you can do:**
- **Upload images** — attach up to 10 photos per space (JPEG, PNG, or WebP, max 5 MB each). The first upload automatically becomes the primary image.
- **Set a primary image** — designate any image as the thumbnail shown in search results and listings.
- **Delete an image** — remove a photo from the space. If the primary image is deleted, the broadcaster can set a new one.
- **List all images** for a space — public, no login required.

Space images are profile photos of the location itself — they do not represent ad creatives and are not part of the booking asset lifecycle.

### Browsing Campaigns
Broadcasters can browse the marketplace to find campaigns that are a good fit for their spaces.

- **List public active campaigns** — `GET /api/campaigns/public` returns all advertiser campaigns marked as `public` and `active`. This is the primary discovery surface for broadcasters.
- **View a campaign by ID** — `GET /api/campaigns/:id` is accessible to both advertisers (returns their own campaign) and broadcasters (returns any public campaign, used to inspect details before submitting an offer).

### Making Offers
When a broadcaster finds a campaign they want to pitch for:

- **Submit an offer** on a campaign — propose one or more of your spaces. For each space, specify the target `slot_id`, `daily_playbacks_allocated`, and a `proposed_price`. The platform validates space ownership and that the total proposed price doesn't exceed the campaign's remaining budget.
- **Cancel a pending offer** you made.
- **View your own offers** on a campaign (you only see your offers, not other broadcasters').

### Broadcaster Dashboard
A consolidated view of the broadcaster's activity:

- **My bookings** — all pending and active bookings across your spaces, joined with campaign details.
- **My spaces** — all spaces you own.
- **My offers** — all campaign offers you've submitted, across all campaigns.

### Reviews
Broadcasters can also leave reviews for advertisers.

---

## Messaging

Advertisers and broadcasters can communicate directly through an in-app messaging system. One thread exists per advertiser–broadcaster pair, regardless of how many campaigns or spaces they're discussing.

### Threads
- **Start or retrieve a thread** — provide a `space_id` (advertiser contacting a space's owner) or a `campaign_id` (broadcaster contacting a campaign's advertiser). The system resolves the other party automatically. Calling this again returns the existing thread — it's idempotent.
- **List your threads** — see all conversations. Dual-role users see threads from both sides of their activity.
- Threads are **auto-created** when a booking is made or an offer is submitted, so both parties always have a channel open without any manual action.

### Messages
- **Send a message** in a thread. Only thread participants can send or read messages.
- **Attach a file** — upload an image (JPEG, PNG, WebP, GIF) or video (MP4, MOV, max 50 MB) as an attachment. The upload returns a URL and MIME type that can be included when sending the next message.
- **Send a message with an attachment** — after uploading, include the attachment URL and type in the message body. The FE renders these as thumbnails inline in the conversation.
- **Read message history** — full chronological thread history, participants only.

### Promoting Attachments to Booking Creatives
Files shared in a thread can be promoted to active booking creatives without re-uploading. Pass the attachment URL and MIME type to `POST /api/bookings/:id/assets` and the file is instantly added to the booking's creative library.

---

## Shared Features (Both Roles)

### Space Search (Public)
Anyone — logged in or not — can search for spaces. Filters available:

- Keyword (name/description)
- City, region
- Space type, venue type, indoor/outdoor
- CPM range (min/max)
- Interests/categories
- Active status (defaults to active only)
- **Radius search** — pass `lat`, `lng`, and `radius` (km) to find spaces within a geographic area. Results include a `distance_km` field and are sorted nearest first. Only spaces that have been geocoded are included.

Results are ordered by creation date, or by distance when radius search is active.

### Bookings (shared access)
Both roles can view bookings they're involved in:

- **Advertiser** sees bookings tied to their campaigns.
- **Broadcaster** sees bookings tied to their spaces.
- Either party can view a specific booking by ID if they're a party to it.

Broadcasters can **accept or reject** incoming booking requests. Advertisers can **cancel** bookings.

### Reviews (reading)
Anyone can read reviews. No login required to browse reviews for a broadcaster, advertiser, or space.

---

## Location Services

### Address Autocomplete (Public)
Any client can query the address autocomplete endpoint to power address input fields:

- **Search addresses** — type a partial address and receive up to 5 suggestions with display name, latitude, and longitude. Powered by the Mapbox Geocoding API.
- **Proximity bias** — optionally pass the user's current `lat`/`lng` to bias results toward their location.

### Automatic Geocoding
When a broadcaster creates or updates a space with address fields (`address_line1`, `city`, `country`, `postal_code`), the backend automatically geocodes the address and stores `geo_lat`/`geo_lng` on the space. No manual coordinate input is needed.

### Screen Devices (Raspberry Pi Player)
Broadcasters can pair physical screen devices (e.g. a Raspberry Pi in kiosk mode) to their spaces. The device polls the API every 30 seconds and receives the active creative to display.

**Device lifecycle:**
1. **Register** — device boots and calls `POST /api/player/register`. Receives a unique `device_id` (stored locally) and a 6-digit pairing code (valid 10 minutes).
2. **Pair** — broadcaster enters the 6-digit code in the dashboard via `POST /api/player/pair`, linking the device to a space.
3. **Poll** — device calls `GET /api/player/:deviceId` every 30 seconds. Returns the active creative, the current slot, and `duration_seconds` (always 15). If the device is not yet paired, returns the pairing code instead.
4. **Report** — after each play, device calls `POST /api/player/:deviceId/played` to log a play event (booking, asset, duration, completion).
5. **Deactivate** — broadcaster can remove a device via `DELETE /api/player/:deviceId`.

Broadcasters can list all devices paired to a space via `GET /api/spaces/:id/devices`.

### Play Event Tracking
Every time a screen device plays a creative, a `play_event` record is stored with device, booking, asset, duration, and completion flag. This is the foundation for impression reporting, proof-of-play, and the pacing algorithm.

---

## Planning System

### The Playback Unit
The atomic unit of airtime is one **playback** = 15 seconds of screen time. This applies equally to video and to static images (a static image displayed for 15 seconds counts as one playback). All scheduling, pricing, and tracking is expressed in playbacks.

### Time Slots
Each space is divided into **time slots** — default three 8-hour blocks in UTC:

| Slot | Hours (UTC) | Default impression estimate | Default price multiplier |
|---|---|---|---|
| Overnight | 00:00 – 08:00 | 50 per playback | 0.7× |
| Daytime | 08:00 – 16:00 | 150 per playback | 1.0× |
| Prime | 16:00 – 24:00 | 250 per playback | 1.5× |

Three default slots are seeded automatically when a space is created. Broadcasters can customise per-slot `est_impressions_per_playback`, `daily_capacity_playbacks`, and `price_multiplier` via `PATCH /api/spaces/:id/slots/:slotId`.

The slot list for any space is public: `GET /api/spaces/:id/slots`.

### Slot-Based Bookings
Every booking must target a specific slot. When creating a booking, an advertiser passes `slot_id` and `daily_playbacks_allocated`. The system:

1. Validates the slot belongs to the requested space.
2. Checks that the requested allocation does not exceed the slot's remaining daily capacity across the date range.
3. Calculates the price using the slot-aware formula:

```
price_per_playback  = (CPM / 1000) × slot.est_impressions_per_playback × slot.price_multiplier
total_price         = daily_playbacks_allocated × duration_days × price_per_playback
```

Multiple advertisers can share the same slot on the same space as long as the combined `daily_playbacks_allocated` stays within `daily_capacity_playbacks`.

### Real-Time Playback Pacing
When a screen device polls the player endpoint, the BE resolves what to play in real time:

1. Determines the current UTC time and finds the matching slot for that space.
2. Fetches all slot-based bookings active today for that slot.
3. Counts each booking's played events for today from `play_events`.
4. Picks the booking with the highest **remaining** allocation (`daily_playbacks_allocated − used_today`). This is a greedy fair-share algorithm — the booking furthest behind its daily allocation plays next.
5. If all bookings have exhausted their allocation for the day, a broadcaster-configured **default asset** is shown (if set), otherwise the screen goes idle.
6. If no slot covers the current time (screen is off-air), the player returns `active: false`.

The player response includes the current `slot` object and `duration_seconds` (always 15) so the client never hardcodes timing.

### Space Usage & Busy Bar
`GET /api/spaces/:id/usage` returns a real-time snapshot of playback usage for a given date (defaults to today):

- Per slot: `daily_capacity_playbacks`, `total_allocated_playbacks`, `total_used_playbacks`, `pct_capacity_sold`
- Per booking within each slot: `daily_playbacks_allocated`, `used_today`, `remaining_today`, `pct_used`

The FE uses this to render a segmented busy bar per slot, with each advertiser's share shown as a coloured segment filled as their playbacks are consumed throughout the day.

---

## What's in the Schema but Not Yet Exposed

These tables exist in the database but have no active API endpoints yet:

| Feature | Status |
|---|---|
| **Payments** | Schema exists (`payments` table), no endpoints |
| **Agreements / contracts** | Schema exists (`agreements` table), no endpoints |
| **Analytics / stats** | Schema exists (`stats` table), no endpoints |
| **Subscription plans** | Schema exists (`subscription_plans`, `subscriptions` tables), no endpoints |
| **Admin endpoints** | `admin` role exists in auth, no admin-specific routes |

---

## Booking & Offer Lifecycle

### Direct Booking
```
Advertiser creates booking (pending)
    → Broadcaster accepts / rejects
    → If accepted: booking is active for the date range
    → Advertiser can cancel at any point
```

### Offer Flow
```
Advertiser creates campaign (draft → active + public)
    → Broadcaster browses public campaigns
    → Broadcaster submits offer with space(s) + proposed prices
    → Advertiser reviews offer
    → Advertiser accepts → bookings auto-created (accepted status)
      OR
    → Advertiser rejects offer
    → Broadcaster can cancel their own pending offer
```

---

## Pricing

All bookings use slot-based pricing:
```
price_per_playback = (CPM / 1000) × slot.est_impressions_per_playback × slot.price_multiplier
total_price        = daily_playbacks_allocated × duration_days × price_per_playback
```

In the offer flow, the broadcaster sets a custom `proposed_price` per space, which overrides the formula when the booking is auto-created on acceptance.