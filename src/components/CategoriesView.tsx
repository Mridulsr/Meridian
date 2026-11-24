import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { CATEGORIES } from '../data/categoriesCatalog';
import { FULL_CATALOG, getRecommendations, searchWithRelated } from '../engine/recommender';
import { CatalogItem, CategoryId, UserTasteState } from '../types/catalog';
import { ItemCard } from './ItemCard';
import { FeaturedMatchBanner } from './FeaturedMatchBanner';

const PAGE_SIZE = 36;

interface CategoriesViewProps {
  tasteState: UserTasteState;
  initialCategory?: CategoryId | 'all';
  onOpenItem: (item: CatalogItem) => void;
  onToggleLike: (itemId: string) => void;
  onToggleSave: (itemId: string) => void;
  onDislike: (itemId: string) => void;
}

export function CategoriesView({
  tasteState,
  initialCategory = 'all',
  onOpenItem,
  onToggleLike,
  onToggleSave,
  onDislike,
}: CategoriesViewProps) {
  const [selectedCategory, setSelectedCategory] = useState<CategoryId | 'all'>(initialCategory);
  const [onlyNew, setOnlyNew] = useState(false);
  const [query, setQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [selectedCategory, onlyNew, query]);

  const categoryCounts = useMemo(() => {
    const map: Record<string, number> = { all: FULL_CATALOG.length };
    CATEGORIES.forEach((c) => {
      map[c.id] = FULL_CATALOG.filter((item) => item.category === c.id).length;
    });
    return map;
  }, []);

  const scopedPool = useMemo(() => {
    return FULL_CATALOG.filter((item) => {
      if (selectedCategory !== 'all' && item.category !== selectedCategory) return false;
      if (onlyNew && !item.isNew) return false;
      return true;
    });
  }, [selectedCategory, onlyNew]);

  const searchResults = useMemo(() => {
    if (!query.trim()) return null;
    return searchWithRelated(query, scopedPool, tasteState, 12);
  }, [query, scopedPool, tasteState]);

  const recommendations = useMemo(() => {
    if (query.trim()) return [];
    return getRecommendations(FULL_CATALOG, tasteState, {
      category: selectedCategory,
      onlyNew,
      preferNew: onlyNew,
    });
  }, [tasteState, selectedCategory, onlyNew, query]);

  const activeCategoryMeta =
    selectedCategory === 'all'
      ? null
      : CATEGORIES.find((c) => c.id === selectedCategory) || null;

  const visibleBrowse = recommendations.slice(0, visibleCount);
  const remainingBrowse = Math.max(0, recommendations.length - visibleBrowse.length);

  return (
    <div className="space-y-8">
      {/* Header */}
      <section className="pb-6 border-b border-slate-200 dark:border-slate-800">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
          Directory · <span className="font-mono tabular-nums">10</span> Categories ·{' '}
          <span className="font-mono tabular-nums">{FULL_CATALOG.length.toLocaleString()}</span> Searchable Entries
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 mt-1.5 tracking-tight">
          {activeCategoryMeta ? activeCategoryMeta.label : 'Explore All 10 Categories'}
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1.5 max-w-2xl">
          {activeCategoryMeta
            ? activeCategoryMeta.description
            : 'Search across 1,150+ movies, albums, regional dishes, books, TV series, podcasts, games, destinations, documentaries, and design landmarks.'}
        </p>
      </section>

      {/* 10 Category Segmented Controls */}
      <section className="space-y-4">
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900 dark:border-slate-100'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            All Categories{' '}
            <span className="font-mono tabular-nums opacity-70 ml-1">
              {categoryCounts.all}
            </span>
          </button>

          {CATEGORIES.map((cat) => {
            const active = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900 dark:border-slate-100'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                {cat.label}{' '}
                <span className="font-mono tabular-nums opacity-70 ml-1">
                  {categoryCounts[cat.id]}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search & New Filter */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex-1 max-w-xl space-y-1.5">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search any category: Biryani, Radiohead, Panchayat, Ladakh, Zelda, Tolkien..."
                className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-blue-600 dark:focus:border-blue-500"
              />
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-2">
              <span>Quick search:</span>
              {['Biryani', 'Radiohead', 'Panchayat', 'Ladakh', 'Elden Ring', 'Sci-Fi', 'India'].map((sample) => (
                <button
                  key={sample}
                  type="button"
                  onClick={() => setQuery(sample)}
                  className="text-blue-700 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  {sample}
                </button>
              ))}
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 underline cursor-pointer ml-1"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setOnlyNew((v) => !v)}
            aria-pressed={onlyNew}
            className={`px-3.5 py-2 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 self-start cursor-pointer ${
              onlyNew
                ? 'bg-blue-700 dark:bg-blue-600 text-white border-blue-700 dark:border-blue-600'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            {onlyNew ? 'Showing New Releases Only (2024–2026)' : 'Filter: New Releases Only'}
          </button>
        </div>

        {/* Search Results Mode */}
        {searchResults ? (
          <div className="space-y-8 pt-2">
            {searchResults.directMatches[0] && (
              <FeaturedMatchBanner
                item={searchResults.directMatches[0].item}
                matchPercent={searchResults.directMatches[0].matchPercent}
                isLiked={tasteState.likedIds.includes(searchResults.directMatches[0].item.id)}
                isSaved={tasteState.savedIds.includes(searchResults.directMatches[0].item.id)}
                onOpen={onOpenItem}
                onToggleLike={onToggleLike}
                onToggleSave={onToggleSave}
              />
            )}

            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-3">
                Matches for &ldquo;{query.trim()}&rdquo;{' '}
                <span className="font-mono tabular-nums text-slate-400 dark:text-slate-500 font-normal">
                  ({searchResults.directMatches.length})
                </span>
              </h2>
              {searchResults.directMatches.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 text-sm text-slate-500 dark:text-slate-400">
                  No direct match for &ldquo;{query.trim()}&rdquo; in this view — see related recommendations below or clear category filter.
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {searchResults.directMatches.slice(0, visibleCount).map(({ item, matchPercent, reasons }) => (
                      <ItemCard
                        key={item.id}
                        item={item}
                        matchPercent={matchPercent}
                        reasons={reasons}
                        isLiked={tasteState.likedIds.includes(item.id)}
                        isSaved={tasteState.savedIds.includes(item.id)}
                        onOpen={onOpenItem}
                        onToggleLike={onToggleLike}
                        onToggleSave={onToggleSave}
                        onDislike={onDislike}
                      />
                    ))}
                  </div>
                  {searchResults.directMatches.length > visibleCount && (
                    <div className="flex items-center justify-center gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                        className="px-4 py-2 text-xs font-medium bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-lg hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors cursor-pointer"
                      >
                        Load {Math.min(PAGE_SIZE, searchResults.directMatches.length - visibleCount)} More Matches
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {searchResults.relatedMatches.length > 0 && (
              <div className="pt-6 border-t border-slate-200 dark:border-slate-800">
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-1">
                  Related Picks Like &ldquo;{query.trim()}&rdquo;
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                  Cross-matched across themes, mood, origin, and your browsing history.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {searchResults.relatedMatches.map(({ item, matchPercent, reasons }) => (
                    <ItemCard
                      key={item.id}
                      item={item}
                      matchPercent={matchPercent}
                      reasons={reasons}
                      isLiked={tasteState.likedIds.includes(item.id)}
                      isSaved={tasteState.savedIds.includes(item.id)}
                      onOpen={onOpenItem}
                      onToggleLike={onToggleLike}
                      onToggleSave={onToggleSave}
                      onDislike={onDislike}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : recommendations.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-10 text-center">
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">No items match your current filter.</p>
            <button
              type="button"
              onClick={() => {
                setSelectedCategory('all');
                setOnlyNew(false);
                setQuery('');
              }}
              className="mt-4 px-3.5 py-2 text-xs font-medium bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-lg hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>
                Showing <span className="font-mono tabular-nums font-semibold text-slate-800 dark:text-slate-200">{visibleBrowse.length}</span> of{' '}
                <span className="font-mono tabular-nums font-semibold text-slate-800 dark:text-slate-200">{recommendations.length}</span> items
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {visibleBrowse.map(({ item, matchPercent, reasons }) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  matchPercent={matchPercent}
                  reasons={reasons}
                  isLiked={tasteState.likedIds.includes(item.id)}
                  isSaved={tasteState.savedIds.includes(item.id)}
                  onOpen={onOpenItem}
                  onToggleLike={onToggleLike}
                  onToggleSave={onToggleSave}
                  onDislike={onDislike}
                />
              ))}
            </div>

            {remainingBrowse > 0 && (
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                  className="px-4 py-2 text-xs font-medium bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-lg hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  Load {Math.min(PAGE_SIZE, remainingBrowse)} More ({remainingBrowse} remaining)
                </button>
                {remainingBrowse <= 150 && (
                  <button
                    type="button"
                    onClick={() => setVisibleCount(recommendations.length)}
                    className="px-4 py-2 text-xs font-medium bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 rounded-lg hover:border-slate-300 dark:hover:border-slate-700 transition-colors cursor-pointer"
                  >
                    Show All ({recommendations.length})
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
