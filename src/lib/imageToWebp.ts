// ──────────────────────────────────────────────────────
// prepareImageForUpload — Pipeline de imagem WebP
// ──────────────────────────────────────────────────────
// Regra de ouro: NENHUMA imagem fotográfica entra no
// Supabase Storage sem passar por este pipeline.

const WEBP_QUALITY = 0.82;
const DEFAULT_MAX_EDGE = 2560;
const MAX_RAW_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]);

export type PrepareImageOptions = {
  quality?: number;
  maxEdge?: number;
  bucket?: string;
  /** Preserva transparência de PNGs ao converter para WebP.
   *  Quando false (padrão), preenche fundo branco.
   *  Útil para logos e artes de banner. */
  preserveTransparency?: boolean;
};

export type PrepareImageResult = {
  file: File;
  width: number;
  height: number;
  originalSize: number;
  finalSize: number;
  compressionRatio: string;
  wasResized: boolean;
};

// ── Validações pré-conversão ──────────────────────────

function validateMime(file: File): void {
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    throw new Error(
      `Tipo "${file.type || '(vazio)'}" não permitido. Envie JPG, PNG ou WebP.`,
    );
  }
}

function validateSize(file: File): void {
  if (file.size === 0) {
    throw new Error('O arquivo está vazio.');
  }
  if (file.size > MAX_RAW_SIZE_BYTES) {
    const mb = (file.size / (1024 * 1024)).toFixed(1);
    throw new Error(`Arquivo muito grande (${mb} MB). Máximo: 25 MB.`);
  }
}

// ── EXIF Orientation (parsing explícito) ──────────────
// createImageBitmap com `orientation: 'fromImage'` não é
// suportado em todos os browsers. Fazemos parsing manual.

/** Lê EXIF Orientation de um buffer JPEG. Retorna 1 se não encontrar. */
export function getExifOrientation(buffer: ArrayBuffer): number {
  const view = new DataView(buffer);

  // Validar assinatura JPEG: 0xFF 0xD8
  if (view.byteLength < 4 || view.getUint16(0, false) !== 0xFFD8) return 1;

  // Procurar APP1 (EXIF) marker
  let offset = 2;
  while (offset < view.byteLength - 1) {
    const marker = view.getUint16(offset, false);
    offset += 2;

    // APP1 marker = 0xFFE1
    if (marker === 0xFFE1) {
      const length = view.getUint16(offset, false);
      // Validar "Exif\0\0"
      if (
        view.byteLength >= offset + 8 &&
        view.getUint32(offset + 2, false) === 0x45786966 &&
        view.getUint16(offset + 6, false) === 0x0000
      ) {
        const tiffOffset = offset + 8;
        // DataView usa parâmetro littleEndian; byte order MM = big-endian
        const littleEndian = view.getUint16(tiffOffset, false) === 0x4949;
        // IFD offset
        const ifdOffset = view.getUint32(tiffOffset + 4, littleEndian) + tiffOffset;
        if (ifdOffset + 2 <= view.byteLength) {
          const numEntries = view.getUint16(ifdOffset, littleEndian);

          for (let i = 0; i < numEntries; i++) {
            const entryOffset = ifdOffset + 2 + i * 12;
            if (entryOffset + 12 > view.byteLength) break;
            const tag = view.getUint16(entryOffset, littleEndian);
            // Tag 0x0112 = Orientation
            if (tag === 0x0112) {
              return view.getUint16(entryOffset + 8, littleEndian);
            }
          }
        }
      }
      offset += length;
    } else if ((marker & 0xFF00) === 0xFF00) {
      if (offset + 2 > view.byteLength) break;
      const length = view.getUint16(offset, false);
      offset += length;
    } else {
      break;
    }
  }
  return 1;
}

function applyExifOrientation(
  ctx: CanvasRenderingContext2D,
  _bitmap: ImageBitmap,
  orientation: number,
  width: number,
  height: number,
): void {
  // Orientações EXIF: 1=normal, 3=180°, 6=90°CW, 8=270°CW
  // Outras (2,4,5,7) envolvem espelhamento — raramente usadas em fotos
  switch (orientation) {
    case 3: // 180°
      ctx.translate(width, height);
      ctx.rotate(Math.PI);
      break;
    case 6: // 90° clockwise
      ctx.translate(width, 0);
      ctx.rotate(Math.PI / 2);
      break;
    case 8: // 270° clockwise (90° CCW)
      ctx.translate(0, height);
      ctx.rotate(-Math.PI / 2);
      break;
    case 2: // flip horizontal
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
      break;
    case 4: // flip vertical
      ctx.translate(0, height);
      ctx.scale(1, -1);
      break;
    case 5: // transpose
      ctx.translate(width, 0);
      ctx.rotate(Math.PI / 2);
      ctx.scale(-1, 1);
      break;
    case 7: // transverse
      ctx.translate(0, height);
      ctx.rotate(-Math.PI / 2);
      ctx.scale(-1, 1);
      break;
    // case 1: normal — no-op
  }
}

/** Dimensões finais considerando orientação EXIF */
function getOrientedDimensions(
  origW: number,
  origH: number,
  orientation: number,
): { width: number; height: number } {
  if ([6, 7, 8, 5].includes(orientation)) {
    return { width: origH, height: origW };
  }
  return { width: origW, height: origH };
}

// ── Função principal ──────────────────────────────────

export async function prepareImageForUpload(
  file: File,
  options?: PrepareImageOptions,
): Promise<PrepareImageResult> {
  const quality = options?.quality ?? WEBP_QUALITY;
  const maxEdge = options?.maxEdge ?? DEFAULT_MAX_EDGE;
  const preserveTransparency = options?.preserveTransparency ?? false;

  // 1. Validações pré-conversão
  validateMime(file);
  validateSize(file);

  const originalSize = file.size;
  const isAlreadyWebp = file.type === 'image/webp';

  // 2. Ler EXIF orientation (apenas JPEG)
  let exifOrientation = 1;
  if (
    (file.type === 'image/jpeg' || file.type === 'image/jpg') &&
    file.size < MAX_RAW_SIZE_BYTES
  ) {
    try {
      const buffer = await file.arrayBuffer();
      exifOrientation = getExifOrientation(buffer);
    } catch {
      // Se falhar o parsing, assume orientation 1 (normal)
    }
  }

  // 3. Decodificar imagem
  let bitmap: ImageBitmap | null = null;
  try {
    try {
      bitmap = await createImageBitmap(file);
    } catch {
      throw new Error(
        'Não foi possível ler a imagem. Ela pode estar corrompida. Tente outro arquivo.',
      );
    }

    const rawW = bitmap.width;
    const rawH = bitmap.height;

    if (rawW < 10 || rawH < 10) {
      throw new Error(
        `Imagem muito pequena (${rawW}×${rawH}px). Mínimo: 10×10 pixels.`,
      );
    }

    // 4. Dimensões considerando orientação EXIF
    const oriented = getOrientedDimensions(rawW, rawH, exifOrientation);
    let width = oriented.width;
    let height = oriented.height;
    let wasResized = false;

    if (maxEdge > 0 && (width > maxEdge || height > maxEdge)) {
      const scale = maxEdge / Math.max(width, height);
      width = Math.max(1, Math.round(width * scale));
      height = Math.max(1, Math.round(height * scale));
      wasResized = true;
    }

    // 5. Renderizar no canvas
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Não foi possível processar a imagem.');

    // Fundo branco APENAS se NÃO preservar transparência
    if (file.type === 'image/png' && !preserveTransparency) {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
    }

    // Aplicar orientação EXIF no canvas
    if (exifOrientation !== 1) {
      ctx.save();
      applyExifOrientation(ctx, bitmap, exifOrientation, width, height);
    }

    ctx.drawImage(bitmap, 0, 0, width, height);

    if (exifOrientation !== 1) {
      ctx.restore();
    }

    // 6. Converter para WebP
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/webp', quality);
    });

    if (!blob || blob.size === 0) {
      throw new Error(
        'A conversão para WebP falhou. Tente outro arquivo.',
      );
    }

    // 7. Gerar nome UUID
    const uuid = crypto.randomUUID();
    const filename = `${uuid}.webp`;

    const webpFile = new File([blob], filename, {
      type: 'image/webp',
      lastModified: Date.now(),
    });

    // 8. Validação pós-conversão
    if (webpFile.size === 0) {
      throw new Error('A conversão resultou em arquivo vazio.');
    }

    // Se o WebP convertido é MAIOR que o original WebP já existente
    if (isAlreadyWebp && webpFile.size >= originalSize) {
      return {
        file: new File([file], filename, {
          type: 'image/webp',
          lastModified: Date.now(),
        }),
        width: rawW,
        height: rawH,
        originalSize,
        finalSize: originalSize,
        compressionRatio: '0%',
        wasResized: false,
      };
    }

    const compressionRatio =
      originalSize > 0
        ? `${Math.round((1 - webpFile.size / originalSize) * 100)}%`
        : '0%';

    return {
      file: webpFile,
      width,
      height,
      originalSize,
      finalSize: webpFile.size,
      compressionRatio,
      wasResized,
    };
  } finally {
    bitmap?.close();
  }
}

// ── Re-export para compatibilidade ────────────────────

export type ConvertToWebpOptions = {
  quality?: number;
  maxEdge?: number;
};

export async function convertImageFileToWebp(
  file: File,
  options?: ConvertToWebpOptions,
): Promise<File> {
  const result = await prepareImageForUpload(file, options);
  return result.file;
}
