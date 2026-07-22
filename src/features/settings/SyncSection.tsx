import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { isSyncConfigured } from '@/lib/env';
import { getUser, sendLoginCode, signOut, syncNow, verifyLoginCode } from '@/lib/sync';
import { Button, TextField } from '@/components/ui';

export function SyncSection() {
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
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

  return (
    <section className="glass mt-4 rounded-3xl p-5">
      <p className="text-[12px] uppercase tracking-[0.14em] text-faint">Backup na nuvem</p>
      <p className="mt-3 text-[13px] leading-relaxed text-muted">
        Opcional. Seus dados são criptografados <strong className="text-ink">neste dispositivo</strong>{' '}
        antes de subir — o servidor guarda apenas texto cifrado que ele não consegue ler.
      </p>

      {!user ? (
        <div className="mt-4 grid gap-3">
          <TextField
            label="Seu e-mail"
            type="email"
            inputMode="email"
            placeholder="voce@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {codeSent ? (
            <TextField
              label="Código recebido por e-mail"
              inputMode="numeric"
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          ) : null}
          <div className="flex gap-2">
            {!codeSent ? (
              <Button
                disabled={busy || !email.includes('@')}
                onClick={() => void run(async () => {
                  await sendLoginCode(email);
                  setCodeSent(true);
                  setStatus('Código enviado. Confira seu e-mail.');
                })}
              >
                {busy ? 'Enviando…' : 'Enviar código'}
              </Button>
            ) : (
              <Button
                disabled={busy || code.trim().length < 4}
                onClick={() => void run(async () => {
                  setUser(await verifyLoginCode(email, code));
                  setStatus('Conectada com sucesso.');
                })}
              >
                {busy ? 'Entrando…' : 'Entrar'}
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="mt-4 grid gap-3">
          <p className="text-[13px] text-muted">
            Conectada como <span className="font-medium text-ink">{user.email}</span>
          </p>
          <TextField
            label="Senha de criptografia"
            type="password"
            placeholder="Escolha uma senha forte"
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            hint="Só você sabe esta senha. Se perdê-la, os dados na nuvem não podem ser recuperados — nem por nós."
          />
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={busy || passphrase.length < 8}
              onClick={() => void run(async () => {
                const r = await syncNow(passphrase);
                setStatus(`Sincronizado — ${r.pushed} enviados, ${r.pulled} recebidos.`);
              })}
            >
              {busy ? 'Sincronizando…' : 'Sincronizar agora'}
            </Button>
            <Button
              variant="ghost"
              disabled={busy}
              onClick={() => void run(async () => {
                await signOut();
                setUser(null);
                setCodeSent(false);
                setPassphrase('');
              })}
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
