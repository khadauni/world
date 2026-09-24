import { useEffect, useState } from 'react';
import type { WorldModule } from '@/core/types';
import type { WorldShell as WorldShellType } from '@/engine/WorldShell';
import type { Profile } from '@/core/store';
import { Button } from '@/ui/Button';
import { SkyBackground } from '@/ui/SkyBackground';
import { worldById } from '@/worlds/registry';
import { navigate } from '../router';
import styles from './Screens.module.css';

type LoadState =
  | { status: 'loading' }
  | { status: 'ready'; module: WorldModule; Shell: typeof WorldShellType }
  | { status: 'error' };

const LOADING_LINES = ['Fuelling the rocket…', 'Polishing the planets…', 'Waking up your guide…', 'Packing space snacks…'];

/** Code-split world loader with a playful wait screen and an offline-friendly retry. */
export function WorldScreen({ worldId, profile }: { worldId: string; profile: Profile }) {
  const meta = worldById(worldId);
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const [line, setLine] = useState(0);

  useEffect(() => {
    if (!meta?.load) return;
    let cancelled = false;
    setState({ status: 'loading' });
    // The 3D engine (three.js, R3F) and the world are fetched together, only when a world is opened.
    Promise.all([import('@/engine/WorldShell'), meta.load()])
      .then(([engine, module]) => !cancelled && setState({ status: 'ready', module, Shell: engine.WorldShell }))
      .catch(() => !cancelled && setState({ status: 'error' }));
    return () => {
      cancelled = true;
    };
  }, [meta, attempt]);

  useEffect(() => {
    if (state.status !== 'loading') return;
    const t = setInterval(() => setLine((l) => (l + 1) % LOADING_LINES.length), 1400);
    return () => clearInterval(t);
  }, [state.status]);

  if (!meta || meta.status !== 'live' || !meta.load) {
    return (
      <main className={styles.center}>
        <SkyBackground />
        <p className={styles.bigEmoji} aria-hidden="true">
          🛸
        </p>
        <h1>This world is still being built!</h1>
        <Button tone="sun" size="l" onClick={() => navigate({ name: 'hub' })}>
          Back to worlds
        </Button>
      </main>
    );
  }

  if (state.status === 'ready') return <state.Shell meta={meta} module={state.module} profile={profile} />;

  return (
    <main className={styles.center} style={{ background: `radial-gradient(120% 100% at 50% 0%, ${meta.palette.from}, ${meta.palette.to})` }}>
      <SkyBackground planets={false} />
      <div className={styles.loaderOrb} aria-hidden="true">
        <span className="emoji">{meta.emoji}</span>
      </div>
      {state.status === 'loading' ? (
        <p className={styles.loaderText} role="status" aria-live="polite">
          {LOADING_LINES[line]}
        </p>
      ) : (
        <>
          <p className={styles.loaderText} role="alert">
            Hmm, we couldn’t open this world. Check the internet and try again.
          </p>
          <div style={{ display: 'flex', gap: 12 }}>
            <Button tone="paper" onClick={() => navigate({ name: 'hub' })}>
              Back
            </Button>
            <Button tone="sun" onClick={() => setAttempt((a) => a + 1)}>
              Try again
            </Button>
          </div>
        </>
      )}
    </main>
  );
}
