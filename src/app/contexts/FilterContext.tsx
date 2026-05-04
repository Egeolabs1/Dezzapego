import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

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
    // Initialize from localStorage if available
    const [searchQuery, setSearchQuery] = useState(() => {
        return readLocalStorage('dezzapego_search');
    });

    const [selectedState, setSelectedState] = useState(() => {
        return readLocalStorage('dezzapego_state');
    });

    const [selectedCity, setSelectedCity] = useState(() => {
        return readLocalStorage('dezzapego_city');
    });

    // Persist to localStorage whenever they change
    useEffect(() => {
        writeLocalStorage('dezzapego_search', searchQuery);
    }, [searchQuery]);

    useEffect(() => {
        writeLocalStorage('dezzapego_state', selectedState);
        writeLocalStorage('dezzapego_city', selectedCity);
    }, [selectedState, selectedCity]);

    const setLocation = (state: string, city: string) => {
        setSelectedState(state);
        setSelectedCity(city);
    };

    return (
        <FilterContext.Provider value={{
            searchQuery,
            setSearchQuery,
            selectedState,
            selectedCity,
            setLocation
        }}>
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
