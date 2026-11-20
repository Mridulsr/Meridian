import { X, Check, Sun, Moon, Monitor } from 'lucide-react';
import { CATEGORIES } from '../data/categoriesCatalog';
import { getAllUniqueTags, SAMPLE_PROFILES } from '../engine/recommender';
import { CategoryId, SampleProfile } from '../types/catalog';

export type ThemeMode = 'light' | 'dark' | 'system';

interface TasteSetupModalProps {
  isOpen: boolean;
  themeMode: ThemeMode;
  onChangeTheme: (mode: ThemeMode) => void;
  preferredTags: string[];
  preferredCategories: CategoryId[];
  onClose: () => void;
  onToggleTag: (tag: string) => void;
  onToggleCategory: (category: CategoryId) => void;
  onApplyProfile: (profile: SampleProfile) => void;
  onResetBlank: () => void;
}

export function TasteSetupModal({
  isOpen,
  themeMode,
  onChangeTheme,
  preferredTags,
  preferredCategories,
  onClose,
  onToggleTag,
  onToggleCategory,
  onApplyProfile,
  onResetBlank,
}: TasteSetupModalProps) {
  if (!isOpen) return null;

  const availableTags = getAllUniqueTags();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 dark:bg-black/65 backdrop-blur-[2px] p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="taste-setup-title"
    >
      <div
        className="w-full max-w-2xl max-h-[88vh] overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg p-6 sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="taste-setup-title" className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Taste &amp; Theme Preferences
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Choose your visual theme, pick topics you enjoy, or load a sample browsing history.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close setup"
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Appearance Theme */}
        <div className="mt-6 pb-5 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2.5">
            Theme
          </h3>
          <div className="inline-flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
            {(
              [
                { id: 'light', label: 'Light', icon: Sun },
                { id: 'dark', label: 'Dark', icon: Moon },
                { id: 'system', label: 'System', icon: Monitor },
              ] as const
            ).map(({ id, label, icon: Icon }) => {
              const active = themeMode === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onChangeTheme(id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Sample Browsing History Presets */}
        <div className="mt-5">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2.5">
            Sample Browsing Profiles
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {SAMPLE_PROFILES.map((profile) => (
              <button
                key={profile.id}
                type="button"
                onClick={() => {
                  onApplyProfile(profile);
                  onClose();
                }}
                className="text-left p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-blue-600 dark:hover:border-blue-500 hover:bg-blue-50/40 dark:hover:bg-blue-950/40 transition-colors cursor-pointer"
              >
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{profile.name}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{profile.subtitle}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Favorite Categories */}
        <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2.5">
            Priority Categories
          </h3>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => {
              const active = preferredCategories.includes(cat.id);
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => onToggleCategory(cat.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900 dark:border-slate-100'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  {active && <Check className="w-3.5 h-3.5" />}
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Favorite Themes / Genres */}
        <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2.5">
            Themes &amp; Genres You Enjoy
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {availableTags.map((tag) => {
              const active = preferredTags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => onToggleTag(tag)}
                  className={`px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-blue-700 dark:bg-blue-600 text-white border-blue-700 dark:border-blue-600'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-7 pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => {
              onResetBlank();
              onClose();
            }}
            className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors cursor-pointer"
          >
            Start with Blank History
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium bg-blue-700 dark:bg-blue-600 text-white rounded-lg hover:bg-blue-800 dark:hover:bg-blue-700 transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
