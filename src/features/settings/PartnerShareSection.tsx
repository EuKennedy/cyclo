import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui';
import { HeartIcon } from '@/components/icons';
import type { SettingsRecord } from '@/lib/db';
import {
  buildSharePayload,
  buildShareUrl,
  createPartnerShare,
  revokePartnerShare,
  SHARE_DAYS,
} from '@/lib/partnerShare';

export function PartnerShareSection({
  settings,
  lastStart,
}: {
  settings: SettingsRecord;
  lastStart: Date;
}) {
  const share = settings.partnerShare ?? null;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const url = share ? buildShareUrl(share) : null;

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Não consegui copiar. Selecione o link e copie manualmente.');
    }
  };

  return (
    <section className="glass mt-4 rounded-3xl p-5">
      <div className="flex items-center gap-2">
        <HeartIcon width={16} height={16} style={{ color: 'var(--color-luteal)' }} />
        <p className="text-[12px] uppercase tracking-[0.14em] text-faint">Compartilhar com o parceiro</p>
      </div>

      {!share ? (
        <>
          <p className="mt-3 text-[13px] leading-relaxed text-muted">
            Gere um link para ele acompanhar em que fase você está e{' '}
            <strong className="text-ink">como te apoiar</strong>. Ele vê só um resumo — seus
            sintomas, humor e anotações <strong className="text-ink">nunca</strong> são
            compartilhados.
          </p>
          <Button
            className="mt-4 w-full"
            disabled={busy}
            onClick={() =>
              void run(async () => {
                await createPartnerShare(buildSharePayload(settings, lastStart));
              })
            }
          >
            {busy ? 'Gerando…' : 'Gerar link para o parceiro'}
          </Button>
        </>
      ) : (
        <>
          <p className="mt-3 text-[13px] leading-relaxed text-muted">
            Link ativo. Expira em{' '}
            <strong className="text-ink">
              {format(parseISO(share.expiresAt), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </strong>
            .
          </p>

          <p className="mt-3 break-all rounded-xl bg-white/[0.04] p-3 text-[11.5px] leading-relaxed text-faint">
            {url}
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <Button className="flex-1" onClick={() => void copy()}>
              {copied ? 'Copiado ✓' : 'Copiar link'}
            </Button>
            {typeof navigator !== 'undefined' && 'share' in navigator ? (
              <Button
                variant="ghost"
                onClick={() =>
                  void navigator
                    .share({ title: 'Meu Cyclo', url: url ?? '' })
                    .catch(() => undefined)
                }
              >
                Enviar
              </Button>
            ) : null}
          </div>

          <button
            type="button"
            disabled={busy}
            onClick={() =>
              void run(async () => {
                if (!window.confirm('Revogar o link? Ele para de funcionar imediatamente.')) return;
                await revokePartnerShare(share);
              })
            }
            className="mt-3 w-full rounded-2xl border py-3 text-[13.5px] font-semibold transition active:scale-[0.98] disabled:opacity-40"
            style={{
              borderColor: 'color-mix(in srgb, var(--color-menstrual) 45%, transparent)',
              color: 'var(--color-menstrual)',
            }}
          >
            {busy ? 'Revogando…' : 'Revogar link agora'}
          </button>
        </>
      )}

      <p className="mt-3 text-[11.5px] leading-relaxed text-faint">
        O link vale {SHARE_DAYS} dias e você pode revogá-lo quando quiser. A chave que abre o resumo
        viaja só no endereço do link — o servidor guarda apenas texto cifrado que não consegue ler.
      </p>

      {error ? (
        <p className="mt-3 text-[12px]" style={{ color: 'var(--color-menstrual)' }}>
          {error}
        </p>
      ) : null}
    </section>
  );
}
