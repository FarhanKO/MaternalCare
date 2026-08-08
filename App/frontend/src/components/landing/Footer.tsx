import { Link } from 'react-router-dom';
import { Activity } from 'lucide-react';

const groups = [
  { title: 'Platform', links: ['Dashboard', 'Pregnancy', 'Child growth', 'AI insight'] },
  { title: 'For care teams', links: ['Doctor portal', 'Caregivers', 'Reports', 'Security'] },
  { title: 'Company', links: ['About', 'Careers', 'Privacy', 'Contact'] },
];

const ROUTES: Record<string, string> = { About: '/about' };

