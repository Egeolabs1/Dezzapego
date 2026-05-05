import { Search, Heart, User, CirclePlus, Menu, LogOut, ChevronDown, ShieldCheck } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { LocationSelector } from './LocationSelector';
import { Logo, LogoIcon } from './Logo';
import { Notifications } from './Notifications';
import { SearchAutocomplete } from './SearchAutocomplete';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useFilter } from '../contexts/FilterContext';

type HeaderProps = {
  // Props are now optional/deprecated as we use Context, 
  // but kept optional to avoid breaking pending refactors if any.
  // Ideally, remove them entirely or use as overrides.
  hideLocationFilter?: boolean;
  selectedState?: string;
  selectedCity?: string;
  onLocationChange?: (state: string, city: string) => void;
};

export function Header({
  hideLocationFilter = false,
  selectedState: selectedStateOverride,
  selectedCity: selectedCityOverride,
  onLocationChange,
}: HeaderProps) {
  const { searchQuery, setSearchQuery, selectedState, selectedCity, setLocation } = useFilter();
  const resolvedState = selectedStateOverride ?? selectedState;
  const resolvedCity = selectedCityOverride ?? selectedCity;
  const handleLocationChange = onLocationChange ?? setLocation;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isAdmin = profile?.role === 'admin';

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
    setUserMenuOpen(false);
    setMobileMenuOpen(false);
  };

  const runSearch = (query: string) => {
    const nextQuery = query.trim();
    const params = new URLSearchParams(window.location.search);
    if (nextQuery) {
      params.set('q', nextQuery);
    } else {
      params.delete('q');
    }
    const qs = params.toString();
    navigate(qs ? `/?${qs}` : '/');
  };

  const handleSearchSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    runSearch(searchQuery);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownRef]);

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <button
            onClick={() => {
              setSearchQuery(''); // Optional: Clear search on logo click?
              navigate('/');
            }}
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

          <div className="hidden md:flex flex-1 max-w-2xl mx-8">
            <form onSubmit={handleSearchSubmit} className="relative w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                enterKeyHint="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por produtos, marcas ou categorias..."
                className="w-full pl-12 pr-14 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                type="submit"
                aria-label="Buscar"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md bg-blue-600 p-2 text-white transition-colors hover:bg-blue-700"
              >
                <Search className="h-4 w-4" />
              </button>
              <SearchAutocomplete 
                query={searchQuery} 
                onSelect={(val) => {
                  setSearchQuery(val);
                  setTimeout(() => {
                    runSearch(val);
                  }, 10);
                }} 
              />
            </form>
          </div>

          <div className="flex md:hidden flex-1 items-center gap-2 mx-2 min-w-0">
            <form onSubmit={handleSearchSubmit} className="relative flex-1 min-w-0">
              <div className="absolute left-2.5 top-1/2 -translate-y-1/2">
                <Search className="w-3.5 h-3.5 text-gray-400" />
              </div>
              <input
                type="text"
                enterKeyHint="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar..."
                className="w-full pl-8 pr-9 py-2 bg-gray-100 border-none rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              />
              <button
                type="submit"
                aria-label="Buscar"
                className="absolute right-1 top-1/2 -translate-y-1/2 rounded-md bg-blue-600 p-1.5 text-white transition-colors active:bg-blue-700"
              >
                <Search className="h-3.5 w-3.5" />
              </button>
              <SearchAutocomplete 
                query={searchQuery} 
                onSelect={(val) => {
                  setSearchQuery(val);
                  setTimeout(() => {
                    runSearch(val);
                  }, 10);
                }} 
              />
            </form>
            {!hideLocationFilter && (
              <div className="flex-shrink-0 scale-90 origin-right">
                <LocationSelector
                  selectedState={resolvedState}
                  selectedCity={resolvedCity}
                  onLocationChange={handleLocationChange}
                />
              </div>
            )}
          </div>

          {/* Actions - Desktop */}
          <div className="hidden md:flex items-center gap-3">
            {!hideLocationFilter && (
              <LocationSelector
                selectedState={resolvedState}
                selectedCity={resolvedCity}
                onLocationChange={handleLocationChange}
              />
            )}

            <Notifications />

            <Link to="/favoritos" className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-blue-600 transition-colors">
              <Heart className="w-5 h-5" />
              <span>Favoritos</span>
            </Link>

            {user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 px-2 py-1 rounded-full hover:bg-gray-100 transition-colors focus:outline-none"
                >
                  <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold">
                    {user.email?.charAt(0).toUpperCase()}
                  </div>
                  <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg py-1 border border-gray-100 z-50">
                    <div className="px-4 py-2 border-b border-gray-100">
                      <Link to="/dashboard" onClick={() => setUserMenuOpen(false)} className="hover:text-blue-600 transition-colors">
                        <p className="text-sm font-medium text-gray-900">Minha Conta</p>
                      </Link>
                      <p className="text-xs text-gray-500 truncate">{user.email}</p>
                    </div>

                    {/* Admin Link - Only for Admins */}
                    {/* Uses optional chaining or defaults as profile structure updates */}
                    {isAdmin && (
                      <Link
                        to="/admin"
                        onClick={() => setUserMenuOpen(false)}
                        className="w-full text-left flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 font-medium"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        <span>Painel Admin</span>
                      </Link>
                    )}
                    <Link
                      to="/meus-anuncios"
                      onClick={() => setUserMenuOpen(false)}
                      className="w-full text-left flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <Heart className="w-4 h-4" /> {/* Reusing Heart icon for now, or use List/Grid */}
                      <span>Meus Anúncios</span>
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className="w-full text-left flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sair</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/login">
                <button className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-blue-600 transition-colors">
                  <User className="w-5 h-5" />
                  <span>Entrar</span>
                </button>
              </Link>
            )}

            <Link to="/anunciar">
              <button className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition-shadow">
                <CirclePlus className="w-5 h-5" />
                <span>Anunciar Grátis</span>
              </button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-gray-700"
            aria-label="Abrir menu"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 py-4 space-y-2">
            <Link
              to="/favoritos"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 px-4 py-2 w-full text-left text-gray-700 hover:bg-gray-50 rounded-lg"
            >
              <Heart className="w-5 h-5" />
              <span>Favoritos</span>
            </Link>
            {user ? (
              <>
                <Link
                  to="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 px-4 py-2 w-full text-left text-gray-700 hover:bg-gray-50 rounded-lg"
                >
                  <User className="w-5 h-5" />
                  <span>Minha Conta</span>
                </Link>
                <Link
                  to="/meus-anuncios"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 px-4 py-2 w-full text-left text-gray-700 hover:bg-gray-50 rounded-lg"
                >
                  <Heart className="w-5 h-5" />
                  <span>Meus Anúncios</span>
                </Link>
                {isAdmin && (
                  <Link
                    to="/admin"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 w-full text-left text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <ShieldCheck className="w-5 h-5" />
                    <span>Painel Admin</span>
                  </Link>
                )}
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-2 px-4 py-2 w-full text-left text-red-600 hover:bg-gray-50 rounded-lg"
                >
                  <LogOut className="w-5 h-5" />
                  <span>Sair ({user.email})</span>
                </button>
              </>
            ) : (
              <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                <button className="flex items-center gap-2 px-4 py-2 w-full text-left text-gray-700 hover:bg-gray-50 rounded-lg">
                  <User className="w-5 h-5" />
                  <span>Entrar</span>
                </button>
              </Link>
            )}
            <Link to="/anunciar" onClick={() => setMobileMenuOpen(false)}>
              <button className="flex items-center gap-2 px-4 py-3 w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg justify-center">
                <CirclePlus className="w-5 h-5" />
                <span>Anunciar Grátis</span>
              </button>
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
