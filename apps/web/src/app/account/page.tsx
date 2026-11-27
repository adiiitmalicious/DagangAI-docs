'use client';

import { LogOut } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/FormFields';
import { useToast } from '@/components/ui/Toast';
import { apiFetch, ApiClientError } from '@/lib/api-client';
import { AuthGuard, useAuth } from '@/lib/auth-context';

export default function AccountPage() {
  const { user, refreshMe, logout } = useAuth();
  const { showToast } = useToast();

  const [fullName, setFullName] = useState('');
  const [savingName, setSavingName] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (user?.full_name) {
      setFullName(user.full_name);
    }
  }, [user?.full_name]);

  const handleSaveName = async (e: FormEvent) => {
    e.preventDefault();
    setSavingName(true);
    try {
      await apiFetch('/me', {
        method: 'PATCH',
        body: { full_name: fullName.trim() },
      });
      await refreshMe();
      showToast('Nama akun berhasil diperbarui.', 'success');
    } catch (err) {
      showToast(
        err instanceof ApiClientError ? err.message : 'Gagal memperbarui profil akun.',
        'error'
      );
    } finally {
      setSavingName(false);
    }
  };

  const handleSavePassword = async (e: FormEvent) => {
    e.preventDefault();
    setSavingPassword(true);
    try {
      await apiFetch('/me/password', {
        method: 'PATCH',
        body: {
          current_password: currentPassword,
          new_password: newPassword,
        },
      });
      setCurrentPassword('');
      setNewPassword('');
      showToast('Kata sandi berhasil diperbarui.', 'success');
    } catch (err) {
      showToast(
        err instanceof ApiClientError ? err.message : 'Gagal memperbarui kata sandi.',
        'error'
      );
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <AuthGuard requireBusiness={false}>
      <AppShell pageTitle="Pengaturan Akun">
        <div className="max-w-2xl space-y-6">
          <section className="rounded-[12px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-5 shadow-[var(--shadow-card)]">
            <h2 className="font-heading text-[17px] font-semibold text-[var(--text-primary)]">
              Informasi Akun
            </h2>
            <form onSubmit={handleSaveName} className="mt-4 space-y-4">
              <Input
                label="Nama Lengkap"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
              <Input
                label="Email"
                value={user?.email ?? ''}
                disabled
                helperText="Email digunakan untuk masuk dan tidak dapat diubah."
              />
              <Button type="submit" variant="primary" isLoading={savingName}>
                Simpan Perubahan
              </Button>
            </form>
          </section>

          <section className="rounded-[12px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-5 shadow-[var(--shadow-card)]">
            <h2 className="font-heading text-[17px] font-semibold text-[var(--text-primary)]">
              Ubah Kata Sandi
            </h2>
            <form onSubmit={handleSavePassword} className="mt-4 space-y-4">
              <Input
                label="Kata Sandi Saat Ini"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
              <Input
                label="Kata Sandi Baru"
                type="password"
                placeholder="Minimal 8 karakter"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
              <Button type="submit" variant="secondary" isLoading={savingPassword}>
                Perbarui Kata Sandi
              </Button>
            </form>
          </section>

          <section className="rounded-[12px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-5 shadow-[var(--shadow-card)]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-heading text-[16px] font-semibold text-[var(--text-primary)]">
                  Keluar dari Sesi
                </h2>
                <p className="text-[13px] text-[var(--text-secondary)]">
                  Akhiri sesi aktif Anda di perangkat ini.
                </p>
              </div>
              <Button
                variant="danger"
                leftIcon={<LogOut className="h-4 w-4" />}
                onClick={logout}
              >
                Keluar
              </Button>
            </div>
          </section>
        </div>
      </AppShell>
    </AuthGuard>
  );
}
