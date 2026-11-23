# Meridian — Personalized Multi-Category Recommendation System

![React](https://img.shields.io/badge/React-19.0-149eca?style=flat-square&logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-7.0-3178c6?style=flat-square&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06b6d4?style=flat-square&logo=tailwindcss&logoColor=white)
![Express](https://img.shields.io/badge/Express-4.21-0f172a?style=flat-square&logo=express&logoColor=white)
![Catalog](https://img.shields.io/badge/Catalog-197_Items_%C2%B7_10_Categories-2563eb?style=flat-square)

**Meridian** is a full-stack, responsive recommendation engine and media discovery platform driven by **user browsing history, explicit preferences, and cross-category taste transfer**. It pairs a **50-year cinema archive (`1976–2026`)**—connecting timeless classics to standout **2024–2026 new releases**—with **10 curated lifestyle and culture categories**, **franchise-aware search**, **Bollywood, Hollywood & Regional cinema**, **streaming platform filtering**, **live cached movie posters**, and **Light / Dark / System themes**.

---

## Table of Contents

- [Key Capabilities](#key-capabilities)
- [System Architecture](#system-architecture)
- [Recommendation Engine Methodology](#recommendation-engine-methodology)
- [Catalog Coverage (197 Curated Items)](#catalog-coverage-197-curated-items)
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
- **50 Years of Cinema + Best in New (`1976–2026`)**: Dedicated cinema vault covering every decade from the 1970s to 2026, with a personalized **Best in New Cinema (`2024–2026`)** spotlight informed by your classic and past-era favorites.
- **Franchise-Aware Search + 10+ Related Picks**: Searching any title, franchise, director, platform, or industry (e.g., `John Wick`, `Bollywood`, `Kill`, `ZEE5`, `Netflix`) returns chronological series installments (`1, 2, 3, 4` + spin-offs) alongside **10+ related recommendations**.
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

## Catalog Coverage (197 Curated Items)

### 50 Years of Cinema (`1976–2026`)

The movie catalog (`src/data/movies50Years.ts`) contains **97 films** distributed across six eras:

| Era | Film Count | Representative Titles |
| :--- | :---: | :--- |
| **1970s (`1976–1979`)** | 10 | *Taxi Driver*, *Network*, *Star Wars*, *Amar Akbar Anthony*, *Don*, *Gol Maal*, *Alien*, *Apocalypse Now*, *Stalker* |
| **1980s (`1980–1989`)** | 8 | *The Shining*, *Raiders of the Lost Ark*, *Blade Runner*, *The Thing*, *Paris, Texas*, *Mr. India*, *My Neighbor Totoro* |
| **1990s (`1990–1999`)** | 10 | *Goodfellas*, *The Silence of the Lambs*, *Jurassic Park*, *Pulp Fiction*, *Heat*, *DDLJ*, *Satya*, *The Matrix* |
| **2000s (`2000–2009`)** | 11 | *In the Mood for Love*, *Lagaan*, *Dil Chahta Hai*, *Spirited Away*, *Oldboy*, *Children of Men*, *The Dark Knight*, *Taken*, *3 Idiots* |
| **2010s (`2010–2019`)** | 24 | *Inception*, *The Raid: Redemption*, *Gangs of Wasseypur*, *John Wick (1–3)*, *Whiplash*, *Drishyam*, *Arrival*, *Andhadhun*, *Tumbbad*, *Parasite* |
| **2020s (`2020–2026`)** | 34 | *RRR*, *John Wick: Chapter 4*, *Jawan*, *12th Fail*, *Pathaan*, *Dune: Part Two*, *Kill*, *Maharaja*, *Laapataa Ladies*, *Ballerina*, *Sinners*, *Project Hail Mary*, *The Odyssey* |

> **Best in New (`2024–2026`)**: **20** current theatrical and OTT releases flagged with `isNew: true`.

### All 10 Categories

| # | Category | Items | Domain Focus |
| :---: | :--- | :---: | :--- |
| 1 | **Movies** | 97 | 50-year Hollywood, Bollywood, Indian Regional & International cinema (`1976–2026`) |
| 2 | **Music** | 12 | Modal jazz, classic rock, French house, art rock, hip-hop, R&B, film scores & 2024–2025 albums |
| 3 | **Food & Dining** | 12 | Artisanal ramen, Neapolitan pizza, Oaxacan mole, Sichuan mapo tofu, kaiseki, Nordic foraging & mezze |
| 4 | **Books** | 12 | Speculative sci-fi, cyberpunk, literary mysteries, historical sagas & 2024 prize winners |
| 5 | **TV Series** | 12 | Prestige crime, mystery thrillers, time-loop sci-fi & 2024–2025 limited series |
| 6 | **Games** | 12 | Classic JRPGs, spatial puzzles, narrative RPGs, metroidvanias & 2024–2025 indie hits |
| 7 | **Podcasts** | 10 | Architecture/design storytelling, song deconstructions, longform history & food science |
| 8 | **Travel & Places** | 10 | Kyoto, Lisbon, Mexico City, Dolomites, Copenhagen, Naoshima, Oaxaca, Seoul, Iceland & Skye |
| 9 | **Documentaries** | 10 | Visual essays, longitudinal sports, culinary mastery, mountaineering & 2024 award docs |
| 10 | **Art & Design** | 10 | Dieter Rams, Saul Bass, Tadao Ando, Hiroshi Sugimoto, Isamu Noguchi & teamLab Borderless |

### Streaming Platforms & Industries

Movies include structured `industry` and `platforms` metadata for direct filtering:

- **Industries**: `Hollywood` (53) · `Bollywood` (32) · `International` (8) · `Indian Regional` (4)
- **Platforms**: `Prime Video` (66) · `Netflix` (50) · `SonyLIV` (11) · `Hotstar` (11) · `ZEE5` (10) · `Apple TV+` (9) · `MUBI` (6) · `Theaters` (6)

---

## Franchise Search & Related Discovery

Searching in either the **For You** bar or **50 Years of Movies** runs `searchWithRelated(query, items, state, 12)`:

1. **Direct & Franchise Matching**: Token-matches across `title`, `franchise`, `creator`, `tags`, `moods`, `platforms`, `industry`, `origin`, and `summary`. When multiple entries share a `franchise` (e.g., `John Wick`), installments are ordered chronologically (`2014 → 2017 → 2019 → 2023 → 2025`).
2. **10+ Related Picks**: Aggregates the tags, moods, categories, and creators of the matched set, combines them with your personal taste weights, and ranks up to **12 closely related titles** outside the direct matches.

For example, searching **`John Wick`** displays:
- **Direct Matches**: *John Wick* (2014), *John Wick: Chapter 2* (2017), *John Wick: Chapter 3 – Parabellum* (2019), *John Wick: Chapter 4* (2023), and *From the World of John Wick: Ballerina* (2025).
- **10+ Related Action/Revenge Movies**: *Nobody*, *The Raid: Redemption*, *Atomic Blonde*, *Extraction*, *Bullet Train*, *The Equalizer*, *Monkey Man*, *Kill*, *Marco*, *The Killer*, *Taken*, and *The Accountant*.

---

## Live Poster Fetching & Caching Pipeline

Official poster and cover artwork is resolved on demand without relying on fragile hardcoded third-party URLs:

1. **Client (`PosterThumb.tsx`)**: Maintains an in-memory session cache (`clientPosterCache`) and requests `/api/poster?title=...&year=...&category=...` with lazy image loading.
2. **Server Resolver (`server.ts`)**: Builds category-aware search queries (e.g., `"<Title> <Year> film"`, `"<Title> album"`, `"<Title> novel"`), queries Wikipedia's MediaWiki `pageimages` API with `pilicense=any`, deduplicates concurrent in-flight lookups, and caches resolved URLs in memory.
3. **Allowlisted Image Proxy (`/api/poster-image`)**: Strictly validates that upstream image URLs begin with `https://upload.wikimedia.org/` (preventing SSRF), streams the image bytes with `Cache-Control: public, max-age=604800`, and prevents browser CORS or referrer failures.
4. **Typographic Fallback**: If no upstream image exists or a network request fails, `PosterThumb` renders a clean, balanced card showing the title, release year, category icon, and category label—ensuring zero broken image frames.

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
├── server.ts                       # Express server, Vite dev middleware & poster API
├── tsconfig.json                   # TypeScript compiler configuration
├── vite.config.ts                  # Vite + React + Tailwind v4 configuration
└── src/
    ├── App.tsx                     # Root state, navigation, theme sync & For You view
    ├── index.css                   # Tailwind v4 import, @theme fonts & dark variant
    ├── main.tsx                    # React 19 DOM entry point
    ├── types/
    │   └── catalog.ts              # Shared interfaces (CatalogItem, UserTasteState, etc.)
    ├── data/
    │   ├── movies50Years.ts        # 97-film 50-year cinema dataset (1976–2026)
    │   └── categoriesCatalog.ts    # Metadata & 100 items across the other 9 categories
    ├── engine/
    │   └── recommender.ts          # Scoring engine, breakdown analytics & sample profiles
    └── components/
        ├── CategoriesView.tsx      # 10-category browser with search & new-release filter
        ├── HistoryProfileView.tsx  # Taste profile bars, persona switchers & activity log
        ├── ItemCard.tsx            # Card with poster, metadata, explanation & actions
        ├── ItemDetailModal.tsx     # Full synopsis, platforms, series & 10 related picks
        ├── MoviesArchiveView.tsx   # 50-year movie explorer, OTT & industry filters
        ├── PosterThumb.tsx         # Cached poster image component with fallback card
        └── TasteSetupModal.tsx     # Theme, category, tag & sample profile modal
```

---

## Backend API Reference

### `GET /api/poster`

Resolves and caches a poster URL for a catalog item.

- **Query Parameters**:
  - `title` *(required)*: Item title (e.g., `John Wick`)
  - `year` *(optional)*: Release year (e.g., `2014`)
  - `category` *(optional, default `movies`)*: Category identifier (`movies`, `series`, `music`, `books`, `games`, `documentaries`, etc.)
- **Response (`200 OK`)**:
  ```json
  {
    "posterUrl": "/api/poster-image?url=https%3A%2F%2Fupload.wikimedia.org%2F..."
  }
  ```
  Returns `{ "posterUrl": null }` if no poster is found.

### `GET /api/poster-image`

Proxies an allowlisted Wikimedia image asset with long-lived HTTP cache headers (`public, max-age=604800`).

- **Query Parameters**:
  - `url` *(required)*: Encoded URL starting with `https://upload.wikimedia.org/`
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
