import { MapPin, DollarSign, SlidersHorizontal, Tag, Filter, RotateCcw, Search } from 'lucide-react';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import { CATEGORY_SPECS, CategoryField, getCategoryFields } from '../data/categorySpecs';

type FiltersProps = {
  selectedCategory: string;
  selectedSubcategory?: string;
  selectedState: string;
  onStateChange: (state: string) => void;
  selectedCity: string;
  onCityChange: (city: string) => void;
  advertiserType?: 'ambos' | 'particular' | 'profissional';
  onAdvertiserTypeChange?: (type: 'ambos' | 'particular' | 'profissional') => void;
  sortBy?: 'relevancia' | 'recentes' | 'menor-preco' | 'maior-preco';
  onSortByChange?: (sort: 'relevancia' | 'recentes' | 'menor-preco' | 'maior-preco') => void;
  priceRange: [number, number];
  onPriceRangeChange: (range: [number, number]) => void;
  detailsFilters: Record<string, any>;
  onDetailsFilterChange: (filters: Record<string, any>) => void;
  radius?: number; // Added since it was in Home usage references in conversation
  onRadiusChange?: (r: number) => void;
  userLocation?: { lat: number, lng: number } | null;
  onUserLocationChange?: (loc: { lat: number, lng: number } | null) => void;
};

const brazilianStates = [
  { value: '', label: 'Todo o Brasil' },
  { value: 'AC', label: 'Acre' },
  { value: 'AL', label: 'Alagoas' },
  { value: 'AP', label: 'Amapá' },
  { value: 'AM', label: 'Amazonas' },
  { value: 'BA', label: 'Bahia' },
  { value: 'CE', label: 'Ceará' },
  { value: 'DF', label: 'Distrito Federal' },
  { value: 'ES', label: 'Espírito Santo' },
  { value: 'GO', label: 'Goiás' },
  { value: 'MA', label: 'Maranhão' },
  { value: 'MT', label: 'Mato Grosso' },
  { value: 'MS', label: 'Mato Grosso do Sul' },
  { value: 'MG', label: 'Minas Gerais' },
  { value: 'PA', label: 'Pará' },
  { value: 'PB', label: 'Paraíba' },
  { value: 'PR', label: 'Paraná' },
  { value: 'PE', label: 'Pernambuco' },
  { value: 'PI', label: 'Piauí' },
  { value: 'RJ', label: 'Rio de Janeiro' },
  { value: 'RN', label: 'Rio Grande do Norte' },
  { value: 'RS', label: 'Rio Grande do Sul' },
  { value: 'RO', label: 'Rondônia' },
  { value: 'RR', label: 'Roraima' },
  { value: 'SC', label: 'Santa Catarina' },
  { value: 'SP', label: 'São Paulo' },
  { value: 'SE', label: 'Sergipe' },
  { value: 'TO', label: 'Tocantins' },
];

export function Filters({
  selectedCategory,
  selectedSubcategory,
  selectedState,
  onStateChange,
  selectedCity,
  onCityChange,
  advertiserType = 'ambos',
  onAdvertiserTypeChange,
  sortBy = 'relevancia',
  onSortByChange,
  priceRange,
  onPriceRangeChange,
  detailsFilters,
  onDetailsFilterChange,
  radius,
  onRadiusChange,
  userLocation,
  onUserLocationChange
}: FiltersProps) {
  const [minPrice, setMinPrice] = useState(priceRange[0]);
  const [maxPrice, setMaxPrice] = useState(priceRange[1]);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    setMinPrice(priceRange[0]);
    setMaxPrice(priceRange[1]);
  }, [priceRange]);

  const applyPriceFilter = () => {
    onPriceRangeChange([minPrice, maxPrice]);
  };

  const clearAllFilters = () => {
    onStateChange('');
    onCityChange('');
    onPriceRangeChange([0, 10000000]);
    onDetailsFilterChange({});
    if (onUserLocationChange) onUserLocationChange(null);
    if (onRadiusChange) onRadiusChange(0);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const handleDynamicFilterChange = (field: string, value: string | number | boolean) => {
    onDetailsFilterChange({
      ...detailsFilters,
      [field]: value
    });
  };

  const handleBooleanFilterToggle = (field: string) => {
    const next = !detailsFilters[field];
    onDetailsFilterChange({
      ...detailsFilters,
      [field]: next ? true : '',
    });
  };

  const activeDetailsFilters = Object.values(detailsFilters).filter(Boolean).length;
  const hasLocationFilter = Boolean(selectedState || selectedCity || userLocation || (radius || 0) > 0);
  const hasPriceFilter = priceRange[0] > 0 || priceRange[1] < 10000000;
  const activeFiltersCount = activeDetailsFilters + (hasLocationFilter ? 1 : 0) + (hasPriceFilter ? 1 : 0);
  const categoryFields = getCategoryFields(selectedCategory, selectedSubcategory);
  const propertyDetailsOptions = categoryFields
    .filter((field) => field.type === 'checkbox' && field.name.startsWith('det_'))
    .map((field) => ({ key: field.name, label: field.label.replace('Detalhe: ', '') }));
  const condoDetailsOptions = categoryFields
    .filter((field) => field.type === 'checkbox' && field.name.startsWith('cond_'))
    .map((field) => ({ key: field.name, label: field.label.replace('Condomínio: ', '') }));

  const renderDynamicFilters = () => {
    if (!selectedCategory || !CATEGORY_SPECS[selectedCategory]) return null;

    const fields = categoryFields;
    const quickNumberFields = new Set(['bedrooms', 'bathrooms', 'garage']);
    const isImoveisSpecialCheckbox = (name: string) =>
      selectedCategory === 'Imóveis' && (name.startsWith('det_') || name.startsWith('cond_'));

    return (
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-200 transition-all hover:shadow-md">
        <h3 className="flex items-center gap-2 font-bold text-gray-800 mb-4">
          <Tag className="w-5 h-5 text-purple-600" />
          Filtros de {selectedCategory}
        </h3>
        <div className="space-y-3">
          {fields.map((field: CategoryField) => {
            if (field.type === 'checkbox' && isImoveisSpecialCheckbox(field.name)) {
              return null;
            }

            if (field.type === 'checkbox') {
              return (
                <label key={field.name} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(detailsFilters[field.name])}
                    onChange={() => handleBooleanFilterToggle(field.name)}
                    className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  {field.label}
                </label>
              );
            }

            if (field.type === 'select') {
              return (
                <div key={field.name} className="min-w-0">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{field.label}</label>
                  <div className="flex flex-wrap gap-2">
                    {field.options?.map(opt => {
                      const selected = detailsFilters[field.name] === opt;
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => handleDynamicFilterChange(field.name, selected ? '' : opt)}
                          className={`px-3 py-2 rounded-xl border text-sm transition-colors ${selected
                            ? 'border-purple-500 bg-purple-50 text-purple-700 font-semibold'
                            : 'border-gray-300 bg-gray-50 text-gray-700 hover:bg-gray-100'
                            }`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            }

            if (field.type === 'number') {
              if (quickNumberFields.has(field.name) && selectedCategory === 'Imóveis') {
                const options = ['0', '1', '2', '3', '4', '5+'];
                return (
                  <div key={field.name} className="min-w-0">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{field.label}</label>
                    <div className="flex flex-wrap gap-2">
                      {options.map((option) => {
                        const selected = String(detailsFilters[field.name] ?? '') === option;
                        return (
                          <button
                            key={option}
                            type="button"
                            onClick={() => handleDynamicFilterChange(field.name, selected ? '' : option)}
                            className={`h-9 min-w-9 px-3 rounded-xl border text-sm transition-colors ${selected
                              ? 'border-purple-500 bg-purple-50 text-purple-700 font-semibold'
                              : 'border-gray-300 bg-gray-50 text-gray-700 hover:bg-gray-100'
                              }`}
                          >
                            {option}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              }

              return (
                <div key={field.name} className="min-w-0">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{field.label}</label>
                  <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
                    <input
                      type="number"
                      placeholder="Min."
                      value={detailsFilters[`${field.name}Min`] || ''}
                      onChange={(e) => handleDynamicFilterChange(`${field.name}Min`, e.target.value)}
                      className="w-full px-3 py-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all text-gray-700"
                    />
                    <input
                      type="number"
                      placeholder="Máx."
                      value={detailsFilters[`${field.name}Max`] || ''}
                      onChange={(e) => handleDynamicFilterChange(`${field.name}Max`, e.target.value)}
                      className="w-full px-3 py-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all text-gray-700"
                    />
                    <button
                      type="button"
                      className="h-10 w-10 shrink-0 rounded-full bg-purple-600 text-white flex items-center justify-center hover:bg-purple-700 transition-colors"
                      aria-label={`Aplicar filtro de ${field.label}`}
                    >
                      <Search className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div key={field.name} className="min-w-0">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{field.label}</label>
                <input
                  type="text"
                  placeholder={field.placeholder || field.label}
                  value={detailsFilters[field.name] || ''}
                  onChange={(e) => handleDynamicFilterChange(field.name, e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border-transparent rounded-xl focus:bg-white focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all text-gray-700"
                />
              </div>
            )
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Mobile Toggle */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="lg:hidden w-full flex items-center justify-between p-4 bg-white border border-gray-200 shadow-sm rounded-2xl hover:bg-gray-50 transition-all active:scale-[0.98]"
      >
        <div className="flex items-center gap-3">
          <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
            <SlidersHorizontal className="w-5 h-5" />
          </div>
          <span className="font-semibold text-gray-800">Filtros</span>
          {activeFiltersCount > 0 && (
            <span className="bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">{activeFiltersCount}</span>
          )}
        </div>
        <span className="text-sm font-medium text-gray-500">
          {isExpanded ? 'Ocultar' : 'Mostrar'}
        </span>
      </button>

      {/* Filters Container */}
      <div className={`space-y-4 ${isExpanded ? 'block' : 'hidden lg:block'}`}>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-gray-800">Painel de filtros</h2>
              <p className="text-sm text-gray-500">
                {activeFiltersCount > 0 ? `${activeFiltersCount} filtro(s) ativo(s)` : 'Nenhum filtro aplicado'}
              </p>
            </div>
            <button
              onClick={clearAllFilters}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
              type="button"
            >
              <RotateCcw className="w-4 h-4" />
              Limpar
            </button>
          </div>
        </div>

        {/* Location Filter */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-200 transition-all hover:shadow-md">
          <div className="flex items-center gap-2 mb-4">
            <div className="bg-blue-100 p-1.5 rounded-lg text-blue-600">
              <MapPin className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-gray-800">Localização</h3>
          </div>
          <div className="space-y-3">
            <div className="min-w-0">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Estado</label>
              <div className="relative">
                <select
                  title="Estado"
                  value={selectedState}
                  onChange={(e) => {
                    onStateChange(e.target.value);
                    if (e.target.value === '') {
                      onCityChange('');
                    }
                  }}
                  className="w-full pl-4 pr-10 py-2.5 bg-gray-50 border-transparent rounded-xl focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all appearance-none cursor-pointer text-gray-700 font-medium"
                >
                  {brazilianStates.map((state) => (
                    <option key={state.value} value={state.value}>
                      {state.label}
                    </option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
              </div>
            </div>
            <div className="min-w-0">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Cidade (opcional)</label>
              <input
                type="text"
                value={selectedCity}
                onChange={(e) => onCityChange(e.target.value)}
                placeholder="Nome da cidade..."
                className="w-full px-4 py-2.5 bg-gray-50 border-transparent rounded-xl focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-gray-700"
              />
            </div>
          </div>
        </div>

        {/* Proximity Filter (Radius) */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-200 transition-all hover:shadow-md">
          <div className="flex items-center gap-2 mb-4">
            <div className="bg-orange-100 p-1.5 rounded-lg text-orange-600">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </div>
            <h3 className="font-bold text-gray-800">Proximidade</h3>
          </div>

          <div className="space-y-3">
            {!userLocation ? (
              <button
                onClick={() => {
                  if (!navigator.geolocation) {
                    toast.info('Geolocalização não suportada pelo seu navegador.');
                    return;
                  }
                  navigator.geolocation.getCurrentPosition(
                    (position) => {
                      if (onUserLocationChange) {
                        onUserLocationChange({
                          lat: position.coords.latitude,
                          lng: position.coords.longitude
                        });
                        // Set default radius to 50km
                        if (onRadiusChange) onRadiusChange(50);
                        toast.success('Localização atual obtida com sucesso!');
                      }
                    },
                    (error) => {
                      toast.error('Erro ao obter localização: ' + error.message);
                    }
                  );
                }}
                className="w-full py-2.5 border-2 border-dashed border-orange-200 text-orange-600 font-medium rounded-xl hover:bg-orange-50 transition-colors flex items-center justify-center gap-2"
              >
                <MapPin className="w-4 h-4" />
                Usar minha localização
              </button>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm font-medium text-gray-700">
                  <span>Raio de busca</span>
                  <span className="text-orange-600 bg-orange-50 px-2 py-0.5 rounded-lg">{radius} km</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="200"
                  value={radius || 0}
                  onChange={(e) => onRadiusChange && onRadiusChange(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-600"
                  aria-label="Raio de busca"
                />
                <button
                  onClick={() => {
                    if (onUserLocationChange) onUserLocationChange(null);
                    if (onRadiusChange) onRadiusChange(0);
                    toast.info('Filtro de localização removido.');
                  }}
                  className="text-xs text-gray-500 hover:text-red-500 underline text-center w-full block"
                >
                  Remover filtro de localização
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Dynamic Filters */}
        {renderDynamicFilters()}

        {selectedCategory === 'Imóveis' && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-200 transition-all hover:shadow-md space-y-5">
            <div>
              <h4 className="text-sm font-semibold text-gray-800 mb-3">Detalhes do imóvel</h4>
              <div className="space-y-2">
                {propertyDetailsOptions.map((item) => (
                  <label key={item.key} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(detailsFilters[item.key])}
                      onChange={() => handleBooleanFilterToggle(item.key)}
                      className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    {item.label}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-gray-800 mb-3">Detalhes do condomínio</h4>
              <div className="space-y-2">
                {condoDetailsOptions.map((item) => (
                  <label key={item.key} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(detailsFilters[item.key])}
                      onChange={() => handleBooleanFilterToggle(item.key)}
                      className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    {item.label}
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-200 transition-all hover:shadow-md">
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-semibold text-gray-800 mb-2">Tipo de anunciante</h4>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: 'ambos', label: 'Ambos' },
                  { value: 'particular', label: 'Particular' },
                  { value: 'profissional', label: 'Profissional' },
                ].map((option) => {
                  const selected = advertiserType === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => onAdvertiserTypeChange?.(option.value as 'ambos' | 'particular' | 'profissional')}
                      className={`px-3 py-2 rounded-xl border text-sm transition-colors ${selected
                        ? 'border-purple-500 bg-purple-50 text-purple-700 font-semibold'
                        : 'border-gray-300 bg-gray-50 text-gray-700 hover:bg-gray-100'
                        }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-gray-800 mb-2">Ordenar por</h4>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: 'relevancia', label: 'Mais Relevantes' },
                  { value: 'recentes', label: 'Mais Recentes' },
                  { value: 'menor-preco', label: 'Menor Preço' },
                  { value: 'maior-preco', label: 'Maior Preço' },
                ].map((option) => {
                  const selected = sortBy === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => onSortByChange?.(option.value as 'relevancia' | 'recentes' | 'menor-preco' | 'maior-preco')}
                      className={`px-3 py-2 rounded-xl border text-sm transition-colors ${selected
                        ? 'border-purple-500 bg-purple-50 text-purple-700 font-semibold'
                        : 'border-gray-300 bg-gray-50 text-gray-700 hover:bg-gray-100'
                        }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Price Filter */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-200 transition-all hover:shadow-md">
          <div className="flex items-center gap-2 mb-4">
            <div className="bg-green-100 p-1.5 rounded-lg text-green-600">
              <DollarSign className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-gray-800">Faixa de Preço</h3>
          </div>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Mínimo</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">R$</span>
                  <input
                    type="number"
                    value={minPrice}
                    onChange={(e) => setMinPrice(Number(e.target.value))}
                    className="w-full pl-10 pr-3 py-2 bg-gray-50 border-transparent rounded-xl focus:bg-white focus:border-green-500 focus:ring-4 focus:ring-green-500/10 transition-all text-sm font-medium"
                    placeholder="0"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Máximo</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">R$</span>
                  <input
                    type="number"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(Number(e.target.value))}
                    className="w-full pl-10 pr-3 py-2 bg-gray-50 border-transparent rounded-xl focus:bg-white focus:border-green-500 focus:ring-4 focus:ring-green-500/10 transition-all text-sm font-medium"
                    placeholder="10000000"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={applyPriceFilter}
              className="w-full py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold rounded-xl hover:shadow-lg hover:from-green-700 hover:to-emerald-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <Filter className="w-4 h-4" />
              Aplicar Filtro
            </button>
            {(priceRange[0] > 0 || priceRange[1] < 10000000) && (
              <p className="text-xs text-center text-gray-500 font-medium bg-gray-50 py-1 rounded-lg">
                Filtro atual: {formatPrice(priceRange[0])} - {formatPrice(priceRange[1])}
              </p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
