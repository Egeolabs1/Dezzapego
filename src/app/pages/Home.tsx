import { useMemo, useState, useEffect } from 'react';
import { formatPrice } from '../../lib/formatters';

import { useSearchParams } from 'react-router-dom';
import { Header } from '../components/Header';
import { Hero } from '../components/Hero';
import { Categories } from '../components/Categories';
import { Filters } from '../components/Filters';
import { AdsList } from '../components/AdsList';
import { useFilter } from '../contexts/FilterContext';
import { AdDetails } from '../components/AdDetails';
import { AdSenseSlot } from '../components/AdSenseSlot';
import type { Ad } from '../../types';
import { useFavorites } from '../hooks/useFavorites';


import SEO from '../../components/SEO';
import { toAbsoluteUrl } from '../../lib/seo';
import {
    buildWebsiteStructuredData,
    buildListingStructuredData,
    getListingSeoForHome,
} from '../../lib/categorySeo';

export default function Home() {
    const [searchParams, setSearchParams] = useSearchParams();
    const { searchQuery, setSearchQuery } = useFilter();

    // Derived state from URL
    const selectedCategory = searchParams.get('category') || '';
    const selectedSubcategory = searchParams.get('subcategory') || '';
    const selectedTransactionType = (searchParams.get('type') as 'venda' | 'aluguel' | '') || '';
    const selectedState = searchParams.get('state') || '';
    const selectedCity = searchParams.get('city') || '';
    const advertiserType = (searchParams.get('advertiserType') as 'ambos' | 'particular' | 'profissional') || 'ambos';
    const sortBy = (searchParams.get('sortBy') as 'relevancia' | 'recentes' | 'menor-preco' | 'maior-preco') || 'relevancia';

    const minPrice = searchParams.get('minPrice') ? Number(searchParams.get('minPrice')) : 0;
    const maxPrice = searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : 10000000;
    const priceRange: [number, number] = [minPrice, maxPrice];

    const radius = searchParams.get('radius') ? Number(searchParams.get('radius')) : 0;

    // Filters that are not yet persisted or complex objects can remain verified simple state for now 
    // or be expanded later. 'detailsFilters' and 'userLocation' are candidates for future improvement 
    // but might be too complex for simple URL params without encoding.
    const [detailsFilters, setDetailsFilters] = useState<Record<string, any>>({});
    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

    // Sync context with URL on mount
    useEffect(() => {
        const q = searchParams.get('q');
        if (q && q !== searchQuery) {
            setSearchQuery(q);
        }
    }, []);

    // Sync URL with context (with debounce)
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchQuery !== (searchParams.get('q') || '')) {
                updateSearchParams({ q: searchQuery });
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const [selectedAd, setSelectedAd] = useState<Ad | null>(null);
    const { favorites, toggleFavorite } = useFavorites();

    const listingSeo = useMemo(
        () =>
            getListingSeoForHome({
                category: selectedCategory,
                subcategory: selectedSubcategory,
                transactionType: selectedTransactionType,
                searchQuery,
            }),
        [selectedCategory, selectedSubcategory, selectedTransactionType, searchQuery]
    );

    const listingStructuredData = useMemo(() => {
        const q = searchQuery.trim();
        if (!selectedCategory || q) {
            return buildWebsiteStructuredData();
        }
        return buildListingStructuredData({
            category: selectedCategory,
            subcategory: selectedSubcategory || undefined,
        });
    }, [selectedCategory, selectedSubcategory, searchQuery]);

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

    const handleHeaderLocationChange = (state: string, city: string) => {
        if (!state) {
            updateSearchParams({ state: null, city: null });
            return;
        }
        updateSearchParams({ state, city });
    };

    // Handle deep linking to specific ad if ID is in URL (optional, can be added later)
    // For now, checks existing ad selection logic

    if (selectedAd) {
        return (
            <div className="min-h-screen bg-gray-50">
                <SEO
                    title={selectedAd.title}
                    description={`${formatPrice(selectedAd.price)} — ${(selectedAd.description || '').slice(0, 155)}`}
                    image={selectedAd.images[0]}
                    url={toAbsoluteUrl(`/anuncio/${selectedAd.id}`)}
                    canonicalUrl={toAbsoluteUrl(`/anuncio/${selectedAd.id}`)}
                    type="article"
                    ogTitle="Dezzapego"
                    ogDescription={selectedAd.title}
                />
                <Header
                    selectedState={selectedState}
                    selectedCity={selectedCity}
                    onLocationChange={handleHeaderLocationChange}
                />
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
            <SEO
                title={listingSeo.title}
                description={listingSeo.description}
                keywords={listingSeo.keywords}
                canonicalUrl={listingSeo.canonicalUrl}
                structuredData={listingStructuredData}
                ogTitle="Dezzapego"
                ogDescription="Imóveis, carros, eletrônicos e mais. Publique anúncios grátis no Dezzapego."
            />
            <Header
                selectedState={selectedState}
                selectedCity={selectedCity}
                onLocationChange={handleHeaderLocationChange}
            />
            <Hero />
            <Categories
                selectedCategory={selectedCategory}
                onCategorySelect={handleCategorySelect}
                selectedSubcategory={selectedSubcategory}
                onSubcategorySelect={handleSubcategorySelect}
                selectedTransactionType={selectedTransactionType}
                onTransactionTypeSelect={handleTransactionTypeSelect}
            />
            <div className="max-w-[1600px] mx-auto px-2 md:px-4 pt-4">
                <AdSenseSlot
                    slot={import.meta.env.VITE_ADSENSE_HOME_TOP_SLOT}
                    format="auto"
                    minHeightClass="min-h-[120px]"
                    className="hidden md:block"
                />
            </div>
            <div className="max-w-[1600px] mx-auto px-2 md:px-4 py-4 md:py-8">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6">
                    <aside className="lg:col-span-4 xl:col-span-3 lg:sticky lg:top-24 self-start">
                        <Filters
                            selectedCategory={selectedCategory}
                            selectedSubcategory={selectedSubcategory}
                            selectedState={selectedState}
                            onStateChange={(state) => updateSearchParams({ state, city: '' })} // Reset city when state changes
                            selectedCity={selectedCity}
                            onCityChange={(city) => updateSearchParams({ city })}
                            advertiserType={advertiserType}
                            onAdvertiserTypeChange={(type) => updateSearchParams({ advertiserType: type })}
                            sortBy={sortBy}
                            onSortByChange={(nextSortBy) => updateSearchParams({ sortBy: nextSortBy })}
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
                    <main className="lg:col-span-8 xl:col-span-9">
                        <AdsList
                            selectedCategory={selectedCategory}
                            selectedSubcategory={selectedSubcategory}
                            selectedTransactionType={selectedTransactionType}
                            selectedState={selectedState}
                            selectedCity={selectedCity}
                            advertiserType={advertiserType}
                            sortBy={sortBy}
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
