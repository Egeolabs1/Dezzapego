import { MapPin, Navigation, X } from 'lucide-react';
import { useState } from 'react';

type LocationSelectorProps = {
  selectedState: string;
  selectedCity: string;
  onLocationChange: (state: string, city: string) => void;
};

// Lista de estados brasileiros
const brazilianStates = [
  { code: 'AC', name: 'Acre' },
  { code: 'AL', name: 'Alagoas' },
  { code: 'AP', name: 'Amapá' },
  { code: 'AM', name: 'Amazonas' },
  { code: 'BA', name: 'Bahia' },
  { code: 'CE', name: 'Ceará' },
  { code: 'DF', name: 'Distrito Federal' },
  { code: 'ES', name: 'Espírito Santo' },
  { code: 'GO', name: 'Goiás' },
  { code: 'MA', name: 'Maranhão' },
  { code: 'MT', name: 'Mato Grosso' },
  { code: 'MS', name: 'Mato Grosso do Sul' },
  { code: 'MG', name: 'Minas Gerais' },
  { code: 'PA', name: 'Pará' },
  { code: 'PB', name: 'Paraíba' },
  { code: 'PR', name: 'Paraná' },
  { code: 'PE', name: 'Pernambuco' },
  { code: 'PI', name: 'Piauí' },
  { code: 'RJ', name: 'Rio de Janeiro' },
  { code: 'RN', name: 'Rio Grande do Norte' },
  { code: 'RS', name: 'Rio Grande do Sul' },
  { code: 'RO', name: 'Rondônia' },
  { code: 'RR', name: 'Roraima' },
  { code: 'SC', name: 'Santa Catarina' },
  { code: 'SP', name: 'São Paulo' },
  { code: 'SE', name: 'Sergipe' },
  { code: 'TO', name: 'Tocantins' },
];

// Mapeamento simples de coordenadas para cidades (mock para demonstração)
const coordinatesToCity = (lat: number, lng: number): { city: string; state: string } => {
  // São Paulo
  if (lat > -24 && lat < -23 && lng > -47 && lng < -46) {
    return { city: 'São Paulo', state: 'SP' };
  }
  // Rio de Janeiro
  if (lat > -23 && lat < -22 && lng > -44 && lng < -43) {
    return { city: 'Rio de Janeiro', state: 'RJ' };
  }
  // Brasília
  if (lat > -16 && lat < -15 && lng > -48 && lng < -47) {
    return { city: 'Brasília', state: 'DF' };
  }
  // Belo Horizonte
  if (lat > -20 && lat < -19 && lng > -44 && lng < -43) {
    return { city: 'Belo Horizonte', state: 'MG' };
  }
  // Porto Alegre
  if (lat > -31 && lat < -29 && lng > -52 && lng < -50) {
    return { city: 'Porto Alegre', state: 'RS' };
  }
  // Curitiba
  if (lat > -26 && lat < -25 && lng > -50 && lng < -49) {
    return { city: 'Curitiba', state: 'PR' };
  }
  // Fallback
  return { city: 'São Paulo', state: 'SP' };
};

export function LocationSelector({ selectedState, selectedCity, onLocationChange }: LocationSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);

  const handleGeolocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocalização não é suportada pelo seu navegador');
      return;
    }

    setIsDetecting(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const location = coordinatesToCity(latitude, longitude);
        onLocationChange(location.state, location.city);
        setIsDetecting(false);
        setIsOpen(false);
      },
      (error) => {
        let errorMessage = 'Não foi possível obter sua localização.';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Permissão negada. Por favor, permita o acesso à sua localização nas configurações do navegador.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Localização indisponível. Verifique se o GPS está ativado.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Tempo esgotado ao tentar obter sua localização.';
            break;
          default:
            errorMessage = 'Erro desconhecido ao obter localização.';
        }
        
        alert(errorMessage + ' Por favor, selecione manualmente.');
        console.error('Erro de geolocalização:', error);
        setIsDetecting(false);
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 300000,
      }
    );
  };

  const handleStateSelect = (stateCode: string) => {
    // Ao selecionar um estado, limpa a cidade para que o usuário possa procurar em todo o estado
    onLocationChange(stateCode, '');
    setIsOpen(false);
  };

  const handleClearLocation = () => {
    onLocationChange('', '');
    setIsOpen(false);
  };

  return (
    <div className="relative">
      {/* Location Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:text-blue-600 transition-colors border border-gray-300 rounded-lg hover:border-blue-400"
      >
        <MapPin className="w-4 h-4" />
        <span className="hidden sm:inline text-sm">
          {selectedCity ? `${selectedCity}, ${selectedState}` : selectedState ? selectedState : 'Localização'}
        </span>
        <span className="sm:hidden text-sm">{selectedState || 'Local'}</span>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown Content */}
          <div className="absolute top-full right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-xl z-50">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Selecione sua localização</h3>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-1 hover:bg-gray-100 rounded-full"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Geolocation Button */}
              <button
                onClick={handleGeolocation}
                disabled={isDetecting}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 mb-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-md transition-shadow disabled:opacity-50"
              >
                <Navigation className={`w-4 h-4 ${isDetecting ? 'animate-pulse' : ''}`} />
                <span>{isDetecting ? 'Detectando...' : 'Usar minha localização atual'}</span>
              </button>

              {/* Clear Location */}
              {(selectedState || selectedCity) && (
                <button
                  onClick={handleClearLocation}
                  className="w-full px-4 py-2 mb-3 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Limpar localização
                </button>
              )}

              {/* State List */}
              <div className="border-t border-gray-200 pt-3">
                <p className="text-xs text-gray-500 mb-2">Ou escolha um estado:</p>
                <div className="max-h-64 overflow-y-auto">
                  {brazilianStates.map((state) => (
                    <button
                      key={state.code}
                      onClick={() => handleStateSelect(state.code)}
                      className={`w-full text-left px-3 py-2 rounded-lg hover:bg-blue-50 transition-colors text-sm ${
                        selectedState === state.code ? 'bg-blue-100 text-blue-700 font-medium' : 'text-gray-700'
                      }`}
                    >
                      {state.name} ({state.code})
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}