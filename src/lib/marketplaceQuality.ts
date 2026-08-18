import type { Ad, Profile } from '../types';

export const SAVED_SEARCHES_KEY = 'dezzapego_saved_searches';

export type SavedSearch = {
  id: string;
  label: string;
  url: string;
  createdAt: string;
  filters: {
    selectedCategory: string;
    selectedSubcategory: string;
    selectedTransactionType?: string;
    selectedState: string;
    selectedCity?: string;
    advertiserType?: string;
    sortBy?: string;
    priceRange: [number, number];
    searchQuery: string;
    detailsFilters?: Record<string, unknown>;
    radius?: number;
  };
};

export function digitsOnly(value: string) {
  return value.replace(/\D/g, '');
}

export function formatPhone(value: string) {
  const d = digitsOnly(value).slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function formatCpfCnpj(value: string) {
  const d = digitsOnly(value).slice(0, 14);
  if (d.length <= 11) {
    if (d.length <= 3) return d;
    if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
    if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  }
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

function hasRepeatedDigits(value: string) {
  return /^(\d)\1+$/.test(value);
}

function validateCpf(value: string) {
  const cpf = digitsOnly(value);
  if (cpf.length !== 11 || hasRepeatedDigits(cpf)) return false;
  const calc = (factor: number) => {
    let total = 0;
    for (let i = 0; i < factor - 1; i++) total += Number(cpf[i]) * (factor - i);
    const rest = (total * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  return calc(10) === Number(cpf[9]) && calc(11) === Number(cpf[10]);
}

function validateCnpj(value: string) {
  const cnpj = digitsOnly(value);
  if (cnpj.length !== 14 || hasRepeatedDigits(cnpj)) return false;
  const calc = (length: number) => {
    const weights = length === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const sum = weights.reduce((acc, weight, index) => acc + Number(cnpj[index]) * weight, 0);
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };
  return calc(12) === Number(cnpj[12]) && calc(13) === Number(cnpj[13]);
}

export function isValidCpfOrCnpj(value: string) {
  const digits = digitsOnly(value);
  if (digits.length === 11) return validateCpf(digits);
  if (digits.length === 14) return validateCnpj(digits);
  return false;
}

export function normalizeText(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

export function findSuspiciousSignals(input: { title: string; description: string; price?: string | number }) {
  const text = normalizeText(`${input.title} ${input.description}`);
  const signals: string[] = [];
  if (/(pix antecipado|sinal antecipado|entrada antecipada|pague antes|reserva por pix)/.test(text)) {
    signals.push('Evite pedir pagamento antecipado no texto do anúncio.');
  }
  if (/(whatsapp|zap|telegram|instagram|http:\/\/|https:\/\/|www\.)/.test(text)) {
    signals.push('Prefira deixar contato nos campos próprios, não no título ou descrição.');
  }
  if (/(urgente demais|imperdivel hoje|preco de desapego total|abaixo da tabela)/.test(text)) {
    signals.push('Use uma descrição objetiva; promessas exageradas reduzem confiança.');
  }
  const numericPrice = typeof input.price === 'number' ? input.price : Number(digitsOnly(String(input.price || ''))) / 100;
  if (numericPrice > 0 && numericPrice < 10) {
    signals.push('Confira se o preço está correto.');
  }
  return signals;
}

export function getAdQualityTips(input: { title: string; description: string; images: string[]; location?: { neighborhood?: string } }) {
  const tips: string[] = [];
  if (input.title.trim().length < 18) tips.push('Use um título mais específico com marca, modelo ou principal diferencial.');
  if (input.description.trim().length < 80) tips.push('Inclua estado de conservação, medidas, itens inclusos e motivo da venda.');
  if (input.images.length < 3) tips.push('Anúncios com 3 ou mais fotos tendem a gerar mais contatos.');
  if (!input.location?.neighborhood?.trim()) tips.push('Adicionar bairro ajuda compradores próximos a decidir mais rápido.');
  return tips;
}

export function getSellerTrustBadges(profile: Partial<Profile> | null, seller?: Ad['seller']) {
  const badges: string[] = [];
  if (profile?.verified || seller?.verified) badges.push('Conta verificada');
  if (profile?.created_at) badges.push(`Desde ${new Date(profile.created_at).getFullYear()}`);
  if ((seller as { type?: string } | undefined)?.type === 'professional') badges.push('Profissional');
  return badges;
}

export function getRelatedAds(current: Ad, ads: Ad[]) {
  return ads
    .filter((ad) => ad.id !== current.id)
    .map((ad) => {
      let score = 0;
      if (ad.category === current.category) score += 4;
      if (ad.subcategory && ad.subcategory === current.subcategory) score += 3;
      if (ad.location?.state === current.location?.state) score += 2;
      if (ad.location?.city === current.location?.city) score += 2;
      if (ad.featured) score += 1;
      return { ad, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || new Date(b.ad.publishedAt).getTime() - new Date(a.ad.publishedAt).getTime())
    .slice(0, 4)
    .map((item) => item.ad);
}

export function readSavedSearches() {
  try {
    const raw = localStorage.getItem(SAVED_SEARCHES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is SavedSearch => Boolean(item?.id && item?.url && item?.label));
  } catch {
    return [];
  }
}

export function writeSavedSearches(searches: SavedSearch[]) {
  try {
    localStorage.setItem(SAVED_SEARCHES_KEY, JSON.stringify(searches.slice(0, 10)));
  } catch {
    /* ignore QuotaExceededError or SecurityError */
  }
}

export function removeSavedSearch(id: string) {
  const next = readSavedSearches().filter((item) => item.id !== id);
  writeSavedSearches(next);
  return next;
}

export function buildSearchLabel(search: Pick<SavedSearch, 'filters'>) {
  const { filters } = search;
  const pieces = [
    filters.searchQuery?.trim(),
    filters.selectedCategory,
    filters.selectedSubcategory,
    filters.selectedCity,
    filters.selectedState,
  ].filter(Boolean);
  return pieces.length ? pieces.join(' · ') : 'Busca geral';
}

export function saveSearch(search: Omit<SavedSearch, 'id' | 'createdAt' | 'label'> & { label?: string }) {
  const now = new Date().toISOString();
  const savedSearch: SavedSearch = {
    ...search,
    id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}`,
    label: search.label || buildSearchLabel(search),
    createdAt: now,
  };
  const previous = readSavedSearches().filter((item) => item.url !== savedSearch.url);
  const next = [savedSearch, ...previous].slice(0, 10);
  writeSavedSearches(next);
  return next;
}

export function encodeDetailsFilters(filters: Record<string, unknown>) {
  const cleaned = Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== '' && value !== null && value !== undefined));
  if (Object.keys(cleaned).length === 0) return '';
  return JSON.stringify(cleaned);
}

export function decodeDetailsFilters(value: string | null) {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return parsed as Record<string, unknown>;
  } catch {
    return {};
  }
}

export function withDetailsFiltersInUrl(pathname: string, search: string, filters: Record<string, unknown>) {
  const params = new URLSearchParams(search);
  const encoded = encodeDetailsFilters(filters);
  if (encoded) {
    params.set('details', encoded);
  } else {
    params.delete('details');
  }
  const qs = params.toString();
  return `${pathname}${qs ? `?${qs}` : ''}`;
}
