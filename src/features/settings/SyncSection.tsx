import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { isSyncConfigured } from '@/lib/env';
import { getUser, signInWithPassphrase, signOut, syncNow } from '@/lib/sync';
import { Button, TextField } from '@/components/ui';

export function SyncSection() {
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isSyncConfigured) void getUser().then(setUser).catch(() => undefined);
  }, []);

  if (!isSyncConfigured) {
    return (
      <section className="glass mt-4 rounded-3xl p-5">
        <p className="text-[12px] uppercase tracking-[0.14em] text-faint">Backup na nuvem</p>
        <p className="mt-3 text-[13px] leading-relaxed text-muted">
          O backup criptografado ainda não está ativado. Todos os seus dados continuam salvos
          somente neste dispositivo.
        </p>
      </section>
    );
  }

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const canSubmit = email.includes('@') && passphrase.trim().length >= 8;

  return (
    <section className="glass mt-4 rounded-3xl p-5">
      <p className="text-[12px] uppercase tracking-[0.14em] text-faint">Backup na nuvem</p>
      <p className="mt-3 text-[13px] leading-relaxed text-muted">
        Opcional. Seus dados são criptografados <strong className="text-ink">neste dispositivo</strong>{' '}
        antes de subir — o servidor guarda apenas texto cifrado que não consegue ler. Use o mesmo
        e-mail e senha para recuperar tudo em outro aparelho. <strong className="text-ink">Nenhum
        e-mail é enviado.</strong>
      </p>

      {!user ? (
        <div className="mt-4 grid gap-3">
          <TextField
            label="E-mail"
            type="email"
            inputMode="email"
            placeholder="voce@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <TextField
            label="Senha do backup"
            type="password"
            placeholder="Escolha uma senha forte"
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            hint="Só você sabe esta senha — é ela que protege e recupera seus dados. Se esquecê-la, o backup não pode ser recuperado, nem por nós."
          />
          <Button
            disabled={busy || !canSubmit}
            onClick={() =>
              void run(async () => {
                const { user: u, isNew } = await signInWithPassphrase(email, passphrase);
                setUser(u);
                const r = await syncNow(passphrase, { overwrite: !isNew });
                setStatus(
                  isNew
                    ? `Backup ativado — ${r.pushed} itens salvos.`
                    : `Backup restaurado — ${r.pulled} itens recuperados.`,
                );
              })
            }
          >
            {busy ? 'Conectando…' : 'Ativar backup'}
          </Button>
        </div>
      ) : (
        <div className="mt-4 grid gap-3">
          <p className="text-[13px] text-muted">
            Conectada como <span className="font-medium text-ink">{user.email}</span>
          </p>
          <TextField
            label="Senha do backup"
            type="password"
            placeholder="Sua senha do backup"
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={busy || passphrase.trim().length < 8}
              onClick={() =>
                void run(async () => {
                  const r = await syncNow(passphrase);
                  setStatus(`Sincronizado — ${r.pushed} enviados, ${r.pulled} recebidos.`);
                })
              }
            >
              {busy ? 'Sincronizando…' : 'Sincronizar agora'}
            </Button>
            <Button
              variant="ghost"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  await signOut();
                  setUser(null);
                  setPassphrase('');
                })
              }
            >
              Sair
            </Button>
          </div>
        </div>
      )}

      {status ? <p className="mt-3 text-[12px]" style={{ color: 'var(--color-ovulatory)' }}>{status}</p> : null}
      {error ? <p className="mt-3 text-[12px]" style={{ color: 'var(--color-menstrual)' }}>{error}</p> : null}
    </section>
  );
}
