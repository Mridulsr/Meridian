import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { MOVIES_50_YEARS } from '../data/movies50Years';
import { getRecommendations, searchWithRelated } from '../engine/recommender';
import { CatalogItem, Era, MovieIndustry, StreamingPlatform, UserTasteState } from '../types/catalog';
import { ItemCard } from './ItemCard';
import { FeaturedMatchBanner } from './FeaturedMatchBanner';
import { PosterThumb } from './PosterThumb';

type EraFilter = 'all' | Era | 'new-only';
type SortMode = 'match' | 'rating' | 'newest' | 'chronological';
type VisualPeriod = 'all-recent' | '2010-2014' | '2015-2019' | '2020-2023' | '2024-2026';

const VISUAL_PERIOD_TABS: Array<{ id: VisualPeriod; label: string }> = [
  { id: 'all-recent', label: 'All 2010–2026' },
  { id: '2010-2014', label: '2010–2014' },
  { id: '2015-2019', label: '2015–2019' },
  { id: '2020-2023', label: '2020–2023' },
  { id: '2024-2026', label: '2024–2026' },
];

interface MoviesArchiveViewProps {
  tasteState: UserTasteState;
  onOpenItem: (item: CatalogItem) => void;
  onToggleLike: (itemId: string) => void;
  onToggleSave: (itemId: string) => void;
  onDislike: (itemId: string) => void;
}

const ERA_TABS: Array<{ id: EraFilter; label: string }> = [
  { id: 'all', label: 'All 50 Years' },
  { id: 'new-only', label: 'Best New (2024–2026)' },
  { id: '2020s', label: '2020s' },
  { id: '2010s', label: '2010s' },
  { id: '2000s', label: '2000s' },
  { id: '1990s', label: '1990s' },
  { id: '1980s', label: '1980s' },
  { id: '1970s', label: '1970s' },
];

const PLATFORMS: Array<'all' | StreamingPlatform> = [
  'all',
  'Netflix',
  'Prime Video',
  'ZEE5',
  'SonyLIV',
  'Hotstar',
  'Apple TV+',
  'MUBI',
  'Theaters',
];

const INDUSTRIES: Array<'all' | MovieIndustry> = [
  'all',
  'Bollywood',
  'Hollywood',
  'Indian Regional',
  'International',
];

export function MoviesArchiveView({
  tasteState,
  onOpenItem,
  onToggleLike,
  onToggleSave,
  onDislike,
}: MoviesArchiveViewProps) {
  const [eraFilter, setEraFilter] = useState<EraFilter>('all');
  const [selectedGenre, setSelectedGenre] = useState<string>('all');
  const [selectedPlatform, setSelectedPlatform] = useState<'all' | StreamingPlatform>('all');
  const [selectedIndustry, setSelectedIndustry] = useState<'all' | MovieIndustry>('all');
  const [sortMode, setSortMode] = useState<SortMode>('match');
  const [visualPeriod, setVisualPeriod] = useState<VisualPeriod>('all-recent');
  const [query, setQuery] = useState('');

  // Top personalized "Best in New" picks derived from 50-year history
  const bestNewMatches = useMemo(() => {
    return getRecommendations(MOVIES_50_YEARS, tasteState, {
      onlyNew: true,
      preferNew: true,
      limit: 3,
    });
  }, [tasteState]);

  // Curated 2010–2026 Visual Gallery spanning the entire modern era
  const recentVisualPicks = useMemo(() => {
    const pool = MOVIES_50_YEARS.filter((m) => m.year >= 2010 && m.year <= 2026);
    if (visualPeriod === '2010-2014') {
      return pool.filter((m) => m.year >= 2010 && m.year <= 2014).slice(0, 6);
    }
    if (visualPeriod === '2015-2019') {
      return pool.filter((m) => m.year >= 2015 && m.year <= 2019).slice(0, 6);
    }
    if (visualPeriod === '2020-2023') {
      return pool.filter((m) => m.year >= 2020 && m.year <= 2023).slice(0, 6);
    }
    if (visualPeriod === '2024-2026') {
      return pool.filter((m) => m.year >= 2024 && m.year <= 2026).slice(0, 6);
    }
    // Balanced spread across 2010–2026
    const p1 = pool.filter((m) => m.year >= 2010 && m.year <= 2014).slice(0, 2);
    const p2 = pool.filter((m) => m.year >= 2015 && m.year <= 2019).slice(0, 2);
    const p3 = pool.filter((m) => m.year >= 2020 && m.year <= 2023).slice(0, 2);
    const p4 = pool.filter((m) => m.year >= 2024 && m.year <= 2026).slice(0, 6);
    return [...p1, ...p2, ...p3, ...p4];
  }, [visualPeriod]);

  // Search-with-related mode when user types a query like "john wick"
  const searchResults = useMemo(() => {
    if (!query.trim()) return null;
    return searchWithRelated(query, MOVIES_50_YEARS, tasteState, 12);
  }, [query, tasteState]);

  // All scored movies
  const scoredMovies = useMemo(() => {
    return getRecommendations(MOVIES_50_YEARS, tasteState, {
      preferNew: eraFilter === 'new-only',
    });
  }, [tasteState, eraFilter]);

  const topGenres = useMemo(() => {
    const counts: Record<string, number> = {};
    MOVIES_50_YEARS.forEach((m) => {
      m.tags.forEach((t) => {
        counts[t] = (counts[t] || 0) + 1;
      });
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 14)
      .map(([g]) => g);
  }, []);

  const eraCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: MOVIES_50_YEARS.length,
      'new-only': MOVIES_50_YEARS.filter((m) => m.isNew).length,
    };
    (['1970s', '1980s', '1990s', '2000s', '2010s', '2020s'] as Era[]).forEach((e) => {
      counts[e] = MOVIES_50_YEARS.filter((m) => m.era === e).length;
    });
    return counts;
  }, []);

  const filteredMovies = useMemo(() => {
    const list = scoredMovies.filter(({ item }) => {
      if (eraFilter === 'new-only' && !item.isNew) return false;
      if (eraFilter !== 'all' && eraFilter !== 'new-only' && item.era !== eraFilter) return false;
      if (selectedGenre !== 'all' && !item.tags.includes(selectedGenre)) return false;
      if (selectedPlatform !== 'all' && !(item.platforms || []).includes(selectedPlatform)) return false;
      if (selectedIndustry !== 'all' && item.industry !== selectedIndustry) return false;
      return true;
    });

    if (sortMode === 'rating') {
      return [...list].sort((a, b) => b.item.rating - a.item.rating);
    }
    if (sortMode === 'newest') {
      return [...list].sort((a, b) => b.item.year - a.item.year || b.item.rating - a.item.rating);
    }
    if (sortMode === 'chronological') {
      return [...list].sort((a, b) => a.item.year - b.item.year);
    }
    return list;
  }, [scoredMovies, eraFilter, selectedGenre, selectedPlatform, selectedIndustry, sortMode]);

  const applySearchFilters = (list: typeof filteredMovies) =>
    list.filter(({ item }) => {
      if (selectedPlatform !== 'all' && !(item.platforms || []).includes(selectedPlatform)) return false;
      if (selectedIndustry !== 'all' && item.industry !== selectedIndustry) return false;
      if (selectedGenre !== 'all' && !item.tags.includes(selectedGenre)) return false;
      return true;
    });

  return (
    <div className="space-y-10">
      {/* Header */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Cinema Archive · <span className="font-mono tabular-nums">1976 – 2026</span> ·{' '}
            <span className="font-mono tabular-nums">{MOVIES_50_YEARS.length}</span> Films · Hollywood, Bollywood &amp; OTT
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 mt-1.5 tracking-tight">
            50 Years of Movies &amp; Streaming Picks
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1.5 max-w-2xl">
            Search any movie or franchise (such as John Wick, Kill, or Andhadhun) to see all parts plus 10+ related films across Netflix, Prime Video, ZEE5, SonyLIV, and Bollywood.
          </p>
        </div>
      </section>

      {/* Spotlight: Best in New (2024–2026) — hidden while actively searching */}
      {!searchResults && (
        <section aria-labelledby="best-new-cinema-heading">
          <div className="flex items-baseline justify-between gap-4 mb-4">
            <div>
              <h2 id="best-new-cinema-heading" className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Best in New Releases (2024–2026)
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Top current cinema matched to your past movie and category tastes.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setEraFilter('new-only')}
              className="text-xs font-medium text-blue-700 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 whitespace-nowrap shrink-0 cursor-pointer"
            >
              View all new ({eraCounts['new-only']})
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {bestNewMatches.map(({ item, matchPercent, reasons }) => (
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
        </section>
      )}

      {/* Visual Archive Strip: 2010–2026 */}
      {!searchResults && (
        <section
          aria-labelledby="visual-2010-2026-heading"
          className="pt-6 border-t border-slate-200 dark:border-slate-800 space-y-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div>
              <h2 id="visual-2010-2026-heading" className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Cinema Visual Gallery (2010–2026)
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Explore official posters and scene galleries across every chapter from 2010 through 2026. Click any poster for full details &amp; visuals.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 dark:bg-slate-900 border border-transparent dark:border-slate-800 rounded-lg w-fit">
              {VISUAL_PERIOD_TABS.map((tab) => {
                const active = visualPeriod === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setVisualPeriod(tab.id)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      active
                        ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
            {recentVisualPicks.map((movie) => (
              <button
                key={movie.id}
                type="button"
                onClick={() => onOpenItem(movie)}
                className="group relative text-left rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 hover:border-blue-600 dark:hover:border-blue-500 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
              >
                <PosterThumb
                  id={movie.id}
                  title={movie.title}
                  year={movie.year}
                  category={movie.category}
                  creator={movie.creator}
                  wikiPage={movie.wikiPage}
                  imageQuery={movie.imageQuery}
                  className="w-full aspect-[2/3] rounded-none border-0"
                />
                <div className="absolute inset-x-0 bottom-0 p-2.5 bg-gradient-to-t from-slate-950/90 via-slate-950/55 to-transparent">
                  <div className="text-[11px] font-mono tabular-nums text-slate-200">
                    {movie.year}
                    {movie.industry ? ` · ${movie.industry}` : ''}
                  </div>
                  <div className="text-xs font-semibold text-white leading-snug line-clamp-2 mt-0.5 group-hover:text-blue-300 transition-colors">
                    {movie.title}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Search & Filters */}
      <section className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
        {/* Era Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 dark:bg-slate-900 border border-transparent dark:border-slate-800 p-1 rounded-xl w-fit max-w-full overflow-x-auto">
          {ERA_TABS.map((tab) => {
            const active = eraFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setEraFilter(tab.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                {tab.label}{' '}
                <span className="font-mono tabular-nums text-slate-400 dark:text-slate-500 ml-0.5">
                  {eraCounts[tab.id] ?? 0}
                </span>
              </button>
            );
          })}
        </div>

        {/* Streaming Platform Filters */}
        <div className="flex flex-wrap items-center gap-1.5">
          {PLATFORMS.map((platform) => {
            const active = selectedPlatform === platform;
            return (
              <button
                key={platform}
                type="button"
                onClick={() => setSelectedPlatform(platform)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900 dark:border-slate-100'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                {platform === 'all' ? 'All Platforms' : platform}
              </button>
            );
          })}
        </div>

        {/* Search + Dropdowns */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex-1 max-w-md space-y-1.5">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search e.g. John Wick, Bollywood, Kill, ZEE5, Netflix..."
                className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-blue-600 dark:focus:border-blue-500"
              />
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-2">
              <span>Quick try:</span>
              {['John Wick', 'F1', 'Stree 2', 'Kalki 2898 AD', 'Kill', 'Bollywood'].map((sample) => (
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

          <div className="flex flex-wrap items-center gap-2 self-start">
            <select
              aria-label="Filter by industry"
              value={selectedIndustry}
              onChange={(e) => setSelectedIndustry(e.target.value as 'all' | MovieIndustry)}
              className="px-3 py-2 text-xs font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-700 dark:text-slate-200 focus:outline-none focus:border-blue-600 cursor-pointer"
            >
              {INDUSTRIES.map((ind) => (
                <option key={ind} value={ind}>
                  {ind === 'all' ? 'All Industries' : ind}
                </option>
              ))}
            </select>

            <select
              aria-label="Filter by genre"
              value={selectedGenre}
              onChange={(e) => setSelectedGenre(e.target.value)}
              className="px-3 py-2 text-xs font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-700 dark:text-slate-200 focus:outline-none focus:border-blue-600 cursor-pointer"
            >
              <option value="all">All Genres</option>
              {topGenres.map((genre) => (
                <option key={genre} value={genre}>
                  {genre}
                </option>
              ))}
            </select>

            <select
              aria-label="Sort movies"
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as SortMode)}
              className="px-3 py-2 text-xs font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-700 dark:text-slate-200 focus:outline-none focus:border-blue-600 cursor-pointer"
            >
              <option value="match">Sort: Best Match for You</option>
              <option value="rating">Sort: Highest Rated</option>
              <option value="newest">Sort: Newest First</option>
              <option value="chronological">Sort: 1976 to 2026</option>
            </select>
          </div>
        </div>

        {/* Search Results: Direct / Series Matches + 10+ Related Movies */}
        {searchResults ? (() => {
          const filteredDirect = applySearchFilters(searchResults.directMatches);
          const filteredRelated = applySearchFilters(searchResults.relatedMatches);
          const topMatch = filteredDirect[0];

          return (
            <div className="space-y-8 pt-2">
              {topMatch && (
                <FeaturedMatchBanner
                  item={topMatch.item}
                  matchPercent={topMatch.matchPercent}
                  isLiked={tasteState.likedIds.includes(topMatch.item.id)}
                  isSaved={tasteState.savedIds.includes(topMatch.item.id)}
                  onOpen={onOpenItem}
                  onToggleLike={onToggleLike}
                  onToggleSave={onToggleSave}
                />
              )}

              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-3">
                  Matches for &ldquo;{query.trim()}&rdquo;{' '}
                  <span className="font-mono tabular-nums text-slate-400 dark:text-slate-500 font-normal">
                    ({filteredDirect.length})
                  </span>
                </h2>
                {filteredDirect.length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
                    No exact title match for &ldquo;{query.trim()}&rdquo; with current platform/industry filters — showing related recommendations below.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredDirect.map(({ item, matchPercent, reasons }) => (
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
              </div>

              {filteredRelated.length > 0 && (
                <div className="pt-6 border-t border-slate-200 dark:border-slate-800">
                  <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-1">
                    10+ Related Movies Like &ldquo;{query.trim()}&rdquo;
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                    Closely matched across Hollywood, Bollywood, Netflix, Prime Video, ZEE5, and SonyLIV.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredRelated.map(({ item, matchPercent, reasons }) => (
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
          );
        })() : filteredMovies.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-10 text-center">
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">No films match these filters.</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Try clearing your platform, industry, or decade filters.
            </p>
            <button
              type="button"
              onClick={() => {
                setEraFilter('all');
                setSelectedGenre('all');
                setSelectedPlatform('all');
                setSelectedIndustry('all');
                setQuery('');
              }}
              className="mt-4 px-3.5 py-2 text-xs font-medium bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-lg hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors cursor-pointer"
            >
              Reset Film Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMovies.map(({ item, matchPercent, reasons }) => (
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
