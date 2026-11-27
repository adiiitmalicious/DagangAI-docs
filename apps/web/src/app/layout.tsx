import type { Metadata } from 'next';
import { Inter, Plus_Jakarta_Sans } from 'next/font/google';
import { ToastProvider } from '@/components/ui/Toast';
import { AuthProvider } from '@/lib/auth-context';
import './globals.css';

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['600', '700'],
  variable: '--font-plus-jakarta',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'DagangAI — Ruang Kerja Pemasaran AI untuk UMKM & Ekonomi Kreatif',
  description:
    'Buat konten promosi kontekstual, desain poster siap unggah, dan atur jadwal pemasaran bisnis Anda dalam satu ruang kerja terpadu.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${plusJakarta.variable} ${inter.variable}`}>
      <body className="min-h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)] antialiased">
        <ToastProvider>
          <AuthProvider>{children}</AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
