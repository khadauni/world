import { useEffect } from 'react';
import { setSfxEnabled } from '@/core/audio/sfx';
import { stopSpeaking } from '@/core/audio/speech';
import { useReducedMotion } from '@/core/prefs';
import { useActiveProfile, useApp } from '@/core/store';
import { Hub } from './screens/Hub';
import { Parents } from './screens/Parents';
import { Welcome } from './screens/Welcome';
import { WorldScreen } from './screens/WorldScreen';
import { navigate, useRoute } from './router';

export function App() {
  const route = useRoute();
  const profile = useActiveProfile();
  const sound = useApp((s) => s.settings.sound);
  const reducedMotion = useReducedMotion();

  useEffect(() => setSfxEnabled(sound), [sound]);

  useEffect(() => {
    document.documentElement.dataset.reducedMotion = String(reducedMotion);
  }, [reducedMotion]);

  // Stop any narration when the screen changes; keep focus sensible for keyboard/screen-reader users.
  useEffect(() => {
    stopSpeaking();
    window.scrollTo(0, 0);
  }, [route.name]);

  // Kid screens need an explorer; send them to the picker if none is chosen.
  const needsProfile = (route.name === 'hub' || route.name === 'world') && !profile;
  useEffect(() => {
    if (needsProfile) navigate({ name: 'home' }, { replace: true });
  }, [needsProfile]);

  useEffect(() => {
    if (route.name === 'home' && profile) navigate({ name: 'hub' }, { replace: true });
  }, [route.name, profile]);

  if (route.name === 'parents') return <Parents />;
  if (route.name === 'world' && profile) return <WorldScreen key={route.worldId} worldId={route.worldId} profile={profile} />;
  if (route.name === 'hub' && profile) return <Hub profile={profile} />;
  return <Welcome />;
}
