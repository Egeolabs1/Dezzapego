import { useState } from 'react';
import { Header } from '../components/Header';
import { Hero } from '../components/Hero';
import { Categories } from '../components/Categories';
import { Filters } from '../components/Filters';
import { AdsList } from '../components/AdsList';
import { AdDetails } from '../components/AdDetails';
import type { Ad } from '../../types';

export default function Home() {
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [selectedSubcategory, setSelectedSubcategory] = useState<string>('');
    const [selectedTransactionType, setSelectedTransactionType] = useState<'venda' | 'aluguel' | ''>('');
    const [selectedState, setSelectedState] = useState<string>('');
    const [selectedCity, setSelectedCity] = useState<string>('');
    const [priceRange, setPriceRange] = useState<[number, number]>([0, 100000]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedAd, setSelectedAd] = useState<Ad | null>(null);
    const [favorites, setFavorites] = useState<Set<string>>(new Set());

    const handleCategorySelect = (category: string) => {
        setSelectedCategory(category);
        setSelectedSubcategory('');
        setSelectedTransactionType('');
    };

    const handleLocationChange = (state: string, city: string) => {
        setSelectedState(state);
        setSelectedCity(city);
    };

    const toggleFavorite = (adId: string) => {
        setFavorites(prev => {
            const newFavorites = new Set(prev);
            if (newFavorites.has(adId)) {
                newFavorites.delete(adId);
            } else {
                newFavorites.add(adId);
            }
            return newFavorites;
        });
    };

    if (selectedAd) {
        return (
            <div className="min-h-screen bg-gray-50">
                <Header
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    onLogoClick={() => setSelectedAd(null)}
                    selectedState={selectedState}
                    selectedCity={selectedCity}
                    onLocationChange={handleLocationChange}
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
            <Header
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                onLogoClick={() => setSelectedAd(null)}
                selectedState={selectedState}
                selectedCity={selectedCity}
                onLocationChange={handleLocationChange}
            />
            <Hero />
            <Categories
                selectedCategory={selectedCategory}
                onCategorySelect={handleCategorySelect}
                selectedSubcategory={selectedSubcategory}
                onSubcategorySelect={setSelectedSubcategory}
                selectedTransactionType={selectedTransactionType}
                onTransactionTypeSelect={setSelectedTransactionType}
            />
            <div className="container mx-auto px-2 md:px-4 py-4 md:py-8">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    <aside className="lg:col-span-1">
                        <Filters
                            selectedState={selectedState}
                            onStateChange={setSelectedState}
                            selectedCity={selectedCity}
                            onCityChange={setSelectedCity}
                            priceRange={priceRange}
                            onPriceRangeChange={setPriceRange}
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
                        />
                    </main>
                </div>
            </div>
        </div>
    );
}
