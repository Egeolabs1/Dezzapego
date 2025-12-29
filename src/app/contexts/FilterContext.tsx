import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface FilterContextType {
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    selectedState: string;
    selectedCity: string;
    setLocation: (state: string, city: string) => void;
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export function FilterProvider({ children }: { children: ReactNode }) {
    // Initialize from localStorage if available
    const [searchQuery, setSearchQuery] = useState(() => {
        return localStorage.getItem('dezzapego_search') || '';
    });

    const [selectedState, setSelectedState] = useState(() => {
        return localStorage.getItem('dezzapego_state') || '';
    });

    const [selectedCity, setSelectedCity] = useState(() => {
        return localStorage.getItem('dezzapego_city') || '';
    });

    // Persist to localStorage whenever they change
    useEffect(() => {
        localStorage.setItem('dezzapego_search', searchQuery);
    }, [searchQuery]);

    useEffect(() => {
        localStorage.setItem('dezzapego_state', selectedState);
        localStorage.setItem('dezzapego_city', selectedCity);
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
