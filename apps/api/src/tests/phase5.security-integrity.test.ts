import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { createApp } from '../app.js';
import { LocalStorageAdapter } from '../storage/adapter.js';
import { MAX_IMAGE_SIZE_BYTES, validateImageBuffer } from '../storage/validation.js';

const app = createApp();

async function withServer(fn: (baseUrl: string) => Promise<void>) {
  const srv = app.listen(0);
  try {
    const addr = srv.address();
    if (!addr || typeof addr === 'string') throw new Error('Invalid address');
    await fn(`http://127.0.0.1:${addr.port}`);
  } finally {
    srv.close();
  }
}

test('T-045 / BR-12: Validasi foto produk/logo (PNG/JPEG/WebP <= 5 MB)', () => {
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
  assert.equal(validateImageBuffer(png).mimeType, 'image/png');

  const jpg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00]);
  assert.equal(validateImageBuffer(jpg).mimeType, 'image/jpeg');

  const webp = Buffer.from('RIFF\x00\x00\x00\x00WEBP', 'ascii');
  assert.equal(validateImageBuffer(webp).mimeType, 'image/webp');

  assert.throws(
    () => validateImageBuffer(Buffer.from('not-an-image')),
    (err: { code?: string; statusCode?: number }) =>
      err.code === 'UNSUPPORTED_MEDIA_TYPE' && err.statusCode === 400
  );

  assert.throws(
    () => validateImageBuffer(Buffer.alloc(MAX_IMAGE_SIZE_BYTES + 1)),
    (err: { code?: string; statusCode?: number }) =>
      err.code === 'FILE_TOO_LARGE' && err.statusCode === 413
  );
});

test('T-043: Storage adapter mencegah path traversal & memverifikasi signed URL', async () => {
  const tmpDir = path.resolve(process.cwd(), '.tmp-test-storage');
  const adapter = new LocalStorageAdapter({
    baseDir: tmpDir,
    signingSecret: 'test-secret-32-chars-minimum-1234',
  });

  await assert.rejects(
    () => adapter.putObject('../../etc/passwd', Buffer.from('x'), 'text/plain'),
    /path traversal/i
  );

  const signed = await adapter.getSignedUrl('businesses/b1/logo/test.png', 60);
  const url = new URL(signed);
  assert.equal(
    adapter.verifySignedToken(
      url.searchParams.get('key')!,
      url.searchParams.get('expires')!,
      url.searchParams.get('sig')!
    ),
    true
  );
  assert.equal(
    adapter.verifySignedToken('businesses/b1/logo/test.png', '1000', 'invalid'),
    false
  );
  await fs.rm(tmpDir, { recursive: true, force: true });
});

test('T-043 / T-044: Endpoint terautentikasi menolak tanpa JWT (401) & format envelope konsisten', async () => {
  await withServer(async (baseUrl) => {
    const protectedEndpoints = [
      '/api/v1/me',
      '/api/v1/business',
      '/api/v1/products',
      '/api/v1/ai/quota',
      '/api/v1/contents',
      '/api/v1/analytics/summary',
      '/api/v1/admin/overview',
    ];

    for (const ep of protectedEndpoints) {
      const res = await fetch(`${baseUrl}${ep}`);
      assert.equal(res.status, 401, `${ep} harus mengembalikan 401`);
      const body = (await res.json()) as {
        success: boolean;
        error: { code: string };
        meta: { request_id: string };
      };
      assert.equal(body.success, false);
      assert.equal(body.error.code, 'UNAUTHORIZED');
      assert.ok(body.meta.request_id.startsWith('req_'));
    }

    const notFound = await fetch(`${baseUrl}/api/v1/does-not-exist`);
    assert.equal(notFound.status, 404);
    const nfBody = (await notFound.json()) as { error: { code: string } };
    assert.equal(nfBody.error.code, 'RESOURCE_NOT_FOUND');
  });
});

test('T-043 / NFR-05: Kunci API LLM tidak pernah terekspos di kode frontend', async () => {
  const webSrcDir = path.resolve(process.cwd(), '../web/src');
  async function walk(dir: string): Promise<string[]> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const files: string[] = [];
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) files.push(...(await walk(full)));
      else if (/\.(ts|tsx)$/.test(e.name)) files.push(full);
    }
    return files;
  }

  const files = await walk(webSrcDir);
  for (const file of files) {
    const content = await fs.readFile(file, 'utf8');
    assert.equal(
      content.includes('GEMINI_API_KEY'),
      false,
      `GEMINI_API_KEY tidak boleh ada di ${file}`
    );
  }
});

test('T-043 / T-044 / T-045: Verifikasi constraint SQL (BR-01, BR-07, BR-09, BR-10, BR-12)', async () => {
  const schemaPath = path.resolve(
    process.cwd(),
    'src/db/migrations/0001_initial_schema.sql'
  );
  const sql = await fs.readFile(schemaPath, 'utf8');

  assert.match(sql, /owner_user_id\s+UUID\s+NOT\s+NULL\s+UNIQUE/i, 'BR-01 1:1');
  assert.match(sql, /chk_ai_logs_credits_only_on_success/i, 'BR-07');
  assert.match(sql, /chk_planner_planned_date/i, 'BR-09 planned');
  assert.match(sql, /chk_planner_published_timestamp/i, 'BR-09 published');
  assert.match(sql, /product_name_snapshot/i, 'BR-10 snapshot');
  assert.match(sql, /file_size_bytes\s*<=\s*5242880/i, 'BR-12 5MB');
});
