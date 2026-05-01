/**
 * Converte imagens enviadas pelo usuário para WebP no navegador (menor uso de armazenamento).
 * Se o navegador não suportar `canvas.toBlob('image/webp')`, devolve o arquivo original.
 */

const WEBP_QUALITY = 0.82;
/** Maior lado em pixels antes de reduzir (mantém proporção). 0 = não redimensiona. */
const DEFAULT_MAX_EDGE = 2560;

export type ConvertToWebpOptions = {
    quality?: number;
    /** Limite do maior lado; 0 desliga redimensionamento. */
    maxEdge?: number;
};

function sanitizeBasename(name: string): string {
    const base = name.replace(/\.[^.]+$/, '').slice(0, 80);
    const safe = base.replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').toLowerCase();
    return safe || 'imagem';
}

/**
 * Decodifica qualquer formato suportado pelo browser e exporta como WebP quando possível.
 */
export async function convertImageFileToWebp(file: File, options?: ConvertToWebpOptions): Promise<File> {
    const quality = options?.quality ?? WEBP_QUALITY;
    const maxEdge = options?.maxEdge ?? DEFAULT_MAX_EDGE;

    if (file.type === 'image/webp' && maxEdge <= 0) {
        return file;
    }

    let bitmap: ImageBitmap | null = null;
    try {
        try {
            bitmap = await createImageBitmap(file);
        } catch {
            throw new Error('Formato de imagem não suportado. Use JPG ou PNG.');
        }

        let { width, height } = bitmap;
        if (maxEdge > 0 && (width > maxEdge || height > maxEdge)) {
            const scale = maxEdge / Math.max(width, height);
            width = Math.max(1, Math.round(width * scale));
            height = Math.max(1, Math.round(height * scale));
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Não foi possível processar a imagem.');

        ctx.drawImage(bitmap, 0, 0, width, height);

        const blob = await new Promise<Blob | null>((resolve) => {
            canvas.toBlob(resolve, 'image/webp', quality);
        });

        if (!blob || blob.size === 0) {
            return file;
        }

        const base = sanitizeBasename(file.name);
        return new File([blob], `${base}.webp`, {
            type: 'image/webp',
            lastModified: Date.now(),
        });
    } finally {
        bitmap?.close();
    }
}
