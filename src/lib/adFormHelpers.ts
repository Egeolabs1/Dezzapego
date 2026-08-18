import { getCategoryFields, type CategoryField } from '../app/data/categorySpecs';

export const MIN_TITLE_LENGTH = 15;
export const MIN_DESCRIPTION_LENGTH = 80;
export const MAX_TITLE_LENGTH = 100;

export function formatCurrencyInput(raw: string): string {
    const digits = raw.replace(/\D/g, '');
    if (!digits) return '';
    const value = Number(digits);
    return value.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

export function formatCurrencyFromNumber(value: number): string {
    return Number(value || 0).toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

export function parseCurrencyInput(raw: string): number {
    if (!raw) return 0;
    const normalized = raw.replace(/\./g, '').replace(',', '.').replace(/[^\d.]/g, '');
    const numeric = Number(normalized);
    return Number.isFinite(numeric) ? numeric : 0;
}

export function getValidImages(images: string[]): string[] {
    return images.map((img) => img.trim()).filter(Boolean);
}

export type AdLocationForm = {
    state: string;
    city: string;
    neighborhood?: string;
    lat: number | null;
    lng: number | null;
};

export function validateLocation(loc: AdLocationForm): string | null {
    const uf = (loc.state || '').trim().toUpperCase();
    if (!uf || uf.length !== 2) return 'Informe a UF com 2 letras.';
    const city = (loc.city || '').trim();
    if (city.length < 2) return 'Informe a cidade.';
    return null;
}

export function validateAdCategoryStep(category: string, subcategory: string): string | null {
    if (!category) return 'Selecione uma categoria.';
    if (!subcategory) return 'Selecione uma subcategoria.';
    return null;
}

export function validateAdMainFields(input: {
    title: string;
    description: string;
    price: string;
}): string | null {
    const title = input.title.trim();
    if (title.length < MIN_TITLE_LENGTH) {
        return `Use um título mais específico (mínimo ${MIN_TITLE_LENGTH} caracteres).`;
    }
    if (title.length > MAX_TITLE_LENGTH) {
        return `O título pode ter no máximo ${MAX_TITLE_LENGTH} caracteres.`;
    }
    const desc = input.description.trim();
    if (desc.length < MIN_DESCRIPTION_LENGTH) {
        return `Amplie a descrição para pelo menos ${MIN_DESCRIPTION_LENGTH} caracteres.`;
    }
    const price = parseCurrencyInput(input.price);
    if (price <= 0) return 'Informe um preço maior que zero.';
    return null;
}

export function validateAdBasics(input: {
    title: string;
    description: string;
    category: string;
    subcategory: string;
    price: string;
    images: string[];
}): string | null {
    const catErr = validateAdCategoryStep(input.category, input.subcategory);
    if (catErr) return catErr;
    const mainErr = validateAdMainFields({
        title: input.title,
        description: input.description,
        price: input.price,
    });
    if (mainErr) return mainErr;
    const validImages = getValidImages(input.images);
    if (validImages.length === 0) return 'Adicione pelo menos uma foto ao anúncio.';
    return null;
}

export function getMissingRequiredDetailLabels(
    category: string,
    subcategory: string,
    details: Record<string, unknown>,
): string[] {
    const fields = getCategoryFields(category, subcategory);
    return fields
        .filter((field) => field.required)
        .filter((field) => {
            const value = details[field.name];
            return value === undefined || value === null || String(value).trim() === '';
        })
        .map((f) => f.label);
}

export function buildNormalizedDetails(
    category: string,
    subcategory: string,
    details: Record<string, unknown>,
): Record<string, unknown> {
    const fields = getCategoryFields(category, subcategory);
    if (!fields.length) return details;

    const normalized: Record<string, unknown> = {};
    fields.forEach((field) => {
        const value = details[field.name];
        if (field.type === 'checkbox') {
            normalized[field.name] = Boolean(value);
            return;
        }
        if (field.type === 'number') {
            if (value === undefined || value === null || String(value).trim() === '') {
                normalized[field.name] = '';
            } else {
                const n = field.unit === 'R$' ? parseCurrencyInput(String(value)) : Number(value);
                normalized[field.name] = Number.isNaN(n) ? value : n;
            }
            return;
        }
        normalized[field.name] = value ?? '';
    });
    return normalized;
}

export function cleanCheckboxLabel(label: string): string {
    return label.replace(/^Detalhe:\s*/i, '').replace(/^Condomínio:\s*/i, '').trim();
}

export function partitionCategoryFields(fields: CategoryField[]) {
    const nonCheckboxFields = fields.filter((field) => field.type !== 'checkbox');
    const propertyCheckboxes = fields.filter((field) => field.type === 'checkbox' && field.name.startsWith('det_'));
    const condoCheckboxes = fields.filter((field) => field.type === 'checkbox' && field.name.startsWith('cond_'));
    const genericCheckboxes = fields.filter(
        (field) => field.type === 'checkbox' && !field.name.startsWith('det_') && !field.name.startsWith('cond_'),
    );
    const commercialCheckboxes = genericCheckboxes.filter((field) =>
        /(accept|financing|warranty|delivery|invoice|quote|commission|allowance|insurance)/i.test(field.name),
    );
    const featureCheckboxes = genericCheckboxes.filter(
        (field) => !commercialCheckboxes.some((c) => c.name === field.name),
    );
    return {
        nonCheckboxFields,
        propertyCheckboxes,
        condoCheckboxes,
        commercialCheckboxes,
        featureCheckboxes,
    };
}
