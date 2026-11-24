# Meridian — Personalized Multi-Category Recommendation System

![React](https://img.shields.io/badge/React-19.0-149eca?style=flat-square&logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-7.0-3178c6?style=flat-square&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06b6d4?style=flat-square&logo=tailwindcss&logoColor=white)
![Express](https://img.shields.io/badge/Express-4.21-0f172a?style=flat-square&logo=express&logoColor=white)
![Catalog](https://img.shields.io/badge/Catalog-1%2C156_Items_%C2%B7_10_Categories-2563eb?style=flat-square)

**Meridian** is a full-stack, responsive recommendation engine and media discovery platform driven by **user browsing history, explicit preferences, and cross-category taste transfer**. It pairs a **50-year cinema archive (`1976–2026`, 539 films)**—connecting timeless classics to **126 standout `2024–2026` new releases**—with **1,156 searchable items across 10 curated lifestyle and culture categories**, **franchise-aware search with rich top-match details**, **Bollywood, Hollywood & Regional cinema**, **streaming platform filtering**, **live cached posters**, and **Light / Dark / System themes**.

---

## Table of Contents

- [Key Capabilities](#key-capabilities)
- [System Architecture](#system-architecture)
- [Recommendation Engine Methodology](#recommendation-engine-methodology)
- [Catalog Coverage (1,156 Curated Items)](#catalog-coverage-1156-curated-items)
  - [50 Years of Cinema (`1976–2026`)](#50-years-of-cinema-19762026)
  - [All 10 Categories](#all-10-categories)
  - [Streaming Platforms & Industries](#streaming-platforms--industries)
- [Franchise Search & Related Discovery](#franchise-search--related-discovery)
- [Live Poster Fetching & Caching Pipeline](#live-poster-fetching--caching-pipeline)
- [Theme System (Light / Dark / System)](#theme-system-light--dark--system)
- [Project Structure](#project-structure)
- [Backend API Reference](#backend-api-reference)
- [Getting Started](#getting-started)
- [Extending the Catalog](#extending-the-catalog)

---

## Key Capabilities

- **Real-Time Browsing History Personalization**: Every item you **Explore** (view), **Like**, **Save**, or **Hide** immediately recalculates your preference vector across tags, moods, creators, eras, and categories.
- **50 Years of Cinema + Best in New (`1976–2026`)**: Dedicated **539-film** cinema vault covering every decade from the 1970s to 2026, with a personalized **Best in New Cinema (`2024–2026`)** spotlight informed by your classic and past-era favorites and **380 films from `2010–2026`**.
- **Franchise-Aware Search + Rich Top-Match Details + 10+ Related Picks**: Searching any title, franchise, director, cast member, platform, or industry (e.g., `John Wick`, `F1`, `Stree 2`, `Kalki 2898 AD`, `Bollywood`, `Kill`, `ZEE5`, `Netflix`) opens a full **Top Match Details** banner (poster, starring cast, language, streaming platforms, unclipped synopsis, recognition/awards, and themes) followed by chronological series installments (`1, 2, 3, 4` + spin-offs) and **10+ related recommendations**.
- **Cross-Category Taste Transfer**: Preferences learned in one domain flow naturally into others—for example, engaging with atmospheric sci-fi or Japanese cinema elevates synthwave scores, ramen/kaiseki dining, speculative novels, and architectural travel guides.
- **Streaming & Industry Filtering**: Filter across **Netflix**, **Prime Video**, **ZEE5**, **SonyLIV**, **Hotstar**, **Apple TV+**, **MUBI**, and **Theaters**, as well as **Hollywood**, **Bollywood**, **Indian Regional**, and **International** cinema.
- **Live Official Posters with Resilient Fallback**: Server-side cached Wikipedia MediaWiki poster lookup and allowlisted image proxy, paired with a zero-broken-image typographic fallback card.
- **Transparent Explanations**: Every recommendation displays a clear reason string citing exact items or themes from your browsing history.
- **Sample Personas & History Management**: Inspect your derived taste breakdown, remove individual log entries, restore hidden items, reset to a blank cold start, or switch between three built-in sample personas.

---

## System Architecture

```text
┌───────────────────────────────────────────────────────────────────────────┐
│                         React 19 Client (Vite SPA)                        │
│                                                                           │
│  ┌──────────────┐   ┌───────────────────────┐   ┌──────────────────────┐  │
│  │  Views & UI  │──▶│  Recommendation Engine │──▶│  Browser Storage     │  │
│  │  - For You   │   │  (recommender.ts)      │   │  - Taste & History   │  │
│  │  - 50Y Films │   │  - Signal Weights      │   │    (localStorage)    │  │
│  │  - 10 Cats   │   │  - Recency Decay       │   │  - Theme Preference  │  │
│  │  - History   │   │  - Franchise Search    │   │    (zero-flash boot) │  │
│  └──────┬───────┘   └───────────────────────┘   └──────────────────────┘  │
│         │                                                                 │
│         ▼ GET /api/poster & /api/poster-image                             │
└─────────┼─────────────────────────────────────────────────────────────────┘
          │
          ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                     Express Server (server.ts :3000)                      │
│                                                                           │
│  - In-Memory Poster URL Cache & In-Flight Request Deduplication           │
│  - MediaWiki Search/PageImages Resolver (title + year + category hints)   │
│  - Allowlisted Image Proxy (https://upload.wikimedia.org/ only)           │
│  - Vite Dev Middleware (development) / Static dist/ Server (production)   │
└───────────────────────────────────────────────────────────────────────────┘
```

---

## Recommendation Engine Methodology

All ranking logic lives in `src/engine/recommender.ts` and operates deterministically in real time with zero artificial latency.

### 1. Signal Extraction & Recency Decay (`computeSignalWeights`)

User interactions are aggregated from the latest 60 browsing events plus explicit preferences:

| Signal Source | Base Weight | Decay / Notes |
| :--- | :---: | :--- |
| **Like (`like`)** | `+2.8` | Multiplied by recency factor `max(0.55, 1.25 - index * 0.02)` (plus persistent `+1.2` tag / `+0.9` mood anchor) |
| **Save (`save`)** | `+2.4` | Multiplied by recency factor |
| **View / Explore (`view`)** | `+1.0` | Multiplied by recency factor |
| **Hide / Dislike (`dislike`)** | `-3.0` | Excludes the item and penalizes its tags and moods |
| **Taste Setup Tags** | `+2.5` | Direct user-selected genre/theme affinity |
| **Taste Setup Categories** | `+1.5` | Direct user-selected category priority |

### 2. Multi-Factor Scoring (`getRecommendations`)

When history or setup signals are present, each eligible candidate item is scored across seven normalized dimensions:

- **Tag Similarity (`2.2×`)**: Normalized overlap against the user's weighted theme vector.
- **Mood Alignment (`1.4×`)**: Normalized overlap against the user's weighted tone/mood vector.
- **Creator Affinity (`+1.15`)**: Boosts works by directors, authors, or artists the user previously enjoyed.
- **Category & Era Affinity (`+0.45` / `+0.35`)**: Gentle lift toward active categories and decades.
- **Critical Quality Baseline**: Normalized rating prior `(rating - 7.8) * 0.75`.
- **Unseen Discovery Lift (`+0.55`)**: Encourages fresh discoveries not yet viewed or liked.
- **Best in New Boost (`+1.45`)**: Applied when surfacing standout `2024–2026` releases aligned with past-era tastes.

When starting from a blank history (**Cold Start**), the engine falls back cleanly to critical acclaim paired with recent-release freshness until the user clicks or likes their first item.

---

## Catalog Coverage (1,156 Curated Items)

### 50 Years of Cinema (`1976–2026`)

The movie catalog (`src/data/movies50Years.ts` + `src/data/moviesExpanded.ts`) contains **539 unique films** distributed across six eras:

| Era | Film Count | Representative Titles |
| :--- | :---: | :--- |
| **1970s (`1976–1979`)** | 21 | *Taxi Driver*, *Network*, *Star Wars*, *Amar Akbar Anthony*, *Don*, *Gol Maal*, *Alien*, *Apocalypse Now*, *Stalker* |
| **1980s (`1980–1989`)** | 28 | *The Shining*, *Raiders of the Lost Ark*, *Blade Runner*, *The Thing*, *Paris, Texas*, *Mr. India*, *My Neighbor Totoro* |
| **1990s (`1990–1999`)** | 39 | *Goodfellas*, *The Silence of the Lambs*, *Jurassic Park*, *Pulp Fiction*, *Heat*, *DDLJ*, *Satya*, *The Matrix* |
| **2000s (`2000–2009`)** | 71 | *In the Mood for Love*, *Lagaan*, *Dil Chahta Hai*, *Spirited Away*, *Oldboy*, *Children of Men*, *The Dark Knight*, *Taken*, *3 Idiots* |
| **2010s (`2010–2019`)** | 161 | *Inception*, *The Raid: Redemption*, *Gangs of Wasseypur*, *John Wick (1–3)*, *Whiplash*, *Drishyam (Malayalam)*, *Arrival*, *Andhadhun*, *Tumbbad*, *Parasite* |
| **2020s (`2020–2026`)** | 219 | *RRR*, *John Wick: Chapter 4*, *Dune: Part Two*, *Kill*, *Maharaja*, *Deadpool & Wolverine*, *Furiosa*, *The Wild Robot*, *Stree 2*, *Kalki 2898 AD*, *Aavesham*, *Manjummel Boys*, *Amar Singh Chamkila*, *F1*, *Sinners*, *Superman*, *Ballerina*, *Project Hail Mary*, *The Odyssey*, *Dune: Part Three* |

> **Best in New (`2024–2026`)**: **126** current theatrical and OTT releases flagged with `isNew: true`, enriched with starring `cast`, `language`, `awards`/recognition, `platforms`, and unclipped synopsis details (`380` total films from `2010–2026`).

### All 10 Categories

| # | Category | Items | Domain Focus |
| :---: | :--- | :---: | :--- |
| 1 | **Movies** | 539 | 50-year Hollywood, Bollywood, Indian Regional & International cinema (`1976–2026`) |
| 2 | **Music** | 84 | Jazz, classic rock, electronic, hip-hop, R&B, classical, Bollywood OSTs & 2024–2025 albums |
| 3 | **TV Series** | 82 | Prestige crime, mystery thrillers, time-loop sci-fi, anime & Indian OTT series (*Panchayat*, *Mirzapur*, *Scam 1992*, *The Family Man*) |
| 4 | **Food & Dining** | 81 | Regional Indian classics (Hyderabadi biryani, masala dosa, chole bhature, litti chokha), ramen, Neapolitan pizza, mole, kaiseki & global street food |
| 5 | **Books** | 80 | Speculative sci-fi, cyberpunk, literary fiction, Indian modern classics, philosophy, economics & recent prize winners |
| 6 | **Games** | 70 | Soulslikes (*Elden Ring*, *Sekiro*), CRPGs (*Baldur's Gate 3*), narrative RPGs, metroidvanias, tactics & 2024–2025 indies (*Balatro*) |
| 7 | **Podcasts** | 60 | Architecture/design storytelling, song deconstructions, narrative journalism, history, tech & Indian founder podcasts |
| 8 | **Travel & Places** | 60 | Global cities, national parks, coastal retreats & Indian heritage destinations (Kyoto, Ladakh, Hampi, Goa, Udaipur, Iceland, Lisbon) |
| 9 | **Documentaries** | 50 | Visual essays, nature cinema, sports, music, true crime, mountaineering & Indian non-fiction |
| 10 | **Art & Design** | 50 | Architecture landmarks, industrial design, contemporary museums, typography & Indian modernist art/craft |
| — | **Total** | **1,156** | Zero duplicate IDs or title+category collisions, paginated in 36-item browse slices |

### Streaming Platforms & Industries

Movies include structured `industry` and `platforms` metadata for direct filtering:

- **Industries**: `Hollywood` (266) · `Bollywood` (179) · `Indian Regional` (49) · `International` (45)
- **Platforms**: `Prime Video` (352) · `Netflix` (248) · `Hotstar` (101) · `Theaters` (62) · `Apple TV+` (56) · `MUBI` (56) · `ZEE5` (37) · `SonyLIV` (17)

---

## Franchise Search & Related Discovery

Searching in either the **For You** bar or **50 Years of Movies** runs `searchWithRelated(query, items, state, 12)`:

1. **Direct & Franchise Matching**: Token-matches across `title`, `franchise`, `creator`, `cast`, `language`, `awards`, `tags`, `moods`, `platforms`, `industry`, `origin`, and `summary`. When multiple entries share a `franchise` (e.g., `John Wick`), installments are ordered chronologically (`2014 → 2017 → 2019 → 2023 → 2025`), and the top match renders a full-detail `FeaturedMatchBanner`.
2. **10+ Related Picks**: Aggregates the tags, moods, categories, and creators of the matched set, combines them with your personal taste weights, and ranks up to **12 closely related titles** outside the direct matches.

For example, searching **`John Wick`** displays:
- **Direct Matches**: *John Wick* (2014), *John Wick: Chapter 2* (2017), *John Wick: Chapter 3 – Parabellum* (2019), *John Wick: Chapter 4* (2023), and *From the World of John Wick: Ballerina* (2025).
- **10+ Related Action/Revenge Movies**: *Nobody*, *The Raid: Redemption*, *Atomic Blonde*, *Extraction*, *Bullet Train*, *The Equalizer*, *Monkey Man*, *Kill*, *Marco*, *The Killer*, *Taken*, and *The Accountant*.

---

## Live Poster & Visual Gallery Pipeline

Official posters, podcast cover art, culinary/travel photography, and scene stills (`2010–2026` and classic archives) are resolved on demand without fragile hardcoded third-party URLs:

1. **Client (`PosterThumb.tsx` & `ItemGallery.tsx`)**: Maintain in-memory session caches (`clientPosterCache`, `clientGalleryCache`) and request `/api/poster` and `/api/gallery` with `creator`, `wikiPage`, and `imageQuery` hints.
2. **Server Resolver (`server.ts`)**: Uses a polite concurrency-limited queue across exact Wikipedia `titles` lookups, category-aware Wikipedia `pageimages` queries, **Wikimedia Commons** `File:` photography search (for food, travel, architecture, and cast/scene stills), and **Apple iTunes Search** cover art (for podcasts & music fallbacks), with in-memory caching and request deduplication.
3. **Allowlisted Image Proxy (`/api/poster-image`)**: Strictly validates that upstream URLs belong to allowlisted hosts (`https://upload.wikimedia.org/`, `https://thumb.wikimedia.org/`, and `https://is*-ssl.mzstatic.com/`), streams image bytes with `Cache-Control: public, max-age=604800`, and prevents CORS or referrer failures.
4. **Typographic Fallback**: If no upstream image exists or a network request fails, `PosterThumb` renders a clean card showing title, release year, category icon, and category label—ensuring zero broken image frames.

---

## Theme System (Light / Dark / System)

- **Tailwind CSS v4 `@custom-variant dark`**: Configured in `src/index.css` via `@custom-variant dark (&:where(.dark, .dark *));` for deterministic class-based switching.
- **Zero-Flash Boot**: An inline `<script>` in `index.html` reads `localStorage.getItem('meridian_theme_v1')` before React mounts and applies `.dark` to `<html>` immediately.
- **Accessible Controls**: Switch between **Light** and **Dark** in the workspace toolbar or footer, or choose **Light**, **Dark**, or **System** inside **Taste Setup**.

---

## Project Structure

```text
├── index.html                      # Entry HTML, Google Fonts & zero-flash theme script
├── metadata.json                   # Applet metadata & capability declarations
├── package.json                    # Dependencies and npm scripts
├── server.ts                       # Express server, Vite dev middleware, poster & gallery API
├── tsconfig.json                   # TypeScript compiler configuration
├── vite.config.ts                  # Vite + React + Tailwind v4 configuration
└── src/
    ├── App.tsx                     # Root state, navigation, theme sync & For You view
    ├── index.css                   # Tailwind v4 import, @theme fonts & dark variant
    ├── main.tsx                    # React 19 DOM entry point
    ├── types/
    │   └── catalog.ts              # Shared interfaces (CatalogItem, UserTasteState, etc.)
    ├── data/
    │   ├── movies50Years.ts                  # Base 120-film archive & merger (539 total films)
    │   ├── moviesExpanded.ts                 # 419 additional global, Bollywood & regional films
    │   ├── categoriesCatalog.ts              # Category metadata & merged 617 non-movie items
    │   ├── categoriesExpandedMusicFood.ts    # Expanded music albums & global/Indian cuisine
    │   ├── categoriesExpandedBooksSeries.ts  # Expanded literature & global/Indian TV series
    │   ├── categoriesExpandedPodcastsGames.ts# Expanded podcasts & video games
    │   └── categoriesExpandedTravelDocsDesign.ts # Expanded travel, documentaries & art/design
    ├── engine/
    │   └── recommender.ts                    # Scoring engine, searchWithRelated & sample profiles
    └── components/
        ├── CategoriesView.tsx                # 10-category browser, search, Top Match & 36-item paging
        ├── FeaturedMatchBanner.tsx           # Full top-match detail panel & scene gallery on search
        ├── HistoryProfileView.tsx            # Taste profile bars, persona switchers & activity log
        ├── ItemCard.tsx                      # Card with poster, metadata, explanation & actions
        ├── ItemDetailModal.tsx               # Full synopsis, cast, awards, visuals & 10 related picks
        ├── ItemGallery.tsx                   # 4-photo Wikimedia Commons scenes/cast visual strip
        ├── MoviesArchiveView.tsx             # 50-year movie explorer, 2010–2026 visual reel & paging
        ├── PosterThumb.tsx                   # Cached poster image component with fallback card
        └── TasteSetupModal.tsx               # Theme, category, tag & sample profile modal
```

---

## Backend API Reference

### `GET /api/poster`

Resolves and caches a poster, album cover, podcast cover, or dish/destination photo URL for a catalog item.

- **Query Parameters**:
  - `title` *(required)*: Item title (e.g., `John Wick`)
  - `year` *(optional)*: Release year (e.g., `2014`)
  - `category` *(optional, default `movies`)*: Category identifier (`movies`, `series`, `music`, `food`, `travel`, `podcasts`, `books`, `games`, `documentaries`, `design`)
  - `creator`, `wikiPage`, `imageQuery` *(optional)*: Disambiguation and Commons search hints
- **Response (`200 OK`)**:
  ```json
  {
    "posterUrl": "/api/poster-image?url=https%3A%2F%2Fupload.wikimedia.org%2F..."
  }
  ```
  Returns `{ "posterUrl": null }` if no poster is found.

### `GET /api/gallery`

Resolves up to **4** relevant Wikimedia Commons photographs (cast/director premieres, locations, dishes, architecture, live performances) for an item.

- **Query Parameters**: `title` *(required)*, `year`, `category`, `creator`, `origin`, `cast`, `imageQuery`
- **Response (`200 OK`)**: `{ "images": [{ "imageUrl": "/api/poster-image?url=...", "caption": "..." }] }`

### `GET /api/poster-image`

Proxies an allowlisted Wikimedia (`upload.wikimedia.org` / `thumb.wikimedia.org`) or Apple Podcast/Album (`is*-ssl.mzstatic.com`) image asset with long-lived HTTP cache headers (`public, max-age=604800`).

- **Query Parameters**:
  - `url` *(required)*: Encoded allowlisted HTTPS image URL
- **Responses**: `200 OK` (image binary), `400 Bad Request` (non-allowlisted host), `404 Not Found` / `502 Bad Gateway` (upstream failure).

---

## Getting Started

### Prerequisites

- **Node.js** `v20+` (verified on `v22.23.2`)
- **npm**

### Local Development

```bash
# 1. Install dependencies
npm install

# 2. Start Express + Vite dev server on port 3000
npm run dev
```

Navigate to **`http://localhost:3000`**.

### Production Build & Verification

```bash
# Type-check with TypeScript
npm run lint

# Build client assets into dist/
npm run build

# Serve production build via Express on port 3000
NODE_ENV=production npm start
```

---

## Extending the Catalog

- **Add Movies**: Append entries to `RAW_MOVIES` in `src/data/movies50Years.ts`. Decade (`era`) and `isNew` (`year >= 2024`) are derived automatically, and `platforms` / `industry` support optional overrides. Set `franchise` to group sequels chronologically in search and detail views.
- **Add Items to Other Categories**: Append `CatalogItem` objects to `OTHER_CATEGORIES_ITEMS` in `src/data/categoriesCatalog.ts`.
- **Add Sample Personas**: Add presets to `SAMPLE_PROFILES` in `src/engine/recommender.ts` to expose them in **Taste Setup** and **History & Taste**.
