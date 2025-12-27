import { Search, Heart, User, CirclePlus, Menu } from 'lucide-react';
import { useState } from 'react';
import { LocationSelector } from './LocationSelector';
import { Logo, LogoIcon } from './Logo';

type HeaderProps = {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onLogoClick: () => void;
  selectedState: string;
  selectedCity: string;
  onLocationChange: (state: string, city: string) => void;
};

export function Header({ searchQuery, onSearchChange, onLogoClick, selectedState, selectedCity, onLocationChange }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <button 
            onClick={onLogoClick}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            {/* Ícone do Logo - Visível em Mobile */}
            <div className="sm:hidden">
              <LogoIcon className="w-10 h-10" />
            </div>
            {/* Logo Completo - Visível em Desktop */}
            <div className="hidden sm:block">
              <Logo className="h-8 w-auto" />
            </div>
          </button>

          {/* Search Bar - Desktop */}
          <div className="hidden md:flex flex-1 max-w-2xl mx-8">
            <div className="relative w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Buscar por produtos, marcas ou categorias..."
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Actions - Desktop */}
          <div className="hidden md:flex items-center gap-3">
            <LocationSelector
              selectedState={selectedState}
              selectedCity={selectedCity}
              onLocationChange={onLocationChange}
            />
            <button className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-blue-600 transition-colors">
              <Heart className="w-5 h-5" />
              <span>Favoritos</span>
            </button>
            <button className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-blue-600 transition-colors">
              <User className="w-5 h-5" />
              <span>Entrar</span>
            </button>
            <button className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition-shadow">
              <CirclePlus className="w-5 h-5" />
              <span>Anunciar Grátis</span>
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-gray-700"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>

        {/* Search Bar - Mobile */}
        <div className="md:hidden pb-4">
          <div className="relative w-full mb-3">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Buscar produtos..."
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <LocationSelector
            selectedState={selectedState}
            selectedCity={selectedCity}
            onLocationChange={onLocationChange}
          />
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 py-4 space-y-2">
            <button className="flex items-center gap-2 px-4 py-2 w-full text-left text-gray-700 hover:bg-gray-50 rounded-lg">
              <Heart className="w-5 h-5" />
              <span>Favoritos</span>
            </button>
            <button className="flex items-center gap-2 px-4 py-2 w-full text-left text-gray-700 hover:bg-gray-50 rounded-lg">
              <User className="w-5 h-5" />
              <span>Entrar</span>
            </button>
            <button className="flex items-center gap-2 px-4 py-3 w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg justify-center">
              <CirclePlus className="w-5 h-5" />
              <span>Anunciar Grátis</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}