import { normalizeText } from './marketplaceQuality';

export type SearchAlertFilters = {
  searchQuery?: string;
  selectedCategory?: string;
  selectedSubcategory?: string;
  selectedTransactionType?: string;
  selectedState?: string;
  selectedCity?: string;
  advertiserType?: string;
  priceRange?: [number, number];
  detailsFilters?: Record<string, unknown>;
};

type SearchableAd = {
  title?: string | null;
  description?: string | null;
  category?: string | null;
  subcategory?: string | null;
  price?: number | string | null;
  transactionType?: string | null;
  transaction_type?: string | null;
  location?: { city?: string | null; state?: string | null } | null;
  seller?: { type?: string | null } | null;
  details?: Record<string, unknown> | null;
  [key: string]: unknown;
};

export function normalizeSearchAlertFilters(value: unknown): SearchAlertFilters {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const raw = value as Record<string, unknown>;
  const stringField = (key: string, maxLength: number) =>
    typeof raw[key] === 'string' ? String(raw[key]).trim().slice(0, maxLength) : undefined;
  const range = Array.isArray(raw.priceRange) && raw.priceRange.length === 2
    ? raw.priceRange.map(Number)
    : null;

  return {
    searchQuery: stringField('searchQuery', 120),
    selectedCategory: stringField('selectedCategory', 80),
    selectedSubcategory: stringField('selectedSubcategory', 100),
    selectedTransactionType: stringField('selectedTransactionType', 30),
    selectedState: stringField('selectedState', 80),
    selectedCity: stringField('selectedCity', 100),
    advertiserType: stringField('advertiserType', 30),
    ...(range && range.every(Number.isFinite) ? { priceRange: [range[0], range[1]] as [number, number] } : {}),
    ...(raw.detailsFilters && typeof raw.detailsFilters === 'object' && !Array.isArray(raw.detailsFilters)
      ? { detailsFilters: Object.fromEntries(Object.entries(raw.detailsFilters as Record<string, unknown>).filter(([, item]) => item !== '' && item !== null && item !== undefined).slice(0, 30)) }
      : {}),
  };
}

export function matchesSearchAlert(ad: SearchableAd, filters: SearchAlertFilters) {
  if (filters.searchQuery?.trim()) {
    const searchable = normalizeText([
      ad.title,
      ad.description,
      ad.category,
      ad.subcategory,
      ad.location?.city,
      ad.location?.state,
    ].filter(Boolean).join(' '));
    if (!searchable.includes(normalizeText(filters.searchQuery.trim()))) return false;
  }

  if (filters.selectedCategory && normalizeText(ad.category || '') !== normalizeText(filters.selectedCategory)) return false;
  if (filters.selectedSubcategory && normalizeText(ad.subcategory || '') !== normalizeText(filters.selectedSubcategory)) return false;
  if (filters.selectedState && normalizeText(ad.location?.state || '') !== normalizeText(filters.selectedState)) return false;
  if (filters.selectedCity && normalizeText(ad.location?.city || '') !== normalizeText(filters.selectedCity)) return false;

  const transactionType = ad.transactionType || ad.transaction_type;
  if (filters.selectedTransactionType && normalizeText(transactionType || '') !== normalizeText(filters.selectedTransactionType)) return false;

  if (filters.priceRange) {
    const price = Number(ad.price);
    if (!Number.isFinite(price) || price < filters.priceRange[0] || price > filters.priceRange[1]) return false;
  }

  if (filters.advertiserType && filters.advertiserType !== 'ambos') {
    const isProfessional = /professional|profissional/i.test(ad.seller?.type || '');
    if (filters.advertiserType === 'profissional' && !isProfessional) return false;
    if (filters.advertiserType === 'particular' && isProfessional) return false;
  }

  for (const [key, expected] of Object.entries(filters.detailsFilters || {})) {
    const min = key.match(/^(.*)Min$/);
    const max = key.match(/^(.*)Max$/);
    const actual = ad[key] ?? ad.details?.[key] ?? (min || max ? ad[min?.[1] || max?.[1]!] ?? ad.details?.[min?.[1] || max?.[1]!] : undefined);
    if (min || max) {
      const actualNumber = Number(actual);
      const expectedNumber = Number(expected);
      if (!Number.isFinite(actualNumber) || !Number.isFinite(expectedNumber)) return false;
      if (min && actualNumber < expectedNumber) return false;
      if (max && actualNumber > expectedNumber) return false;
    } else if (typeof expected === 'boolean') {
      if (!(actual === true || actual === 1 || String(actual).toLowerCase() === 'true' || String(actual).toLowerCase() === 'sim')) return false;
    } else if (actual === undefined || !normalizeText(String(actual)).includes(normalizeText(String(expected)))) {
      return false;
    }
  }

  return true;
}

export function hasSearchAlertCriteria(filters: SearchAlertFilters) {
  return Boolean(
    filters.searchQuery?.trim() ||
    filters.selectedCategory ||
    filters.selectedSubcategory ||
    filters.selectedState ||
    filters.selectedCity ||
    filters.selectedTransactionType ||
    filters.advertiserType && filters.advertiserType !== 'ambos' ||
    filters.detailsFilters && Object.keys(filters.detailsFilters).length > 0 ||
    filters.priceRange && (filters.priceRange[0] > 0 || filters.priceRange[1] < 10_000_000),
  );
}
