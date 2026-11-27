import { ERROR_CODES } from '@dagangai/shared';
import { AppError } from '../lib/errors.js';

const BLOCKED_INPUT_PATTERNS: RegExp[] = [
  /\b(judi\s*online|slot\s*gacor|togel|pinjol\s*ilegal|obat\s*aborsi|narkoba|sabu)\b/i,
  /\b(penipuan|investasi\s*bodong|money\s*laundering|pornografi)\b/i,
  /ignore\s+(all\s+)?previous\s+instructions/i,
];

/**
 * Moderasi input dasar sesuai PRD §10.3 poin 6.
 */
export function assertSafeUserInput(inputs: Array<string | null | undefined>): void {
  for (const text of inputs) {
    if (!text) continue;
    for (const pattern of BLOCKED_INPUT_PATTERNS) {
      if (pattern.test(text)) {
        throw new AppError(
          400,
          ERROR_CODES.CONTENT_POLICY_VIOLATION,
          'Permintaan mengandung topik atau instruksi yang tidak diizinkan oleh kebijakan keamanan konten DagangAI.'
        );
      }
    }
  }
}

/**
 * Mendeteksi placeholder eksplisit seperti [isi harga] atau [Masukkan Kontak] (BR-04).
 */
export function detectPlaceholders(text: string): string[] {
  const matches = text.match(/\[[^\]\n]{2,50}\]/g);
  if (!matches) return [];
  return [...new Set(matches)];
}

/**
 * Menghitung jumlah karakter & kata untuk pratinjau Content Studio.
 */
export function countTextStats(text: string): { char_count: number; word_count: number } {
  const trimmed = text.trim();
  if (!trimmed) return { char_count: 0, word_count: 0 };
  return {
    char_count: trimmed.length,
    word_count: trimmed.split(/\s+/).length,
  };
}

/**
 * Memeriksa apakah teks mengandung kata yang dilarang pengguna.
 */
export function findViolatedAvoidedWords(text: string, avoidedWords: string[]): string[] {
  if (!avoidedWords || avoidedWords.length === 0) return [];
  const lower = text.toLowerCase();
  return avoidedWords.filter((w) => w.trim().length > 0 && lower.includes(w.toLowerCase()));
}

export const HUMAN_REVIEW_NOTICE =
  'Periksa kembali harga, detail produk, dan klaim promosi sebelum dipublikasikan.';
