import { MOVIES_50_YEARS } from '../data/movies50Years';
import { CATEGORIES, OTHER_CATEGORIES_ITEMS } from '../data/categoriesCatalog';
import {
  CatalogItem,
  CategoryId,
  Era,
  HistoryEntry,
  RecommendationResult,
  SampleProfile,
  TasteBreakdown,
  UserTasteState,
} from '../types/catalog';

export const FULL_CATALOG: CatalogItem[] = [
  ...MOVIES_50_YEARS,
  ...OTHER_CATEGORIES_ITEMS,
];

export const ITEM_BY_ID: Record<string, CatalogItem> = Object.fromEntries(
  FULL_CATALOG.map((item) => [item.id, item])
);

const CATEGORY_LABEL_MAP: Record<CategoryId, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c.label])
) as Record<CategoryId, string>;

export const SAMPLE_PROFILES: SampleProfile[] = [
  {
    id: 'scifi-ramen',
    name: 'Sci-Fi & Culinary Explorer',
    subtitle: 'Loves atmospheric 80s/2010s sci-fi cinema, ramen & mole craft, synthwave, and Kyoto.',
    preferredTags: ['sci-fi', 'culinary', 'atmospheric', 'architecture'],
    preferredCategories: ['movies', 'food', 'music', 'travel'],
    likedIds: ['mov-blade-runner-1982', 'mov-arrival-2016', 'food-tonkotsu-ramen', 'mus-vangelis-br'],
    savedIds: ['trv-kyoto-machiya', 'book-project-hail-mary'],
    viewedIds: ['mov-alien-1979', 'mov-children-of-men-2006', 'food-mole-negro', 'gam-outer-wilds'],
  },
  {
    id: 'classic-cinema-jazz',
    name: 'Classic Cinema & Jazz Buff',
    subtitle: 'Draws from 70s–90s film classics, modal jazz, literary mysteries, and longform history.',
    preferredTags: ['drama', 'neo-noir', 'jazz', 'literary'],
    preferredCategories: ['movies', 'music', 'books', 'documentaries'],
    likedIds: ['mov-taxi-driver-1976', 'mov-goodfellas-1990', 'mus-kind-of-blue', 'book-secret-history'],
    savedIds: ['mov-in-the-mood-2000', 'doc-soundtrack-coup-2024'],
    viewedIds: ['mov-paris-texas-1984', 'mov-no-country-2007', 'pod-blank-check', 'des-saul-bass'],
  },
  {
    id: 'indie-games-travel',
    name: 'Indie Games & Modern Design',
    subtitle: 'Gravitates toward clever puzzles, contemporary indie music, Nordic food, and modern design.',
    preferredTags: ['indie', 'puzzle', 'design', 'minimalism'],
    preferredCategories: ['games', 'design', 'music', 'movies'],
    likedIds: ['gam-disco-elysium', 'gam-hollow-knight', 'des-dieter-rams', 'mov-parasite-2019'],
    savedIds: ['trv-copenhagen', 'mov-past-lives-2023'],
    viewedIds: ['gam-portal-2', 'mus-in-rainbows', 'food-nordic-ferment-2024', 'pod-99pi'],
  },
];

export function createInitialTasteState(profile: SampleProfile = SAMPLE_PROFILES[0]): UserTasteState {
  const now = Date.now();
  const history: HistoryEntry[] = [];

  profile.viewedIds.forEach((itemId, idx) => {
    history.push({
      id: `init-view-${itemId}`,
      itemId,
      action: 'view',
      timestamp: now - (idx + 5) * 1000 * 60 * 18,
    });
  });

  profile.likedIds.forEach((itemId, idx) => {
    history.push({
      id: `init-like-${itemId}`,
      itemId,
      action: 'like',
      timestamp: now - (idx + 1) * 1000 * 60 * 9,
    });
  });

  profile.savedIds.forEach((itemId, idx) => {
    history.push({
      id: `init-save-${itemId}`,
      itemId,
      action: 'save',
      timestamp: now - (idx + 1) * 1000 * 60 * 4,
    });
  });

  history.sort((a, b) => b.timestamp - a.timestamp);

  return {
    history,
    likedIds: [...profile.likedIds],
    savedIds: [...profile.savedIds],
    dislikedIds: [],
    preferredTags: [...profile.preferredTags],
    preferredCategories: [...profile.preferredCategories],
  };
}

export function createBlankTasteState(): UserTasteState {
  return {
    history: [],
    likedIds: [],
    savedIds: [],
    dislikedIds: [],
    preferredTags: [],
    preferredCategories: [],
  };
}

interface SignalWeights {
  tags: Record<string, number>;
  moods: Record<string, number>;
  eras: Record<Era, number>;
  categories: Record<CategoryId, number>;
  creators: Record<string, number>;
  totalInteractions: number;
}

function computeSignalWeights(state: UserTasteState): SignalWeights {
  const tags: Record<string, number> = {};
  const moods: Record<string, number> = {};
  const eras: Record<Era, number> = {
    '1970s': 0,
    '1980s': 0,
    '1990s': 0,
    '2000s': 0,
    '2010s': 0,
    '2020s': 0,
  };
  const categories: Record<CategoryId, number> = {
    movies: 0,
    music: 0,
    food: 0,
    books: 0,
    series: 0,
    podcasts: 0,
    games: 0,
    travel: 0,
    documentaries: 0,
    design: 0,
  };
  const creators: Record<string, number> = {};

  // Explicit preferred tags from quick setup
  state.preferredTags.forEach((t) => {
    tags[t] = (tags[t] || 0) + 2.5;
  });

  state.preferredCategories.forEach((c) => {
    categories[c] = (categories[c] || 0) + 1.5;
  });

  // Browsing history with recency weight (most recent entries matter more)
  const historySlice = state.history.slice(0, 60);
  historySlice.forEach((entry, index) => {
    const item = ITEM_BY_ID[entry.itemId];
    if (!item) return;

    const recencyMultiplier = Math.max(0.55, 1.25 - index * 0.02);
    let baseWeight = 1.0;
    if (entry.action === 'like') baseWeight = 2.8;
    else if (entry.action === 'save') baseWeight = 2.4;
    else if (entry.action === 'dislike') baseWeight = -3.0;

    const w = baseWeight * recencyMultiplier;

    item.tags.forEach((tag) => {
      tags[tag] = (tags[tag] || 0) + w;
    });
    item.moods.forEach((mood) => {
      moods[mood] = (moods[mood] || 0) + w * 0.85;
    });

    if (w > 0) {
      eras[item.era] = (eras[item.era] || 0) + w * 0.6;
      categories[item.category] = (categories[item.category] || 0) + w * 0.45;
      creators[item.creator] = (creators[item.creator] || 0) + w * 0.8;
    }
  });

  // Ensure explicit likes/saves remain reflected even if older than 60 history events
  state.likedIds.forEach((id) => {
    const item = ITEM_BY_ID[id];
    if (!item) return;
    item.tags.forEach((t) => (tags[t] = (tags[t] || 0) + 1.2));
    item.moods.forEach((m) => (moods[m] = (moods[m] || 0) + 0.9));
  });

  return {
    tags,
    moods,
    eras,
    categories,
    creators,
    totalInteractions: state.history.length + state.preferredTags.length,
  };
}

export function getTasteBreakdown(state: UserTasteState): TasteBreakdown {
  const weights = computeSignalWeights(state);

  const topTags = Object.entries(weights.tags)
    .filter(([, w]) => w > 0.3)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([label, weight]) => ({ label, weight: Number(weight.toFixed(1)) }));

  const topMoods = Object.entries(weights.moods)
    .filter(([, w]) => w > 0.3)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([label, weight]) => ({ label, weight: Number(weight.toFixed(1)) }));

  const topEras = (Object.entries(weights.eras) as Array<[Era, number]>)
    .filter(([, w]) => w > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([era, weight]) => ({ era, weight: Number(weight.toFixed(1)) }));

  const topCategories = (Object.entries(weights.categories) as Array<[CategoryId, number]>)
    .filter(([, w]) => w > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([category, weight]) => ({
      category,
      label: CATEGORY_LABEL_MAP[category],
      weight: Number(weight.toFixed(1)),
    }));

  return {
    topTags,
    topMoods,
    topEras,
    topCategories,
    totalInteractions: weights.totalInteractions,
  };
}

function buildHumanReasons(
  item: CatalogItem,
  state: UserTasteState,
  weights: SignalWeights,
  preferNewBoost: boolean
): string[] {
  const reasons: string[] = [];

  // Find direct source items from liked/saved/viewed history that share tags or creator
  const positiveIds = Array.from(
    new Set([
      ...state.likedIds,
      ...state.savedIds,
      ...state.history.filter((h) => h.action === 'view').map((h) => h.itemId),
    ])
  );

  let bestSource: { title: string; year: number; overlap: number; sameCreator: boolean } | null = null;
  for (const sourceId of positiveIds) {
    if (sourceId === item.id) continue;
    const src = ITEM_BY_ID[sourceId];
    if (!src) continue;
    const sharedTags = item.tags.filter((t) => src.tags.includes(t));
    const sharedMoods = item.moods.filter((m) => src.moods.includes(m));
    const sameCreator = src.creator === item.creator;
    const overlap = sharedTags.length * 2 + sharedMoods.length + (sameCreator ? 3 : 0);
    if (overlap > 0 && (!bestSource || overlap > bestSource.overlap)) {
      bestSource = { title: src.title, year: src.year, overlap, sameCreator };
    }
  }

  if (bestSource) {
    if (bestSource.sameCreator) {
      reasons.push(`From ${item.creator}, whose work you engaged with (${bestSource.title})`);
    } else {
      reasons.push(`Connects with ${bestSource.title} (${bestSource.year}) in your history`);
    }
  }

  const matchedTags = item.tags
    .filter((t) => (weights.tags[t] || 0) > 0.5)
    .sort((a, b) => (weights.tags[b] || 0) - (weights.tags[a] || 0))
    .slice(0, 2);

  if (matchedTags.length > 0) {
    reasons.push(`Matches your taste for ${matchedTags.join(' & ')}`);
  }

  if (item.isNew && preferNewBoost) {
    reasons.push(`Standout ${item.year} release aligned with your past favorites`);
  }

  if (reasons.length === 0) {
    reasons.push(`Critically acclaimed (${item.rating.toFixed(1)}/10) in ${CATEGORY_LABEL_MAP[item.category]}`);
  }

  return reasons.slice(0, 2);
}

export interface RecommendationOptions {
  category?: CategoryId | 'all';
  onlyNew?: boolean;
  preferNew?: boolean;
  excludeLiked?: boolean;
  limit?: number;
}

export function getRecommendations(
  items: CatalogItem[],
  state: UserTasteState,
  options: RecommendationOptions = {}
): RecommendationResult[] {
  const {
    category = 'all',
    onlyNew = false,
    preferNew = false,
    excludeLiked = false,
    limit,
  } = options;

  const weights = computeSignalWeights(state);
  const hasHistory = weights.totalInteractions > 0;
  const viewedSet = new Set(state.history.filter((h) => h.action === 'view').map((h) => h.itemId));
  const likedSet = new Set(state.likedIds);
  const dislikedSet = new Set(state.dislikedIds);

  const maxTagWeight = Math.max(1, ...Object.values(weights.tags));
  const maxMoodWeight = Math.max(1, ...Object.values(weights.moods));

  const filtered = items.filter((item) => {
    if (dislikedSet.has(item.id)) return false;
    if (excludeLiked && likedSet.has(item.id)) return false;
    if (category !== 'all' && item.category !== category) return false;
    if (onlyNew && !item.isNew) return false;
    return true;
  });

  const scored = filtered.map((item) => {
    // Tag similarity
    const tagScore = item.tags.reduce((sum, tag) => {
      const w = weights.tags[tag] || 0;
      return sum + w / maxTagWeight;
    }, 0);

    // Mood similarity
    const moodScore = item.moods.reduce((sum, mood) => {
      const w = weights.moods[mood] || 0;
      return sum + (w / maxMoodWeight) * 0.7;
    }, 0);

    // Creator & category affinity
    const creatorBoost = weights.creators[item.creator] ? 1.15 : 0;
    const categoryBoost = (weights.categories[item.category] || 0) > 0 ? 0.45 : 0;

    // Era alignment
    const eraBoost = (weights.eras[item.era] || 0) > 0 ? 0.35 : 0;

    // Quality baseline (8.2 to 9.5 -> normalized)
    const qualityScore = (item.rating - 7.8) * 0.75;

    // Fresh discovery boost for unseen items
    const noveltyBoost = !viewedSet.has(item.id) && !likedSet.has(item.id) ? 0.55 : 0;

    // New release highlight boost when requested
    const newBoost = preferNew && item.isNew ? 1.45 : 0;

    const rawScore = hasHistory
      ? tagScore * 2.2 + moodScore * 1.4 + creatorBoost + categoryBoost + eraBoost + qualityScore + noveltyBoost + newBoost
      : qualityScore * 2.2 + (item.isNew ? 0.6 : 0);

    // Map rawScore cleanly into a realistic 62% - 98% match range
    const normalizedPercent = hasHistory
      ? Math.min(98, Math.max(62, Math.round(64 + rawScore * 4.1)))
      : Math.min(95, Math.max(76, Math.round(72 + item.rating * 2.2)));

    return {
      item,
      score: rawScore,
      matchPercent: normalizedPercent,
      reasons: buildHumanReasons(item, state, weights, preferNew || onlyNew),
    };
  });

  scored.sort((a, b) => b.score - a.score || b.item.rating - a.item.rating);

  return typeof limit === 'number' ? scored.slice(0, limit) : scored;
}

export function getAllUniqueTags(): string[] {
  const counts: Record<string, number> = {};
  FULL_CATALOG.forEach((item) => {
    item.tags.forEach((tag) => {
      counts[tag] = (counts[tag] || 0) + 1;
    });
  });
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 24)
    .map(([tag]) => tag);
}

export function getRelatedToItem(
  seedItem: CatalogItem,
  items: CatalogItem[],
  state: UserTasteState,
  limit = 12
): {
  franchiseItems: RecommendationResult[];
  relatedItems: RecommendationResult[];
} {
  const dislikedSet = new Set(state.dislikedIds);
  const weights = computeSignalWeights(state);

  const franchiseItems: RecommendationResult[] = [];
  const relatedScored: RecommendationResult[] = [];

  items.forEach((candidate) => {
    if (candidate.id === seedItem.id || dislikedSet.has(candidate.id)) return;

    const sameFranchise =
      Boolean(seedItem.franchise) && candidate.franchise === seedItem.franchise;

    if (sameFranchise) {
      franchiseItems.push({
        item: candidate,
        score: 100,
        matchPercent: 99,
        reasons: [`Part of the ${seedItem.franchise} series`],
      });
      return;
    }

    const sharedTags = candidate.tags.filter((t) => seedItem.tags.includes(t));
    const sharedMoods = candidate.moods.filter((m) => seedItem.moods.includes(m));
    const sameCreator = candidate.creator === seedItem.creator;
    const sameCategory = candidate.category === seedItem.category;
    const userAffinity = candidate.tags.reduce(
      (sum, t) => sum + Math.min(1.5, (weights.tags[t] || 0) * 0.25),
      0
    );

    const score =
      sharedTags.length * 2.6 +
      sharedMoods.length * 1.4 +
      (sameCreator ? 2.5 : 0) +
      (sameCategory ? 2.2 : 0) +
      userAffinity +
      (candidate.rating - 7.5) * 0.4;

    if (sharedTags.length > 0 || sharedMoods.length > 0 || sameCreator) {
      const matchPercent = Math.min(98, Math.max(70, Math.round(68 + score * 2.4)));
      const reasonParts: string[] = [];
      if (sharedTags.length > 0) {
        reasonParts.push(`Shares ${sharedTags.slice(0, 3).join(', ')} with ${seedItem.title}`);
      } else if (sharedMoods.length > 0) {
        reasonParts.push(`Similar ${sharedMoods.slice(0, 2).join(' & ')} tone to ${seedItem.title}`);
      }
      relatedScored.push({
        item: candidate,
        score,
        matchPercent,
        reasons: reasonParts,
      });
    }
  });

  franchiseItems.sort((a, b) => a.item.year - b.item.year);
  relatedScored.sort((a, b) => b.score - a.score || b.item.rating - a.item.rating);

  return {
    franchiseItems,
    relatedItems: relatedScored.slice(0, limit),
  };
}

export interface SearchWithRelatedResult {
  directMatches: RecommendationResult[];
  relatedMatches: RecommendationResult[];
}

export function searchWithRelated(
  query: string,
  items: CatalogItem[],
  state: UserTasteState,
  relatedLimit = 12
): SearchWithRelatedResult {
  const q = query.trim().toLowerCase();
  if (!q) {
    return { directMatches: [], relatedMatches: [] };
  }

  const tokens = q.split(/\s+/).filter(Boolean);
  const dislikedSet = new Set(state.dislikedIds);
  const weights = computeSignalWeights(state);

  const directMatches: Array<RecommendationResult & { relevance: number }> = [];
  const directIds = new Set<string>();

  items.forEach((item) => {
    if (dislikedSet.has(item.id)) return;

    const titleLower = item.title.toLowerCase();
    const franchiseLower = (item.franchise || '').toLowerCase();
    const creatorLower = item.creator.toLowerCase();
    const platformText = (item.platforms || []).join(' ').toLowerCase();
    const industryText = (item.industry || '').toLowerCase();
    const fullText = `${titleLower} ${franchiseLower} ${creatorLower} ${item.tags.join(' ')} ${item.moods.join(' ')} ${platformText} ${industryText} ${item.origin.toLowerCase()} ${item.summary.toLowerCase()}`;

    const allTokensMatch = tokens.every((tok) => fullText.includes(tok));
    if (!allTokensMatch) return;

    let relevance = 1;
    if (titleLower.includes(q)) relevance += 10;
    if (franchiseLower && franchiseLower.includes(q)) relevance += 8;
    if (titleLower.startsWith(q)) relevance += 4;
    if (creatorLower.includes(q)) relevance += 5;
    if (platformText.includes(q) || industryText.includes(q)) relevance += 4;

    directIds.add(item.id);
    directMatches.push({
      item,
      score: relevance,
      relevance,
      matchPercent: Math.min(99, Math.max(82, Math.round(80 + item.rating * 1.8))),
      reasons: item.franchise && franchiseLower.includes(q)
        ? [`${item.franchise} series (${item.year})`]
        : [`Matches "${query.trim()}"`],
    });
  });

  // Sort direct matches: highest relevance first; if same franchise, order chronologically 1 -> 2 -> 3 -> 4
  directMatches.sort((a, b) => {
    if (
      a.item.franchise &&
      b.item.franchise &&
      a.item.franchise === b.item.franchise &&
      Math.abs(a.relevance - b.relevance) <= 4
    ) {
      return a.item.year - b.item.year;
    }
    return b.relevance - a.relevance || b.item.rating - a.item.rating;
  });

  // Build seed tag/mood profile from direct matches (or query tokens if none matched literally)
  const seedTagWeights: Record<string, number> = {};
  const seedMoodWeights: Record<string, number> = {};
  const seedCreators = new Set<string>();
  const seedCategories = new Set<CategoryId>();

  if (directMatches.length > 0) {
    directMatches.slice(0, 5).forEach(({ item }) => {
      item.tags.forEach((t) => {
        seedTagWeights[t] = (seedTagWeights[t] || 0) + 1;
      });
      item.moods.forEach((m) => {
        seedMoodWeights[m] = (seedMoodWeights[m] || 0) + 1;
      });
      seedCreators.add(item.creator);
      seedCategories.add(item.category);
    });
  } else {
    tokens.forEach((t) => {
      seedTagWeights[t] = 2;
    });
  }

  const primarySeedTitle = directMatches[0]?.item.title || query.trim();

  // Score all non-direct items as related recommendations (aiming for 10+ strong related picks)
  const relatedCandidates: RecommendationResult[] = [];
  items.forEach((candidate) => {
    if (directIds.has(candidate.id) || dislikedSet.has(candidate.id)) return;

    let tagOverlapScore = 0;
    const matchedTags: string[] = [];
    candidate.tags.forEach((tag) => {
      if (seedTagWeights[tag]) {
        tagOverlapScore += seedTagWeights[tag] * 2.4;
        matchedTags.push(tag);
      }
    });

    let moodOverlapScore = 0;
    candidate.moods.forEach((mood) => {
      if (seedMoodWeights[mood]) {
        moodOverlapScore += seedMoodWeights[mood] * 1.2;
      }
    });

    const sameCategory = seedCategories.size === 0 || seedCategories.has(candidate.category);
    const sameCreator = seedCreators.has(candidate.creator);
    const userHistoryBoost = candidate.tags.reduce(
      (sum, t) => sum + Math.min(1.5, (weights.tags[t] || 0) * 0.2),
      0
    );

    const score =
      tagOverlapScore +
      moodOverlapScore +
      (sameCreator ? 3.0 : 0) +
      (sameCategory ? 2.5 : 0) +
      userHistoryBoost +
      (candidate.rating - 7.5) * 0.5;

    if (tagOverlapScore > 0 || moodOverlapScore > 0 || directMatches.length === 0) {
      const matchPercent = Math.min(97, Math.max(72, Math.round(70 + score * 1.9)));
      relatedCandidates.push({
        item: candidate,
        score,
        matchPercent,
        reasons: [
          matchedTags.length > 0
            ? `Related to ${primarySeedTitle} · ${matchedTags.slice(0, 3).join(', ')}`
            : `Recommended alongside "${query.trim()}"`,
        ],
      });
    }
  });

  relatedCandidates.sort((a, b) => b.score - a.score || b.item.rating - a.item.rating);

  return {
    directMatches: directMatches.map(({ item, score, matchPercent, reasons }) => ({
      item,
      score,
      matchPercent,
      reasons,
    })),
    relatedMatches: relatedCandidates.slice(0, relatedLimit),
  };
}

