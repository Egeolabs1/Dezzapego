import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Upload, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface ImageUploadProps {
    onUpload: (url: string) => void;
    onRemove: (url: string) => void;
    currentImages: string[];
    maxImages?: number;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export function ImageUpload({ onUpload, onRemove, currentImages = [], maxImages = 6 }: ImageUploadProps) {
    const [uploading, setUploading] = useState(false);

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
                    const fileExt = file.name.split('.').pop();
                    const fileName = `${Math.random()}.${fileExt}`;
                    const filePath = `${fileName}`;

                    const { error: uploadError } = await supabase.storage
                        .from('ads')
                        .upload(filePath, file);

                    if (uploadError) throw uploadError;

                    const { data } = supabase.storage.from('ads').getPublicUrl(filePath);
                    onUpload(data.publicUrl);
                    successCount++;
                } catch (error) {
                    console.error('Error uploading file:', file.name, error);
                }
            }));

            if (successCount > 0) {
                toast.success(`${successCount} imagem(ns) enviada(s)!`);
            }
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || 'Erro ao enviar imagens.');
        } finally {
            event.target.value = '';
            setUploading(false);
        }
    };

    return (
        <div className="w-full">
            {currentImages.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                    {currentImages.map((url, index) => (
                        <div key={url} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 group">
                            <img
                                src={url}
                                alt={`Upload preview ${index + 1}`}
                                className="w-full h-full object-cover"
                            />
                            <button
                                onClick={() => onRemove(url)}
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
                                <p className="text-xs text-gray-500">Enviando...</p>
                            </>
                        ) : (
                            <>
                                <Upload className="w-8 h-8 mb-2 text-gray-400" />
                                <p className="text-sm text-gray-500 font-medium">
                                    Adicionar fotos ({currentImages.length}/{maxImages})
                                </p>
                                <p className="text-xs text-gray-400 mt-1">MAX. 5MB</p>
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
