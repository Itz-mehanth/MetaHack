import { defaultProfile, normalizeProfile, type Profile } from './progression.js';

const KEY = 'handforge.profile.v1';

/** Loads the saved profile; any storage error falls back to a fresh one. */
export function loadProfile(): Profile {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? normalizeProfile(JSON.parse(raw)) : defaultProfile();
  } catch {
    return defaultProfile();
  }
}

export function saveProfile(profile: Profile): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(profile));
  } catch {
    // Private mode or blocked storage: progress lasts for this session only.
  }
}

export function resetProfile(): Profile {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // Ignore: a fresh profile is returned either way.
  }
  return defaultProfile();
}
