import { isOnboarded, useSettings } from '@/lib/settings';
import { Onboarding } from '@/features/onboarding/Onboarding';
import { AppShell } from '@/features/app/AppShell';
import { PartnerView } from '@/features/partner/PartnerView';

/** A partner link looks like `…/?p=<token>#k=<key>`. The key never leaves the
 * fragment, so it is never sent to any server. */
function readShareFromUrl(): { token: string; key: string | null } | null {
  if (typeof window === 'undefined') return null;
  const token = new URLSearchParams(window.location.search).get('p');
  if (!token) return null;
  const hash = window.location.hash;
  return { token, key: hash.startsWith('#k=') ? hash.slice(3) : null };
}

export default function App() {
  // Resolved before any local-DB hook runs: a partner should never get a Cyclo
  // database created on their device.
  const share = readShareFromUrl();
  if (share) return <PartnerView token={share.token} shareKey={share.key} />;
  return <CycloApp />;
}

function CycloApp() {
  const settings = useSettings();

  if (settings === undefined) {
    return (
      <div className="flex min-h-dvh w-full items-center justify-center bg-void">
        <span className="text-display animate-pulse text-2xl font-semibold tracking-tight text-muted">
          Cyclo
        </span>
      </div>
    );
  }

  if (!isOnboarded(settings)) return <Onboarding />;

  return <AppShell settings={settings} />;
}
