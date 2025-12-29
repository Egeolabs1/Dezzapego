-- Add missing columns to profiles table
alter table public.profiles 
add column if not exists city text,
add column if not exists state text,
add column if not exists reserved_username text,
add column if not exists website text,
add column if not exists instagram text,
add column if not exists cpf_cnpj text;

-- Add updated_at if missing?
-- alter table public.profiles add column if not exists updated_at timestamptz default now();
