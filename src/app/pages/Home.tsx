import { useState } from 'react';
import { formatPrice } from '../../lib/formatters';

import { useSearchParams } from 'react-router-dom';
import { Header } from '../components/Header';
import { Hero } from '../components/Hero';
import { Categories } from '../components/Categories';
import { Filters } from '../components/Filters';
import { AdsList } from '../components/AdsList';
import { AdDetails } from '../components/AdDetails';
import type { Ad } from '../../types';
import { useFavorites } from '../hooks/useFavorites';


import SEO from '../../components/SEO';

export default function Home() {
    const [searchParams, setSearchParams] = useSearchParams();

    // Derived state from URL
    const selectedCategory = searchParams.get('category') || '';
    const selectedSubcategory = searchParams.get('subcategory') || '';
    const selectedTransactionType = (searchParams.get('type') as 'venda' | 'aluguel' | '') || '';
    const selectedState = searchParams.get('state') || '';
    const selectedCity = searchParams.get('city') || '';
    const searchQuery = searchParams.get('q') || '';

    const minPrice = searchParams.get('minPrice') ? Number(searchParams.get('minPrice')) : 0;
    const maxPrice = searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : 10000000;
    const priceRange: [number, number] = [minPrice, maxPrice];

    const radius = searchParams.get('radius') ? Number(searchParams.get('radius')) : 0;

    // Filters that are not yet persisted or complex objects can remain verified simple state for now 
    // or be expanded later. 'detailsFilters' and 'userLocation' are candidates for future improvement 
    // but might be too complex for simple URL params without encoding.
    const [detailsFilters, setDetailsFilters] = useState<Record<string, any>>({});
    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

    const [selectedAd, setSelectedAd] = useState<Ad | null>(null);
    const { favorites, toggleFavorite } = useFavorites();

    const updateSearchParams = (updates: Record<string, string | null>) => {
        setSearchParams(prev => {
            const newParams = new URLSearchParams(prev);
            Object.entries(updates).forEach(([key, value]) => {
                if (value === null || value === '') {
                    newParams.delete(key);
                } else {
                    newParams.set(key, value);
                }
            });
            return newParams;
        });
    };

    const handleCategorySelect = (category: string) => {
        // When changing category, reset dependent filters
        setSearchParams(prev => {
            const newParams = new URLSearchParams(prev);
            if (category) newParams.set('category', category);
            else newParams.delete('category');

            newParams.delete('subcategory');
            newParams.delete('type');
            return newParams;
        });
        setDetailsFilters({});
    };

    const handleSubcategorySelect = (subcategory: string) => {
        updateSearchParams({ subcategory });
    };

    const handleTransactionTypeSelect = (type: string) => {
        updateSearchParams({ type });
    };



    const handlePriceRangeChange = (range: [number, number]) => {
        updateSearchParams({
            minPrice: range[0].toString(),
            maxPrice: range[1].toString()
        });
    };

    const handleRadiusChange = (newRadius: number) => {
        updateSearchParams({ radius: newRadius.toString() });
    };

    // Handle deep linking to specific ad if ID is in URL (optional, can be added later)
    // For now, checks existing ad selection logic

    if (selectedAd) {
        return (
            <div className="min-h-screen bg-gray-50">
                <SEO
                    title={selectedAd.title}
                    description={`${formatPrice(selectedAd.price)} - ${selectedAd.description}`}
                    image={selectedAd.images[0]}
                    url={`https://dezzapego.com/anuncio/${selectedAd.id}`}
                    type="article"
                />
                <Header />
                <AdDetails
                    ad={selectedAd}
                    onBack={() => setSelectedAd(null)}
                    isFavorite={favorites.has(selectedAd.id)}
                    onToggleFavorite={() => toggleFavorite(selectedAd.id)}
                />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <SEO title="Home" />
            <Header />
            <Hero />
            <Categories
                selectedCategory={selectedCategory}
                onCategorySelect={handleCategorySelect}
                selectedSubcategory={selectedSubcategory}
                onSubcategorySelect={handleSubcategorySelect}
                selectedTransactionType={selectedTransactionType}
                onTransactionTypeSelect={handleTransactionTypeSelect}
            />
            <div className="container mx-auto px-2 md:px-4 py-4 md:py-8">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    <aside className="lg:col-span-1">
                        <Filters
                            selectedCategory={selectedCategory}
                            selectedState={selectedState}
                            onStateChange={(state) => updateSearchParams({ state, city: '' })} // Reset city when state changes
                            selectedCity={selectedCity}
                            onCityChange={(city) => updateSearchParams({ city })}
                            priceRange={priceRange}
                            onPriceRangeChange={handlePriceRangeChange}
                            detailsFilters={detailsFilters}
                            onDetailsFilterChange={setDetailsFilters}
                            radius={radius}
                            onRadiusChange={handleRadiusChange}
                            userLocation={userLocation}
                            onUserLocationChange={setUserLocation}
                        />
                    </aside>
                    <main className="lg:col-span-3">
                        <AdsList
                            selectedCategory={selectedCategory}
                            selectedSubcategory={selectedSubcategory}
                            selectedTransactionType={selectedTransactionType}
                            selectedState={selectedState}
                            selectedCity={selectedCity}
                            priceRange={priceRange}
                            searchQuery={searchQuery}
                            onAdClick={setSelectedAd}
                            favorites={favorites}
                            onToggleFavorite={toggleFavorite}
                            detailsFilters={detailsFilters}
                            radius={radius}
                            userLocation={userLocation}
                        />
                    </main>
                </div>
            </div>
        </div>
    );
}
