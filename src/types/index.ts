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
    business_id?: string | null;
    agent_id?: string | null;
    property_type?: PropertyType;
    property_transaction_type?: PropertyListingType;
    bedrooms?: number;
    bathrooms?: number;
    parking_spots?: number;
    area_m2?: number;
    lot_area_m2?: number;
    floor_number?: number;
    total_floors?: number;
    year_built?: number;
    furnished?: boolean;
    condominium_fee?: number;
    iptu_monthly?: number;
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
    featuredExpiresAt?: string;
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
    is_admin?: boolean | null;
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

export type BusinessType = 'generic' | 'real_estate' | 'vehicle_dealer' | 'professional' | 'store';

export type Business = {
    id: string;
    owner_id: string;
    name: string;
    slug: string;
    type: BusinessType;
    description: string | null;
    logo_url: string | null;
    cover_url: string | null;
    highlight_color: string;
    phone: string | null;
    whatsapp: string | null;
    email: string | null;
    website: string | null;
    instagram: string | null;
    facebook: string | null;
    cnpj: string | null;
    address: string | null;
    neighborhood: string | null;
    city: string | null;
    state: string | null;
    cep: string | null;
    lat: number | null;
    lng: number | null;
    opening_hours: Record<string, unknown>;
    attendance_options: string[];
    verification_status: 'none' | 'pending' | 'verified' | 'rejected';
    verification_docs: { doc: string[]; selfie: string[] } | null;
    verification_rejection_reason: string | null;
    rating: number;
    followers_count: number;
    ads_count: number;
    plan_type: 'free' | 'pro' | 'max';
    is_active: boolean;
    created_at: string;
    updated_at: string;
};

export type BusinessMember = {
    id: string;
    business_id: string;
    user_id: string;
    role: BusinessMemberRole;
    invited_by: string | null;
    status: 'active' | 'invited' | 'removed';
    created_at: string;
    updated_at: string;
};

export type BusinessFollower = {
    id: string;
    business_id: string;
    user_id: string;
    created_at: string;
};

export type RealEstateSpecialty = 'residencial' | 'comercial' | 'loteamento' | 'rural' | 'industrial';

export type PropertyTransactionType = 'sale' | 'rent' | 'seasonal' | 'launch';

export type PropertyType = 'casa' | 'apartamento' | 'terreno' | 'comercial' | 'rural' | 'flat' | 'kitnet' | 'cobertura' | 'loft' | 'chacara' | 'fazenda' | 'sitio';

export type PropertyListingType = 'sale' | 'rent' | 'seasonal' | 'launch';

export type VisitStatus = 'pending' | 'confirmed' | 'completed' | 'canceled' | 'no_show';

export type BusinessRealEstate = {
  business_id: string;
  creci: string | null;
  creci_type: 'pj' | 'pf';
  specialties: string[];
  regions: string[];
  transaction_types: string[];
  team_size: number;
  years_experience: number | null;
  properties_sold: number;
  avg_sale_price: number | null;
  video_url: string | null;
  whatsapp_message: string;
  accepts_whatsapp: boolean;
  accepts_phone: boolean;
  accepts_visit: boolean;
  visit_scheduling_url: string | null;
  created_at: string;
  updated_at: string;
};

export type BusinessAgent = {
  id: string;
  business_id: string;
  user_id: string | null;
  name: string;
  creci: string | null;
  creci_type: 'pf' | 'pj';
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  avatar_url: string | null;
  bio: string | null;
  specialties: string[];
  regions: string[];
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type PropertyLead = {
  id: string;
  business_id: string;
  ad_id: string | null;
  agent_id: string | null;
  buyer_id: string | null;
  buyer_name: string | null;
  buyer_phone: string | null;
  buyer_email: string | null;
  buyer_whatsapp: string | null;
  message: string | null;
  source: LeadSource;
  status: LeadStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type PropertyVisit = {
  id: string;
  business_id: string;
  ad_id: string | null;
  agent_id: string | null;
  buyer_id: string | null;
  buyer_name: string;
  buyer_phone: string;
  buyer_email: string | null;
  visit_date: string;
  visit_time: string;
  status: VisitStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type BusinessBairro = {
  id: string;
  business_id: string;
  city: string;
  state: string;
  neighborhood: string;
  property_count: number;
  created_at: string;
};

// --- FASE 3: Lojas de Veículos ---

export type VehicleTransmission = 'manual' | 'automatic' | 'automated' | 'cvt';
export type VehicleFuel = 'gasoline' | 'ethanol' | 'diesel' | 'flex' | 'electric' | 'hybrid';
export type VehicleBodyType = 'sedan' | 'hatch' | 'suv' | 'pickup' | 'utility' | 'motorcycle' | 'van' | 'other';
export type VehicleStatus = 'active' | 'sold' | 'reserved' | 'paused';
export type TestDriveStatus = 'solicitado' | 'confirmado' | 'reagendado' | 'cancelado' | 'concluido';
export type TradeInStatus = 'pending' | 'contacted' | 'negotiating' | 'accepted' | 'rejected';
export type DeliveryReach = 'LOCAL' | 'REGIONAL' | 'ESTADUAL' | 'NACIONAL';

export interface BusinessVehicleDealer {
  business_id: string;
  cnpj?: string | null;
  brands_worked: string[];
  has_financing: boolean;
  accepts_trade: boolean;
  has_delivery: boolean;
  delivery_reach: DeliveryReach;
  business_hours?: string | null;
  created_at: string;
  updated_at: string;
}

export interface VehicleListing {
  id: string;
  business_id: string;
  user_id: string;
  ad_id?: string | null;
  brand: string;
  model: string;
  version?: string | null;
  year_fabrication: number;
  year_model: number;
  price: number;
  mileage?: number | null;
  transmission?: VehicleTransmission | null;
  fuel?: VehicleFuel | null;
  body_type?: VehicleBodyType | null;
  color?: string | null;
  doors?: number | null;
  horsepower?: number | null;
  plate_last_digit?: string | null;
  is_unique_owner: boolean;
  is_armored: boolean;
  has_warranty: boolean;
  accepts_trade: boolean;
  has_financing: boolean;
  equipment: string[];
  reach: DeliveryReach;
  delivery_options: string[];
  images: string[];
  status: VehicleStatus;
  views_count: number;
  favorites_count: number;
  created_at: string;
  updated_at: string;
}

export interface TestDrive {
  id: string;
  vehicle_id: string;
  business_id: string;
  user_id?: string | null;
  buyer_name: string;
  buyer_phone: string;
  buyer_email?: string | null;
  requested_date: string;
  requested_time: string;
  status: TestDriveStatus;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface TradeIn {
  id: string;
  business_id: string;
  user_id?: string | null;
  ad_id?: string | null;
  brand: string;
  model: string;
  version?: string | null;
  year: number;
  mileage?: number | null;
  expected_value?: number | null;
  images: string[];
  notes?: string | null;
  status: TradeInStatus;
  created_at: string;
  updated_at: string;
}

export interface VehicleCollection {
  id: string;
  business_id: string;
  name: string;
  slug: string;
  description?: string | null;
  image_url?: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface FinancingSimulation {
  vehicle_price: number;
  down_payment: number;
  financed_amount: number;
  installments: number;
  estimated_monthly: number;
  estimated_total: number;
  disclaimer: string;
}

export interface VehicleFilters {
  brands: string[];
  models: string[];
  body_types: string[];
  fuels: string[];
  transmissions: string[];
  colors: string[];
  min_year: number | null;
  max_year: number | null;
  min_price: number | null;
  max_price: number | null;
  min_mileage: number | null;
  max_mileage: number | null;
}

// --- FASE 4: CRM, Leads, Pipeline ---

export type LeadStatus = 'novo' | 'contatado' | 'negociando' | 'visita' | 'proposta' | 'vendido' | 'perdido';
export type LeadSource = 'whatsapp' | 'visita' | 'test_drive' | 'trade_in' | 'chat' | 'telefone' | 'formulario' | 'manual' | 'outro';
export type BusinessMemberRole = 'owner' | 'admin' | 'manager' | 'sales' | 'agent' | 'viewer';

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  novo: 'Novo',
  contatado: 'Contatado',
  negociando: 'Negociando',
  visita: 'Visita/Test Drive',
  proposta: 'Proposta',
  vendido: 'Vendido',
  perdido: 'Perdido',
};

export const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
  whatsapp: 'WhatsApp',
  visita: 'Visita',
  test_drive: 'Test Drive',
  trade_in: 'Troca',
  chat: 'Chat',
  telefone: 'Telefone',
  formulario: 'Formulário',
  manual: 'Manual',
  outro: 'Outro',
};

export const MEMBER_ROLE_LABELS: Record<BusinessMemberRole, string> = {
  owner: 'Proprietário',
  admin: 'Administrador',
  manager: 'Gerente',
  sales: 'Vendas',
  agent: 'Corretor/Agente',
  viewer: 'Visualizador',
};

export interface Lead {
  id: string;
  business_id: string;
  user_id?: string | null;
  ad_id?: string | null;
  name: string;
  phone: string;
  email?: string | null;
  status: LeadStatus;
  source: LeadSource;
  responsible_id?: string | null;
  listing_type?: string | null;
  listing_id?: string | null;
  notes?: string | null;
  value?: number | null;
  created_at: string;
  updated_at: string;
}

export interface LeadNote {
  id: string;
  lead_id: string;
  author_id: string;
  text: string;
  created_at: string;
}

export interface LeadStatusHistory {
  id: string;
  lead_id: string;
  old_status?: LeadStatus | null;
  new_status: LeadStatus;
  changed_by: string;
  created_at: string;
}

export interface BusinessCollection {
  id: string;
  business_id: string;
  name: string;
  slug: string;
  description?: string | null;
  image_url?: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface BusinessDashboardMetrics {
  total_leads: number;
  leads_novo: number;
  leads_contatado: number;
  leads_negociando: number;
  leads_visita: number;
  leads_proposta: number;
  leads_vendido: number;
  leads_perdido: number;
  active_listings: number;
  followers: number;
  total_views: number;
  leads_by_source: Record<string, number>;
  leads_by_week: { week: string; count: number }[];
}

export interface LeadWithNotes {
  lead: Lead;
  notes: LeadNote[];
  history: LeadStatusHistory[];
}

// --- FASE 5: Geolocation ---

export type SearchRadius = 10 | 25 | 50 | 100 | 200;

export const SEARCH_RADIUS_LABELS: Record<SearchRadius, string> = {
  10: 'Até 10 km',
  25: 'Até 25 km',
  50: 'Até 50 km',
  100: 'Até 100 km',
  200: 'Até 200 km',
};

export interface NearbyBusiness {
  id: string;
  name: string;
  slug: string;
  type: string;
  logo_url?: string | null;
  cover_url?: string | null;
  cidade?: string | null;
  estado?: string | null;
  rating: number;
  followers_count: number;
  ads_count: number;
  is_verified: boolean;
  distance_km: number;
}

export interface LocationAd {
  id: string;
  title: string;
  price: number;
  category: string;
  images: string[];
  cidade?: string | null;
  estado?: string | null;
  bairro?: string | null;
  status: string;
  views_count: number;
  created_at: string;
  distance_km?: number | null;
}

export interface LocationSuggestion {
  cidade: string;
  estado: string;
}

// --- FASE 6: SEO ---

export interface SeoLocationPage {
  id: string;
  slug_type: string;
  estado: string;
  cidade?: string | null;
  bairro?: string | null;
  marca?: string | null;
  modelo?: string | null;
  title: string;
  description: string;
  h1?: string | null;
  canonical_path: string;
  intro_text?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// --- FASE 7: Planos, Monetização ---

export type BusinessPlanTier = 'free' | 'pro' | 'max';

export const PLAN_TIER_LABELS: Record<BusinessPlanTier, string> = {
  free: 'Empresa Free',
  pro: 'Empresa Pro',
  max: 'Empresa Max',
};

export interface BusinessPlan {
  id: string;
  tier: BusinessPlanTier;
  name: string;
  price_monthly: number;
  price_yearly: number;
  max_listings: number;
  max_members: number;
  has_crm: boolean;
  has_collections: boolean;
  has_import_csv: boolean;
  has_api: boolean;
  has_advanced_metrics: boolean;
  has_priority_support: boolean;
  has_sponsored: boolean;
  features: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
}

export interface BusinessSubscription {
  id: string;
  business_id: string;
  plan_id: string;
  tier: BusinessPlanTier;
  status: 'active' | 'cancelled' | 'expired' | 'past_due';
  started_at: string;
  expires_at?: string | null;
  payment_method?: string | null;
  external_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlanFeatures {
  tier: BusinessPlanTier;
  name: string;
  max_listings: number;
  max_members: number;
  has_crm: boolean;
  has_collections: boolean;
  has_import_csv: boolean;
  has_api: boolean;
  has_advanced_metrics: boolean;
  has_priority_support: boolean;
  has_sponsored: boolean;
  features: Record<string, unknown>;
}

export interface SponsoredListing {
  id: string;
  ad_id: string;
  business_id: string;
  sponsor_type: 'highlight' | 'priority' | 'category' | 'regional';
  start_date: string;
  end_date: string;
  budget?: number | null;
  spent: number;
  status: 'active' | 'paused' | 'expired' | 'completed';
  created_at: string;
}
