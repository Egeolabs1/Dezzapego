export type Seller = {
    name: string;
    avatar_url?: string | null; // NEW
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
    lat?: number; // NEW
    lng?: number; // NEW
    neighborhood?: string; // NEW
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

export type Profile = {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    phone: string | null;
    email: string | null;
    bio: string | null;
    city: string | null;
    state: string | null;
    website: string | null;
    instagram: string | null;
    cpf_cnpj: string | null;
    rating: number;
    verified: boolean;
    verification_status: 'none' | 'pending' | 'verified' | 'rejected';
    verification_docs: { doc: string[], selfie: string[] } | null;
    created_at: string;
    role?: 'user' | 'admin'; // NEW
};
