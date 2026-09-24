import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { Mesh } from 'three';
import { StudioLights, Starfield, Tappable } from '@/engine/kit';
import type { WorldContent, WorldModule, WorldRuntimeProps, WorldStop } from '@/core/types';

/** Temporary world used while the real one is being built. Replaced by each world's own module. */
export function makePlaceholder(id: string, stopCount: number, emoji: string, color: string): WorldModule {
  const stops: WorldStop[] = Array.from({ length: stopCount }, (_, i) => ({
    id: `stop-${i + 1}`,
    title: `Stop ${i + 1}`,
    emoji,
    color,
    narration: [`This is stop ${i + 1}.`],
    facts: ['More coming soon!'],
    task: { kind: 'tap-orb', instruction: 'Tap the glowing ball 3 times!' },
    quiz: [
      {
        id: `${id}-q${i}`,
        bands: ['tiny', 'junior', 'senior'],
        prompt: 'Which one is a star?',
        choices: [
          { id: 'sun', label: 'The Sun', emoji: '☀️' },
          { id: 'moon', label: 'The Moon', emoji: '🌙' },
        ],
        answerId: 'sun',
        explain: 'The Sun is a star!',
      },
    ],
  }));
  const content: WorldContent = {
    id,
    guide: { name: 'Cosmo', look: 'astro' },
    intro: ['Hi {name}! This world is being built.'],
    stops,
    outro: ['Great job!'],
    badge: { id: `${id}-badge`, name: 'Explorer', emoji, description: 'You explored it all.' },
  };

  function Scene({ phase, actions }: WorldRuntimeProps) {
    const ref = useRef<Mesh>(null);
    const taps = useRef(0);
    useFrame((_, dt) => {
      if (ref.current) ref.current.rotation.y += dt * 0.6;
    });
    return (
      <>
        <StudioLights />
        <Starfield count={1500} radius={200} />
        <Tappable
          onTap={() => {
            if (phase !== 'task') return;
            taps.current += 1;
            actions.sfx('collect');
            actions.taskProgress(taps.current, 3);
            if (taps.current >= 3) {
              taps.current = 0;
              actions.completeTask();
            }
          }}
        >
          <mesh ref={ref}>
            <icosahedronGeometry args={[1.6, 3]} />
            <meshPhysicalMaterial color={color} roughness={0.35} clearcoat={1} emissive={color} emissiveIntensity={phase === 'task' ? 0.6 : 0.1} />
          </mesh>
        </Tappable>
      </>
    );
  }

  return { content, canvas: { camera: { position: [0, 0, 7] }, background: '#0b0f2e', bloom: { intensity: 0.8, luminanceThreshold: 0.6 } }, Scene };
}
