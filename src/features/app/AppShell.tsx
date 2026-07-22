import { useEffect, useState } from 'react';
import { AuroraBackground } from '@/components/AuroraBackground';
import { TabBar, type Tab } from '@/components/nav/TabBar';
import { HomeScreen } from '@/features/home/HomeScreen';
import { CalendarScreen } from '@/features/calendar/CalendarScreen';
import { LogScreen } from '@/features/log/LogScreen';
import { AnalysisScreen } from '@/features/analysis/AnalysisScreen';
import { SettingsScreen } from '@/features/settings/SettingsScreen';
import { useCycleState } from '@/lib/useCycle';
import { PHASE_HEX } from '@/lib/phases';
import type { SettingsRecord } from '@/lib/db';

export function AppShell({ settings }: { settings: SettingsRecord }) {
  const [tab, setTab] = useState<Tab>('home');
  const cycle = useCycleState(settings);

  // Aurora follows today's real phase; Home overrides it while scrubbing.
  useEffect(() => {
    const hex = PHASE_HEX[cycle.status.phase];
    document.documentElement.style.setProperty('--phase', hex.color);
    document.documentElement.style.setProperty('--phase-deep', hex.deep);
  }, [tab, cycle.status.phase]);

  return (
    <div className="relative min-h-dvh w-full">
      <AuroraBackground />
      <div className="mx-auto max-w-md px-6 pb-32 pt-8">
        {tab === 'home' && <HomeScreen settings={settings} cycle={cycle} />}
        {tab === 'calendar' && <CalendarScreen settings={settings} cycle={cycle} />}
        {tab === 'log' && <LogScreen settings={settings} cycle={cycle} />}
        {tab === 'analysis' && <AnalysisScreen settings={settings} cycle={cycle} />}
        {tab === 'settings' && <SettingsScreen settings={settings} />}
      </div>
      <TabBar active={tab} onChange={setTab} />
    </div>
  );
}
