import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const USER_AGENT = 'MeridianDiscoveryApp/1.0 (https://meridian.local) Node/22';

// In-memory caches & in-flight deduplication
const posterUrlCache = new Map<string, string | null>();
const inflightPosterLookups = new Map<string, Promise<string | null>>();
const galleryCache = new Map<string, GalleryImage[]>();
const inflightGalleryLookups = new Map<string, Promise<GalleryImage[]>>();

export interface GalleryImage {
  imageUrl: string;
  caption: string;
}

interface WikiQueryResponse {
  query?: {
    pages?: Record<
      string,
      {
        index?: number;
        title?: string;
        thumbnail?: {
          source?: string;
        };
      }
    >;
  };
}

interface CommonsQueryResponse {
  query?: {
    pages?: Record<
      string,
      {
        index?: number;
        title?: string;
        imageinfo?: Array<{
          thumburl?: string;
          url?: string;
          mime?: string;
        }>;
      }
    >;
  };
}

interface ItunesSearchResponse {
  results?: Array<{
    collectionName?: string;
    trackName?: string;
    artistName?: string;
    artworkUrl600?: string;
    artworkUrl100?: string;
  }>;
}

function isAllowedImageUrl(rawUrl: string): boolean {
  if (!rawUrl) return false;
  if (rawUrl.startsWith('https://upload.wikimedia.org/')) return true;
  if (rawUrl.startsWith('https://thumb.wikimedia.org/')) return true;
  if (/^https:\/\/is\d-ssl\.mzstatic\.com\//.test(rawUrl)) return true;
  return false;
}

function stripUtm(url: string): string {
  return url.split('?')[0];
}

// Polite concurrency limiter so bursts of cards don't hit Wikimedia rate limits
let activeWikiRequests = 0;
const wikiWaitQueue: Array<() => void> = [];

async function withWikiRateLimit<T>(fn: () => Promise<T>): Promise<T> {
  if (activeWikiRequests >= 4) {
    await new Promise<void>((resolve) => wikiWaitQueue.push(resolve));
  }
  activeWikiRequests += 1;
  try {
    return await fn();
  } finally {
    activeWikiRequests -= 1;
    const next = wikiWaitQueue.shift();
    if (next) {
      setTimeout(next, 35);
    }
  }
}

async function fetchJsonSafe<T>(url: string, timeoutMs = 5500): Promise<T | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) return null;
    const text = await response.text();
    if (!text.startsWith('{') && !text.startsWith('[')) return null;
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

async function queryWikipediaExact(pageTitle: string): Promise<string | null> {
  if (!pageTitle.trim()) return null;
  return withWikiRateLimit(async () => {
    const endpoint = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(
      pageTitle
    )}&redirects=1&prop=pageimages&piprop=thumbnail&pithumbsize=500&pilicense=any&format=json`;
    const data = await fetchJsonSafe<WikiQueryResponse>(endpoint);
    if (!data) return null;
    const pages = Object.values(data.query?.pages ?? {});
    for (const page of pages) {
      const src = page.thumbnail?.source;
      if (src && isAllowedImageUrl(src)) {
        return stripUtm(src);
      }
    }
    return null;
  });
}

async function queryWikipediaPoster(searchTerm: string): Promise<string | null> {
  if (!searchTerm.trim()) return null;
  return withWikiRateLimit(async () => {
    const endpoint = `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(
      searchTerm
    )}&gsrlimit=3&prop=pageimages&piprop=thumbnail&pithumbsize=500&pilicense=any&format=json`;
    const data = await fetchJsonSafe<WikiQueryResponse>(endpoint);
    if (!data) return null;

    const pages = Object.values(data.query?.pages ?? {});
    pages.sort((a, b) => (a.index ?? 99) - (b.index ?? 99));

    for (const page of pages) {
      const src = page.thumbnail?.source;
      if (src && isAllowedImageUrl(src)) {
        return stripUtm(src);
      }
    }
    return null;
  });
}

function cleanCommonsCaption(fileTitle: string | undefined): string {
  if (!fileTitle) return 'Related archival photograph';
  return fileTitle
    .replace(/^File:/i, '')
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[_-]+/g, ' ')
    .trim();
}

async function queryCommonsImages(
  searchTerm: string,
  limit = 4
): Promise<Array<{ url: string; caption: string }>> {
  if (!searchTerm.trim()) return [];
  return withWikiRateLimit(async () => {
    const endpoint = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrsearch=${encodeURIComponent(
      searchTerm
    )}&gsrlimit=${limit + 3}&prop=imageinfo&iiprop=url|mime&iiurlwidth=640&format=json`;

    const data = await fetchJsonSafe<CommonsQueryResponse>(endpoint);
    if (!data) return [];

    const pages = Object.values(data.query?.pages ?? {});
    pages.sort((a, b) => (a.index ?? 99) - (b.index ?? 99));

    const results: Array<{ url: string; caption: string }> = [];
    for (const page of pages) {
      const info = page.imageinfo?.[0];
      const mime = info?.mime || '';
      const raw = info?.thumburl || info?.url;
      if (
        raw &&
        isAllowedImageUrl(raw) &&
        (mime === 'image/jpeg' || mime === 'image/png' || mime === 'image/webp')
      ) {
        results.push({
          url: stripUtm(raw),
          caption: cleanCommonsCaption(page.title),
        });
      }
      if (results.length >= limit) break;
    }
    return results;
  });
}

async function queryItunesArt(term: string, entity: 'podcast' | 'album'): Promise<string | null> {
  if (!term.trim()) return null;
  const endpoint = `https://itunes.apple.com/search?term=${encodeURIComponent(
    term
  )}&entity=${entity}&limit=3`;
  const data = await fetchJsonSafe<ItunesSearchResponse>(endpoint, 5000);
  const first = data?.results?.[0];
  const raw = first?.artworkUrl600 || first?.artworkUrl100;
  if (!raw) return null;
  const hiRes = raw.replace(/\/\d+x\d+bb\./, '/600x600bb.');
  return isAllowedImageUrl(hiRes) ? hiRes : null;
}

async function resolvePosterUrl(params: {
  title: string;
  year: string;
  category: string;
  creator: string;
  wikiPage: string;
  imageQuery: string;
}): Promise<string | null> {
  const { title, year, category, creator, wikiPage, imageQuery } = params;
  const cacheKey = `${category}::${title}::${year}::${wikiPage}::${imageQuery}`;
  if (posterUrlCache.has(cacheKey)) {
    return posterUrlCache.get(cacheKey) ?? null;
  }

  const existing = inflightPosterLookups.get(cacheKey);
  if (existing) {
    return existing;
  }

  const lookupPromise = (async () => {
    try {
      // 1. Exact Wikipedia page override if supplied
      if (wikiPage) {
        const exact = await queryWikipediaExact(wikiPage);
        if (exact) {
          posterUrlCache.set(cacheKey, exact);
          return exact;
        }
      }

      // 2. Podcasts: Apple Podcasts artwork first, then Wikipedia
      if (category === 'podcasts') {
        const itunes = await queryItunesArt(imageQuery || `${title} ${creator}`.trim(), 'podcast');
        if (itunes) {
          posterUrlCache.set(cacheKey, itunes);
          return itunes;
        }
      }

      // 3. Visual/experiential categories with Commons photo search priority when imageQuery given
      if (imageQuery && (category === 'food' || category === 'travel' || category === 'design')) {
        const commons = await queryCommonsImages(imageQuery, 1);
        if (commons[0]?.url) {
          posterUrlCache.set(cacheKey, commons[0].url);
          return commons[0].url;
        }
      }

      // 4. Category-aware Wikipedia poster search
      const candidates: string[] = [];
      if (category === 'movies') {
        if (year) candidates.push(`${title} ${year} film`);
        if (creator) candidates.push(`${title} ${creator} film`);
        candidates.push(`${title} film`);
        candidates.push(title);
      } else if (category === 'series') {
        if (year) candidates.push(`${title} ${year} TV series`);
        candidates.push(`${title} TV series`);
        if (creator) candidates.push(`${title} ${creator}`);
        candidates.push(title);
      } else if (category === 'music') {
        if (creator) candidates.push(`${title} ${creator} album`);
        candidates.push(`${title} album`);
        candidates.push(title);
      } else if (category === 'books') {
        if (creator) candidates.push(`${title} ${creator} novel`);
        candidates.push(`${title} novel`);
        candidates.push(title);
      } else if (category === 'games') {
        candidates.push(`${title} video game`);
        candidates.push(title);
      } else if (category === 'documentaries') {
        if (year) candidates.push(`${title} ${year} documentary`);
        candidates.push(`${title} documentary film`);
        candidates.push(title);
      } else {
        if (imageQuery) candidates.push(imageQuery);
        candidates.push(title);
      }

      for (const query of candidates) {
        const found = await queryWikipediaPoster(query);
        if (found) {
          posterUrlCache.set(cacheKey, found);
          return found;
        }
      }

      // 5. Fallback for music albums to iTunes Search
      if (category === 'music') {
        const albumArt = await queryItunesArt(`${title} ${creator}`.trim(), 'album');
        if (albumArt) {
          posterUrlCache.set(cacheKey, albumArt);
          return albumArt;
        }
      }

      // 6. Fallback to Wikimedia Commons for any remaining category
      const commonsFallback = await queryCommonsImages(imageQuery || title, 1);
      if (commonsFallback[0]?.url) {
        posterUrlCache.set(cacheKey, commonsFallback[0].url);
        return commonsFallback[0].url;
      }

      posterUrlCache.set(cacheKey, null);
      return null;
    } catch {
      return null;
    } finally {
      inflightPosterLookups.delete(cacheKey);
    }
  })();

  inflightPosterLookups.set(cacheKey, lookupPromise);
  return lookupPromise;
}

async function resolveGalleryImages(params: {
  title: string;
  year: string;
  category: string;
  creator: string;
  origin: string;
  cast: string;
  imageQuery: string;
}): Promise<GalleryImage[]> {
  const { title, year, category, creator, origin, cast, imageQuery } = params;
  const cacheKey = `${category}::${title}::${year}::${creator}::${imageQuery}`;
  if (galleryCache.has(cacheKey)) {
    return galleryCache.get(cacheKey) ?? [];
  }

  const existing = inflightGalleryLookups.get(cacheKey);
  if (existing) {
    return existing;
  }

  const lookupPromise = (async () => {
    try {
      const queries: string[] = [];
      if (imageQuery) {
        queries.push(imageQuery);
      }

      if (category === 'movies' || category === 'series' || category === 'documentaries') {
        const leadActor = cast.split(',')[0]?.trim();
        if (leadActor) {
          queries.push(`${leadActor} ${title}`);
        }
        if (creator) {
          queries.push(`${creator} ${title}`);
          queries.push(`${creator} ${year}`);
        }
        queries.push(`${title} ${year} premiere`);
        queries.push(title);
      } else if (category === 'travel') {
        queries.push(`${title} ${origin}`);
        queries.push(creator || title);
      } else if (category === 'food') {
        queries.push(`${title} ${origin}`);
        queries.push(title);
      } else if (category === 'music') {
        if (creator) queries.push(`${creator} live concert`);
        queries.push(`${title} ${creator}`);
      } else if (category === 'design') {
        if (creator) queries.push(`${creator} ${title}`);
        queries.push(`${title} ${origin}`);
      } else {
        if (creator) queries.push(`${creator}`);
        queries.push(title);
      }

      const seenUrls = new Set<string>();
      const collected: GalleryImage[] = [];

      for (const q of queries) {
        if (!q.trim()) continue;
        const found = await queryCommonsImages(q, 4);
        for (const item of found) {
          if (!seenUrls.has(item.url)) {
            seenUrls.add(item.url);
            collected.push({
              imageUrl: `/api/poster-image?url=${encodeURIComponent(item.url)}`,
              caption: item.caption,
            });
          }
          if (collected.length >= 4) break;
        }
        if (collected.length >= 4) break;
      }

      galleryCache.set(cacheKey, collected);
      return collected;
    } catch {
      return [];
    } finally {
      inflightGalleryLookups.delete(cacheKey);
    }
  })();

  inflightGalleryLookups.set(cacheKey, lookupPromise);
  return lookupPromise;
}

async function startServer() {
  const app = express();

  app.get('/api/poster', async (req, res) => {
    const title = String(req.query.title || '').trim();
    const year = String(req.query.year || '').trim();
    const category = String(req.query.category || 'movies').trim();
    const creator = String(req.query.creator || '').trim();
    const wikiPage = String(req.query.wikiPage || '').trim();
    const imageQuery = String(req.query.imageQuery || '').trim();

    if (!title) {
      res.status(400).json({ posterUrl: null });
      return;
    }

    const remoteUrl = await resolvePosterUrl({
      title,
      year,
      category,
      creator,
      wikiPage,
      imageQuery,
    });

    if (!remoteUrl) {
      res.json({ posterUrl: null });
      return;
    }

    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.json({
      posterUrl: `/api/poster-image?url=${encodeURIComponent(remoteUrl)}`,
    });
  });

  app.get('/api/gallery', async (req, res) => {
    const title = String(req.query.title || '').trim();
    const year = String(req.query.year || '').trim();
    const category = String(req.query.category || 'movies').trim();
    const creator = String(req.query.creator || '').trim();
    const origin = String(req.query.origin || '').trim();
    const cast = String(req.query.cast || '').trim();
    const imageQuery = String(req.query.imageQuery || '').trim();

    if (!title) {
      res.status(400).json({ images: [] });
      return;
    }

    const images = await resolveGalleryImages({
      title,
      year,
      category,
      creator,
      origin,
      cast,
      imageQuery,
    });

    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.json({ images });
  });

  app.get('/api/poster-image', async (req, res) => {
    const rawUrl = String(req.query.url || '').trim();
    if (!isAllowedImageUrl(rawUrl)) {
      res.status(400).send('Invalid image host');
      return;
    }

    try {
      const upstream = await fetch(rawUrl, {
        headers: {
          'User-Agent': USER_AGENT,
        },
        signal: AbortSignal.timeout(7000),
      });

      if (!upstream.ok) {
        res.status(404).end();
        return;
      }

      const contentType = upstream.headers.get('content-type') || 'image/jpeg';
      const arrayBuffer = await upstream.arrayBuffer();
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=604800');
      res.send(Buffer.from(arrayBuffer));
    } catch {
      res.status(502).end();
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Meridian server running on http://localhost:${PORT}`);
  });
}

startServer();
