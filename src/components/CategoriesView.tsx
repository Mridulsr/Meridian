import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { CATEGORIES } from '../data/categoriesCatalog';
import { FULL_CATALOG, getRecommendations } from '../engine/recommender';
import { CatalogItem, CategoryId, UserTasteState } from '../types/catalog';
import { ItemCard } from './ItemCard';

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

  const categoryCounts = useMemo(() => {
    const map: Record<string, number> = { all: FULL_CATALOG.length };
    CATEGORIES.forEach((c) => {
      map[c.id] = FULL_CATALOG.filter((item) => item.category === c.id).length;
    });
    return map;
  }, []);

  const recommendations = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = getRecommendations(FULL_CATALOG, tasteState, {
      category: selectedCategory,
      onlyNew,
      preferNew: onlyNew,
    });
    if (!q) return base;
    return base.filter(({ item }) => {
      const hay = `${item.title} ${item.franchise || ''} ${item.creator} ${item.origin} ${item.industry || ''} ${(item.platforms || []).join(' ')} ${item.tags.join(' ')} ${item.summary}`.toLowerCase();
      return hay.includes(q);
    });
  }, [tasteState, selectedCategory, onlyNew, query]);

  const activeCategoryMeta =
    selectedCategory === 'all'
      ? null
      : CATEGORIES.find((c) => c.id === selectedCategory) || null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <section className="pb-6 border-b border-slate-200 dark:border-slate-800">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
          Directory · <span className="font-mono tabular-nums">10</span> Categories ·{' '}
          <span className="font-mono tabular-nums">{FULL_CATALOG.length}</span> Curated Entries
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 mt-1.5 tracking-tight">
          {activeCategoryMeta ? activeCategoryMeta.label : 'Explore All 10 Categories'}
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1.5 max-w-2xl">
          {activeCategoryMeta
            ? activeCategoryMeta.description
            : 'Every category is ranked dynamically using your browsing history, liked items, and preferred themes.'}
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
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search titles, creators, cuisines, or themes..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-blue-600 dark:focus:border-blue-500"
            />
          </div>

          <button
            type="button"
            onClick={() => setOnlyNew((v) => !v)}
            aria-pressed={onlyNew}
            className={`px-3.5 py-2 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              onlyNew
                ? 'bg-blue-700 dark:bg-blue-600 text-white border-blue-700 dark:border-blue-600'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            {onlyNew ? 'Showing New Releases Only (2024–2026)' : 'Filter: New Releases Only'}
          </button>
        </div>

        {/* Results */}
        {recommendations.length === 0 ? (
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recommendations.map(({ item, matchPercent, reasons }) => (
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
        )}
      </section>
    </div>
  );
}
