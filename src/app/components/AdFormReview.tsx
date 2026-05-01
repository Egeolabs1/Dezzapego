import { MapPin, Tag, FileText, Image as ImageIcon } from 'lucide-react';
import { formatPrice } from '../../lib/formatters';
import { getValidImages, parseCurrencyInput, type AdLocationForm } from '../../lib/adFormHelpers';

type Props = {
    title: string;
    description: string;
    price: string;
    category: string;
    subcategory: string;
    images: string[];
    location: AdLocationForm;
};

export function AdFormReview({ title, description, price, category, subcategory, images, location }: Props) {
    const validImages = getValidImages(images);
    const numericPrice = parseCurrencyInput(price);

    return (
        <div className="space-y-6 rounded-xl border border-gray-200 bg-gray-50/80 p-6">
            <h3 className="text-lg font-semibold text-gray-900">Revisão antes de publicar</h3>
            <p className="text-sm text-gray-600">
                Confira se está tudo certo. Você poderá editar o anúncio depois em &quot;Meus Anúncios&quot;.
            </p>

            <div className="grid gap-4 md:grid-cols-2">
                <div className="flex gap-2 rounded-lg border border-white bg-white p-4 shadow-sm">
                    <Tag className="mt-0.5 h-5 w-5 shrink-0 text-purple-600" />
                    <div>
                        <p className="text-xs font-medium uppercase text-gray-500">Categoria</p>
                        <p className="font-medium text-gray-900">{category || '—'}</p>
                        <p className="mt-1 text-sm text-gray-600">{subcategory || '—'}</p>
                    </div>
                </div>
                <div className="flex gap-2 rounded-lg border border-white bg-white p-4 shadow-sm">
                    <FileText className="mt-0.5 h-5 w-5 shrink-0 text-purple-600" />
                    <div className="min-w-0">
                        <p className="text-xs font-medium uppercase text-gray-500">Preço</p>
                        <p className="text-xl font-bold text-purple-700">{formatPrice(numericPrice)}</p>
                    </div>
                </div>
            </div>

            <div className="rounded-lg border border-white bg-white p-4 shadow-sm">
                <p className="text-xs font-medium uppercase text-gray-500">Título</p>
                <p className="mt-1 font-semibold text-gray-900">{title.trim() || '—'}</p>
            </div>

            <div className="rounded-lg border border-white bg-white p-4 shadow-sm">
                <p className="text-xs font-medium uppercase text-gray-500">Descrição</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">{description.trim() || '—'}</p>
            </div>

            <div className="flex gap-2 rounded-lg border border-white bg-white p-4 shadow-sm">
                <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-purple-600" />
                <div>
                    <p className="text-xs font-medium uppercase text-gray-500">Localização</p>
                    <p className="font-medium text-gray-900">
                        {location.city}, {location.state}
                        {location.neighborhood ? ` — ${location.neighborhood}` : ''}
                    </p>
                    {location.lat != null && location.lng != null && (
                        <p className="mt-1 text-xs text-gray-500">
                            Coordenadas: {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                        </p>
                    )}
                </div>
            </div>

            <div className="rounded-lg border border-white bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center gap-2">
                    <ImageIcon className="h-5 w-5 text-purple-600" />
                    <p className="text-xs font-medium uppercase text-gray-500">Fotos ({validImages.length})</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    {validImages.map((url, i) => (
                        <div key={url} className="relative">
                            <img
                                src={url}
                                alt=""
                                className={`h-20 w-20 rounded-lg border-2 object-cover ${i === 0 ? 'border-purple-600' : 'border-gray-200'}`}
                            />
                            {i === 0 && (
                                <span className="absolute -top-1 -left-1 rounded bg-purple-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                                    Capa
                                </span>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
