import { useEffect, useMemo, useState } from 'react';
import { Search, SlidersHorizontal, ArrowRight, Sun, Moon } from 'lucide-react';
import { CATEGORIES } from './data/categoriesCatalog';
import { MOVIES_50_YEARS } from './data/movies50Years';
import {
  createBlankTasteState,
  createInitialTasteState,
  FULL_CATALOG,
  getRecommendations,
  getTasteBreakdown,
  ITEM_BY_ID,
  searchWithRelated,
} from './engine/recommender';
import { CatalogItem, CategoryId, SampleProfile, UserTasteState } from './types/catalog';
import { ItemCard } from './components/ItemCard';
import { FeaturedMatchBanner } from './components/FeaturedMatchBanner';
import { ItemDetailModal } from './components/ItemDetailModal';
import { TasteSetupModal, ThemeMode } from './components/TasteSetupModal';
import { MoviesArchiveView } from './components/MoviesArchiveView';
import { CategoriesView } from './components/CategoriesView';
import { HistoryProfileView } from './components/HistoryProfileView';

type NavTab = 'for-you' | 'movies-50' | 'categories' | 'history';

const STORAGE_KEY = 'meridian_taste_state_v2';
const THEME_STORAGE_KEY = 'meridian_theme_v1';

function loadSavedState(): UserTasteState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as UserTasteState;
      if (parsed && Array.isArray(parsed.history)) {
        return parsed;
      }
    }
  } catch {
    // Fallback cleanly to starter profile
  }
  return createInitialTasteState();
}

function loadSavedTheme(): ThemeMode {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'light' || saved === 'dark' || saved === 'system') {
      return saved;
    }
  } catch {
    // Ignore storage errors
  }
  return 'light';
}

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('for-you');
  const [categoryJump, setCategoryJump] = useState<CategoryId | 'all'>('all');
  const [tasteState, setTasteState] = useState<UserTasteState>(() => loadSavedState());
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => loadSavedTheme());
  const [isDarkEffective, setIsDarkEffective] = useState<boolean>(false);
  const [selectedItem, setSelectedItem] = useState<CatalogItem | null>(null);
  const [isSetupOpen, setIsSetupOpen] = useState(false);

  // For You search
  const [homeQuery, setHomeQuery] = useState('');
  const [spotlightCategory, setSpotlightCategory] = useState<CategoryId>('food');

  // Sync theme to <html class="dark"> and localStorage
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = () => {
      const dark = themeMode === 'dark' || (themeMode === 'system' && media.matches);
      document.documentElement.classList.toggle('dark', dark);
      setIsDarkEffective(dark);
    };

    applyTheme();
    try {
      localStorage.setItem(THEME_STORAGE_KEY, themeMode);
    } catch {
      // Ignore storage errors
    }

    media.addEventListener('change', applyTheme);
    return () => media.removeEventListener('change', applyTheme);
  }, [themeMode]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasteState));
    } catch {
      // Ignore storage quota errors
    }
  }, [tasteState]);

  const breakdown = useMemo(() => getTasteBreakdown(tasteState), [tasteState]);

  // Live search with direct franchise matches + 10+ related items when searching on For You
  const homeSearchResults = useMemo(() => {
    if (!homeQuery.trim()) return null;
    return searchWithRelated(homeQuery, FULL_CATALOG, tasteState, 12);
  }, [homeQuery, tasteState]);

  // Top personalized cross-category recommendations (excluding already liked so discoveries stay fresh)
  const topForYou = useMemo(() => {
    return getRecommendations(FULL_CATALOG, tasteState, {
      excludeLiked: true,
      preferNew: false,
      limit: 6,
    });
  }, [tasteState]);

  // Best in New Movies (2024–2026) driven by 50-year taste history
  const bestNewMovies = useMemo(() => {
    return getRecommendations(MOVIES_50_YEARS, tasteState, {
      onlyNew: true,
      preferNew: true,
      limit: 3,
    });
  }, [tasteState]);

  // Spotlight category picks (Food, Music, Books, etc.)
  const spotlightRecommendations = useMemo(() => {
    return getRecommendations(FULL_CATALOG, tasteState, {
      category: spotlightCategory,
      limit: 3,
    });
  }, [tasteState, spotlightCategory]);

  // Selected item live recommendation metadata
  const selectedItemMeta = useMemo(() => {
    if (!selectedItem) return null;
    const allScored = getRecommendations(FULL_CATALOG, tasteState);
    return allScored.find((r) => r.item.id === selectedItem.id) || null;
  }, [selectedItem, tasteState]);

  // Handlers
  const handleOpenItem = (item: CatalogItem) => {
    setSelectedItem(item);
    setTasteState((prev) => {
      const latest = prev.history[0];
      if (latest && latest.itemId === item.id && latest.action === 'view') {
        return prev;
      }
      return {
        ...prev,
        history: [
          {
            id: `view-${item.id}-${Date.now()}`,
            itemId: item.id,
            action: 'view',
            timestamp: Date.now(),
          },
          ...prev.history,
        ],
      };
    });
  };

  const handleToggleLike = (itemId: string) => {
    setTasteState((prev) => {
      const alreadyLiked = prev.likedIds.includes(itemId);
      const nextLiked = alreadyLiked
        ? prev.likedIds.filter((id) => id !== itemId)
        : [...prev.likedIds, itemId];
      const nextDisliked = prev.dislikedIds.filter((id) => id !== itemId);

      const nextHistory = alreadyLiked
        ? prev.history
        : [
            {
              id: `like-${itemId}-${Date.now()}`,
              itemId,
              action: 'like' as const,
              timestamp: Date.now(),
            },
            ...prev.history,
          ];

      return {
        ...prev,
        likedIds: nextLiked,
        dislikedIds: nextDisliked,
        history: nextHistory,
      };
    });
  };

  const handleToggleSave = (itemId: string) => {
    setTasteState((prev) => {
      const alreadySaved = prev.savedIds.includes(itemId);
      const nextSaved = alreadySaved
        ? prev.savedIds.filter((id) => id !== itemId)
        : [...prev.savedIds, itemId];

      const nextHistory = alreadySaved
        ? prev.history
        : [
            {
              id: `save-${itemId}-${Date.now()}`,
              itemId,
              action: 'save' as const,
              timestamp: Date.now(),
            },
            ...prev.history,
          ];

      return {
        ...prev,
        savedIds: nextSaved,
        history: nextHistory,
      };
    });
  };

  const handleDislike = (itemId: string) => {
    setTasteState((prev) => ({
      ...prev,
      likedIds: prev.likedIds.filter((id) => id !== itemId),
      savedIds: prev.savedIds.filter((id) => id !== itemId),
      dislikedIds: Array.from(new Set([...prev.dislikedIds, itemId])),
      history: [
        {
          id: `dislike-${itemId}-${Date.now()}`,
          itemId,
          action: 'dislike',
          timestamp: Date.now(),
        },
        ...prev.history,
      ],
    }));
  };

  const handleRestoreDisliked = (itemId: string) => {
    setTasteState((prev) => ({
      ...prev,
      dislikedIds: prev.dislikedIds.filter((id) => id !== itemId),
    }));
  };

  const handleTogglePreferredTag = (tag: string) => {
    setTasteState((prev) => ({
      ...prev,
      preferredTags: prev.preferredTags.includes(tag)
        ? prev.preferredTags.filter((t) => t !== tag)
        : [...prev.preferredTags, tag],
    }));
  };

  const handleTogglePreferredCategory = (category: CategoryId) => {
    setTasteState((prev) => ({
      ...prev,
      preferredCategories: prev.preferredCategories.includes(category)
        ? prev.preferredCategories.filter((c) => c !== category)
        : [...prev.preferredCategories, category],
    }));
  };

  const handleApplyProfile = (profile: SampleProfile) => {
    setTasteState(createInitialTasteState(profile));
  };

  const handleClearHistory = () => {
    setTasteState(createBlankTasteState());
  };

  const handleRemoveHistoryEntry = (entryId: string) => {
    setTasteState((prev) => ({
      ...prev,
      history: prev.history.filter((h) => h.id !== entryId),
    }));
  };

  const jumpToCategory = (categoryId: CategoryId) => {
    setCategoryJump(categoryId);
    setActiveTab('categories');
  };

  const toggleLightDark = () => {
    setThemeMode(isDarkEffective ? 'light' : 'dark');
  };

  const recentViewedTitles = Array.from(
    new Set(
      tasteState.history
        .filter((h) => h.action !== 'dislike')
        .map((h) => ITEM_BY_ID[h.itemId]?.title)
        .filter(Boolean)
    )
  ).slice(0, 3);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-150">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single-element Brand Wordmark */}
          <button
            type="button"
            onClick={() => setActiveTab('for-you')}
            className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap shrink-0 cursor-pointer"
          >
            Meridian
          </button>

          {/* Zone 2: Clean single-line text nav links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            <button
              type="button"
              onClick={() => setActiveTab('for-you')}
              className={`whitespace-nowrap shrink-0 transition-colors cursor-pointer py-1 ${
                activeTab === 'for-you'
                  ? 'text-blue-700 dark:text-blue-400 border-b-2 border-blue-700 dark:border-blue-400'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              For You
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('movies-50')}
              className={`whitespace-nowrap shrink-0 transition-colors cursor-pointer py-1 ${
                activeTab === 'movies-50'
                  ? 'text-blue-700 dark:text-blue-400 border-b-2 border-blue-700 dark:border-blue-400'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              50 Years of Movies
            </button>
            <button
              type="button"
              onClick={() => {
                setCategoryJump('all');
                setActiveTab('categories');
              }}
              className={`whitespace-nowrap shrink-0 transition-colors cursor-pointer py-1 ${
                activeTab === 'categories'
                  ? 'text-blue-700 dark:text-blue-400 border-b-2 border-blue-700 dark:border-blue-400'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              10 Categories
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`whitespace-nowrap shrink-0 transition-colors cursor-pointer py-1 ${
                activeTab === 'history'
                  ? 'text-blue-700 dark:text-blue-400 border-b-2 border-blue-700 dark:border-blue-400'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              History &amp; Taste
            </button>
          </nav>

          {/* Zone 3: Single primary action button */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => setIsSetupOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white dark:text-slate-900 bg-slate-900 dark:bg-slate-100 rounded-lg hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Taste Setup</span>
            </button>
          </div>
        </div>

        {/* Mobile navigation row */}
        <div className="md:hidden border-t border-slate-100 dark:border-slate-800 px-4 py-2 flex items-center gap-4 overflow-x-auto text-xs font-medium">
          <button
            type="button"
            onClick={() => setActiveTab('for-you')}
            className={`whitespace-nowrap shrink-0 py-1 ${
              activeTab === 'for-you' ? 'text-blue-700 dark:text-blue-400 font-semibold' : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            For You
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('movies-50')}
            className={`whitespace-nowrap shrink-0 py-1 ${
              activeTab === 'movies-50' ? 'text-blue-700 dark:text-blue-400 font-semibold' : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            50 Years of Movies
          </button>
          <button
            type="button"
            onClick={() => {
              setCategoryJump('all');
              setActiveTab('categories');
            }}
            className={`whitespace-nowrap shrink-0 py-1 ${
              activeTab === 'categories' ? 'text-blue-700 dark:text-blue-400 font-semibold' : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            10 Categories
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`whitespace-nowrap shrink-0 py-1 ${
              activeTab === 'history' ? 'text-blue-700 dark:text-blue-400 font-semibold' : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            History &amp; Taste
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Workspace Toolbar: Quick Theme Switch */}
        <div className="flex items-center justify-end mb-4">
          <div className="inline-flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg">
            <button
              type="button"
              onClick={() => setThemeMode('light')}
              aria-pressed={!isDarkEffective}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                !isDarkEffective
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <Sun className="w-3.5 h-3.5" />
              <span>Light</span>
            </button>
            <button
              type="button"
              onClick={() => setThemeMode('dark')}
              aria-pressed={isDarkEffective}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                isDarkEffective
                  ? 'bg-slate-800 text-slate-100 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Moon className="w-3.5 h-3.5" />
              <span>Dark</span>
            </button>
          </div>
        </div>

        {activeTab === 'for-you' && (
          <div className="space-y-12">
            {/* Simple Personalized Overview + Search */}
            <section className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-8 border-b border-slate-200 dark:border-slate-800">
              <div className="max-w-2xl">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Personalized Discovery ·{' '}
                  <span className="font-mono tabular-nums">{CATEGORIES.length}</span> Categories ·{' '}
                  Netflix · Prime Video · ZEE5 · SonyLIV · Bollywood
                </p>
                <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-slate-100 mt-2 tracking-tight text-balance">
                  Recommendations shaped by what you explore and enjoy.
                </h1>
                <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 mt-2.5 leading-relaxed">
                  {breakdown.totalInteractions > 0 ? (
                    <>
                      Based on{' '}
                      <span className="font-medium text-slate-900 dark:text-slate-100">
                        {recentViewedTitles.length > 0
                          ? recentViewedTitles.join(', ')
                          : 'your selected preferences'}
                      </span>
                      {breakdown.topTags.length > 0 && (
                        <>
                          {' '}
                          · Top affinities:{' '}
                          <span className="text-slate-800 dark:text-slate-200">
                            {breakdown.topTags
                              .slice(0, 4)
                              .map((t) => t.label)
                              .join(', ')}
                          </span>
                        </>
                      )}
                      .
                    </>
                  ) : (
                    'Your browsing history is blank. Explore any title below or open Taste Setup to personalize across all 10 categories.'
                  )}
                </p>
              </div>

              {/* Search with Franchise + 10 Related Picks */}
              <div className="w-full lg:w-96 shrink-0 space-y-2">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={homeQuery}
                    onChange={(e) => setHomeQuery(e.target.value)}
                    placeholder="Enter a movie (e.g. John Wick), Bollywood, Netflix, ZEE5..."
                    className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-blue-600 dark:focus:border-blue-500"
                  />
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-2">
                  <span>Try:</span>
                  {['John Wick', 'F1', 'Stree 2', 'Kalki 2898 AD', 'Bollywood', 'Netflix', 'ZEE5', 'SonyLIV'].map((term) => (
                    <button
                      key={term}
                      type="button"
                      onClick={() => setHomeQuery(term)}
                      className="text-blue-700 dark:text-blue-400 hover:underline cursor-pointer"
                    >
                      {term}
                    </button>
                  ))}
                  {homeQuery && (
                    <button
                      type="button"
                      onClick={() => setHomeQuery('')}
                      className="text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 underline cursor-pointer ml-1"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </section>

            {/* When searching: Featured Top Match Details + Franchise Matches + 10+ Related Picks */}
            {homeSearchResults ? (
              <div className="space-y-10">
                {homeSearchResults.directMatches[0] && (
                  <FeaturedMatchBanner
                    item={homeSearchResults.directMatches[0].item}
                    matchPercent={homeSearchResults.directMatches[0].matchPercent}
                    isLiked={tasteState.likedIds.includes(homeSearchResults.directMatches[0].item.id)}
                    isSaved={tasteState.savedIds.includes(homeSearchResults.directMatches[0].item.id)}
                    onOpen={handleOpenItem}
                    onToggleLike={handleToggleLike}
                    onToggleSave={handleToggleSave}
                  />
                )}

                <section aria-labelledby="search-direct-matches">
                  <div className="flex items-baseline justify-between gap-4 mb-4">
                    <div>
                      <h2 id="search-direct-matches" className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                        Matches for &ldquo;{homeQuery.trim()}&rdquo;{' '}
                        <span className="font-mono tabular-nums text-slate-400 dark:text-slate-500 font-normal">
                          ({homeSearchResults.directMatches.length})
                        </span>
                      </h2>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        All parts, franchise installments, or platform matches for your search.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setHomeQuery('')}
                      className="text-xs font-medium text-blue-700 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 cursor-pointer shrink-0"
                    >
                      Back to For You
                    </button>
                  </div>

                  {homeSearchResults.directMatches.length === 0 ? (
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 text-sm text-slate-600 dark:text-slate-400">
                      No exact title match for &ldquo;{homeQuery.trim()}&rdquo; — here are closely related recommendations below.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {homeSearchResults.directMatches.map(({ item, matchPercent, reasons }) => (
                        <ItemCard
                          key={item.id}
                          item={item}
                          matchPercent={matchPercent}
                          reasons={reasons}
                          isLiked={tasteState.likedIds.includes(item.id)}
                          isSaved={tasteState.savedIds.includes(item.id)}
                          onOpen={handleOpenItem}
                          onToggleLike={handleToggleLike}
                          onToggleSave={handleToggleSave}
                          onDislike={handleDislike}
                        />
                      ))}
                    </div>
                  )}
                </section>

                {homeSearchResults.relatedMatches.length > 0 && (
                  <section aria-labelledby="search-related-matches" className="pt-6 border-t border-slate-200 dark:border-slate-800">
                    <div className="mb-4">
                      <h2 id="search-related-matches" className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                        10+ Related Picks Like &ldquo;{homeQuery.trim()}&rdquo;
                      </h2>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Similar movies and titles across Hollywood, Bollywood, Netflix, Prime Video, ZEE5, and SonyLIV.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {homeSearchResults.relatedMatches.map(({ item, matchPercent, reasons }) => (
                        <ItemCard
                          key={item.id}
                          item={item}
                          matchPercent={matchPercent}
                          reasons={reasons}
                          isLiked={tasteState.likedIds.includes(item.id)}
                          isSaved={tasteState.savedIds.includes(item.id)}
                          onOpen={handleOpenItem}
                          onToggleLike={handleToggleLike}
                          onToggleSave={handleToggleSave}
                          onDislike={handleDislike}
                        />
                      ))}
                    </div>
                  </section>
                )}
              </div>
            ) : (
              <>
                {/* Section 1: Cross-Category Picks For You */}
                <section aria-labelledby="recommended-for-you">
                  <div className="flex items-baseline justify-between gap-4 mb-4">
                    <div>
                      <h2 id="recommended-for-you" className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                        Recommended For You
                      </h2>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Ranked dynamically from your browsing history, likes, and saved items.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('history')}
                      className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <span>View History</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {topForYou.map(({ item, matchPercent, reasons }) => (
                      <ItemCard
                        key={item.id}
                        item={item}
                        matchPercent={matchPercent}
                        reasons={reasons}
                        isLiked={tasteState.likedIds.includes(item.id)}
                        isSaved={tasteState.savedIds.includes(item.id)}
                        onOpen={handleOpenItem}
                        onToggleLike={handleToggleLike}
                        onToggleSave={handleToggleSave}
                        onDislike={handleDislike}
                      />
                    ))}
                  </div>
                </section>

                {/* Section 2: Best in New Cinema (Paired with 50 Years of Movies) */}
                <section aria-labelledby="best-new-movies" className="pt-4 border-t border-slate-200 dark:border-slate-800">
                  <div className="flex items-baseline justify-between gap-4 mb-4">
                    <div>
                      <h2 id="best-new-movies" className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                        Best in New Cinema (2024–2026)
                      </h2>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        New releases selected by comparing your classic &amp; past-era tastes across 50 years of film.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('movies-50')}
                      className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <span>Browse 50 Years (1976–2026)</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {bestNewMovies.map(({ item, matchPercent, reasons }) => (
                      <ItemCard
                        key={item.id}
                        item={item}
                        matchPercent={matchPercent}
                        reasons={reasons}
                        isLiked={tasteState.likedIds.includes(item.id)}
                        isSaved={tasteState.savedIds.includes(item.id)}
                        onOpen={handleOpenItem}
                        onToggleLike={handleToggleLike}
                        onToggleSave={handleToggleSave}
                        onDislike={handleDislike}
                      />
                    ))}
                  </div>
                </section>

                {/* Section 3: Explore by Category (Food, Music, Books, & 7 More) */}
                <section aria-labelledby="category-spotlight" className="pt-4 border-t border-slate-200 dark:border-slate-800">
                  <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-3 mb-4">
                    <div>
                      <h2 id="category-spotlight" className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                        Tailored Picks Across All 10 Categories
                      </h2>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Switch any category to see how your preferences translate to food, music, books, travel, and design.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => jumpToCategory(spotlightCategory)}
                      className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <span>Open Full Category</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Clean Category Switcher */}
                  <div className="flex flex-wrap gap-1.5 mb-5">
                    {CATEGORIES.map((cat) => {
                      const active = spotlightCategory === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setSpotlightCategory(cat.id)}
                          className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                            active
                              ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900 dark:border-slate-100'
                              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                          }`}
                        >
                          {cat.label}
                        </button>
                      );
                    })}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {spotlightRecommendations.map(({ item, matchPercent, reasons }) => (
                      <ItemCard
                        key={item.id}
                        item={item}
                        matchPercent={matchPercent}
                        reasons={reasons}
                        isLiked={tasteState.likedIds.includes(item.id)}
                        isSaved={tasteState.savedIds.includes(item.id)}
                        onOpen={handleOpenItem}
                        onToggleLike={handleToggleLike}
                        onToggleSave={handleToggleSave}
                        onDislike={handleDislike}
                      />
                    ))}
                  </div>
                </section>
              </>
            )}
          </div>
        )}

        {activeTab === 'movies-50' && (
          <MoviesArchiveView
            tasteState={tasteState}
            onOpenItem={handleOpenItem}
            onToggleLike={handleToggleLike}
            onToggleSave={handleToggleSave}
            onDislike={handleDislike}
          />
        )}

        {activeTab === 'categories' && (
          <CategoriesView
            key={categoryJump}
            tasteState={tasteState}
            initialCategory={categoryJump}
            onOpenItem={handleOpenItem}
            onToggleLike={handleToggleLike}
            onToggleSave={handleToggleSave}
            onDislike={handleDislike}
          />
        )}

        {activeTab === 'history' && (
          <HistoryProfileView
            tasteState={tasteState}
            onOpenItem={handleOpenItem}
            onRemoveHistoryEntry={handleRemoveHistoryEntry}
            onRestoreDisliked={handleRestoreDisliked}
            onClearHistory={handleClearHistory}
            onApplyProfile={handleApplyProfile}
          />
        )}
      </main>

      {/* Quiet Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 mt-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
          <span>
            Meridian · <span className="font-mono tabular-nums">{FULL_CATALOG.length}</span> curated items across{' '}
            <span className="font-mono tabular-nums">10</span> categories
          </span>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setActiveTab('movies-50')}
              className="hover:text-slate-900 dark:hover:text-slate-100 transition-colors cursor-pointer"
            >
              50 Years of Movies
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className="hover:text-slate-900 dark:hover:text-slate-100 transition-colors cursor-pointer"
            >
              Browsing History
            </button>
            <button
              type="button"
              onClick={toggleLightDark}
              className="hover:text-slate-900 dark:hover:text-slate-100 transition-colors cursor-pointer"
            >
              {isDarkEffective ? 'Switch to Light' : 'Switch to Dark'}
            </button>
            <button
              type="button"
              onClick={() => setIsSetupOpen(true)}
              className="hover:text-slate-900 dark:hover:text-slate-100 transition-colors cursor-pointer"
            >
              Taste Preferences
            </button>
          </div>
        </div>
      </footer>

      {/* Item Detail Modal */}
      <ItemDetailModal
        item={selectedItem}
        tasteState={tasteState}
        matchPercent={selectedItemMeta?.matchPercent}
        reasons={selectedItemMeta?.reasons}
        isLiked={selectedItem ? tasteState.likedIds.includes(selectedItem.id) : false}
        isSaved={selectedItem ? tasteState.savedIds.includes(selectedItem.id) : false}
        onClose={() => setSelectedItem(null)}
        onSelectItem={handleOpenItem}
        onToggleLike={handleToggleLike}
        onToggleSave={handleToggleSave}
        onDislike={handleDislike}
      />

      {/* Taste & Theme Setup Modal */}
      <TasteSetupModal
        isOpen={isSetupOpen}
        themeMode={themeMode}
        onChangeTheme={setThemeMode}
        preferredTags={tasteState.preferredTags}
        preferredCategories={tasteState.preferredCategories}
        onClose={() => setIsSetupOpen(false)}
        onToggleTag={handleTogglePreferredTag}
        onToggleCategory={handleTogglePreferredCategory}
        onApplyProfile={handleApplyProfile}
        onResetBlank={handleClearHistory}
      />
    </div>
  );
}
