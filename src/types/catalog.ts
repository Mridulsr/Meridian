export type CategoryId =
  | 'movies'
  | 'music'
  | 'food'
  | 'books'
  | 'series'
  | 'podcasts'
  | 'games'
  | 'travel'
  | 'documentaries'
  | 'design';

export type Era =
  | '1970s'
  | '1980s'
  | '1990s'
  | '2000s'
  | '2010s'
  | '2020s';

export interface CategoryMeta {
  id: CategoryId;
  label: string;
  shortLabel: string;
  description: string;
}

export type StreamingPlatform =
  | 'Netflix'
  | 'Prime Video'
  | 'ZEE5'
  | 'SonyLIV'
  | 'Hotstar'
  | 'Apple TV+'
  | 'MUBI'
  | 'Theaters';

export type MovieIndustry =
  | 'Hollywood'
  | 'Bollywood'
  | 'Indian Regional'
  | 'International';

export interface CatalogItem {
  id: string;
  title: string;
  category: CategoryId;
  year: number;
  era: Era;
  creator: string;
  tags: string[];
  moods: string[];
  rating: number;
  isNew: boolean;
  origin: string;
  durationOrFormat: string;
  summary: string;
  whyNotable: string;
  franchise?: string;
  platforms?: StreamingPlatform[];
  industry?: MovieIndustry;
}

export type InteractionAction = 'view' | 'like' | 'save' | 'dislike';

export interface HistoryEntry {
  id: string;
  itemId: string;
  action: InteractionAction;
  timestamp: number;
}

export interface UserTasteState {
  history: HistoryEntry[];
  likedIds: string[];
  savedIds: string[];
  dislikedIds: string[];
  preferredTags: string[];
  preferredCategories: CategoryId[];
}

export interface RecommendationResult {
  item: CatalogItem;
  score: number;
  matchPercent: number;
  reasons: string[];
}

export interface TasteBreakdown {
  topTags: Array<{ label: string; weight: number }>;
  topMoods: Array<{ label: string; weight: number }>;
  topEras: Array<{ era: Era; weight: number }>;
  topCategories: Array<{ category: CategoryId; label: string; weight: number }>;
  totalInteractions: number;
}

export interface SampleProfile {
  id: string;
  name: string;
  subtitle: string;
  preferredTags: string[];
  preferredCategories: CategoryId[];
  likedIds: string[];
  savedIds: string[];
  viewedIds: string[];
}
