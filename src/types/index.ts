export type Seller = {
    name: string;
    phone: string;
    memberSince: string;
    type?: 'personal' | 'professional';
    rating?: number;
    verified?: boolean;
    joinDate?: string;
};

export type AdLocation = {
    city: string;
    state: string;
    // coordinates?: { lat: number; lng: number }; // Future use
};

export type Ad = {
    id: string;
    user_id: string;
    title: string;
    price: number;
    description: string;
    category: string;
    subcategory: string;
    transactionType?: 'venda' | 'aluguel';
    propertyType?: string;
    condominium?: number;
    iptu?: number;
    location: AdLocation;
    images: string[];
    seller: Seller;
    publishedAt: string;
    featured: boolean;
    views: number;
};
