import { Link } from 'react-router-dom';
import { categoriesData } from '../data/categories';
import { ChevronRight, Map, Home } from 'lucide-react';

export default function SiteMap() {
    return (
        <div className="min-h-screen bg-gray-50 pb-12">
            {/* Header / Breadcrumb area */}
            <div className="bg-white border-b border-gray-200">
                <div className="container mx-auto px-4 py-8">
                    <div className="flex items-center text-sm text-gray-500 mb-4">
                        <Link to="/" className="hover:text-amber-600 flex items-center gap-1">
                            <Home className="w-4 h-4" />
                            Home
                        </Link>
                        <ChevronRight className="w-4 h-4 mx-2" />
                        <span className="text-gray-900 font-medium">Mapa do Site</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-amber-100 rounded-xl">
                            <Map className="w-8 h-8 text-amber-600" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Mapa do Site</h1>
                            <p className="text-gray-500 mt-1">
                                Encontre tudo o que você precisa em um só lugar.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Sitemap Grid */}
            <div className="container mx-auto px-4 py-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {categoriesData.map((category) => {
                        const Icon = category.icon;
                        return (
                            <div key={category.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
                                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2 border-b border-gray-100 pb-2">
                                    <Icon className="w-5 h-5 text-amber-600" />
                                    {category.name}
                                </h2>
                                <ul className="space-y-2">
                                    {category.subcategories.map((subcategory) => (
                                        <li key={subcategory.id}>
                                            <Link
                                                to={`/?category=${encodeURIComponent(category.id)}&subcategory=${encodeURIComponent(subcategory.id)}`}
                                                className="text-gray-600 hover:text-amber-600 text-sm flex items-center gap-2 hover:translate-x-1 transition-all"
                                            >
                                                <ChevronRight className="w-3 h-3 text-gray-300" />
                                                {subcategory.name}
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
