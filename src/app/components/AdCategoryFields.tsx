import { CATEGORY_SPECS, getCategoryFields } from '../data/categorySpecs';
import { cleanCheckboxLabel, formatCurrencyInput, partitionCategoryFields } from '../../lib/adFormHelpers';

type Props = {
    category: string;
    subcategory: string;
    details: Record<string, unknown>;
    onDetailChange: (name: string, value: unknown) => void;
    /** 'new' usa estilos do fluxo de criação; 'edit' estilos mais neutros */
    variant?: 'new' | 'edit';
};

const inputClassNew =
    'w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 focus:bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-all placeholder:text-gray-400';
const inputClassEdit =
    'w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white';
const selectClassNew = inputClassNew + ' appearance-none cursor-pointer';
const selectClassEdit = inputClassEdit;

export function AdCategoryFields({ category, subcategory, details, onDetailChange, variant = 'new' }: Props) {
    if (!category || !CATEGORY_SPECS[category]) return null;

    const fields = getCategoryFields(category, subcategory);
    const {
        nonCheckboxFields,
        propertyCheckboxes,
        condoCheckboxes,
        commercialCheckboxes,
        featureCheckboxes,
    } = partitionCategoryFields(fields);

    const inputClass = variant === 'edit' ? inputClassEdit : inputClassNew;
    const selectClass = variant === 'edit' ? selectClassEdit : selectClassNew;

    const renderCheckboxGroup = (groupTitle: string, items: typeof fields) => {
        if (items.length === 0) return null;
        const box =
            variant === 'edit'
                ? 'flex items-center gap-2 p-2 border border-gray-200 rounded-lg bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors'
                : 'flex items-center gap-2 p-2.5 border border-gray-200 rounded-lg bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors';
        return (
            <div className="space-y-2">
                <h4 className="text-sm font-semibold text-gray-700">{groupTitle}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {items.map((field) => (
                        <label key={field.name} className={box}>
                            <input
                                type="checkbox"
                                checked={!!details[field.name]}
                                onChange={(e) => onDetailChange(field.name, e.target.checked)}
                                className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500 border-gray-300"
                            />
                            <span className="text-gray-700 text-sm">
                                {cleanCheckboxLabel(field.label)}
                                {field.required ? <span className="text-red-500 ml-1">*</span> : null}
                            </span>
                        </label>
                    ))}
                </div>
            </div>
        );
    };

    const checkboxWrapper =
        variant === 'edit'
            ? 'md:col-span-2 rounded-xl border border-gray-200 bg-gray-50/50 p-3 space-y-4'
            : 'col-span-2 rounded-xl border border-gray-200 bg-gray-50/50 p-4 space-y-4';

    return (
        <>
            {nonCheckboxFields.map((field) => (
                <div key={field.name} className="space-y-2">
                    <label htmlFor={`field-${field.name}`} className="block text-sm font-medium text-gray-700">
                        {field.label}
                        {field.required ? <span className="text-red-500 ml-1">*</span> : null}
                    </label>
                    <div className="relative">
                        {field.type === 'select' ? (
                            <select
                                id={`field-${field.name}`}
                                value={(details[field.name] as string) || ''}
                                onChange={(e) => onDetailChange(field.name, e.target.value)}
                                required={field.required}
                                className={selectClass + (variant === 'new' ? ' pl-4' : '')}
                                aria-label={field.label}
                            >
                                <option value="">Selecione...</option>
                                {field.options?.map((opt) => (
                                    <option key={opt} value={opt}>
                                        {opt}
                                    </option>
                                ))}
                            </select>
                        ) : (
                            <input
                                id={`field-${field.name}`}
                                type={field.type === 'number' && field.unit !== 'R$' ? 'number' : 'text'}
                                inputMode={field.type === 'number' ? 'decimal' : 'text'}
                                placeholder={field.placeholder}
                                value={(details[field.name] as string | number) ?? ''}
                                onChange={(e) =>
                                    onDetailChange(
                                        field.name,
                                        field.type === 'number' && field.unit === 'R$'
                                            ? formatCurrencyInput(e.target.value)
                                            : e.target.value,
                                    )
                                }
                                required={field.required}
                                className={inputClass}
                            />
                        )}
                        {field.unit && (
                            <span
                                className={
                                    variant === 'edit'
                                        ? 'absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none'
                                        : 'absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none'
                                }
                            >
                                {field.unit}
                            </span>
                        )}
                    </div>
                </div>
            ))}

            {(commercialCheckboxes.length > 0 ||
                featureCheckboxes.length > 0 ||
                propertyCheckboxes.length > 0 ||
                condoCheckboxes.length > 0) && (
                <div className={checkboxWrapper}>
                    {renderCheckboxGroup('Condições comerciais', commercialCheckboxes)}
                    {renderCheckboxGroup('Características', featureCheckboxes)}
                    {renderCheckboxGroup('Detalhes do imóvel', propertyCheckboxes)}
                    {renderCheckboxGroup('Detalhes do condomínio', condoCheckboxes)}
                </div>
            )}
        </>
    );
}
