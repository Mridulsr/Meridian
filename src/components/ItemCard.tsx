import { Bookmark, EyeOff, Heart, ArrowUpRight } from 'lucide-react';
import { CATEGORIES } from '../data/categoriesCatalog';
import { CatalogItem, CategoryId } from '../types/catalog';
import { PosterThumb } from './PosterThumb';

const CATEGORY_LABELS: Record<CategoryId, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c.label])
) as Record<CategoryId, string>;

interface ItemCardProps {
  item: CatalogItem;
  matchPercent?: number;
  reasons?: string[];
  isLiked: boolean;
  isSaved: boolean;
  onOpen: (item: CatalogItem) => void;
  onToggleLike: (itemId: string) => void;
  onToggleSave: (itemId: string) => void;
  onDislike: (itemId: string) => void;
}

export function ItemCard({
  item,
  matchPercent,
  reasons,
  isLiked,
  isSaved,
  onOpen,
  onToggleLike,
  onToggleSave,
  onDislike,
}: ItemCardProps) {
  return (
    <article className="group flex flex-col justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 transition-colors duration-150 hover:border-slate-300 dark:hover:border-slate-700">
      <div>
        {/* Quiet unboxed metadata line */}
        <div className="flex items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400 mb-3">
          <div className="flex items-center gap-1.5 truncate">
            <span className="font-medium text-slate-700 dark:text-slate-300">{CATEGORY_LABELS[item.category]}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">{item.year}</span>
            {item.isNew && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-medium text-blue-700 dark:text-blue-400">Best in New</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0 font-mono tabular-nums">
            <span className="text-slate-600 dark:text-slate-400">{item.rating.toFixed(1)}/10</span>
            {typeof matchPercent === 'number' && (
              <>
                <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">·</span>
                <span className="font-semibold text-blue-700 dark:text-blue-400">{matchPercent}% match</span>
              </>
            )}
          </div>
        </div>

        {/* Poster + Title/Details */}
        <div className="flex items-start gap-3.5">
          <button
            type="button"
            onClick={() => onOpen(item)}
            aria-label={`Open ${item.title}`}
            className="shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded-lg cursor-pointer"
          >
            <PosterThumb
              id={item.id}
              title={item.title}
              year={item.year}
              category={item.category}
              className="w-20 h-[120px]"
            />
          </button>

          <div className="min-w-0 flex-1">
            <button
              type="button"
              onClick={() => onOpen(item)}
              className="text-left w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded cursor-pointer"
            >
              <h3 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-100 leading-snug group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
                {item.title}
              </h3>
            </button>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5 truncate">
              {item.creator} <span aria-hidden="true">·</span> {item.industry ?? item.origin}
            </p>
            {item.platforms && item.platforms.length > 0 && (
              <p className="text-xs text-slate-700 dark:text-slate-300 font-medium mt-0.5 truncate">
                {item.platforms.slice(0, 3).join(' · ')}
              </p>
            )}
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed mt-2 line-clamp-2">
              {item.summary}
            </p>
          </div>
        </div>

        {/* Unboxed Tags */}
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-3 truncate">
          {item.tags.slice(0, 4).join(' · ')}
        </p>
      </div>

      <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800">
        {reasons && reasons.length > 0 && (
          <p className="text-xs text-slate-600 dark:text-slate-400 mb-2.5 line-clamp-1">
            {reasons[0]}
          </p>
        )}

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onToggleLike(item.id)}
              aria-pressed={isLiked}
              title={isLiked ? 'Remove like' : 'Like this'}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                isLiked
                  ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-blue-700 dark:fill-blue-400 text-blue-700 dark:text-blue-400' : ''}`} />
              <span>{isLiked ? 'Liked' : 'Like'}</span>
            </button>

            <button
              type="button"
              onClick={() => onToggleSave(item.id)}
              aria-pressed={isSaved}
              title={isSaved ? 'Remove from saved' : 'Save for later'}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                isSaved
                  ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-current' : ''}`} />
              <span>{isSaved ? 'Saved' : 'Save'}</span>
            </button>

            <button
              type="button"
              onClick={() => onDislike(item.id)}
              title="Not for me (hide and adjust recommendations)"
              className="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <EyeOff className="w-3.5 h-3.5" />
              <span className="sr-only sm:not-sr-only">Hide</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => onOpen(item)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-blue-700 dark:hover:text-blue-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <span>Explore</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </article>
  );
}
