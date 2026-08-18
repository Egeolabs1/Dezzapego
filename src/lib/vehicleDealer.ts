import { supabase } from './supabase';
import type {
  BusinessVehicleDealer,
  VehicleListing,
  TestDrive,
  TradeIn,
  VehicleCollection,
  FinancingSimulation,
  VehicleFilters,
  VehicleTransmission,
  VehicleFuel,
  VehicleBodyType,
} from '@/types';

// --- Labels ---

export const TRANSMISSION_LABELS: Record<VehicleTransmission, string> = {
  manual: 'Manual',
  automatic: 'Automático',
  automated: 'Automatizado',
  cvt: 'CVT',
};

export const FUEL_LABELS: Record<VehicleFuel, string> = {
  gasoline: 'Gasolina',
  ethanol: 'Etanol',
  diesel: 'Diesel',
  flex: 'Flex',
  electric: 'Elétrico',
  hybrid: 'Híbrido',
};

export const BODY_TYPE_LABELS: Record<VehicleBodyType, string> = {
  sedan: 'Sedan',
  hatch: 'Hatch',
  suv: 'SUV',
  pickup: 'Pickup',
  utility: 'Utilitário',
  motorcycle: 'Moto',
  van: 'Van',
  other: 'Outro',
};

export const VEHICLE_EQUIPMENT_OPTIONS = [
  'Ar condicionado',
  'Direção elétrica',
  'Bancos de couro',
  'Câmera de ré',
  'Sensores de estacionamento',
  'Teto solar',
  'Piloto automático',
  'Multimídia',
  'Apple CarPlay',
  'Android Auto',
] as const;

// --- VehicleDealer CRUD ---

export async function getVehicleDealerByBusinessId(businessId: string) {
  const { data, error } = await supabase
    .from('business_vehicle_dealer')
    .select('*')
    .eq('business_id', businessId)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data as BusinessVehicleDealer | null;
}

export async function upsertVehicleDealer(businessId: string, data: Partial<BusinessVehicleDealer>) {
  const { error } = await supabase
    .from('business_vehicle_dealer')
    .upsert({ business_id: businessId, ...data }, { onConflict: 'business_id' });
  if (error) throw error;
}

// --- Vehicle CRUD ---

export async function getVehicleById(id: string) {
  const { data, error } = await supabase
    .from('vehicle_listings')
    .select('*, businesses!inner(id, name, slug, logo_url, phone, whatsapp)')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export async function listVehiclesByBusiness(businessId: string, filters?: {
  brand?: string;
  model?: string;
  body_type?: string;
  fuel?: string;
  transmission?: string;
  min_price?: number;
  max_price?: number;
  min_year?: number;
  max_year?: number;
  status?: string;
}) {
  let q = supabase
    .from('vehicle_listings')
    .select('*', { count: 'exact' })
    .eq('business_id', businessId)
    .order('created_at', { ascending: false });

  if (filters) {
    if (filters.brand) q = q.eq('brand', filters.brand);
    if (filters.model) q = q.eq('model', filters.model);
    if (filters.body_type) q = q.eq('body_type', filters.body_type);
    if (filters.fuel) q = q.eq('fuel', filters.fuel);
    if (filters.transmission) q = q.eq('transmission', filters.transmission);
    if (filters.min_price) q = q.gte('price', filters.min_price);
    if (filters.max_price) q = q.lte('price', filters.max_price);
    if (filters.min_year) q = q.gte('year_model', filters.min_year);
    if (filters.max_year) q = q.lte('year_model', filters.max_year);
    if (filters.status) q = q.eq('status', filters.status);
  }

  const { data, error, count } = await q;
  if (error) throw error;
  return { data: data as VehicleListing[], count: count ?? 0 };
}

export async function createVehicleListing(data: {
  business_id: string;
  brand: string;
  model: string;
  year_fabrication: number;
  year_model: number;
  price: number;
  version?: string;
  mileage?: number;
  transmission?: VehicleTransmission;
  fuel?: VehicleFuel;
  body_type?: VehicleBodyType;
  color?: string;
  doors?: number;
  horsepower?: number;
  plate_last_digit?: string;
  is_unique_owner?: boolean;
  is_armored?: boolean;
  has_warranty?: boolean;
  accepts_trade?: boolean;
  has_financing?: boolean;
  equipment?: string[];
  reach?: string;
  delivery_options?: string[];
  images?: string[];
}) {
  const { data: result, error } = await supabase.rpc('create_vehicle_listing', {
    p_business_id: data.business_id,
    p_brand: data.brand,
    p_model: data.model,
    p_year_fabrication: data.year_fabrication,
    p_year_model: data.year_model,
    p_price: data.price,
    p_version: data.version ?? null,
    p_mileage: data.mileage ?? null,
    p_transmission: data.transmission ?? null,
    p_fuel: data.fuel ?? null,
    p_body_type: data.body_type ?? null,
    p_color: data.color ?? null,
    p_doors: data.doors ?? null,
    p_horsepower: data.horsepower ?? null,
    p_plate_last_digit: data.plate_last_digit ?? null,
    p_is_unique_owner: data.is_unique_owner ?? false,
    p_is_armored: data.is_armored ?? false,
    p_has_warranty: data.has_warranty ?? false,
    p_accepts_trade: data.accepts_trade ?? false,
    p_has_financing: data.has_financing ?? false,
    p_equipment: data.equipment ?? [],
    p_reach: data.reach ?? 'LOCAL',
    p_delivery_options: data.delivery_options ?? [],
    p_images: data.images ?? [],
  });
  if (error) throw error;
  return result as VehicleListing;
}

export async function updateVehicleListing(vehicleId: string, data: Partial<{
  brand: string;
  model: string;
  version: string;
  year_fabrication: number;
  year_model: number;
  price: number;
  mileage: number;
  transmission: VehicleTransmission;
  fuel: VehicleFuel;
  body_type: VehicleBodyType;
  color: string;
  doors: number;
  horsepower: number;
  plate_last_digit: string;
  is_unique_owner: boolean;
  is_armored: boolean;
  has_warranty: boolean;
  accepts_trade: boolean;
  has_financing: boolean;
  equipment: string[];
  reach: string;
  delivery_options: string[];
  images: string[];
  status: string;
}>) {
  const params: Record<string, unknown> = { p_vehicle_id: vehicleId };
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) params[`p_${key}`] = value;
  }
  const { data: result, error } = await supabase.rpc('update_vehicle_listing', params);
  if (error) throw error;
  return result as VehicleListing;
}

// --- Test Drive ---

export async function scheduleTestDrive(data: {
  vehicle_id: string;
  buyer_name: string;
  buyer_phone: string;
  requested_date: string;
  requested_time: string;
  buyer_email?: string;
  notes?: string;
}) {
  const { data: result, error } = await supabase.rpc('schedule_test_drive', {
    p_vehicle_id: data.vehicle_id,
    p_buyer_name: data.buyer_name,
    p_buyer_phone: data.buyer_phone,
    p_requested_date: data.requested_date,
    p_requested_time: data.requested_time,
    p_buyer_email: data.buyer_email ?? null,
    p_notes: data.notes ?? null,
  });
  if (error) throw error;
  return result as TestDrive;
}

export async function listTestDrivesByBusiness(businessId: string) {
  const { data, error } = await supabase
    .from('test_drives')
    .select('*, vehicle_listings(brand, model, year_model, images)')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as (TestDrive & { vehicle_listings: { brand: string; model: string; year_model: number; images: string[] } })[];
}

export async function updateTestDriveStatus(driveId: string, status: string) {
  const { data, error } = await supabase
    .from('test_drives')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', driveId)
    .select()
    .single();
  if (error) throw error;
  return data as TestDrive;
}

// --- Trade-In ---

export async function sendTradeIn(data: {
  business_id: string;
  brand: string;
  model: string;
  year: number;
  version?: string;
  mileage?: number;
  expected_value?: number;
  images?: string[];
  notes?: string;
  ad_id?: string;
}) {
  const { data: result, error } = await supabase.rpc('send_trade_in', {
    p_business_id: data.business_id,
    p_brand: data.brand,
    p_model: data.model,
    p_year: data.year,
    p_version: data.version ?? null,
    p_mileage: data.mileage ?? null,
    p_expected_value: data.expected_value ?? null,
    p_images: data.images ?? [],
    p_notes: data.notes ?? null,
    p_ad_id: data.ad_id ?? null,
  });
  if (error) throw error;
  return result as TradeIn;
}

export async function listTradeInsByBusiness(businessId: string) {
  const { data, error } = await supabase
    .from('trade_ins')
    .select('*')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as TradeIn[];
}

// --- Financing Simulation ---

export async function simulateFinancing(vehiclePrice: number, downPayment: number, installments: number) {
  const { data, error } = await supabase.rpc('simulate_financing', {
    p_vehicle_price: vehiclePrice,
    p_down_payment: downPayment,
    p_installments: installments,
  });
  if (error) throw error;
  return data as FinancingSimulation;
}

// --- Vehicle Filters ---

export async function getVehicleFilters(businessId: string) {
  const { data, error } = await supabase.rpc('get_vehicle_filters', {
    p_business_id: businessId,
  });
  if (error) throw error;
  return data as VehicleFilters;
}

// --- Collections ---

export async function listCollectionsByBusiness(businessId: string) {
  const { data, error } = await supabase
    .from('vehicle_collections')
    .select('*')
    .eq('business_id', businessId)
    .order('sort_order');
  if (error) throw error;
  return data as VehicleCollection[];
}
