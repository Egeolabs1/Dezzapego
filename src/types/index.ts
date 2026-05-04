export type Seller = {
    name: string;
    avatar_url?: string | null; // NEW
    phone?: string;
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
    featuredExpiresAt?: string; // NEW: For monetization
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
    account_type?: 'personal' | 'professional' | null;
    business_name?: string | null;
    responsible_name?: string | null;
    rating: number;
    verified: boolean;
    verification_status: 'none' | 'pending' | 'verified' | 'rejected';
    /** URLs públicas das imagens enviadas (bucket ads: userId/verification/...) */
    verification_docs: { doc: string[]; selfie: string[] } | null;
    /** Preenchido pelo admin quando a solicitação é recusada */
    verification_rejection_reason?: string | null;
    created_at: string;
    role?: 'user' | 'admin'; // NEW
    /** Conta suspensa: bloqueia novas ações em anúncios (RLS) e força logout no app */
    is_suspended?: boolean | null;
    /** Motivo exibido ao usuário após suspensão (opcional) */
    suspended_reason?: string | null;
    /** IP público na conclusão do cadastro ou primeiro login com sessão (cliente/API externa). */
    signup_ip?: string | null;
    /** IP da última atividade registrada pelo app */
    last_access_ip?: string | null;
    last_access_at?: string | null;
};
