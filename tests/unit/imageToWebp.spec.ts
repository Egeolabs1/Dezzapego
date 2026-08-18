// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  prepareImageForUpload,
  convertImageFileToWebp,
  getExifOrientation,
} from '@/lib/imageToWebp';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Helpers ──────────────────────────────────────────

function makeFile(type: string, sizeInBytes: number, name = 'test.jpg'): File {
  const buffer = new Uint8Array(sizeInBytes);
  return new File([buffer], name, { type });
}

function makeFileFromBuffer(type: string, buffer: ArrayBuffer, name: string): File {
  return new File([buffer], name, { type });
}

// ── Mocks ────────────────────────────────────────────

const MOCK_UUID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

let mockCtx: {
  fillStyle: string;
  fillRect: ReturnType<typeof vi.fn>;
  drawImage: ReturnType<typeof vi.fn>;
  save: ReturnType<typeof vi.fn>;
  restore: ReturnType<typeof vi.fn>;
  translate: ReturnType<typeof vi.fn>;
  rotate: ReturnType<typeof vi.fn>;
  scale: ReturnType<typeof vi.fn>;
};

let mockCanvas: {
  width: number;
  height: number;
  getContext: ReturnType<typeof vi.fn>;
  toBlob: ReturnType<typeof vi.fn>;
};

function setupCanvasMock(toBlobSize = 8000) {
  mockCtx = {
    fillStyle: '',
    fillRect: vi.fn(),
    drawImage: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    scale: vi.fn(),
  };

  mockCanvas = {
    width: 0,
    height: 0,
    getContext: vi.fn(() => mockCtx),
    toBlob: vi.fn(
      (
        callback: (blob: Blob | null) => void,
        _type: string,
        _quality: number,
      ) => {
        callback(new Blob([new Uint8Array(toBlobSize)], { type: 'image/webp' }));
      },
    ),
  };
}

function makeMockBitmap(w: number, h: number) {
  return {
    width: w,
    height: h,
    close: vi.fn(),
  } as unknown as ImageBitmap;
}

let createImageBitmapSpy: ReturnType<typeof vi.fn>;
let originalCreateImageBitmap: typeof globalThis.createImageBitmap;

beforeEach(() => {
  setupCanvasMock();

  const origCreate = document.createElement.bind(document);
  vi.spyOn(document, 'createElement').mockImplementation(
    (tag: string, options?: ElementCreationOptions) => {
      if (tag === 'canvas') {
        return mockCanvas as unknown as HTMLCanvasElement;
      }
      return origCreate(tag, options);
    },
  );

  originalCreateImageBitmap = globalThis.createImageBitmap;
  createImageBitmapSpy = vi.fn().mockResolvedValue(makeMockBitmap(200, 200));
  vi.stubGlobal('createImageBitmap', createImageBitmapSpy);

  vi.stubGlobal('crypto', {
    randomUUID: () => MOCK_UUID,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  globalThis.createImageBitmap = originalCreateImageBitmap;
});

// ── 1. Validação de MIME ─────────────────────────────

describe('prepareImageForUpload — Validação de MIME', () => {
  it('rejeita image/gif', async () => {
    const file = makeFile('image/gif', 1000);
    await expect(prepareImageForUpload(file)).rejects.toThrow('não permitido');
  });

  it('rejeita image/svg+xml', async () => {
    const file = makeFile('image/svg+xml', 1000);
    await expect(prepareImageForUpload(file)).rejects.toThrow('não permitido');
  });

  it('rejeita image/bmp', async () => {
    const file = makeFile('image/bmp', 1000);
    await expect(prepareImageForUpload(file)).rejects.toThrow('não permitido');
  });

  it('rejeita MIME vazio', async () => {
    const file = makeFile('', 1000);
    await expect(prepareImageForUpload(file)).rejects.toThrow('não permitido');
  });
});

// ── 2. Validação de tamanho ──────────────────────────

describe('prepareImageForUpload — Validação de tamanho', () => {
  it('rejeita arquivo de 0 bytes', async () => {
    const file = makeFile('image/jpeg', 0);
    await expect(prepareImageForUpload(file)).rejects.toThrow('vazio');
  });

  it('rejeita arquivo maior que 25 MB', async () => {
    const size26MB = 26 * 1024 * 1024;
    const file = makeFile('image/jpeg', size26MB);
    await expect(prepareImageForUpload(file)).rejects.toThrow('muito grande');
  });
});

// ── 3. Arquivo corrompido ────────────────────────────

describe('prepareImageForUpload — Arquivo corrompido', () => {
  it('lança erro legível quando createImageBitmap falha', async () => {
    createImageBitmapSpy.mockRejectedValueOnce(new Error('decode error'));
    const file = makeFile('image/jpeg', 1000);
    await expect(prepareImageForUpload(file)).rejects.toThrow(
      'Não foi possível ler a imagem',
    );
  });
});

// ── 4. JPEG válido → WebP ────────────────────────────

describe('prepareImageForUpload — JPEG → WebP', () => {
  it('retorna arquivo .webp com type image/webp e nome UUID', async () => {
    const file = makeFile('image/jpeg', 5000, 'foto.jpg');
    const result = await prepareImageForUpload(file);
    expect(result.file.name).toBe(`${MOCK_UUID}.webp`);
    expect(result.file.type).toBe('image/webp');
  });
});

// ── 5. PNG válido → WebP ─────────────────────────────

describe('prepareImageForUpload — PNG → WebP', () => {
  it('retorna arquivo .webp com type image/webp e nome UUID', async () => {
    const file = makeFile('image/png', 5000, 'foto.png');
    const result = await prepareImageForUpload(file);
    expect(result.file.name).toBe(`${MOCK_UUID}.webp`);
    expect(result.file.type).toBe('image/webp');
  });

  it('preenche fundo branco no canvas para PNGs (padrão)', async () => {
    const file = makeFile('image/png', 5000, 'foto.png');
    await prepareImageForUpload(file);
    expect(mockCtx.fillStyle).toBe('#FFFFFF');
    expect(mockCtx.fillRect).toHaveBeenCalled();
  });
});

// ── 5b. Transparência PNG ────────────────────────────

describe('prepareImageForUpload — preserveTransparency', () => {
  it('NÃO preenche fundo branco quando preserveTransparency=true', async () => {
    const file = makeFile('image/png', 5000, 'logo.png');
    await prepareImageForUpload(file, { preserveTransparency: true });
    expect(mockCtx.fillStyle).not.toBe('#FFFFFF');
    expect(mockCtx.fillRect).not.toHaveBeenCalled();
  });

  it('preenche fundo branco quando preserveTransparency=false (padrão)', async () => {
    const file = makeFile('image/png', 5000, 'logo.png');
    await prepareImageForUpload(file, { preserveTransparency: false });
    expect(mockCtx.fillStyle).toBe('#FFFFFF');
    expect(mockCtx.fillRect).toHaveBeenCalled();
  });

  it('preserveTransparency não afeta JPEG (fundo branco nunca preenchido para JPEG)', async () => {
    const file = makeFile('image/jpeg', 5000, 'foto.jpg');
    await prepareImageForUpload(file, { preserveTransparency: true });
    // JPEGs nunca recebem fillRect independente da opção
    expect(mockCtx.fillRect).not.toHaveBeenCalled();
  });

  it('preserveTransparency não afeta o output — continua sendo WebP válido', async () => {
    const file = makeFile('image/png', 5000, 'arte.png');
    const result = await prepareImageForUpload(file, { preserveTransparency: true });
    expect(result.file.type).toBe('image/webp');
    expect(result.file.name).toMatch(/\.webp$/);
  });
});

// ── 6. Entrada WebP ──────────────────────────────────

describe('prepareImageForUpload — Entrada WebP', () => {
  it('retorna WebP com nome UUID quando entrada já é WebP', async () => {
    const file = makeFile('image/webp', 5000, 'foto.webp');
    const result = await prepareImageForUpload(file);
    expect(result.file.type).toBe('image/webp');
    expect(result.file.name).toMatch(/\.webp$/);
  });
});

// ── 7. Redimensiona imagem grande ────────────────────

describe('prepareImageForUpload — Redimensionamento', () => {
  it('redimensiona de 200x200 para 100x100 com maxEdge=100', async () => {
    createImageBitmapSpy.mockResolvedValueOnce(makeMockBitmap(200, 200));
    const file = makeFile('image/jpeg', 5000);
    const result = await prepareImageForUpload(file, { maxEdge: 100 });
    expect(result.width).toBe(100);
    expect(result.height).toBe(100);
    expect(result.wasResized).toBe(true);
  });
});

// ── 8. Imagem pequena sem redimensionamento ──────────

describe('prepareImageForUpload — Sem redimensionamento', () => {
  it('imagem 50x50 com maxEdge=2560 não é redimensionada', async () => {
    createImageBitmapSpy.mockResolvedValueOnce(makeMockBitmap(50, 50));
    const file = makeFile('image/jpeg', 5000);
    const result = await prepareImageForUpload(file, { maxEdge: 2560 });
    expect(result.wasResized).toBe(false);
    expect(result.width).toBe(50);
    expect(result.height).toBe(50);
  });
});

// ── 9. Dimensões no resultado ────────────────────────

describe('prepareImageForUpload — Dimensões no resultado', () => {
  it('width e height correspondem ao esperado após redimensionamento', async () => {
    createImageBitmapSpy.mockResolvedValueOnce(makeMockBitmap(400, 300));
    const file = makeFile('image/jpeg', 5000);
    const result = await prepareImageForUpload(file, { maxEdge: 200 });
    expect(result.width).toBe(200);
    expect(result.height).toBe(150);
  });
});

// ── 10. Razão de compressão ──────────────────────────

describe('prepareImageForUpload — Razão de compressão', () => {
  it('compressionRatio é uma string percentual', async () => {
    const file = makeFile('image/jpeg', 10000);
    const result = await prepareImageForUpload(file);
    expect(result.compressionRatio).toMatch(/^\d+%$/);
  });
});

// ── 11. Tamanho original rastreado ───────────────────

describe('prepareImageForUpload — Tamanho original', () => {
  it('originalSize corresponde ao tamanho do arquivo de entrada', async () => {
    const file = makeFile('image/jpeg', 10000);
    const result = await prepareImageForUpload(file);
    expect(result.originalSize).toBe(10000);
  });
});

// ── 12. Compatibilidade retro convertImageFileToWebp ─

describe('convertImageFileToWebp — Compatibilidade retro', () => {
  it('retorna um File (não o objeto result)', async () => {
    const file = makeFile('image/jpeg', 5000, 'legacy.jpg');
    const output = await convertImageFileToWebp(file);
    expect(output).toBeInstanceOf(File);
    expect(output.name).toMatch(/\.webp$/);
    expect(output.type).toBe('image/webp');
  });
});

// ── 13. EXIF Orientation (parsing direto) ────────────

describe('getExifOrientation — Parsing EXIF direto', () => {
  function loadFixture(name: string): ArrayBuffer {
    const fixturePath = resolve(__dirname, '..', 'fixtures', name);
    const buf = readFileSync(fixturePath);
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  }

  it('retorna 6 para JPEG com orientation 6', () => {
    const buffer = loadFixture('exif-orientation-6.jpg');
    expect(getExifOrientation(buffer)).toBe(6);
  });

  it('retorna 3 para JPEG com orientation 3', () => {
    const buffer = loadFixture('exif-orientation-3.jpg');
    expect(getExifOrientation(buffer)).toBe(3);
  });

  it('retorna 1 para JPEG com orientation 1 (normal)', () => {
    const buffer = loadFixture('exif-orientation-1.jpg');
    expect(getExifOrientation(buffer)).toBe(1);
  });

  it('retorna 1 para buffer que não é JPEG', () => {
    const buffer = new ArrayBuffer(100);
    expect(getExifOrientation(buffer)).toBe(1);
  });

  it('retorna 1 para buffer vazio demais', () => {
    const buffer = new ArrayBuffer(2);
    expect(getExifOrientation(buffer)).toBe(1);
  });

  it('retorna 1 para JPEG sem EXIF', () => {
    // JPEG mínimo: SOI + DQT + SOF + DHT + SOS + scan + EOI
    // Sem APP1/EXIF
    const buf = Buffer.from([
      0xff, 0xd8, // SOI
      0xff, 0xe0, 0x00, 0x10, // APP0 (JFIF)
      0x4a, 0x46, 0x49, 0x46, 0x00, // JFIF\0
      0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00,
      0xff, 0xd9, // EOI
    ]);
    const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
    expect(getExifOrientation(ab)).toBe(1);
  });
});

// ── 14. prepareImageForUpload com EXIF ───────────────

describe('prepareImageForUpload — EXIF Orientation Integration', () => {
  it('JPEG com EXIF orientation 1 produz WebP válido', async () => {
    const buffer = loadFixtureForTest('exif-orientation-1.jpg');
    const file = makeFileFromBuffer('image/jpeg', buffer, 'plain.jpg');
    const result = await prepareImageForUpload(file);
    expect(result.file.type).toBe('image/webp');
    expect(result.width).toBeGreaterThan(0);
    expect(result.height).toBeGreaterThan(0);
  });

  it('JPEG com EXIF orientation 6 produz WebP válido', async () => {
    const buffer = loadFixtureForTest('exif-orientation-6.jpg');
    const file = makeFileFromBuffer('image/jpeg', buffer, 'rotated.jpg');
    const result = await prepareImageForUpload(file);
    expect(result.file.type).toBe('image/webp');
    expect(result.file.name).toMatch(/\.webp$/);
    expect(result.finalSize).toBeGreaterThan(0);
  });

  it('JPEG com EXIF orientation 3 produz WebP válido', async () => {
    const buffer = loadFixtureForTest('exif-orientation-3.jpg');
    const file = makeFileFromBuffer('image/jpeg', buffer, 'upside-down.jpg');
    const result = await prepareImageForUpload(file);
    expect(result.file.type).toBe('image/webp');
    expect(result.file.name).toMatch(/\.webp$/);
    expect(result.finalSize).toBeGreaterThan(0);
  });
});

function loadFixtureForTest(name: string): ArrayBuffer {
  const fixturePath = resolve(__dirname, '..', 'fixtures', name);
  const buf = readFileSync(fixturePath);
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

// ── 15. EXIF Transformação (fixtures não-quadradas 40x20) ──

describe('prepareImageForUpload — EXIF Transformação 40x20', () => {
  // Fixtures 40x20: createImageBitmap retorna 40x20 (pixel dims).
  // getOrientedDimensions troca para 20x40 nas orientações 6 e 8.

  it('orientation 1 (40x20) → saída 40x20 (sem rotação)', async () => {
    const buffer = loadFixtureForTest('exif-orientation-1-40x20.jpg');
    const file = makeFileFromBuffer('image/jpeg', buffer, 'orient1.jpg');
    createImageBitmapSpy.mockResolvedValueOnce(makeMockBitmap(40, 20));
    const result = await prepareImageForUpload(file);
    expect(result.width).toBe(40);
    expect(result.height).toBe(20);
    expect(result.file.type).toBe('image/webp');
  });

  it('orientation 3 (40x20) → saída 40x20 (180°, dims不变)', async () => {
    const buffer = loadFixtureForTest('exif-orientation-3-40x20.jpg');
    const file = makeFileFromBuffer('image/jpeg', buffer, 'orient3.jpg');
    createImageBitmapSpy.mockResolvedValueOnce(makeMockBitmap(40, 20));
    const result = await prepareImageForUpload(file);
    expect(result.width).toBe(40);
    expect(result.height).toBe(20);
    // Canvas deve ter aplicado save + translate + rotate + restore
    expect(mockCtx.save).toHaveBeenCalled();
    expect(mockCtx.translate).toHaveBeenCalledWith(40, 20);
    expect(mockCtx.rotate).toHaveBeenCalledWith(Math.PI);
    expect(mockCtx.restore).toHaveBeenCalled();
  });

  it('orientation 6 (40x20) → saída 20x40 (90°CW, dims swapped)', async () => {
    const buffer = loadFixtureForTest('exif-orientation-6-40x20.jpg');
    const file = makeFileFromBuffer('image/jpeg', buffer, 'orient6.jpg');
    createImageBitmapSpy.mockResolvedValueOnce(makeMockBitmap(40, 20));
    const result = await prepareImageForUpload(file);
    // 90° CW: width=origH=20, height=origW=40
    expect(result.width).toBe(20);
    expect(result.height).toBe(40);
    expect(result.file.type).toBe('image/webp');
    // Canvas deve ter sido criado com dims swapped
    expect(mockCanvas.width).toBe(20);
    expect(mockCanvas.height).toBe(40);
    // Transformação: translate(20, 0) + rotate(PI/2)
    expect(mockCtx.translate).toHaveBeenCalledWith(20, 0);
    expect(mockCtx.rotate).toHaveBeenCalledWith(Math.PI / 2);
  });

  it('orientation 8 (40x20) → saída 20x40 (270°CW, dims swapped)', async () => {
    const buffer = loadFixtureForTest('exif-orientation-8-40x20.jpg');
    const file = makeFileFromBuffer('image/jpeg', buffer, 'orient8.jpg');
    createImageBitmapSpy.mockResolvedValueOnce(makeMockBitmap(40, 20));
    const result = await prepareImageForUpload(file);
    // 270° CW: width=origH=20, height=origW=40
    expect(result.width).toBe(20);
    expect(result.height).toBe(40);
    expect(mockCanvas.width).toBe(20);
    expect(mockCanvas.height).toBe(40);
    // Transformação: translate(0, 40) + rotate(-PI/2)
    expect(mockCtx.translate).toHaveBeenCalledWith(0, 40);
    expect(mockCtx.rotate).toHaveBeenCalledWith(-Math.PI / 2);
  });
});
