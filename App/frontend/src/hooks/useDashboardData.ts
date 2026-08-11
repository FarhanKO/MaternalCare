import { useCallback, useEffect, useState } from 'react';
import { api, type ApiStatus } from '@/lib/api';
import type { Symptom } from '@/data/symptoms';
import { seedReminders, type Reminder } from '@/data/reminders';

const SYMPTOM_FALLBACK: Symptom[] = [
  { id: 'seed-1', name: 'Back ache', intensity: 'mid', daysPresent: 5 },
  { id: 'seed-2', name: 'Heartburn', intensity: 'mild', daysPresent: 1 },
];

