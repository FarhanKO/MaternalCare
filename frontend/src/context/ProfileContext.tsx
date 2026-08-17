import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, fileUrl, type LifeStage } from '@/lib/api';

export interface Profile {
  name: string;
  /** URL of the stored photo, or null to fall back to initials */
  avatar: string | null;
  bio: string;
  /** drives which reading, news and questions the app shows */
  stage: LifeStage;
  /** editable clinical basics shown on the profile panel */
  details: { week: number; dueDate: string; bloodGroup: string; age: number };
}

interface ProfileValue extends Profile {
  initials: string;
  /** false until the server has answered, so nothing flashes the default name */
  loaded: boolean;
  setAvatar: (dataUrl: string | null) => void;
  setBio: (bio: string) => void;
  setName: (name: string) => void;
  setStage: (stage: LifeStage) => void;
  setDetail: <K extends keyof Profile['details']>(key: K, value: Profile['details'][K]) => void;
}

/** Shown for the moment before the server answers, and if it never does. */
const DEFAULT: Profile = {
  name: 'Ayesha Rahman',
  avatar: null,
  bio: '',
  stage: 'pregnant',
  details: { week: 26, dueDate: 'Apr 2', bloodGroup: 'B+', age: 28 },
};

const Ctx = createContext<ProfileValue | null>(null);

/**
 * The signed-in mother's identity, kept in step everywhere it appears —
 * header, profile panel, community posts, the doctor's record of her.
 *
 * Every edit is written through to the server. It used to live only here, so
 * a new photo or bio was lost on refresh and the clinician never saw the
 * name the mother had chosen.
 */
export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile>(DEFAULT);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api.getProfile()
      .then((p) => {
        if (cancelled) return;
        setProfile((prev) => ({
          ...prev,
          name: p.name,
          bio: p.bio,
          avatar: p.avatar ? fileUrl(p.avatar) : null,
          stage: (p.stage as LifeStage) ?? prev.stage,
          details: {
            ...prev.details,
            bloodGroup: p.bloodGroup ?? prev.details.bloodGroup,
            age: p.age ?? prev.details.age,
          },
        }));
        setLoaded(true);
      })
      .catch(() => { if (!cancelled) setLoaded(true); /* offline — keep defaults */ });
    return () => { cancelled = true; };
  }, []);

  /**
   * Apply locally first so the UI never lags a keystroke, then persist. On
   * failure the server's copy is pulled back so the screen cannot keep
   * showing an edit that was never saved.
   */
  const push = useCallback(
    (local: Partial<Profile>, patch: Parameters<typeof api.updateProfile>[0]) => {
      setProfile((p) => ({ ...p, ...local }));
      api.updateProfile(patch)
        .then((saved) => setProfile((p) => ({
          ...p,
          name: saved.name,
          bio: saved.bio,
          avatar: saved.avatar ? fileUrl(saved.avatar) : null,
        })))
        .catch(() => {
          api.getProfile()
            .then((p) => setProfile((prev) => ({
              ...prev,
              name: p.name,
              bio: p.bio,
              avatar: p.avatar ? fileUrl(p.avatar) : null,
            })))
            .catch(() => { /* still offline; leave what is on screen */ });
        });
    },
    [],
  );

  const value = useMemo<ProfileValue>(() => ({
    ...profile,
    loaded,
    initials: profile.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase(),

    // the data URL goes to the server; what comes back is a URL to the stored file
    setAvatar: (avatar) => push({ avatar }, { avatar }),
    setBio: (bio) => push({ bio }, { bio }),
    setName: (name) => push({ name }, { name }),

    setDetail: (key, value) => {
      setProfile((p) => ({ ...p, details: { ...p.details, [key]: value } }));
      // week and dueDate are derived from the pregnancy, not stored here
      if (key === 'bloodGroup') api.updateProfile({ bloodGroup: String(value) }).catch(() => {});
      if (key === 'age') api.updateProfile({ age: Number(value) }).catch(() => {});
    },

    setStage: (stage) => {
      setProfile((p) => ({ ...p, stage }));
      api.setStage(stage).catch(() => { /* offline — applies this session */ });
    },
  }), [profile, loaded, push]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useProfile() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useProfile must be used inside <ProfileProvider>');
  return ctx;
}

/** Shared avatar — shows the stored photo when set, initials otherwise. */
export function ProfileAvatar({ className, textClass }: { className?: string; textClass?: string }) {
  const { avatar, initials, name } = useProfile();
  if (avatar) {
    return <img src={avatar} alt={name} className={`${className} object-cover`} />;
  }
  return <span className={`${className} grid place-items-center ${textClass ?? ''}`}>{initials}</span>;
}
