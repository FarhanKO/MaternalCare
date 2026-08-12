import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, type LifeStage } from '@/lib/api';

export interface Profile {
  name: string;
  /** data URL of the uploaded photo, or null to fall back to initials */
  avatar: string | null;
  bio: string;
  /** drives which reading, news and questions the app shows */
  stage: LifeStage;
}

interface ProfileValue extends Profile {
  initials: string;
  setAvatar: (dataUrl: string | null) => void;
  setBio: (bio: string) => void;
  setName: (name: string) => void;
  /** persists to the server so the choice survives a reload */
  setStage: (stage: LifeStage) => void;
}

const DEFAULT: Profile = {
  name: 'Aisha Rahman',
  avatar: null,
  bio: '',
  stage: 'pregnant',
};

const Ctx = createContext<ProfileValue | null>(null);

/**
 * Holds the signed-in mother's identity so the avatar, name and bio stay in
 * sync everywhere they appear — header, profile panel and community posts.
 */
export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile>(DEFAULT);

  // hydrate the stage from the server on first load
  useEffect(() => {
    let cancelled = false;
    api.getMe()
      .then((u) => { if (!cancelled && u?.stage) setProfile((p) => ({ ...p, stage: u.stage })); })
      .catch(() => { /* backend offline — keep the default */ });
    return () => { cancelled = true; };
  }, []);

  const value = useMemo<ProfileValue>(() => ({
    ...profile,
    initials: profile.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase(),
    setAvatar: (avatar) => setProfile((p) => ({ ...p, avatar })),
    setBio: (bio) => setProfile((p) => ({ ...p, bio })),
    setName: (name) => setProfile((p) => ({ ...p, name })),
    setStage: (stage) => {
      setProfile((p) => ({ ...p, stage }));
      api.setStage(stage).catch(() => { /* offline — stage still applies this session */ });
    },
  }), [profile]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useProfile() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useProfile must be used inside <ProfileProvider>');
  return ctx;
}

/** Shared avatar — shows the uploaded photo when set, initials otherwise. */
export function ProfileAvatar({ className, textClass }: { className?: string; textClass?: string }) {
  const { avatar, initials, name } = useProfile();
  if (avatar) {
    return <img src={avatar} alt={name} className={`${className} object-cover`} />;
  }
  return <span className={`${className} grid place-items-center ${textClass ?? ''}`}>{initials}</span>;
}
