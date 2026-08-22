import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Upload, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { prepareImageForUpload } from '../../lib/imageToWebp';

interface ImageUploadProps {
    userId: string;
    onUpload: (url: string) => void;
    onRemove: (url: string) => void;
    onReorder?: (newImages: string[]) => void; // New prop
    currentImages: string[];
    maxImages?: number;
    /** 'ad' mostra orientações extras para anúncios (foto obrigatória, capa, formatos). */
    variant?: 'default' | 'ad';
    /** Bucket Supabase Storage (padrão: anúncios). */
    storageBucket?: string;
    /**
     * Subpasta após userId no path, ex. "verification" → `{userId}/verification/arquivo.webp`
     */
    uploadSubfolder?: string;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export function ImageUpload({
    userId,
    onUpload,
    onRemove,
    onReorder,
    currentImages = [],
    maxImages = 6,
    variant = 'default',
    storageBucket = 'ads',
    uploadSubfolder,
}: ImageUploadProps) {
    const [uploading, setUploading] = useState(false);

    const handleMakeMain = (index: number) => {
        if (index === 0 || !onReorder) return;
        const newImages = [...currentImages];
        const [selectedImage] = newImages.splice(index, 1);
        newImages.unshift(selectedImage);
        onReorder(newImages);
        toast.success('Imagem definida como principal!');
    };

    const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        try {
            const files = Array.from(event.target.files || []);
            if (files.length === 0) return;

            if (currentImages.length + files.length > maxImages) {
                toast.error(`Você pode adicionar no máximo ${maxImages} imagens. Atualmente você tem ${currentImages.length}.`);
                return;
            }

            // Validate sizes
            const validFiles = files.filter(file => file.size <= MAX_FILE_SIZE);
            if (files.length !== validFiles.length) {
                toast.error('Algumas imagens excedem 5MB e serão ignoradas.');
            }

            if (validFiles.length === 0) return;

            setUploading(true);
            let successCount = 0;

            await Promise.all(validFiles.map(async (file) => {
                try {
                    const result = await prepareImageForUpload(file);
                    const webpFile = result.file;

                    const prefix = uploadSubfolder ? `${userId}/${uploadSubfolder}` : userId;
                    const filePath = `${prefix}/${webpFile.name}`;

                    let uploadError: Error | null = null;
                    for (let attempt = 0; attempt < 3; attempt += 1) {
                        const result = await supabase.storage.from(storageBucket).upload(filePath, webpFile, {
                            contentType: 'image/webp',
                            upsert: false,
                        });
                        if (!result.error) { uploadError = null; break; }
                        uploadError = result.error;
                        if (attempt < 2) await new Promise((resolve) => window.setTimeout(resolve, 500 * (attempt + 1)));
                    }
                    if (uploadError) throw uploadError;

                    const { data } = supabase.storage.from(storageBucket).getPublicUrl(filePath);
                    onUpload(data.publicUrl);
                    successCount++;
                } catch (error) {
                    const msg =
                        error instanceof Error
                            ? error.message
                            : 'Erro ao processar/enviar.';
                    console.error('Error uploading file:', file.name, error);
                    toast.error(`${file.name}: ${msg}`);
                }
            }));

            if (successCount > 0) {
                toast.success(`${successCount} imagem(ns) enviada(s)!`);
            }
        } catch (error: unknown) {
            console.error(error);
            toast.error(error instanceof Error ? error.message : 'Erro ao enviar imagens.');
        } finally {
            event.target.value = '';
            setUploading(false);
        }
    };

    const isAd = variant === 'ad';

    return (
        <div className="w-full">
            {isAd && (
                <div className="mb-4 rounded-lg border border-purple-100 bg-purple-50/80 px-4 py-3 text-sm text-purple-900">
                    <p className="font-semibold">Fotos do anúncio</p>
                    <ul className="mt-2 list-inside list-disc space-y-1 text-purple-800/90">
                        <li>
                            É obrigatório enviar <strong>pelo menos 1 foto</strong> (até {maxImages} no total).
                        </li>
                        <li>
                            A <strong>primeira foto</strong> é a capa — clique nela para definir como principal.
                        </li>
                        <li>
                            Envie JPG ou PNG — o site converte para <strong>WebP</strong> (menos espaço) antes de gravar no
                            armazenamento.
                        </li>
                        <li>Máximo {MAX_FILE_SIZE / (1024 * 1024)}MB por arquivo no envio.</li>
                    </ul>
                </div>
            )}
            {currentImages.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                    {currentImages.map((url, index) => (
                        <div
                            key={url}
                            className={`relative aspect-square rounded-lg overflow-hidden border-2 group cursor-pointer transition-all ${index === 0 ? 'border-purple-600 ring-2 ring-purple-100' : 'border-gray-200 hover:border-purple-300'}`}
                            onClick={() => handleMakeMain(index)}
                        >
                            <img
                                src={url}
                                alt={`Upload preview ${index + 1}`}
                                className="w-full h-full object-cover"
                            />
                            {index === 0 && (
                                <div className="absolute top-2 left-2 px-2 py-1 bg-purple-600 text-white text-xs font-bold rounded-full shadow-md z-10">
                                    Principal
                                </div>
                            )}
                            {index !== 0 && (
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                    <span className="text-white font-medium opacity-0 group-hover:opacity-100 bg-black/50 px-3 py-1 rounded-full text-xs pointer-events-none">
                                        Definir como Principal
                                    </span>
                                </div>
                            )}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onRemove(url);
                                }}
                                type="button"
                                className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 focus:outline-none"
                                title="Remover imagem"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {currentImages.length < maxImages && (
                <label
                    htmlFor="image-upload"
                    className={`
            relative flex flex-col items-center justify-center w-full h-32 
            border-2 border-dashed rounded-lg cursor-pointer 
            transition-colors
            ${uploading ? 'bg-gray-50 border-gray-300' : 'bg-gray-50 border-gray-300 hover:bg-gray-100'}
          `}
                >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        {uploading ? (
                            <>
                                <Loader2 className="w-8 h-8 mb-2 text-blue-500 animate-spin" />
                                <p className="text-xs text-gray-500">Convertendo para WebP e enviando…</p>
                            </>
                        ) : (
                            <>
                                <Upload className="w-8 h-8 mb-2 text-gray-400" />
                                <p className="text-sm text-gray-500 font-medium">
                                    Adicionar fotos ({currentImages.length}/{maxImages})
                                </p>
                                <p className="text-xs text-gray-400 mt-1">
                                    Até {MAX_FILE_SIZE / (1024 * 1024)}MB · convertido para WebP
                                </p>
                            </>
                        )}
                    </div>
                    <input
                        id="image-upload"
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={handleUpload}
                        disabled={uploading}
                    />
                </label>
            )}
        </div>
    );
}
