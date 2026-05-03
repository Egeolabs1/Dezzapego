import { CATEGORIES } from '../app/data/categories';

export function slugifyCategoryPart(value: string): string {
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/&/g, ' e ')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

export function getCategoryPath(category: string, subcategory?: string): string {
    const categorySlug = slugifyCategoryPart(category);
    if (!subcategory) return `/categoria/${categorySlug}`;
    return `/categoria/${categorySlug}/${slugifyCategoryPart(subcategory)}`;
}

export function resolveCategoryFromSlug(slug?: string): string {
    if (!slug) return '';
    return Object.keys(CATEGORIES).find((category) => slugifyCategoryPart(category) === slug) || '';
}

export function resolveSubcategoryFromSlug(category: string, slug?: string): string {
    if (!category || !slug) return '';
    return CATEGORIES[category]?.find((subcategory) => slugifyCategoryPart(subcategory) === slug) || '';
}
