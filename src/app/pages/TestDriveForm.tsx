'use client';

import { useState } from 'react';
import { Loader2, X, Car } from 'lucide-react';
import { toast } from 'sonner';
import { scheduleTestDrive } from '../../lib/vehicleDealer';

interface TestDriveFormProps {
  vehicleId: string;
  businessId: string;
  onClose: () => void;
}

export default function TestDriveForm({ vehicleId, businessId: _businessId, onClose }: TestDriveFormProps) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const [buyerName, setBuyerName] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [requestedDate, setRequestedDate] = useState('');
  const [requestedTime, setRequestedTime] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!buyerName.trim()) { toast.error('Informe seu nome.'); return; }
    if (!buyerPhone.trim()) { toast.error('Informe seu telefone.'); return; }
    if (!requestedDate) { toast.error('Selecione uma data.'); return; }
    if (!requestedTime) { toast.error('Selecione um horário.'); return; }

    setLoading(true);
    try {
      await scheduleTestDrive({
        vehicle_id: vehicleId,
        buyer_name: buyerName.trim(),
        buyer_phone: buyerPhone.trim(),
        buyer_email: buyerEmail.trim() || undefined,
        requested_date: requestedDate,
        requested_time: requestedTime,
        notes: notes.trim() || undefined,
      });
      setSuccess(true);
      toast.success('Test drive agendado com sucesso!');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao agendar test drive.';
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
            <Car className="w-8 h-8 text-purple-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Test Drive Agendado!</h2>
          <p className="text-sm text-gray-500 mb-6">
            Em breve você receberá uma confirmação. Verifique seu telefone para mais detalhes.
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
            <h2 className="text-xl font-bold text-gray-900">Agendar Test Drive</h2>
            <p className="text-sm text-gray-500">Preencha seus dados para agendar</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nome */}
          <div>
            <label className={labelClass}>Nome completo *</label>
            <input type="text" value={buyerName} onChange={e => setBuyerName(e.target.value)} required
              className={inputClass} placeholder="Seu nome" />
          </div>

          {/* Telefone */}
          <div>
            <label className={labelClass}>Telefone *</label>
            <input type="tel" value={buyerPhone} onChange={e => setBuyerPhone(e.target.value)} required
              className={inputClass} placeholder="(00) 00000-0000" />
          </div>

          {/* Email (opcional) */}
          <div>
            <label className={labelClass}>E-mail (opcional)</label>
            <input type="email" value={buyerEmail} onChange={e => setBuyerEmail(e.target.value)}
              className={inputClass} placeholder="seu@email.com" />
          </div>

          {/* Data e Hora */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Data *</label>
              <input type="date" value={requestedDate} onChange={e => setRequestedDate(e.target.value)} required
                className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Horário *</label>
              <input type="time" value={requestedTime} onChange={e => setRequestedTime(e.target.value)} required
                className={inputClass} />
            </div>
          </div>

          {/* Observações (opcional) */}
          <div>
            <label className={labelClass}>Observações (opcional)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
              className={`${inputClass} resize-none`}
              placeholder="Alguma preferência ou informação adicional..." />
          </div>

          {/* Botões */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-3 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors text-sm">
              Cancelar
            </button>
            <button type="submit"
              disabled={loading || !buyerName.trim() || !buyerPhone.trim() || !requestedDate || !requestedTime}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold rounded-xl disabled:opacity-50 transition-all shadow-md shadow-purple-200">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Car className="w-5 h-5" />}
              Agendar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
