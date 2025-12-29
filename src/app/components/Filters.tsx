import { MapPin, DollarSign, SlidersHorizontal, Tag, Filter, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import { CATEGORY_SPECS, CategoryField } from '../data/categorySpecs';

type FiltersProps = {
  selectedCategory: string;
  selectedState: string;
  onStateChange: (state: string) => void;
  selectedCity: string;
  onCityChange: (city: string) => void;
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
  selectedState,
  onStateChange,
  selectedCity,
  onCityChange,
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

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const handleDynamicFilterChange = (field: string, value: any) => {
    onDetailsFilterChange({
      ...detailsFilters,
      [field]: value
    });
  };

  const renderDynamicFilters = () => {
    if (!selectedCategory || !CATEGORY_SPECS[selectedCategory]) return null;

    const specs = CATEGORY_SPECS[selectedCategory];

    return (
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 transition-all hover:shadow-md">
        <h3 className="flex items-center gap-2 font-bold text-gray-800 mb-4">
          <Tag className="w-5 h-5 text-purple-600" />
          Filtros de {selectedCategory}
        </h3>
        <div className="space-y-4">
          {specs.fields.map((field: CategoryField) => {
            if (field.type === 'select') {
              return (
                <div key={field.name}>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{field.label}</label>
                  <div className="relative">
                    <select
                      title={field.label}
                      value={detailsFilters[field.name] || ''}
                      onChange={(e) => handleDynamicFilterChange(field.name, e.target.value)}
                      className="w-full pl-4 pr-10 py-2.5 bg-gray-50 border-transparent rounded-xl focus:bg-white focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all appearance-none cursor-pointer text-gray-700 font-medium"
                    >
                      <option value="">Qualquer</option>
                      {field.options?.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                  </div>
                </div>
              );
            }

            if (field.type === 'number') {
              return (
                <div key={field.name}>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{field.label} (Mínimo)</label>
                  <input
                    type="number"
                    placeholder={`Ex: ${field.placeholder || ''}`}
                    value={detailsFilters[field.name] || ''}
                    onChange={(e) => handleDynamicFilterChange(field.name, e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 border-transparent rounded-xl focus:bg-white focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all text-gray-700"
                  />
                </div>
              );
            }

            return (
              <div key={field.name}>
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
    <div className="space-y-6">
      {/* Mobile Toggle */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="lg:hidden w-full flex items-center justify-between p-4 bg-white border border-gray-100 shadow-sm rounded-2xl hover:bg-gray-50 transition-all active:scale-[0.98]"
      >
        <div className="flex items-center gap-3">
          <div className="bg-purple-100 p-2 rounded-lg text-purple-600">
            <SlidersHorizontal className="w-5 h-5" />
          </div>
          <span className="font-semibold text-gray-800">Filtros</span>
          {(Object.keys(detailsFilters).length > 0 || selectedState || minPrice > 0) && (
            <span className="bg-purple-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">Ativo</span>
          )}
        </div>
        <span className="text-sm font-medium text-gray-500">
          {isExpanded ? 'Ocultar' : 'Mostrar'}
        </span>
      </button>

      {/* Filters Container */}
      <div className={`space-y-6 ${isExpanded ? 'block' : 'hidden lg:block'}`}>

        {/* Dynamic Filters */}
        {renderDynamicFilters()}

        {/* Location Filter */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 transition-all hover:shadow-md">
          <div className="flex items-center gap-2 mb-4">
            <div className="bg-blue-100 p-1.5 rounded-lg text-blue-600">
              <MapPin className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-gray-800">Localização</h3>
          </div>
          <div className="space-y-4">
            <div>
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
            <div>
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
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 transition-all hover:shadow-md">
          <div className="flex items-center gap-2 mb-4">
            <div className="bg-orange-100 p-1.5 rounded-lg text-orange-600">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </div>
            <h3 className="font-bold text-gray-800">Proximidade</h3>
          </div>

          <div className="space-y-4">
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
                      console.error(error);
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

        {/* Price Filter */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 transition-all hover:shadow-md">
          <div className="flex items-center gap-2 mb-4">
            <div className="bg-green-100 p-1.5 rounded-lg text-green-600">
              <DollarSign className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-gray-800">Faixa de Preço</h3>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Mínimo</label>
                <input
                  type="number"
                  value={minPrice}
                  onChange={(e) => setMinPrice(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-gray-50 border-transparent rounded-xl focus:bg-white focus:border-green-500 focus:ring-4 focus:ring-green-500/10 transition-all text-sm font-medium"
                  placeholder="R$ 0"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Máximo</label>
                <input
                  type="number"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-gray-50 border-transparent rounded-xl focus:bg-white focus:border-green-500 focus:ring-4 focus:ring-green-500/10 transition-all text-sm font-medium"
                  placeholder="R$ Max"
                />
              </div>
            </div>

            <button
              onClick={applyPriceFilter}
              className="w-full py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold rounded-xl hover:shadow-lg hover:from-green-700 hover:to-emerald-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <Filter className="w-4 h-4" />
              Aplicar Filtro
            </button>
            {(priceRange[0] > 0 || priceRange[1] < 100000) && (
              <p className="text-xs text-center text-gray-500 font-medium bg-gray-50 py-1 rounded-lg">
                Filtro atual: {formatPrice(priceRange[0])} - {formatPrice(priceRange[1])}
              </p>
            )}
          </div>
        </div>

        {/* Additional Filters */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 transition-all hover:shadow-md">
          <div className="flex items-center gap-2 mb-4">
            <div className="bg-gray-100 p-1.5 rounded-lg text-gray-600">
              <Filter className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-gray-800">Mais Filtros</h3>
          </div>

          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Condição</h4>
              <div className="space-y-2">
                {['Novo', 'Usado'].map(label => (
                  <label key={label} className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative flex items-center">
                      <input type="checkbox" className="peer w-5 h-5 border-2 border-gray-300 rounded-md checked:bg-blue-600 checked:border-blue-600 transition-all appearance-none cursor-pointer" />
                      <Check className="absolute w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                    <span className="text-sm text-gray-600 group-hover:text-blue-600 transition-colors">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-gray-50">
              <h4 className="text-sm font-semibold text-gray-700 mb-2 mt-2">Tipo</h4>
              <div className="space-y-2">
                {['Anúncios Destacados', 'Com Fotos'].map(label => (
                  <label key={label} className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative flex items-center">
                      <input type="checkbox" className="peer w-5 h-5 border-2 border-gray-300 rounded-md checked:bg-purple-600 checked:border-purple-600 transition-all appearance-none cursor-pointer" />
                      <Check className="absolute w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                    <span className="text-sm text-gray-600 group-hover:text-purple-600 transition-colors">{label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
