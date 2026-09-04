import { Activity, CalendarClock, LayoutDashboard, Stethoscope, Users } from 'lucide-react';
import { SectionDock, type DockItem } from '@/components/ui/SectionDock';
import { useT, type TKey } from '@/i18n';

export type MotherTab = 'dashboard' | 'vitals' | 'reminders' | 'care' | 'community';

/**
 * The tabs, with the translation key each label comes from.
 *
 * `labelKey` is a literal on every entry rather than being built from `key` at
 * render time. `t('nav.' + tab)` would work and would also be invisible to
 * both the typechecker and to anyone grepping for where a string is used,
 * which is how translations quietly go stale.
 */
export const MOTHER_TABS: (DockItem<MotherTab> & { labelKey: TKey })[] = [
  { key: 'dashboard', labelKey: 'nav.dashboard', label: 'Dashboard', icon: LayoutDashboard, hint: 'Today at a glance' },
  { key: 'vitals', labelKey: 'nav.vitals', label: 'Vitals', icon: Activity, hint: 'Trends & measurements' },
  { key: 'reminders', labelKey: 'nav.reminders', label: 'Reminders', icon: CalendarClock, hint: 'Appointments & symptoms' },
  { key: 'care', labelKey: 'nav.doctor', label: 'Doctor', icon: Stethoscope, hint: 'Request and message a doctor' },
  { key: 'community', labelKey: 'nav.community', label: 'Community', icon: Users, hint: 'Mothers & doctors' },
];

interface Props {
  active: MotherTab;
  onChange: (tab: MotherTab) => void;
  badges?: Partial<Record<MotherTab, number>>;
}

/** Section switcher for the mother portal — brand blue. */
export function MotherTabs({ active, onChange, badges }: Props) {
  const { t } = useT();
  const items = MOTHER_TABS.map((item) => ({ ...item, label: t(item.labelKey) }));

  return (
    <SectionDock
      items={items}
      active={active}
      onChange={onChange}
      badges={badges}
      accent="brand"
      layoutId="motherTabPill"
    />
  );
}
