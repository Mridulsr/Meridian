import { useEffect, useState } from 'react';
import { CatalogItem } from '../types/catalog';

interface GalleryEntry {
  imageUrl: string;
  caption: string;
}

const clientGalleryCache = new Map<string, GalleryEntry[]>();

interface ItemGalleryProps {
  item: CatalogItem;
  heading?: string;
  maxImages?: number;
}

export function ItemGallery({
  item,
  heading = 'Related Visuals & Photography',
  maxImages = 4,
}: ItemGalleryProps) {
  const cacheKey = `${item.id}::${item.title}::${item.year}::${item.imageQuery ?? ''}`;
  const [images, setImages] = useState<GalleryEntry[]>(() => clientGalleryCache.get(cacheKey) ?? []);
  const [loading, setLoading] = useState<boolean>(() => !clientGalleryCache.has(cacheKey));
  const [failedUrls, setFailedUrls] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setFailedUrls({});
    if (clientGalleryCache.has(cacheKey)) {
      setImages(clientGalleryCache.get(cacheKey) ?? []);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    const params = new URLSearchParams({
      title: item.title,
      year: String(item.year),
      category: item.category,
      creator: item.creator,
      origin: item.origin,
    });
    if (item.cast && item.cast.length > 0) {
      params.set('cast', item.cast.slice(0, 2).join(','));
    }
    if (item.imageQuery) {
      params.set('imageQuery', item.imageQuery);
    }

    fetch(`/api/gallery?${params.toString()}`)
      .then((res) => (res.ok ? res.json() : { images: [] }))
      .then((data: { images?: GalleryEntry[] }) => {
        const list = Array.isArray(data.images) ? data.images : [];
        clientGalleryCache.set(cacheKey, list);
        if (!cancelled) {
          setImages(list);
          setLoading(false);
        }
      })
      .catch(() => {
        clientGalleryCache.set(cacheKey, []);
        if (!cancelled) {
          setImages([]);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [cacheKey, item.title, item.year, item.category, item.creator, item.origin, item.cast, item.imageQuery]);

  const visibleImages = images.filter((img) => !failedUrls[img.imageUrl]).slice(0, maxImages);

  if (loading) {
    return (
      <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">{heading}</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {Array.from({ length: maxImages }).map((_, idx) => (
            <div
              key={idx}
              className="aspect-[4/3] rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (visibleImages.length === 0) {
    return null;
  }

  return (
    <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
      <p className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-2.5">
        {heading}{' '}
        <span className="font-mono tabular-nums text-slate-400 dark:text-slate-500">
          ({visibleImages.length})
        </span>
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {visibleImages.map((img) => (
          <figure key={img.imageUrl} className="group space-y-1">
            <div className="aspect-[4/3] overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800">
              <img
                src={img.imageUrl}
                alt={`${item.title} — ${img.caption}`}
                title={img.caption}
                loading="lazy"
                referrerPolicy="no-referrer"
                onError={() =>
                  setFailedUrls((prev) => ({
                    ...prev,
                    [img.imageUrl]: true,
                  }))
                }
                className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
              />
            </div>
            <figcaption className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              {img.caption}
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
