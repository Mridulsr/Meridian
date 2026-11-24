import { useEffect, useState } from 'react';
import { Film, Music, BookOpen, Utensils, Tv, Mic, Gamepad2, MapPin, Video, Compass } from 'lucide-react';
import { CategoryId } from '../types/catalog';

// Client-side session cache so cards never re-fetch the same poster
const clientPosterCache = new Map<string, string | null>();

interface PosterThumbProps {
  id: string;
  title: string;
  year: number;
  category: CategoryId;
  creator?: string;
  wikiPage?: string;
  imageQuery?: string;
  className?: string;
}

function CategoryGlyph({ category }: { category: CategoryId }) {
  const cls = 'w-5 h-5 text-slate-400';
  switch (category) {
    case 'movies':
      return <Film className={cls} />;
    case 'music':
      return <Music className={cls} />;
    case 'food':
      return <Utensils className={cls} />;
    case 'books':
      return <BookOpen className={cls} />;
    case 'series':
      return <Tv className={cls} />;
    case 'podcasts':
      return <Mic className={cls} />;
    case 'games':
      return <Gamepad2 className={cls} />;
    case 'travel':
      return <MapPin className={cls} />;
    case 'documentaries':
      return <Video className={cls} />;
    case 'design':
      return <Compass className={cls} />;
  }
}

export function PosterThumb({
  id,
  title,
  year,
  category,
  creator = '',
  wikiPage = '',
  imageQuery = '',
  className = '',
}: PosterThumbProps) {
  const cacheKey = `${id}::${title}::${year}::${wikiPage}::${imageQuery}`;
  const [posterUrl, setPosterUrl] = useState<string | null | undefined>(() =>
    clientPosterCache.has(cacheKey) ? clientPosterCache.get(cacheKey) : undefined
  );
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setImgFailed(false);
    if (clientPosterCache.has(cacheKey)) {
      setPosterUrl(clientPosterCache.get(cacheKey) ?? null);
      return;
    }

    let cancelled = false;
    const params = new URLSearchParams({
      title,
      year: String(year),
      category,
    });
    if (creator) params.set('creator', creator);
    if (wikiPage) params.set('wikiPage', wikiPage);
    if (imageQuery) params.set('imageQuery', imageQuery);

    fetch(`/api/poster?${params.toString()}`)
      .then((res) => (res.ok ? res.json() : { posterUrl: null }))
      .then((data: { posterUrl?: string | null }) => {
        const resolved = data.posterUrl ?? null;
        clientPosterCache.set(cacheKey, resolved);
        if (!cancelled) {
          setPosterUrl(resolved);
        }
      })
      .catch(() => {
        clientPosterCache.set(cacheKey, null);
        if (!cancelled) {
          setPosterUrl(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [cacheKey, title, year, category, creator, wikiPage, imageQuery]);

  const showImage = Boolean(posterUrl) && !imgFailed;

  return (
    <div
      className={`relative overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 shrink-0 ${className}`}
    >
      {showImage ? (
        <img
          src={posterUrl as string}
          alt={`${title} (${year}) poster`}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setImgFailed(true)}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-between p-2.5 bg-gradient-to-b from-slate-100 to-slate-200/80 dark:from-slate-800 dark:to-slate-900 text-center select-none">
          <span className="text-[10px] font-mono tabular-nums text-slate-500 dark:text-slate-400 self-end">
            {year}
          </span>
          <div className="flex flex-col items-center gap-1.5 my-auto">
            <CategoryGlyph category={category} />
            <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200 leading-tight line-clamp-3">
              {title}
            </span>
          </div>
          <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 capitalize">
            {category}
          </span>
        </div>
      )}
    </div>
  );
}
