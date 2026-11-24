import { Bookmark, Heart, ArrowUpRight } from 'lucide-react';
import { CATEGORIES } from '../data/categoriesCatalog';
import { CatalogItem, CategoryId } from '../types/catalog';
import { PosterThumb } from './PosterThumb';
import { ItemGallery } from './ItemGallery';

const CATEGORY_LABELS: Record<CategoryId, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c.label])
) as Record<CategoryId, string>;

interface FeaturedMatchBannerProps {
  item: CatalogItem;
  matchPercent?: number;
  isLiked: boolean;
  isSaved: boolean;
  onOpen: (item: CatalogItem) => void;
  onToggleLike: (itemId: string) => void;
  onToggleSave: (itemId: string) => void;
}

export function FeaturedMatchBanner({
  item,
  matchPercent,
  isLiked,
  isSaved,
  onOpen,
  onToggleLike,
  onToggleSave,
}: FeaturedMatchBannerProps) {
  return (
    <section
      aria-label={`Details for ${item.title}`}
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-6"
    >
      <div className="flex flex-col sm:flex-row gap-5 items-start">
        <button
          type="button"
          onClick={() => onOpen(item)}
          className="shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded-lg cursor-pointer"
        >
          <PosterThumb
            id={item.id}
            title={item.title}
            year={item.year}
            category={item.category}
            creator={item.creator}
            wikiPage={item.wikiPage}
            imageQuery={item.imageQuery}
            className="w-28 sm:w-32 h-[168px] sm:h-[192px]"
          />
        </button>

        <div className="min-w-0 flex-1 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-medium text-slate-800 dark:text-slate-200">
                Top Match Details · {CATEGORY_LABELS[item.category]}
              </span>
              {item.industry && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{item.industry}</span>
                </>
              )}
              {item.language && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{item.language}</span>
                </>
              )}
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">{item.year}</span>
              <span aria-hidden="true">·</span>
              <span>{item.durationOrFormat}</span>
              {item.isNew && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-semibold text-blue-700 dark:text-blue-400">Best in New</span>
                </>
              )}
            </div>

            <div className="font-mono tabular-nums flex items-center gap-2 shrink-0">
              <span className="text-slate-700 dark:text-slate-300 font-medium">
                {item.rating.toFixed(1)}/10
              </span>
              {typeof matchPercent === 'number' && (
                <>
                  <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">·</span>
                  <span className="font-semibold text-blue-700 dark:text-blue-400">
                    {matchPercent}% match
                  </span>
                </>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              {item.title}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
              <span className="font-medium text-slate-800 dark:text-slate-200">Director / Creator: </span>
              {item.creator} <span aria-hidden="true">·</span> {item.origin}
            </p>
          </div>

          {item.cast && item.cast.length > 0 && (
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              <span className="font-medium text-slate-800 dark:text-slate-200">Starring: </span>
              {item.cast.join(', ')}
            </p>
          )}

          {item.platforms && item.platforms.length > 0 && (
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              <span className="font-medium text-slate-800 dark:text-slate-200">Where to watch: </span>
              <span className="text-slate-800 dark:text-slate-200 font-medium">
                {item.platforms.join(' · ')}
              </span>
            </p>
          )}

          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            {item.summary}
          </p>

          <div className="pt-1 space-y-1 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            <p>
              <span className="font-medium text-slate-800 dark:text-slate-200">Why it stands out: </span>
              {item.whyNotable}
            </p>
            {item.awards && (
              <p>
                <span className="font-medium text-slate-800 dark:text-slate-200">Recognition: </span>
                {item.awards}
              </p>
            )}
            <p className="text-xs text-slate-400 dark:text-slate-500 pt-0.5">
              {[...item.tags, ...item.moods].join(' · ')}
            </p>
          </div>

          <div className="pt-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onToggleLike(item.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                isLiked
                  ? 'bg-blue-700 dark:bg-blue-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-white' : ''}`} />
              <span>{isLiked ? 'Liked' : 'Like'}</span>
            </button>

            <button
              type="button"
              onClick={() => onToggleSave(item.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                isSaved
                  ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-current' : ''}`} />
              <span>{isSaved ? 'Saved' : 'Save'}</span>
            </button>

            <button
              type="button"
              onClick={() => onOpen(item)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors cursor-pointer"
            >
              <span>Full Details &amp; Related Picks</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      <div className="mt-5">
        <ItemGallery item={item} heading="Relevant Scenes, Cast & Visuals" maxImages={4} />
      </div>
    </section>
  );
}
