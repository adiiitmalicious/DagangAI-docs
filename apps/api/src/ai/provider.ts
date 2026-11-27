import https from 'node:https';
import { ERROR_CODES } from '@dagangai/shared';
import { AppError } from '../lib/errors.js';

export interface LlmJsonRequest {
  systemPrompt: string;
  userPrompt: string;
  timeoutMs?: number;
}

export interface LlmJsonResponse<T> {
  data: T;
  providerName: string;
  modelName: string;
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  latencyMs: number;
}

export interface LlmProvider {
  generateJson<T>(req: LlmJsonRequest): Promise<LlmJsonResponse<T>>;
}

function extractJsonText(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith('```')) {
    const withoutStart = trimmed.replace(/^```(?:json)?\s*/i, '');
    return withoutStart.replace(/\s*```$/, '').trim();
  }
  return trimmed;
}

function postJsonIpv4(
  url: string,
  payload: unknown,
  timeoutMs: number
): Promise<{ statusCode: number; body: string }> {
  return new Promise((resolve, reject) => {
    const bodyStr = JSON.stringify(payload);
    const req = https.request(
      url,
      {
        method: 'POST',
        family: 4,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(bodyStr),
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode ?? 500,
            body: Buffer.concat(chunks).toString('utf8'),
          });
        });
      }
    );

    req.setTimeout(timeoutMs, () => {
      const err = new Error('LLM request timed out');
      err.name = 'TimeoutError';
      req.destroy(err);
    });

    req.on('error', (err) => reject(err));
    req.write(bodyStr);
    req.end();
  });
}

export class GeminiLlmProvider implements LlmProvider {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly defaultTimeoutMs: number;

  constructor(options?: { apiKey?: string; model?: string; defaultTimeoutMs?: number }) {
    this.apiKey = options?.apiKey ?? process.env.GEMINI_API_KEY ?? '';
    this.model =
      options?.model ?? process.env.GEMINI_MODEL ?? 'gemini-flash-lite-latest';
    this.defaultTimeoutMs =
      options?.defaultTimeoutMs ?? Number(process.env.LLM_TIMEOUT_MS ?? 30_000);
  }

  async generateJson<T>(req: LlmJsonRequest): Promise<LlmJsonResponse<T>> {
    if (!this.apiKey) {
      throw new AppError(
        502,
        ERROR_CODES.AI_PROVIDER_ERROR,
        'Layanan AI belum dikonfigurasi pada server. Kuota harian Anda tidak berkurang.'
      );
    }

    const timeoutMs = Math.min(30_000, req.timeoutMs ?? this.defaultTimeoutMs);
    const startedAt = Date.now();
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      this.model
    )}:generateContent?key=${encodeURIComponent(this.apiKey)}`;

    let httpRes: { statusCode: number; body: string };
    try {
      httpRes = await postJsonIpv4(
        endpoint,
        {
          systemInstruction: {
            parts: [{ text: req.systemPrompt }],
          },
          contents: [
            {
              role: 'user',
              parts: [{ text: req.userPrompt }],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            responseMimeType: 'application/json',
          },
        },
        timeoutMs
      );
    } catch (err: unknown) {
      const name = (err as { name?: string })?.name;
      if (name === 'TimeoutError' || name === 'AbortError') {
        throw new AppError(
          504,
          ERROR_CODES.AI_PROVIDER_TIMEOUT,
          'Layanan AI sedang sibuk atau lambat merespons. Kuota AI Anda tidak berkurang. Silakan coba lagi.'
        );
      }
      throw new AppError(
        502,
        ERROR_CODES.AI_PROVIDER_ERROR,
        'Gagal terhubung ke layanan AI. Kuota harian Anda tidak berkurang. Silakan coba lagi.'
      );
    }

    const latencyMs = Date.now() - startedAt;

    if (httpRes.statusCode < 200 || httpRes.statusCode >= 300) {
      console.error(
        `[Gemini Error] status=${httpRes.statusCode} model=${this.model} body=${httpRes.body.slice(0, 300)}`
      );
      throw new AppError(
        502,
        ERROR_CODES.AI_PROVIDER_ERROR,
        'Layanan AI sedang sibuk. Kuota harian Anda tidak berkurang. Silakan coba lagi.'
      );
    }

    const payload = JSON.parse(httpRes.body) as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
      }>;
      usageMetadata?: {
        promptTokenCount?: number;
        candidatesTokenCount?: number;
      };
    };

    const rawText = payload.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      throw new AppError(
        502,
        ERROR_CODES.AI_PROVIDER_ERROR,
        'Respons layanan AI tidak lengkap. Kuota harian Anda tidak berkurang.'
      );
    }

    try {
      const parsed = JSON.parse(extractJsonText(rawText)) as T;
      return {
        data: parsed,
        providerName: 'google_gemini',
        modelName: this.model,
        estimatedInputTokens:
          payload.usageMetadata?.promptTokenCount ??
          Math.ceil((req.systemPrompt.length + req.userPrompt.length) / 4),
        estimatedOutputTokens:
          payload.usageMetadata?.candidatesTokenCount ?? Math.ceil(rawText.length / 4),
        latencyMs,
      };
    } catch {
      throw new AppError(
        502,
        ERROR_CODES.AI_PROVIDER_ERROR,
        'Format respons AI tidak valid. Kuota harian Anda tidak berkurang.'
      );
    }
  }
}

let cachedProvider: LlmProvider | null = null;

export function getLlmProvider(): LlmProvider {
  if (!cachedProvider) {
    cachedProvider = new GeminiLlmProvider();
  }
  return cachedProvider;
}
