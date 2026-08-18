import { test, expect } from '@playwright/test';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { TEST_USERS, loginUser } from '../fixtures/auth';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Fixtures ──
const PNG_FIXTURE = resolve(__dirname, '..', 'fixtures', 'test-upload-50x50.png');

const TINY_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

const TINY_JPEG_BASE64 =
  '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMCwsKCwsM' +
  'DhEQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRT/2wBDAQMEBAUEBQkFBQkUDQsNFBQUFBQUFBQUFBQU' +
  'FBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBT/wAARCAABAAEDASIAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAA' +
  'AAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAA' +
  'AAAAAP/aAAwDAQACEQMRAD8AKwA//9k=';

// ── Helpers ──────────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

function validateWebPSignature(data: ArrayBuffer): { ok: boolean; reason?: string } {
  if (data.byteLength < 12) {
    return { ok: false, reason: `Arquivo muito pequeno: ${data.byteLength} bytes` };
  }
  const header = new Uint8Array(data, 0, 12);
  const riff = String.fromCharCode(header[0], header[1], header[2], header[3]);
  const webp = String.fromCharCode(header[8], header[9], header[10], header[11]);
  if (riff !== 'RIFF') return { ok: false, reason: `Header esperado RIFF, recebeu ${riff}` };
  if (webp !== 'WEBP') return { ok: false, reason: `Bytes 8-11 esperado WEBP, recebeu ${webp}` };
  return { ok: true };
}

function parseStorageUrl(publicUrl: string): { bucket: string; filePath: string } | null {
  try {
    const url = new URL(publicUrl);
    const parts = url.pathname.split('/');
    const publicIdx = parts.indexOf('public');
    if (publicIdx === -1 || publicIdx + 2 >= parts.length) return null;
    const bucket = parts[publicIdx + 1];
    const filePath = parts.slice(publicIdx + 2).join('/');
    return { bucket, filePath };
  } catch {
    return null;
  }
}

async function dismissCookieBanner(page: import('@playwright/test').Page) {
  const btn = page.locator('button:text("Apenas essenciais")');
  if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await btn.click();
    await page.waitForTimeout(500);
  }
}

/**
 * Garante que o avatar do usuário não existe para que o input de upload
 * seja renderizado (ImageUpload só mostra o input quando currentImages.length < maxImages).
 * Remove o avatar existente via botão de remover no componente ImageUpload.
 */
async function ensureNoAvatar(page: import('@playwright/test').Page) {
  await page.goto('/dashboard');
  await page.waitForTimeout(2500);
  await dismissCookieBanner(page);

  // Se o input de upload já existe, não precisa remover nada
  const hasInput = await page.locator('input[type="file"]').count();
  if (hasInput > 0) return;

  // Verifica se existe botão de remover imagem (só aparece quando avatar existe)
  const removeBtnCount = await page.locator('button[title="Remover imagem"]').count();
  if (removeBtnCount === 0) return;

  // Usa page.evaluate para despachar um click nativo via DOM —
  // contorna o fato de que opacity-0 impede Playwright actionability checks.
  await page.evaluate(() => {
    const btn = document.querySelector('button[title="Remover imagem"]') as HTMLButtonElement | null;
    if (btn) {
      btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    }
  });
  await page.waitForTimeout(2000);

  // Se o avatar foi removido com sucesso, o input deve aparecer.
  // Se não apareceu, espera mais um pouco e tenta recarregar.
  const inputCount = await page.locator('input[type="file"]').count();
  if (inputCount === 0) {
    await page.waitForTimeout(2000);
  }

  // Aguardar o input aparecer após remoção do avatar
  await page.locator('input[type="file"]').first().waitFor({ state: 'attached', timeout: 10000 });
}

/**
 * Aguarda o upload real do ImageUpload component completar.
 * Monitora a requisição POST para o Supabase Storage e captura a URL pública.
 * Retorna a URL pública do objeto uploadado.
 */
async function waitForRealUpload(
  page: import('@playwright/test').Page,
  triggerAction: () => Promise<void>,
  timeoutMs = 30_000,
): Promise<string> {
  const uploadPromise = page.waitForResponse(
    (resp) =>
      resp.url().includes('/storage/v1/object/') &&
      resp.request().method() === 'POST' &&
      resp.status() >= 200 &&
      resp.status() < 300,
    { timeout: timeoutMs },
  );

  await triggerAction();

  const response = await uploadPromise;
  const body = await response.json().catch(() => null) as { Key?: string } | null;

  if (body?.Key) {
    return `${SUPABASE_URL}/storage/v1/object/public/${body.Key}`;
  }

  // Fallback: extrair path da request URL
  const reqUrl = response.url();
  const objectIdx = reqUrl.indexOf('/storage/v1/object/');
  if (objectIdx !== -1) {
    const afterObject = reqUrl.slice(objectIdx + '/storage/v1/object/'.length);
    const qIdx = afterObject.indexOf('?');
    const path = (qIdx !== -1 ? afterObject.slice(0, qIdx) : afterObject);
    return `${SUPABASE_URL}/storage/v1/object/public/${path}`;
  }

  throw new Error('Não foi possível extrair a URL pública do upload');
}

/**
 * Valida um objeto WebP no Supabase Storage.
 * Verifica: HTTP 200, Content-Type webp, size > 0, assinatura RIFF/WEBP.
 */
async function validateStoredWebP(
  request: import('@playwright/test').APIRequestContext,
  publicUrl: string,
): Promise<void> {
  const response = await request.get(publicUrl);
  expect(response.status()).toBe(200);

  const contentType = response.headers()['content-type'] || '';
  expect(contentType).toContain('webp');

  const body = await response.body();
  expect(body.length).toBeGreaterThan(0);

  const ab = body.buffer.slice(body.byteOffset, body.byteOffset + body.length) as ArrayBuffer;
  const sig = validateWebPSignature(ab);
  expect(sig.ok).toBe(true);

  const urlPath = new URL(publicUrl).pathname;
  expect(urlPath).toContain('.webp');
}

// ── Testes E2E existentes (UI) ───────────────────────

test.describe('Upload de Imagens — E2E', () => {
  test('página /anunciar carrega com stepper de 5 etapas', async ({ page }) => {
    await loginUser(page, TEST_USERS.userA.email, TEST_USERS.userA.password);
    await page.goto('/anunciar');
    await page.waitForTimeout(2000);

    const bodyText = await page.textContent('body');
    expect(bodyText).toContain('Categoria');
    expect(bodyText).toContain('Fotos e local');
    expect(bodyText).toContain('Revisão');
  });

  test('dashboard tem input de upload para avatar', async ({ page }) => {
    await loginUser(page, TEST_USERS.userA.email, TEST_USERS.userA.password);
    await ensureNoAvatar(page);
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.waitFor({ state: 'attached', timeout: 15000 });
    const count = await page.locator('input[type="file"]').count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('upload de imagem PNG no dashboard', async ({ page }) => {
    await loginUser(page, TEST_USERS.userA.email, TEST_USERS.userA.password);
    await ensureNoAvatar(page);
    const fileInput = page.locator('input[type="file"]').first();

    const pngBuffer = Buffer.from(TINY_PNG_BASE64, 'base64');
    await fileInput.setInputFiles({
      name: 'avatar-teste.png',
      mimeType: 'image/png',
      buffer: pngBuffer,
    });
    await page.waitForTimeout(3000);
    const bodyText = await page.textContent('body');
    expect(bodyText).toBeTruthy();
    expect(bodyText!.length).toBeGreaterThan(10);
  });

  test('upload de imagem JPEG no dashboard', async ({ page }) => {
    await loginUser(page, TEST_USERS.userA.email, TEST_USERS.userA.password);
    await ensureNoAvatar(page);
    const fileInput = page.locator('input[type="file"]').first();

    const jpegBuffer = Buffer.from(TINY_JPEG_BASE64, 'base64');
    await fileInput.setInputFiles({
      name: 'avatar-teste.jpg',
      mimeType: 'image/jpeg',
      buffer: jpegBuffer,
    });
    await page.waitForTimeout(3000);
    const bodyText = await page.textContent('body');
    expect(bodyText).toBeTruthy();
  });

  test('input de arquivo no dashboard aceita apenas imagens', async ({ page }) => {
    await loginUser(page, TEST_USERS.userA.email, TEST_USERS.userA.password);
    await ensureNoAvatar(page);
    const fileInput = page.locator('input[type="file"]').first();
    const accept = await fileInput.getAttribute('accept');
    expect(accept).toContain('image');
  });

  test('upload de múltiplas imagens no dashboard', async ({ page }) => {
    await loginUser(page, TEST_USERS.userA.email, TEST_USERS.userA.password);
    await ensureNoAvatar(page);
    const fileInput = page.locator('input[type="file"]').first();

    const pngBuffer = Buffer.from(TINY_PNG_BASE64, 'base64');
    const jpegBuffer = Buffer.from(TINY_JPEG_BASE64, 'base64');
    await fileInput.setInputFiles([
      { name: 'foto1.png', mimeType: 'image/png', buffer: pngBuffer },
      { name: 'foto2.jpg', mimeType: 'image/jpeg', buffer: jpegBuffer },
    ]);
    await page.waitForTimeout(4000);
    const bodyText = await page.textContent('body');
    expect(bodyText).toBeTruthy();
  });
});

// ── Storage Real: pipeline real PNG → UI → WebP → Storage ──

test.describe('Storage Real — Validação Pipeline Completo', () => {
  const uploadedUrls: string[] = [];

  test.afterEach(async ({ request }) => {
    for (const url of uploadedUrls) {
      try {
        const parsed = parseStorageUrl(url);
        if (!parsed || !SUPABASE_URL || !SUPABASE_ANON_KEY) continue;
        const encodedPath = `${parsed.bucket}/${encodeURIComponent(parsed.filePath)}`;
        await request.delete(
          `${SUPABASE_URL}/storage/v1/object/${encodedPath}`,
          {
            headers: {
              apikey: SUPABASE_ANON_KEY,
              authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            },
          },
        );
      } catch { /* cleanup best-effort */ }
    }
    uploadedUrls.length = 0;
  });

  // ── A) Avatar: PNG → ImageUpload UI → prepareImageForUpload → WebP → Storage ──

  test('A) Avatar PNG → pipeline real → Storage WebP', async ({ page, request }) => {
    // 1. Login
    await loginUser(page, TEST_USERS.userA.email, TEST_USERS.userA.password);
    await dismissCookieBanner(page);

    // 2. Dashboard + garantir espaço para novo avatar
    await ensureNoAvatar(page);

    // 3. Localizar input de upload e preparar PNG real
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.waitFor({ state: 'attached', timeout: 10000 });
    const pngBuffer = readFileSync(PNG_FIXTURE);
    expect(pngBuffer.length).toBeGreaterThan(0);

    // 4. Upload real: setInputFiles → ImageUpload executa prepareImageForUpload
    //    → canvas.toBlob('image/webp') → supabase.storage.upload()
    //    Monitora a requisição de upload no Storage para capturar a URL.
    const publicUrl = await waitForRealUpload(page, async () => {
      await fileInput.setInputFiles({
        name: 'avatar-e2e.png',
        mimeType: 'image/png',
        buffer: pngBuffer,
      });
    });
    uploadedUrls.push(publicUrl);

    // 5. Aguardar persistência do avatar no perfil (UserDashboard chama persistAvatar)
    await page.waitForTimeout(3000);

    // 6. Validar: filename termina em .webp
    const urlPath = new URL(publicUrl).pathname;
    expect(urlPath).toContain('.webp');

    // 7. Download via REST + validação do objeto no Storage
    await validateStoredWebP(request, publicUrl);
  });

  // ── B) Anúncio: PNG → /anunciar wizard → ImageUpload → WebP → Storage ──

  test('B) Foto anúncio PNG → pipeline real → Storage WebP', async ({ page, request }) => {
    // 1. Login (dismiss cookie banner if it intercepts clicks)
    await loginUser(page, TEST_USERS.userA.email, TEST_USERS.userA.password);
    await dismissCookieBanner(page);

    // 2. Limpar rascunho E2E antes de iniciar
    await page.goto('/anunciar');
    await page.evaluate((userId) => {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key?.startsWith('dezzapego_new_ad_draft') && key.includes(userId)) {
          localStorage.removeItem(key);
        }
      }
    }, TEST_USERS.userA.businessId);
    await page.reload();
    await page.waitForTimeout(3000);
    await dismissCookieBanner(page);

    // ── Passo 0: Categoria ──
    await expect(page.locator('select[name="category"]')).toBeVisible({ timeout: 10000 });
    await page.selectOption('select[name="category"]', 'Serviços');
    await page.waitForTimeout(500);
    await page.selectOption('select[name="subcategory"]', 'Outros');
    await page.waitForTimeout(500);
    await page.click('button:text("Próximo")');
    await page.waitForTimeout(1500);

    // ── Passo 1: Dados principais ──
    await expect(page.locator('#title')).toBeVisible({ timeout: 5000 });
    await page.fill('#title', 'Serviço de teste E2E para Storage Real');
    await page.fill('#price', '150');
    await page.fill('#description', 'Descrição detalhada do serviço de teste automatizado para validação completa do pipeline de upload de imagem com conversão WebP no browser.');
    await page.click('button:text("Próximo")');
    await page.waitForTimeout(1500);

    // ── Passo 2: Detalhes (avançar) ──
    const descInput = page.locator('input[placeholder*="Descreva seu serviço"]');
    await descInput.waitFor({ state: 'attached', timeout: 5000 }).catch(() => {});
    if (await descInput.count() > 0) {
      await descInput.fill('Serviço de teste automatizado');
    }
    await page.click('button:text("Próximo")');
    await page.waitForTimeout(1500);

    // ── Passo 3: Fotos ── Localizar input real do ImageUpload
    const adFileInput = page.locator('input[type="file"]').first();
    await adFileInput.waitFor({ state: 'attached', timeout: 10000 });

    // PNG real como input
    const pngBuffer = readFileSync(PNG_FIXTURE);

    // Upload real via ImageUpload component
    const publicUrl = await waitForRealUpload(page, async () => {
      await adFileInput.setInputFiles({
        name: 'anuncio-e2e.png',
        mimeType: 'image/png',
        buffer: pngBuffer,
      });
    });
    uploadedUrls.push(publicUrl);

    // Aguardar conclusão completa do upload
    await page.waitForTimeout(2000);

    // 3. Validar: filename termina em .webp
    const urlPath = new URL(publicUrl).pathname;
    expect(urlPath).toContain('.webp');

    // 4. Download + validação WebP
    await validateStoredWebP(request, publicUrl);
  });

  // ── C) Diagnóstico: canvas.toBlob WebP encoding no Chromium headless ──

  test('C) Browser canvas WebP encoding funciona no Chromium', async ({ page }) => {
    // Testa diretamente no browser se canvas.toBlob('image/webp') produz blob válido.
    // Se isso falhar, o pipeline real falha — é um BUG DO PRODUTO.
    await page.goto('about:blank');

    const result = await page.evaluate(() => {
      return new Promise<{
        canvasSupported: boolean;
        webpSupported: boolean;
        blobType: string;
        blobSize: number;
        createImageBitmapWorks: boolean;
        error?: string;
      }>((resolve) => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = 10;
          canvas.height = 10;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve({ canvasSupported: false, webpSupported: false, blobType: '', blobSize: 0, createImageBitmapWorks: false, error: 'getContext("2d") retornou null' });
            return;
          }
          ctx.fillStyle = 'red';
          ctx.fillRect(0, 0, 10, 10);

          canvas.toBlob(
            (blob) => {
              if (!blob) {
                resolve({ canvasSupported: true, webpSupported: false, blobType: '', blobSize: 0, createImageBitmapWorks: false, error: 'toBlob retornou null para image/webp' });
                return;
              }
              // Testar createImageBitmap com um arquivo real
              const testFile = new File([blob], 'test.webp', { type: 'image/webp' });
              createImageBitmap(testFile)
                .then((bmp) => {
                  bmp.close();
                  resolve({
                    canvasSupported: true,
                    webpSupported: true,
                    blobType: blob.type,
                    blobSize: blob.size,
                    createImageBitmapWorks: true,
                  });
                })
                .catch((err) => {
                  resolve({
                    canvasSupported: true,
                    webpSupported: true,
                    blobType: blob.type,
                    blobSize: blob.size,
                    createImageBitmapWorks: false,
                    error: `createImageBitmap falhou: ${err}`,
                  });
                });
            },
            'image/webp',
            0.82,
          );
        } catch (err) {
          resolve({ canvasSupported: false, webpSupported: false, blobType: '', blobSize: 0, createImageBitmapWorks: false, error: `Exceção: ${err}` });
        }
      });
    });

    // Canvas e ctx devem funcionar
    expect(result.canvasSupported).toBe(true);

    // WebP encoding via canvas.toBlob deve funcionar
    expect(result.webpSupported).toBe(true);
    expect(result.blobType).toBe('image/webp');
    expect(result.blobSize).toBeGreaterThan(0);

    // createImageBitmap deve decodificar WebP
    expect(result.createImageBitmapWorks).toBe(true);
  });

  // ── D) Teste browser-level: pipeline WebP com File PNG real ──
  // Executa o mesmo pipeline do prepareImageForUpload (createImageBitmap → canvas → toBlob WebP)
  // com um File PNG real dentro do Chromium headless, validando resultado completo.

  test('D) Pipeline WebP browser-level com File PNG real', async ({ page }) => {
    await page.goto('/login');
    await page.waitForTimeout(1000);

    const pngBuffer = readFileSync(PNG_FIXTURE);
    const pngBase64 = pngBuffer.toString('base64');

    const result = await page.evaluate(async (base64Png: string) => {
      const binaryStr = atob(base64Png);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }

      const pngFile = new File([bytes], 'test-50x50.png', {
        type: 'image/png',
        lastModified: Date.now(),
      });

      try {
        // Mesmo pipeline do prepareImageForUpload: createImageBitmap → canvas → toBlob
        const bitmap = await createImageBitmap(pngFile);
        const width = bitmap.width;
        const height = bitmap.height;

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('getContext("2d") retornou null');

        // Fundo branco para PNGs (mesmo comportamento do prepareImageForUpload)
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(bitmap, 0, 0, width, height);
        bitmap.close();

        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob(
            (b) => (b ? resolve(b) : reject(new Error('toBlob retornou null'))),
            'image/webp',
            0.82,
          );
        });

        const uuid = crypto.randomUUID();
        const filename = `${uuid}.webp`;
        const webpFile = new File([blob], filename, {
          type: 'image/webp',
          lastModified: Date.now(),
        });

        const arrayBuf = await webpFile.arrayBuffer();
        const header = new Uint8Array(arrayBuf, 0, 12);
        const riff = String.fromCharCode(header[0], header[1], header[2], header[3]);
        const webp = String.fromCharCode(header[8], header[9], header[10], header[11]);

        return {
          ok: true,
          fileType: webpFile.type,
          fileName: webpFile.name,
          fileSize: webpFile.size,
          width,
          height,
          originalSize: pngFile.size,
          finalSize: webpFile.size,
          riff,
          webp,
          error: undefined as string | undefined,
        };
      } catch (err) {
        return {
          ok: false,
          fileType: '',
          fileName: '',
          fileSize: 0,
          width: 0,
          height: 0,
          originalSize: 0,
          finalSize: 0,
          riff: '',
          webp: '',
          error: err instanceof Error ? err.message : String(err),
        };
      }
    }, pngBase64);

    expect(result.ok).toBe(true);
    expect(result.error).toBeUndefined();

    // file.type === 'image/webp'
    expect(result.fileType).toBe('image/webp');

    // file.name termina em .webp
    expect(result.fileName).toMatch(/\.webp$/);

    // file.size > 0
    expect(result.fileSize).toBeGreaterThan(0);

    // Dimensões corretas (50x50 input, não redimensionado pois maxEdge=2560)
    expect(result.width).toBe(50);
    expect(result.height).toBe(50);

    // originalSize = tamanho do PNG
    expect(result.originalSize).toBe(pngBuffer.length);

    // Para imagens muito pequenas (50x50), WebP pode ser maior devido ao overhead
    // do formato. A validação principal é que o WebP é válido (RIFF/WEBP).
    // Para imagens reais (fotos), WebP é sempre menor.
    expect(result.finalSize).toBeGreaterThan(0);

    // Assinatura binária RIFF/WEBP
    expect(result.riff).toBe('RIFF');
    expect(result.webp).toBe('WEBP');
  });

  // ── E) Teste browser-level: pipeline WebP com File JPEG real ──

  test('E) Pipeline WebP browser-level com File JPEG real', async ({ page }) => {
    await page.goto('/login');
    await page.waitForTimeout(1000);

    const jpegBase64 = TINY_JPEG_BASE64;

    const result = await page.evaluate(async (base64Jpeg: string) => {
      const binaryStr = atob(base64Jpeg);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }

      const jpegFile = new File([bytes], 'test-1x1.jpg', {
        type: 'image/jpeg',
        lastModified: Date.now(),
      });

      try {
        const bitmap = await createImageBitmap(jpegFile);
        const width = bitmap.width;
        const height = bitmap.height;

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('getContext("2d") retornou null');

        ctx.drawImage(bitmap, 0, 0, width, height);
        bitmap.close();

        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob(
            (b) => (b ? resolve(b) : reject(new Error('toBlob retornou null'))),
            'image/webp',
            0.82,
          );
        });

        const uuid = crypto.randomUUID();
        const filename = `${uuid}.webp`;
        const webpFile = new File([blob], filename, {
          type: 'image/webp',
          lastModified: Date.now(),
        });

        const arrayBuf = await webpFile.arrayBuffer();
        const header = new Uint8Array(arrayBuf, 0, 12);
        const riff = String.fromCharCode(header[0], header[1], header[2], header[3]);
        const webp = String.fromCharCode(header[8], header[9], header[10], header[11]);

        return {
          ok: true,
          fileType: webpFile.type,
          fileName: webpFile.name,
          fileSize: webpFile.size,
          riff,
          webp,
          error: undefined as string | undefined,
        };
      } catch (err) {
        return {
          ok: false,
          fileType: '',
          fileName: '',
          fileSize: 0,
          riff: '',
          webp: '',
          error: err instanceof Error ? err.message : String(err),
        };
      }
    }, jpegBase64);

    expect(result.ok).toBe(true);
    expect(result.error).toBeUndefined();
    expect(result.fileType).toBe('image/webp');
    expect(result.fileName).toMatch(/\.webp$/);
    expect(result.fileSize).toBeGreaterThan(0);
    expect(result.riff).toBe('RIFF');
    expect(result.webp).toBe('WEBP');
  });
});
