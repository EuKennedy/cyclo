import { isOnboarded, useSettings } from '@/lib/settings';
import { Onboarding } from '@/features/onboarding/Onboarding';
import { AppShell } from '@/features/app/AppShell';

export default function App() {
  const settings = useSettings();

  // Loading local storage.
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
