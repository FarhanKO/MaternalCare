import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

export interface Profile {
  name: string;
  /** data URL of the uploaded photo, or null to fall back to initials */
  avatar: string | null;
  bio: string;
}

interface ProfileValue extends Profile {
  initials: string;
  setAvatar: (dataUrl: string | null) => void;
  setBio: (bio: string) => void;
  setName: (name: string) => void;
}

const DEFAULT: Profile = {
  name: 'Aisha Rahman',
  avatar: null,
  bio: '',
};

const Ctx = createContext<ProfileValue | null>(null);

