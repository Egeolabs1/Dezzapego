'use client';

import { useState } from 'react';
import { Loader2, X, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { sendTradeIn } from '../../lib/vehicleDealer';

interface TradeInFormProps {
  businessId: string;
  onClose: () => void;
}

export default function TradeInForm({ businessId, onClose }: TradeInFormProps) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [version, setVersion] = useState('');
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [mileage, setMileage] = useState<number>(0);
  const [expectedValue, setExpectedValue] = useState<number>(0);
  const [notes, setNotes] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brand.trim()) { toast.error('Informe a marca do veículo.'); return; }
    if (!model.trim()) { toast.error('Informe o modelo do veículo.'); return; }

    setLoading(true);
    try {
      await sendTradeIn({
        business_id: businessId,
        brand: brand.trim(),
        model: model.trim(),
        version: version.trim() || undefined,
        year,
        mileage: mileage || undefined,
        expected_value: expectedValue || undefined,
        notes: notes.trim() || undefined,
      });
      setSuccess(true);
      toast.success('Proposta de troca enviada com sucesso!');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao enviar proposta de troca.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const inputClass = 'w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 focus:outline-none text-sm';
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1';

  if (success) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center" onClick={e => e.stopPropagation()}>
          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <RefreshCw className="w-8 h-8 text-purple-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Proposta Enviada!</h2>
          <p className="text-sm text-gray-500 mb-6">
            Sua proposta de troca foi enviada. A concessionária entrará em contato em breve para avaliar seu veículo.
          </p>
          <button onClick={onClose}
            className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold rounded-xl transition-all shadow-md shadow-purple-200">
            Fechar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl p-6 md:p-8 max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Enviar Veículo para Troca</h2>
            <p className="text-sm text-gray-500">Informe os dados do seu veículo</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Marca e Modelo */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Marca *</label>
              <input type="text" value={brand} onChange={e => setBrand(e.target.value)} required
                className={inputClass} placeholder="Ex: Honda" />
            </div>
            <div>
              <label className={labelClass}>Modelo *</label>
              <input type="text" value={model} onChange={e => setModel(e.target.value)} required
                className={inputClass} placeholder="Ex: Civic" />
            </div>
          </div>

          {/* Versão */}
          <div>
            <label className={labelClass}>Versão</label>
            <input type="text" value={version} onChange={e => setVersion(e.target.value)}
              className={inputClass} placeholder="Ex: EXL 1.5 Turbo" />
          </div>

          {/* Ano, Km, Valor */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Ano</label>
              <input type="number" value={year} onChange={e => setYear(Number(e.target.value))}
                min={1950} max={new Date().getFullYear() + 1}
                className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Quilometragem</label>
              <input type="number" value={mileage} onChange={e => setMileage(Number(e.target.value))} min={0}
                className={inputClass} placeholder="0" />
            </div>
            <div>
              <label className={labelClass}>Valor Esperado (R$)</label>
              <input type="number" value={expectedValue} onChange={e => setExpectedValue(Number(e.target.value))} min={0}
                className={inputClass} placeholder="0" />
            </div>
          </div>

          {/* Observações */}
          <div>
            <label className={labelClass}>Observações</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
              className={`${inputClass} resize-none`}
              placeholder="Informações adicionais sobre o veículo (opcionais)..." />
          </div>

          {/* Botões */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-3 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors text-sm">
              Cancelar
            </button>
            <button type="submit"
              disabled={loading || !brand.trim() || !model.trim()}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold rounded-xl disabled:opacity-50 transition-all shadow-md shadow-purple-200">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
              Enviar Proposta
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
