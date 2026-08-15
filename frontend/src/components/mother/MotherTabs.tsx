import { Activity, CalendarClock, LayoutDashboard, Stethoscope, Users } from 'lucide-react';
import { SectionDock, type DockItem } from '@/components/ui/SectionDock';

export type MotherTab = 'dashboard' | 'vitals' | 'reminders' | 'care' | 'community';

export const MOTHER_TABS: DockItem<MotherTab>[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, hint: 'Today at a glance' },
  { key: 'vitals', label: 'Vitals', icon: Activity, hint: 'Trends & measurements' },
  { key: 'reminders', label: 'Reminders', icon: CalendarClock, hint: 'Appointments & symptoms' },
  { key: 'care', label: 'Find care', icon: Stethoscope, hint: 'Request a doctor' },
  { key: 'community', label: 'Community', icon: Users, hint: 'Mothers & doctors' },
];

interface Props {
  active: MotherTab;
  onChange: (tab: MotherTab) => void;
  badges?: Partial<Record<MotherTab, number>>;
}

/** Section switcher for the mother portal — brand blue. */
export function MotherTabs({ active, onChange, badges }: Props) {
  return (
    <SectionDock
      items={MOTHER_TABS}
      active={active}
      onChange={onChange}
      badges={badges}
      accent="brand"
      layoutId="motherTabPill"
    />
  );
}
