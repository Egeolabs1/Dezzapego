import { describe, expect, it } from 'vitest';
import { hasSearchAlertCriteria, matchesSearchAlert, type SearchAlertFilters } from '@/lib/searchAlertMatching';

const ad = {
  title: 'Apartamento amplo em São Paulo',
  description: 'Dois quartos, próximo ao metrô.',
  category: 'Imóveis',
  subcategory: 'Venda - casas e apartamentos',
  price: 420000,
  transactionType: 'venda',
  location: { city: 'São Paulo', state: 'SP' },
};

describe('matchesSearchAlert', () => {
  it('matches normalized query, category, location, transaction type and price', () => {
    const filters: SearchAlertFilters = {
      searchQuery: 'sao paulo',
      selectedCategory: 'Imóveis',
      selectedState: 'SP',
      selectedCity: 'São Paulo',
      selectedTransactionType: 'venda',
      priceRange: [300000, 500000],
    };

    expect(matchesSearchAlert(ad, filters)).toBe(true);
  });

  it('rejects an ad that does not match an active filter', () => {
    expect(matchesSearchAlert(ad, { selectedCity: 'Campinas' })).toBe(false);
    expect(matchesSearchAlert(ad, { priceRange: [0, 100000] })).toBe(false);
    expect(matchesSearchAlert(ad, { searchQuery: 'casa na praia' })).toBe(false);
  });

  it('treats absent filters as unrestricted', () => {
    expect(matchesSearchAlert(ad, {})).toBe(true);
  });

  it('requires a meaningful filter before enabling e-mail alerts', () => {
    expect(hasSearchAlertCriteria({})).toBe(false);
    expect(hasSearchAlertCriteria({ searchQuery: 'bicicleta' })).toBe(true);
  });

  it('matches category-specific detail filters from columns or JSON details', () => {
    expect(matchesSearchAlert({ ...ad, details: { bedrooms: 3 } }, { detailsFilters: { bedrooms: 3 } })).toBe(true);
    expect(matchesSearchAlert({ ...ad, details: { bedrooms: 2 } }, { detailsFilters: { bedroomsMin: 3 } })).toBe(false);
  });
});
