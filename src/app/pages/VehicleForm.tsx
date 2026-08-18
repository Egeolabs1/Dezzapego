'use client';

import { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2, ArrowLeft, Save, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { Header } from '../components/Header';
import SEO from '../../components/SEO';
import {
  createVehicleListing,
  updateVehicleListing,
  TRANSMISSION_LABELS,
  FUEL_LABELS,
  BODY_TYPE_LABELS,
  VEHICLE_EQUIPMENT_OPTIONS,
} from '../../lib/vehicleDealer';
import type {
  VehicleTransmission,
  VehicleFuel,
  VehicleBodyType,
  DeliveryReach,
  VehicleListing,
} from '../../types';

const REACH_OPTIONS: { value: DeliveryReach; label: string }[] = [
  { value: 'LOCAL', label: 'Local' },
  { value: 'REGIONAL', label: 'Regional' },
  { value: 'ESTADUAL', label: 'Estadual' },
  { value: 'NACIONAL', label: 'Nacional' },
];

interface VehicleFormProps {
  businessId?: string;
  existingVehicle?: Partial<VehicleListing>;
}

export default function VehicleForm({ businessId: propBusinessId, existingVehicle }: VehicleFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const businessId = propBusinessId || searchParams.get('business_id') || '';
  const isEditing = !!existingVehicle?.id;

  const [loading, setLoading] = useState(false);

  // Campos principais
  const [brand, setBrand] = useState(existingVehicle?.brand || '');
  const [model, setModel] = useState(existingVehicle?.model || '');
  const [version, setVersion] = useState(existingVehicle?.version || '');
  const [yearFabrication, setYearFabrication] = useState(existingVehicle?.year_fabrication || new Date().getFullYear());
  const [yearModel, setYearModel] = useState(existingVehicle?.year_model || new Date().getFullYear());
  const [price, setPrice] = useState(existingVehicle?.price || 0);
  const [mileage, setMileage] = useState(existingVehicle?.mileage || 0);
  const [transmission, setTransmission] = useState<VehicleTransmission | ''>(existingVehicle?.transmission || '');
  const [fuel, setFuel] = useState<VehicleFuel | ''>(existingVehicle?.fuel || '');
  const [bodyType, setBodyType] = useState<VehicleBodyType | ''>(existingVehicle?.body_type || '');
  const [color, setColor] = useState(existingVehicle?.color || '');
  const [doors, setDoors] = useState(existingVehicle?.doors || 4);
  const [horsepower, setHorsepower] = useState(existingVehicle?.horsepower || 0);
  const [plateLastDigit, setPlateLastDigit] = useState(existingVehicle?.plate_last_digit || '');

  // Checkboxes
  const [isUniqueOwner, setIsUniqueOwner] = useState(existingVehicle?.is_unique_owner || false);
  const [isArmored, setIsArmored] = useState(existingVehicle?.is_armored || false);
  const [hasWarranty, setHasWarranty] = useState(existingVehicle?.has_warranty || false);
  const [acceptsTrade, setAcceptsTrade] = useState(existingVehicle?.accepts_trade || false);
  const [hasFinancing, setHasFinancing] = useState(existingVehicle?.has_financing || false);

  // Equipamentos
  const [equipment, setEquipment] = useState<string[]>(existingVehicle?.equipment || []);

  // Imagens (placeholder - input de URL)
  const [imageUrl, setImageUrl] = useState('');
  const [images, setImages] = useState<string[]>(existingVehicle?.images || []);

  // Alcance
  const [reach, setReach] = useState<DeliveryReach>(existingVehicle?.reach || 'LOCAL');

  const toggleEquipment = (item: string) => {
    setEquipment(prev =>
      prev.includes(item) ? prev.filter(e => e !== item) : [...prev, item]
    );
  };

  const addImage = () => {
    const url = imageUrl.trim();
    if (!url) return;
    if (images.includes(url)) {
      toast.error('Esta URL já foi adicionada.');
      return;
    }
    setImages(prev => [...prev, url]);
    setImageUrl('');
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brand.trim()) { toast.error('Informe a marca do veículo.'); return; }
    if (!model.trim()) { toast.error('Informe o modelo do veículo.'); return; }
    if (!businessId) { toast.error('ID da empresa não encontrado.'); return; }
    if (price <= 0) { toast.error('Informe um preço válido.'); return; }

    setLoading(true);
    try {
      const vehicleData = {
        brand: brand.trim(),
        model: model.trim(),
        version: version.trim() || undefined,
        year_fabrication: yearFabrication,
        year_model: yearModel,
        price,
        mileage: mileage || undefined,
        transmission: (transmission || undefined) as VehicleTransmission | undefined,
        fuel: (fuel || undefined) as VehicleFuel | undefined,
        body_type: (bodyType || undefined) as VehicleBodyType | undefined,
        color: color.trim() || undefined,
        doors: doors || undefined,
        horsepower: horsepower || undefined,
        plate_last_digit: plateLastDigit.trim() || undefined,
        is_unique_owner: isUniqueOwner,
        is_armored: isArmored,
        has_warranty: hasWarranty,
        accepts_trade: acceptsTrade,
        has_financing: hasFinancing,
        equipment: equipment.length > 0 ? equipment : undefined,
        reach,
        images: images.length > 0 ? images : undefined,
      };

      if (isEditing && existingVehicle?.id) {
        await updateVehicleListing(existingVehicle.id, vehicleData);
        toast.success('Veículo atualizado com sucesso!');
      } else {
        await createVehicleListing({ business_id: businessId, ...vehicleData });
        toast.success('Veículo cadastrado com sucesso!');
      }
      router.back();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar veículo.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const inputClass = 'w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 focus:outline-none text-sm';
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1';

  return (
    <div className="bg-gray-50 min-h-screen">
      <SEO
        title={isEditing ? 'Editar Veículo' : 'Cadastrar Veículo'}
        description="Gerencie anúncios de veículos no Dezzapego"
        noIndex
      />
      <Header />
      <div className="container mx-auto px-4 py-6 max-w-3xl">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 text-sm">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            {isEditing ? 'Editar Veículo' : 'Cadastrar Veículo'}
          </h1>
          <p className="text-sm text-gray-500 mb-6">
            {isEditing
              ? 'Atualize as informações do veículo.'
              : 'Preencha os dados do veículo para criar o anúncio.'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* --- Dados do Veículo --- */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>Marca *</label>
                <input type="text" value={brand} onChange={e => setBrand(e.target.value)} required
                  className={inputClass} placeholder="Ex: Toyota" />
              </div>
              <div>
                <label className={labelClass}>Modelo *</label>
                <input type="text" value={model} onChange={e => setModel(e.target.value)} required
                  className={inputClass} placeholder="Ex: Corolla" />
              </div>
              <div>
                <label className={labelClass}>Versão</label>
                <input type="text" value={version} onChange={e => setVersion(e.target.value)}
                  className={inputClass} placeholder="Ex: XEi" />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className={labelClass}>Ano Fabricação *</label>
                <input type="number" value={yearFabrication} onChange={e => setYearFabrication(Number(e.target.value))} required min={1900} max={new Date().getFullYear() + 1}
                  className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Ano Modelo *</label>
                <input type="number" value={yearModel} onChange={e => setYearModel(Number(e.target.value))} required min={1900} max={new Date().getFullYear() + 2}
                  className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Preço (R$) *</label>
                <input type="number" value={price} onChange={e => setPrice(Number(e.target.value))} required min={0}
                  className={inputClass} placeholder="0" />
              </div>
              <div>
                <label className={labelClass}>Quilometragem</label>
                <input type="number" value={mileage} onChange={e => setMileage(Number(e.target.value))} min={0}
                  className={inputClass} placeholder="0" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>Câmbio</label>
                <select value={transmission} onChange={e => setTransmission(e.target.value as VehicleTransmission | '')}
                  className={`${inputClass} bg-white`}>
                  <option value="">Selecione</option>
                  {Object.entries(TRANSMISSION_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Combustível</label>
                <select value={fuel} onChange={e => setFuel(e.target.value as VehicleFuel | '')}
                  className={`${inputClass} bg-white`}>
                  <option value="">Selecione</option>
                  {Object.entries(FUEL_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Carroceria</label>
                <select value={bodyType} onChange={e => setBodyType(e.target.value as VehicleBodyType | '')}
                  className={`${inputClass} bg-white`}>
                  <option value="">Selecione</option>
                  {Object.entries(BODY_TYPE_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className={labelClass}>Cor</label>
                <input type="text" value={color} onChange={e => setColor(e.target.value)}
                  className={inputClass} placeholder="Ex: Prata" />
              </div>
              <div>
                <label className={labelClass}>Portas</label>
                <input type="number" value={doors} onChange={e => setDoors(Number(e.target.value))} min={1} max={6}
                  className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Potência (cv)</label>
                <input type="number" value={horsepower} onChange={e => setHorsepower(Number(e.target.value))} min={0}
                  className={inputClass} placeholder="0" />
              </div>
              <div>
                <label className={labelClass}>Último dígito da placa</label>
                <input type="text" value={plateLastDigit} onChange={e => setPlateLastDigit(e.target.value)} maxLength={1}
                  className={inputClass} placeholder="0-9" />
              </div>
            </div>

            {/* --- Checkboxes --- */}
            <hr className="border-gray-100" />
            <h3 className="font-semibold text-gray-900">Informações Adicionais</h3>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { checked: isUniqueOwner, onChange: setIsUniqueOwner, label: 'Único dono' },
                { checked: isArmored, onChange: setIsArmored, label: 'Blindado' },
                { checked: hasWarranty, onChange: setHasWarranty, label: 'Garantia de fábrica' },
                { checked: acceptsTrade, onChange: setAcceptsTrade, label: 'Aceita troca' },
                { checked: hasFinancing, onChange: setHasFinancing, label: 'Financiamento disponível' },
              ].map(({ checked, onChange, label }) => (
                <label key={label} className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-gray-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={e => onChange(e.target.checked)}
                    className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                  />
                  <span className="text-sm text-gray-700">{label}</span>
                </label>
              ))}
            </div>

            {/* --- Equipamentos --- */}
            <hr className="border-gray-100" />
            <h3 className="font-semibold text-gray-900">Equipamentos</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {VEHICLE_EQUIPMENT_OPTIONS.map(item => (
                <label key={item} className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-gray-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={equipment.includes(item)}
                    onChange={() => toggleEquipment(item)}
                    className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                  />
                  <span className="text-sm text-gray-700">{item}</span>
                </label>
              ))}
            </div>
            {equipment.length > 0 && (
              <p className="text-xs text-gray-500">{equipment.length} equipamento(s) selecionado(s)</p>
            )}

            {/* --- Imagens --- */}
            <hr className="border-gray-100" />
            <h3 className="font-semibold text-gray-900">Imagens</h3>
            <div className="flex gap-2">
              <input
                type="url"
                value={imageUrl}
                onChange={e => setImageUrl(e.target.value)}
                className={`${inputClass} flex-1`}
                placeholder="Cole a URL da imagem aqui"
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addImage(); } }}
              />
              <button type="button" onClick={addImage}
                className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-medium transition-colors flex items-center gap-1">
                <Plus className="w-4 h-4" /> Adicionar
              </button>
            </div>
            {images.length > 0 && (
              <div className="space-y-2">
                {images.map((url, index) => (
                  <div key={index} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                    <span className="text-xs text-gray-600 truncate flex-1">{url}</span>
                    <button type="button" onClick={() => removeImage(index)}
                      className="text-red-400 hover:text-red-600 transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* --- Alcance --- */}
            <hr className="border-gray-100" />
            <h3 className="font-semibold text-gray-900">Alcance do Anúncio</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {REACH_OPTIONS.map(opt => (
                <label key={opt.value}
                  className={`flex items-center justify-center p-3 rounded-xl border-2 cursor-pointer transition-all text-sm font-medium ${
                    reach === opt.value
                      ? 'border-purple-500 bg-purple-50 text-purple-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                  }`}>
                  <input
                    type="radio"
                    name="reach"
                    value={opt.value}
                    checked={reach === opt.value}
                    onChange={() => setReach(opt.value)}
                    className="sr-only"
                  />
                  {opt.label}
                </label>
              ))}
            </div>

            {/* --- Botão Salvar --- */}
            <button
              type="submit"
              disabled={loading || !brand.trim() || !model.trim() || price <= 0}
              className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold rounded-xl disabled:opacity-50 transition-all shadow-md shadow-purple-200"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              {isEditing ? 'Salvar Alterações' : 'Cadastrar Veículo'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
