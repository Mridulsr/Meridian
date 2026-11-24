import { useEffect } from 'react';
import { Bookmark, EyeOff, Heart, X, ArrowRight } from 'lucide-react';
import { CATEGORIES } from '../data/categoriesCatalog';
import { FULL_CATALOG, getRelatedToItem } from '../engine/recommender';
import { CatalogItem, CategoryId, UserTasteState } from '../types/catalog';
import { PosterThumb } from './PosterThumb';
import { ItemGallery } from './ItemGallery';

const CATEGORY_LABELS: Record<CategoryId, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c.label])
) as Record<CategoryId, string>;

interface ItemDetailModalProps {
  item: CatalogItem | null;
  tasteState: UserTasteState;
  matchPercent?: number;
  reasons?: string[];
  isLiked: boolean;
  isSaved: boolean;
  onClose: () => void;
  onSelectItem: (item: CatalogItem) => void;
  onToggleLike: (itemId: string) => void;
  onToggleSave: (itemId: string) => void;
  onDislike: (itemId: string) => void;
}

export function ItemDetailModal({
  item,
  tasteState,
  matchPercent,
  reasons,
  isLiked,
  isSaved,
  onClose,
  onSelectItem,
  onToggleLike,
  onToggleSave,
  onDislike,
}: ItemDetailModalProps) {
  useEffect(() => {
    if (!item) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [item, onClose]);

  if (!item) return null;

  const { franchiseItems, relatedItems } = getRelatedToItem(item, FULL_CATALOG, tasteState, 10);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 dark:bg-black/65 backdrop-blur-[2px] p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="detail-modal-title"
    >
      <div
        className="w-full max-w-2xl max-h-[88vh] overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg p-6 sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-1.5">
            <span className="font-medium text-slate-800 dark:text-slate-200">{CATEGORY_LABELS[item.category]}</span>
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

          <button
            type="button"
            onClick={onClose}
            aria-label="Close details"
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 flex flex-col sm:flex-row gap-5 items-start">
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

          <div className="min-w-0 flex-1">
            <h2
              id="detail-modal-title"
              className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight"
            >
              {item.title}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {item.creator} <span aria-hidden="true">·</span> {item.origin}
              <span aria-hidden="true"> · </span>
              <span className="font-mono tabular-nums text-slate-700 dark:text-slate-300 font-medium">
                {item.rating.toFixed(1)}/10
              </span>
              {typeof matchPercent === 'number' && (
                <>
                  <span aria-hidden="true"> · </span>
                  <span className="font-mono tabular-nums text-blue-700 dark:text-blue-400 font-semibold">
                    {matchPercent}% match
                  </span>
                </>
              )}
            </p>

            {item.cast && item.cast.length > 0 && (
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-2">
                <span className="font-medium text-slate-800 dark:text-slate-100">Starring: </span>
                {item.cast.join(', ')}
              </p>
            )}

            {item.platforms && item.platforms.length > 0 && (
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5">
                <span className="font-medium text-slate-800 dark:text-slate-100">Where to watch: </span>
                {item.platforms.join(' · ')}
              </p>
            )}

            <p className="text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed mt-3.5">
              {item.summary}
            </p>
          </div>
        </div>

        <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            <span className="font-medium text-slate-900 dark:text-slate-100">Why it stands out: </span>
            {item.whyNotable}
          </p>
          {item.awards && (
            <p className="text-sm text-slate-600 dark:text-slate-400">
              <span className="font-medium text-slate-900 dark:text-slate-100">Recognition: </span>
              {item.awards}
            </p>
          )}
          {reasons && reasons.length > 0 && (
            <p className="text-sm text-blue-800 dark:text-blue-400">
              <span className="font-medium">Why recommended: </span>
              {reasons.join(' · ')}
            </p>
          )}
          <p className="text-xs text-slate-500 dark:text-slate-400 pt-1">
            <span className="font-medium text-slate-700 dark:text-slate-300">Themes &amp; Tone: </span>
            {[...item.tags, ...item.moods].join(' · ')}
          </p>
        </div>

        {/* Action buttons */}
        <div className="mt-6 flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => onToggleLike(item.id)}
            className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
              isLiked
                ? 'bg-blue-700 dark:bg-blue-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <Heart className={`w-4 h-4 ${isLiked ? 'fill-white' : ''}`} />
            <span>{isLiked ? 'Liked' : 'Like this'}</span>
          </button>

          <button
            type="button"
            onClick={() => onToggleSave(item.id)}
            className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
              isSaved
                ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
            <span>{isSaved ? 'Saved' : 'Save for later'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onDislike(item.id);
              onClose();
            }}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <EyeOff className="w-4 h-4" />
            <span>Not for me</span>
          </button>
        </div>

        {/* Relevant Visual Gallery */}
        <div className="mt-6">
          <ItemGallery item={item} heading="Related Scenes, Cast & Visuals" maxImages={4} />
        </div>

        {/* Franchise / Sequels */}
        {franchiseItems.length > 0 && (
          <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">
              More in the {item.franchise} Series
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {franchiseItems.map(({ item: rel }) => (
                <button
                  key={rel.id}
                  type="button"
                  onClick={() => onSelectItem(rel)}
                  className="flex items-center justify-between gap-3 text-left p-3 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-blue-600 dark:hover:border-blue-500 hover:bg-blue-50/30 dark:hover:bg-blue-950/30 transition-colors cursor-pointer"
                >
                  <div className="min-w-0">
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      <span className="font-mono tabular-nums">{rel.year}</span>
                      {rel.platforms && rel.platforms.length > 0 && ` · ${rel.platforms.slice(0, 2).join(', ')}`}
                    </div>
                    <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate mt-0.5">
                      {rel.title}
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 10 Related Titles */}
        {relatedItems.length > 0 && (
          <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">
              10 Related Picks Like {item.title}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {relatedItems.map(({ item: rel, matchPercent: relMatch }) => (
                <button
                  key={rel.id}
                  type="button"
                  onClick={() => onSelectItem(rel)}
                  className="flex items-center justify-between gap-3 text-left p-3 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors cursor-pointer"
                >
                  <div className="min-w-0">
                    <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {CATEGORY_LABELS[rel.category]} ·{' '}
                      <span className="font-mono tabular-nums">{rel.year}</span>
                      {rel.platforms && rel.platforms.length > 0 && ` · ${rel.platforms[0]}`}
                      {' · '}
                      <span className="font-mono tabular-nums text-blue-700 dark:text-blue-400 font-medium">
                        {relMatch}%
                      </span>
                    </div>
                    <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate mt-0.5">
                      {rel.title}
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
