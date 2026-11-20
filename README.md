# Meridian — Personal Recommendation System

**Meridian** is a minimalist, responsive recommendation web application powered by **user browsing history and past preferences**. It spans **50 years of cinema (1976–2026)**—pairing classic films with standout **2024–2026 new releases**—alongside **10 curated categories** including Music, Food & Dining, Books, TV Series, Podcasts, Games, Travel, Documentaries, and Art & Design.

It also includes **franchise-aware search** (e.g., searching `John Wick` surfaces Parts 1, 2, 3, 4, and *Ballerina* plus 10+ related action/revenge films), **Bollywood, Hollywood & Regional cinema**, **streaming platform filtering** (`Netflix`, `Prime Video`, `ZEE5`, `SonyLIV`, `Hotstar`, `Apple TV+`, `MUBI`, `Theaters`), **live poster fetching**, and **Light / Dark / System themes**.

---

## Features

- **History-Driven Recommendation Engine**
  - Learns in real time from every item you **Explore (view)**, **Like**, **Save**, or **Hide**, as well as explicit themes and priority categories chosen in **Taste Setup**.
  - Applies recency weighting so your most recent browsing activity has the strongest influence.
  - Transfers taste signals across categories (for example, liking atmospheric sci-fi or Japanese cinema surfaces related synthwave music, ramen/kaiseki dining, cyberpunk books, and Kyoto travel).
  - Explains *why* each item is recommended in plain language (e.g., citing specific films or themes from your history).

- **50 Years of Movies (1976–2026) & Best in New**
  - **97 curated films** spanning every decade from the **1970s (1976)** through **2026**, including **20 new releases (2024–2026)** highlighted in **Best in New Cinema**.
  - Decade filtering (`All 50 Years`, `Best New (2024–2026)`, `2020s`, `2010s`, `2000s`, `1990s`, `1980s`, `1970s`), genre filtering, and sorting (`Best Match`, `Highest Rated`, `Newest First`, `1976 to 2026`).

- **Franchise Search & 10+ Related Recommendations**
  - Searching any movie, franchise, platform, or industry (such as `John Wick`, `Bollywood`, `Kill`, `Andhadhun`, `Netflix`, `Prime Video`, `ZEE5`, or `SonyLIV`) returns:
    1. **Direct / Franchise Matches** (e.g., *John Wick*, *Chapter 2*, *Chapter 3 – Parabellum*, *Chapter 4*, and *Ballerina* in order).
    2. **10+ Related Picks** matched by shared genres, choreography/tone, creator lineage, and your personal taste history.
  - Opening any title in the detail modal also displays **More in the Series** and **10 Related Picks**.

- **10 Curated Categories (197 Total Items)**
  | Category | Items | Highlights |
  | :--- | :---: | :--- |
  | **Movies** | 97 | 50 years of Hollywood, Bollywood, Indian Regional & International cinema (`1976–2026`) |
  | **Music** | 12 | Jazz, electronic, indie, hip-hop, R&B, film scores & new albums |
  | **Food & Dining** | 12 | Regional dishes, fermentation craft, kaiseki, ramen, mole & contemporary kitchens |
  | **Books** | 12 | Hard sci-fi, literary thrillers, classics & recent award winners |
  | **TV Series** | 12 | Prestige dramas, crime series, sci-fi mysteries & recent limited series |
  | **Games** | 12 | Narrative RPGs, puzzles, roguelikes & recent releases |
  | **Podcasts** | 10 | Design essays, music deconstructions, deep history & investigative audio |
  | **Travel & Places** | 10 | Cultural cities, alpine trails, architecture islands & food hubs |
  | **Documentaries** | 10 | Music history, culinary portraits, mountaineering & archival essays |
  | **Art & Design** | 10 | Industrial design, modernist architecture, photography & spatial installations |

- **Streaming Platform & Industry Filters**
  - Filter movies across **Netflix**, **Prime Video**, **ZEE5**, **SonyLIV**, **Hotstar**, **Apple TV+**, **MUBI**, and **Theaters**, and by industry (**Bollywood**, **Hollywood**, **Indian Regional**, **International**).

- **Live Poster Artwork with Resilient Fallback**
  - Fetches and caches official poster/cover artwork via an Express proxy (`/api/poster` and `/api/poster-image`) and falls back gracefully to a clean typographic card if an image is unavailable.

- **Light, Dark & System Themes**
  - Switch instantly between **Light**, **Dark**, and **System** appearance modes from the main toolbar, **Taste Setup** modal, or footer, persisted in `localStorage`.

- **Browsing History & Sample Personas**
  - Inspect your derived top themes, moods, and active eras under **History & Taste**.
  - Manage liked, saved, hidden, and chronological browsing entries, reset to a blank slate, or switch between 3 sample personas (*Sci-Fi & Culinary Explorer*, *Classic Cinema & Jazz Buff*, *Indie Games & Modern Design*).

---

## How the Recommendation Scoring Works

Each candidate item is scored dynamically in `src/engine/recommender.ts`:

1. **Signal Extraction (`computeSignalWeights`)**:
   - Aggregates weights from your browsing history (`view`: `1.0`, `save`: `2.4`, `like`: `2.8`, `dislike`: `-3.0`) scaled by a recency multiplier (`1.25` down to `0.55`).
   - Adds explicit preferences from **Taste Setup** (`preferredTags` and `preferredCategories`).
2. **Item Ranking (`getRecommendations`)**:
   - Combines normalized **tag similarity**, **mood alignment**, **creator match**, **category & era affinity**, **critical rating baseline**, and a **novelty boost** for items you have not yet viewed.
3. **Related & Franchise Matching (`getRelatedToItem`, `searchWithRelated`)**:
   - Groups series installments chronologically and scores non-franchise candidates by tag/mood overlap, creator affinity, and user taste weights to surface 10+ related recommendations.

---

## Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS v4 (`@tailwindcss/vite`), Lucide Icons
- **Backend**: Node.js, Express (`server.ts`) with Vite dev middleware and poster caching/proxy routes
- **State Persistence**: Browser `localStorage` (`meridian_taste_state_v2`, `meridian_theme_v1`)

---

## Project Structure

```text
├── index.html                  # HTML entry, Google Fonts & zero-flash theme script
├── package.json                # Scripts & dependencies
├── server.ts                   # Express server + Vite middleware + /api/poster proxy
├── vite.config.ts              # Vite + Tailwind CSS v4 configuration
└── src/
    ├── App.tsx                 # Main layout, navigation, search & state management
    ├── index.css               # Tailwind v4 setup & @custom-variant dark
    ├── main.tsx                # React entry point
    ├── types/
    │   └── catalog.ts          # TypeScript interfaces for items, history & profiles
    ├── data/
    │   ├── movies50Years.ts    # 97-film 50-year cinema dataset (1976–2026)
    │   └── categoriesCatalog.ts# Curated items for the remaining 9 categories
    ├── engine/
    │   └── recommender.ts      # Hybrid taste scoring, search & related-item engine
    └── components/
        ├── ItemCard.tsx        # Recommendation card with poster & preference controls
        ├── ItemDetailModal.tsx # Full item details, series sequels & 10 related picks
        ├── MoviesArchiveView.tsx # 50-year cinema archive, OTT & industry filters
        ├── CategoriesView.tsx  # 10-category directory with search & new-release filter
        ├── HistoryProfileView.tsx # Taste breakdown, personas & browsing history log
        ├── TasteSetupModal.tsx # Theme, category, theme-tag & profile configurator
        └── PosterThumb.tsx     # Cached poster thumbnail with typographic fallback
```

---

## Getting Started

### Prerequisites

- **Node.js** `v20+` (tested on `v22.x`)
- **npm**

### Installation & Local Development

```bash
# 1. Install dependencies
npm install

# 2. Start the development server (Express + Vite on port 3000)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Available Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts the Express + Vite development server on port `3000` (`tsx server.ts`). |
| `npm run build` | Builds the production frontend bundle into `dist/`. |
| `npm start` | Runs the server (`node server.ts`). Set `NODE_ENV=production` to serve `dist/`. |
| `npm run lint` | Runs TypeScript type-checking (`tsc --noEmit`). |

---

## Backend API Endpoints

- `GET /api/poster?title=<title>&year=<year>&category=<category>`
  - Resolves and caches an official poster/cover image URL and returns `{ "posterUrl": "/api/poster-image?url=..." }` (or `{ "posterUrl": null }` when unavailable).
- `GET /api/poster-image?url=<encoded_wikimedia_url>`
  - Proxies allowlisted `upload.wikimedia.org` image assets with cache headers.
