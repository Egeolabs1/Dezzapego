import { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';

interface FilterContextType {
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    selectedState: string;
    selectedCity: string;
    setLocation: (state: string, city: string) => void;
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

function readLocalStorage(key: string): string {
    if (typeof window === 'undefined') return '';
    try {
        return window.localStorage.getItem(key) || '';
    } catch {
        return '';
    }
}

function writeLocalStorage(key: string, value: string): void {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.setItem(key, value);
    } catch {
        /* ignore */
    }
}

export function FilterProvider({ children }: { children: ReactNode }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedState, setSelectedState] = useState('');
    const [selectedCity, setSelectedCity] = useState('');
    const [hasLoadedStoredFilters, setHasLoadedStoredFilters] = useState(false);

    useEffect(() => {
        setSearchQuery(readLocalStorage('dezzapego_search'));
        setSelectedState(readLocalStorage('dezzapego_state'));
        setSelectedCity(readLocalStorage('dezzapego_city'));
        setHasLoadedStoredFilters(true);
    }, []);

    // Persist to localStorage whenever they change
    useEffect(() => {
        if (!hasLoadedStoredFilters) return;
        writeLocalStorage('dezzapego_search', searchQuery);
    }, [hasLoadedStoredFilters, searchQuery]);

    useEffect(() => {
        if (!hasLoadedStoredFilters) return;
        writeLocalStorage('dezzapego_state', selectedState);
        writeLocalStorage('dezzapego_city', selectedCity);
    }, [hasLoadedStoredFilters, selectedState, selectedCity]);

    const setLocation = (state: string, city: string) => {
        setSelectedState(state);
        setSelectedCity(city);
    };

    const value = useMemo(() => ({
        searchQuery,
        setSearchQuery,
        selectedState,
        selectedCity,
        setLocation,
    }), [searchQuery, selectedState, selectedCity]);

    return (
        <FilterContext.Provider value={value}>
            {children}
        </FilterContext.Provider>
    );
}

export function useFilter() {
    const context = useContext(FilterContext);
    if (context === undefined) {
        throw new Error('useFilter must be used within a FilterProvider');
    }
    return context;
}
