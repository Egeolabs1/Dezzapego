import { useEffect, useRef } from 'react';
import { AlertTriangle, X } from 'lucide-react';

type ConfirmDialogProps = {
    open: boolean;
    title: string;
    description: string;
    confirmLabel: string;
    busy?: boolean;
    onCancel: () => void;
    onConfirm: () => void;
};

export function ConfirmDialog({ open, title, description, confirmLabel, busy = false, onCancel, onConfirm }: ConfirmDialogProps) {
    const cancelRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (!open) return;
        cancelRef.current?.focus();
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && !busy) onCancel();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [busy, onCancel, open]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/50 p-4" role="presentation">
            <section role="alertdialog" aria-modal="true" aria-labelledby="confirm-dialog-title" aria-describedby="confirm-dialog-description" className="w-full max-w-md rounded-lg bg-white p-5 shadow-2xl">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                        <span className="rounded-full bg-red-50 p-2 text-red-600"><AlertTriangle className="h-5 w-5" /></span>
                        <div>
                            <h2 id="confirm-dialog-title" className="font-bold text-gray-900">{title}</h2>
                            <p id="confirm-dialog-description" className="mt-2 text-sm leading-relaxed text-gray-600">{description}</p>
                        </div>
                    </div>
                    <button type="button" onClick={onCancel} disabled={busy} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50" aria-label="Fechar confirmação"><X className="h-5 w-5" /></button>
                </div>
                <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <button ref={cancelRef} type="button" onClick={onCancel} disabled={busy} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50">Cancelar</button>
                    <button type="button" onClick={onConfirm} disabled={busy} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60">{busy ? 'Aguarde...' : confirmLabel}</button>
                </div>
            </section>
        </div>
    );
}
