import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const USER_AGENT = 'MeridianRecommender/1.0 (https://meridian.local)';

// In-memory cache of item lookup key -> verified Wikimedia thumbnail URL (or null)
const posterUrlCache = new Map<string, string | null>();
const inflightLookups = new Map<string, Promise<string | null>>();

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

async function queryWikipediaPoster(searchTerm: string): Promise<string | null> {
  const endpoint = `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(
    searchTerm
  )}&gsrlimit=3&prop=pageimages&piprop=thumbnail&pithumbsize=500&pilicense=any&format=json`;

  const response = await fetch(endpoint, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'application/json',
    },
    signal: AbortSignal.timeout(5000),
  });

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as WikiQueryResponse;
  const pages = Object.values(data.query?.pages ?? {});
  pages.sort((a, b) => (a.index ?? 99) - (b.index ?? 99));

  for (const page of pages) {
    const src = page.thumbnail?.source;
    if (src && src.startsWith('https://upload.wikimedia.org/')) {
      return src.split('?')[0];
    }
  }
  return null;
}

async function resolvePosterUrl(title: string, year: string, category: string): Promise<string | null> {
  const cacheKey = `${category}::${title}::${year}`;
  if (posterUrlCache.has(cacheKey)) {
    return posterUrlCache.get(cacheKey) ?? null;
  }

  const existing = inflightLookups.get(cacheKey);
  if (existing) {
    return existing;
  }

  const lookupPromise = (async () => {
    try {
      const candidates: string[] = [];
      if (category === 'movies') {
        if (year) candidates.push(`${title} ${year} film`);
        candidates.push(`${title} film`);
        candidates.push(title);
      } else if (category === 'series') {
        candidates.push(`${title} TV series`);
        candidates.push(title);
      } else if (category === 'music') {
        candidates.push(`${title} album`);
        candidates.push(title);
      } else if (category === 'books') {
        candidates.push(`${title} novel`);
        candidates.push(title);
      } else if (category === 'games') {
        candidates.push(`${title} video game`);
        candidates.push(title);
      } else if (category === 'documentaries') {
        candidates.push(`${title} documentary film`);
        candidates.push(title);
      } else {
        candidates.push(title);
      }

      for (const query of candidates) {
        const found = await queryWikipediaPoster(query);
        if (found) {
          posterUrlCache.set(cacheKey, found);
          return found;
        }
      }

      posterUrlCache.set(cacheKey, null);
      return null;
    } catch {
      return null;
    } finally {
      inflightLookups.delete(cacheKey);
    }
  })();

  inflightLookups.set(cacheKey, lookupPromise);
  return lookupPromise;
}

async function startServer() {
  const app = express();

  app.get('/api/poster', async (req, res) => {
    const title = String(req.query.title || '').trim();
    const year = String(req.query.year || '').trim();
    const category = String(req.query.category || 'movies').trim();

    if (!title) {
      res.status(400).json({ posterUrl: null });
      return;
    }

    const remoteUrl = await resolvePosterUrl(title, year, category);
    if (!remoteUrl) {
      res.json({ posterUrl: null });
      return;
    }

    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.json({
      posterUrl: `/api/poster-image?url=${encodeURIComponent(remoteUrl)}`,
    });
  });

  app.get('/api/poster-image', async (req, res) => {
    const rawUrl = String(req.query.url || '').trim();
    if (!rawUrl.startsWith('https://upload.wikimedia.org/')) {
      res.status(400).send('Invalid image host');
      return;
    }

    try {
      const upstream = await fetch(rawUrl, {
        headers: {
          'User-Agent': USER_AGENT,
        },
        signal: AbortSignal.timeout(6000),
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
