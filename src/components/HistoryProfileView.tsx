import { Trash2, RotateCcw, Heart, Bookmark, Eye, EyeOff } from 'lucide-react';
import { CATEGORIES } from '../data/categoriesCatalog';
import { getTasteBreakdown, ITEM_BY_ID, SAMPLE_PROFILES } from '../engine/recommender';
import { CatalogItem, CategoryId, SampleProfile, UserTasteState } from '../types/catalog';

const CATEGORY_LABELS: Record<CategoryId, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c.label])
) as Record<CategoryId, string>;

interface HistoryProfileViewProps {
  tasteState: UserTasteState;
  onOpenItem: (item: CatalogItem) => void;
  onRemoveHistoryEntry: (entryId: string) => void;
  onRestoreDisliked: (itemId: string) => void;
  onClearHistory: () => void;
  onApplyProfile: (profile: SampleProfile) => void;
}

function formatTimeAgo(timestamp: number): string {
  const diffMin = Math.max(1, Math.floor((Date.now() - timestamp) / 60000));
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}

export function HistoryProfileView({
  tasteState,
  onOpenItem,
  onRemoveHistoryEntry,
  onRestoreDisliked,
  onClearHistory,
  onApplyProfile,
}: HistoryProfileViewProps) {
  const breakdown = getTasteBreakdown(tasteState);
  const maxTag = Math.max(1, ...(breakdown.topTags.map((t) => t.weight)));
  const maxMood = Math.max(1, ...(breakdown.topMoods.map((m) => m.weight)));

  const likedItems = tasteState.likedIds.map((id) => ITEM_BY_ID[id]).filter(Boolean);
  const savedItems = tasteState.savedIds.map((id) => ITEM_BY_ID[id]).filter(Boolean);
  const dislikedItems = tasteState.dislikedIds.map((id) => ITEM_BY_ID[id]).filter(Boolean);

  return (
    <div className="space-y-10">
      {/* Header */}
      <section className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Personalization Engine · <span className="font-mono tabular-nums">{tasteState.history.length}</span> Logged Events
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 mt-1.5 tracking-tight">
            Browsing History &amp; Taste Profile
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1.5 max-w-2xl">
            Every item you open, like, save, or hide adjusts your cross-category preference weights in real time.
          </p>
        </div>

        <button
          type="button"
          onClick={onClearHistory}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Clear All History</span>
        </button>
      </section>

      {/* Taste Signals Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Top Themes From Your History</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 mb-4">
            Strongest topics shaping recommendations across all 10 categories.
          </p>

          {breakdown.topTags.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 py-4">
              No browsing signals yet. Open or like a few items to build your theme profile.
            </p>
          ) : (
            <div className="space-y-3">
              {breakdown.topTags.map((tag) => (
                <div key={tag.label} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-800 dark:text-slate-200">{tag.label}</span>
                    <span className="font-mono tabular-nums text-slate-500 dark:text-slate-400">{tag.weight}</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-700 dark:bg-blue-500 rounded-full"
                      style={{ width: `${Math.min(100, (tag.weight / maxTag) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Preferred Moods &amp; Eras</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 mb-4">
            Tone and decade affinity across your past browsing.
          </p>

          {breakdown.topMoods.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 py-4">
              Explore movies, music, or food items to reveal your mood balance.
            </p>
          ) : (
            <div className="space-y-3">
              {breakdown.topMoods.map((mood) => (
                <div key={mood.label} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-800 dark:text-slate-200">{mood.label}</span>
                    <span className="font-mono tabular-nums text-slate-500 dark:text-slate-400">{mood.weight}</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-slate-800 dark:bg-slate-300 rounded-full"
                      style={{ width: `${Math.min(100, (mood.weight / maxMood) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}

              {breakdown.topEras.length > 0 && (
                <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
                  <span className="font-medium text-slate-800 dark:text-slate-200">Active Eras: </span>
                  {breakdown.topEras.map((e) => `${e.era} (${e.weight})`).join(' · ')}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Switch Sample Profiles */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Test With a Sample Browsing Persona</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 mb-4">
          Load a preset browsing history to immediately compare how recommendations shift across movies, food, music, and more.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {SAMPLE_PROFILES.map((profile) => (
            <button
              key={profile.id}
              type="button"
              onClick={() => onApplyProfile(profile)}
              className="text-left p-4 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-blue-600 dark:hover:border-blue-500 hover:bg-blue-50/30 dark:hover:bg-blue-950/30 transition-colors cursor-pointer"
            >
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{profile.name}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{profile.subtitle}</div>
            </button>
          ))}
        </div>
      </section>

      {/* Liked & Saved Lists */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-3">
            Liked Items <span className="font-mono tabular-nums text-slate-400 dark:text-slate-500 font-normal">({likedItems.length})</span>
          </h2>
          {likedItems.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">Items you like will appear here.</p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {likedItems.map((item) => (
                <li key={item.id} className="py-2.5 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => onOpenItem(item)}
                    className="text-left min-w-0 hover:text-blue-700 dark:hover:text-blue-400 transition-colors cursor-pointer"
                  >
                    <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{item.title}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {CATEGORY_LABELS[item.category]} · <span className="font-mono tabular-nums">{item.year}</span>
                    </div>
                  </button>
                  <Heart className="w-4 h-4 text-blue-700 dark:text-blue-400 fill-blue-700 dark:fill-blue-400 shrink-0" />
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-3">
            Saved Watch &amp; Reading List <span className="font-mono tabular-nums text-slate-400 dark:text-slate-500 font-normal">({savedItems.length})</span>
          </h2>
          {savedItems.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">Save movies, restaurants, books, or albums for later.</p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {savedItems.map((item) => (
                <li key={item.id} className="py-2.5 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => onOpenItem(item)}
                    className="text-left min-w-0 hover:text-blue-700 dark:hover:text-blue-400 transition-colors cursor-pointer"
                  >
                    <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{item.title}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {CATEGORY_LABELS[item.category]} · <span className="font-mono tabular-nums">{item.year}</span>
                    </div>
                  </button>
                  <Bookmark className="w-4 h-4 text-slate-900 dark:text-slate-100 fill-slate-900 dark:fill-slate-100 shrink-0" />
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Hidden / Disliked Items */}
      {dislikedItems.length > 0 && (
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-3">
            Hidden Items <span className="font-mono tabular-nums text-slate-400 dark:text-slate-500 font-normal">({dislikedItems.length})</span>
          </h2>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {dislikedItems.map((item) => (
              <div key={item.id} className="py-2.5 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{item.title}</span>
                  <span className="text-xs text-slate-400 dark:text-slate-500 ml-2">
                    {CATEGORY_LABELS[item.category]} · {item.year}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onRestoreDisliked(item.id)}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 cursor-pointer shrink-0"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restore</span>
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Chronological Browsing History Log */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-1">Recent Browsing Activity</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          Most recent interactions weigh strongest in your recommendations.
        </p>

        {tasteState.history.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400 py-4">
            Your browsing history is empty. Click any movie, dish, album, or book to start building tailored recommendations.
          </p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {tasteState.history.slice(0, 30).map((entry) => {
              const item = ITEM_BY_ID[entry.itemId];
              if (!item) return null;

              const actionLabel =
                entry.action === 'like'
                  ? 'Liked'
                  : entry.action === 'save'
                  ? 'Saved'
                  : entry.action === 'dislike'
                  ? 'Hidden'
                  : 'Viewed';

              return (
                <div key={entry.id} className="py-3 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-slate-400 shrink-0">
                      {entry.action === 'like' ? (
                        <Heart className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                      ) : entry.action === 'save' ? (
                        <Bookmark className="w-4 h-4 text-slate-800 dark:text-slate-200" />
                      ) : entry.action === 'dislike' ? (
                        <EyeOff className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                      ) : (
                        <Eye className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={() => onOpenItem(item)}
                      className="text-left min-w-0 hover:text-blue-700 dark:hover:text-blue-400 transition-colors cursor-pointer"
                    >
                      <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                        {item.title}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {actionLabel} · {CATEGORY_LABELS[item.category]} ·{' '}
                        <span className="font-mono tabular-nums">{item.year}</span> ·{' '}
                        <span className="font-mono tabular-nums">{formatTimeAgo(entry.timestamp)}</span>
                      </div>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => onRemoveHistoryEntry(entry.id)}
                    aria-label={`Remove ${item.title} from history`}
                    className="text-xs text-slate-400 dark:text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
