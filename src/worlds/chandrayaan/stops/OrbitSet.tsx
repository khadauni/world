import { Line } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Color, Object3D, Quaternion, Vector3, type Group, type InstancedMesh } from 'three';
import { Glow, Tappable } from '@/engine/kit';
import { RULES } from '../logic/bands';
import type { Shot } from '../logic/camera';
import { faceRotationY, SRIHARIKOTA } from '../logic/geo';
import { advanceAnomaly, apogeeAfter, inPerigeeZone, wrapAngle } from '../logic/orbit';
import { LINES } from '../lines';
import { PointerHand } from '../parts/Marker';
import { Earth, Moon } from '../parts/Planets';
import { ShotCamera } from '../parts/ShotCamera';
import { IntegratedModule } from '../parts/Spacecraft';
import { Particles, type ParticleConfig } from '../parts/Particles';
import { useMission } from '../store';
import { isAfterTask, useCommands, useOnTaskEnd, useOnTaskStart, useTimers, type StopProps } from './common';

const EARTH_R = 1.9;
const RP = 2.75;
const RA0 = 4.3;
const RA_MAX = 9.4;
const DOTS = 110;
const SUN: [number, number, number] = [-0.3, 0.55, 0.8];
const UP = new Vector3(0, 1, 0);

/** Point on the orbit (Earth at the focus, perigee towards −X, motion counter-clockwise from above). */
function orbitPoint(nu: number, ra: number, out: Vector3): Vector3 {
  const a = (RP + ra) / 2;
  const e = (ra - RP) / (ra + RP);
  const r = (a * (1 - e * e)) / (1 + e * Math.cos(nu));
  return out.set(-r * Math.cos(nu), 0, r * Math.sin(nu));
}

function shotFor(ra: number): Shot {
  const b = Math.sqrt(RP * ra);
  return { target: [(ra - RP) / 2, 0, 0.3], dir: [0.05, 0.62, 1], fit: [ra + RP + 1.4, 2 * b * 0.55 + 1.6] };
}

const BURN: ParticleConfig = {
  count: 60,
  mode: 'glow',
  life: 0.9,
  dir: [0, -1, 0],
  spread: 0.35,
  speed: [1.5, 3],
  drag: 1.5,
  size: [0.35, 0.05],
  color: '#ffd27a',
  color2: '#ff5a1f',
  burstSpread: 0.5,
  seed: 8,
};

/**
 * Stop 2 — orbit-raising around Earth. The craft loops a growing dotted ellipse; tapping BOOST while it is
 * inside the glowing perigee zone raises the apogee (the far side swings out, like pumping a swing).
 */
export function OrbitSet(props: StopProps) {
  const { phase, band, quality, reducedMotion, actions, arriving, onArrive } = props;
  const rules = RULES[band].orbit;
  const total = rules.boostsNeeded;
  const timers = useTimers();
  const store = useMission.getState;

  const craft = useRef<Group>(null);
  const dots = useRef<InstancedMesh>(null);
  const perigeeGlow = useRef<Group>(null);
  const nu = useRef(Math.PI);
  const ra = useRef(RA0);
  const raFrom = useRef(RA0);
  const raTo = useRef(RA0);
  const growT = useRef(1);
  const burn = useRef(0);
  const thrust = useRef(0);
  const boosts = useRef(0);
  const misses = useRef(0);
  const inZone = useRef(false);
  const done = useRef(false);
  const [raGoal, setRaGoal] = useState(isAfterTask(phase) ? RA_MAX : RA0);
  const [history, setHistory] = useState<number[]>([]);
  const [puff, setPuff] = useState(0);
  const [assist, setAssist] = useState(false);

  const tmp = useMemo(() => ({ p: new Vector3(), q: new Vector3(), t: new Vector3(), quat: new Quaternion(), o: new Object3D(), gold: new Color('#ffd23f'), blue: new Color('#9fd8ff') }), []);

  useOnTaskStart(phase, () => {
    timers.clear();
    boosts.current = 0;
    misses.current = 0;
    done.current = false;
    raFrom.current = raTo.current = ra.current = RA0;
    growT.current = 1;
    nu.current = Math.PI;
    setRaGoal(RA0);
    setHistory([]);
    setAssist(false);
    store().patch('orbit', { inZone: false, assist: false, busy: false });
    actions.taskProgress(0, total);
  });

  useOnTaskEnd(phase, () => {
    timers.clear();
    store().patch('orbit', { inZone: false, busy: false });
    if (!done.current) {
      done.current = true;
      raFrom.current = ra.current;
      raTo.current = RA_MAX;
      growT.current = 0;
      setRaGoal(RA_MAX);
    }
  });

  function boost() {
    if (phase !== 'task' || done.current || growT.current < 1) return;
    setPuff((n) => n + 1);
    burn.current = 0.7;
    if (inPerigeeZone(nu.current, rules.zoneHalfAngle)) {
      boosts.current += 1;
      const next = apogeeAfter(boosts.current, total, RA0, RA_MAX);
      setHistory((h) => [...h, ra.current]);
      raFrom.current = ra.current;
      raTo.current = next;
      growT.current = 0;
      setRaGoal(next);
      actions.sfx('whoosh');
      actions.taskProgress(boosts.current, total);
      store().patch('orbit', { busy: true });
      if (boosts.current >= total) {
        done.current = true;
        actions.sfx('star');
        actions.say(LINES.orbitDone);
        timers.later(() => actions.completeTask(), 2800);
      } else actions.say(LINES.boostGood);
    } else {
      misses.current += 1;
      burn.current = 0.25;
      actions.sfx('thud');
      if (misses.current >= 2 && !assist) {
        setAssist(true);
        store().patch('orbit', { assist: true });
        actions.say(LINES.boostAssist);
      } else actions.say(LINES.boostMiss);
    }
  }

  useCommands((cmd) => {
    if (cmd.type === 'boost') boost();
  });

  useLayoutEffect(() => {
    const m = dots.current;
    if (!m) return;
    for (let i = 0; i < DOTS; i++) m.setColorAt(i, tmp.blue);
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [tmp]);

  useFrame((state, dt) => {
    const step = Math.min(dt, 0.25);
    const t = state.clock.elapsedTime;
    // Grow the orbit smoothly after a good burn.
    if (growT.current < 1) {
      growT.current = Math.min(1, growT.current + step / 1.2);
      const k = 1 - Math.pow(1 - growT.current, 3);
      ra.current = raFrom.current + (raTo.current - raFrom.current) * k;
      if (growT.current >= 1) store().patch('orbit', { busy: false });
    }
    const zone = inPerigeeZone(nu.current, rules.zoneHalfAngle);
    const slow = phase === 'task' && zone && (assist || rules.alwaysAssist) ? 0.5 : 1;
    const speed = phase === 'task' || phase === 'explore' || phase === 'travel' ? 1 : 0.6;
    if (!reducedMotion || phase === 'task') nu.current = advanceAnomaly(nu.current, step * slow * speed, rules.period, rules.speedup);
    if (zone !== inZone.current) {
      inZone.current = zone;
      if (phase === 'task') store().patch('orbit', { inZone: zone });
    }

    // Craft position + prograde orientation (engine pointing backwards).
    orbitPoint(nu.current, ra.current, tmp.p);
    orbitPoint(nu.current + 0.02, ra.current, tmp.q);
    tmp.t.copy(tmp.q).sub(tmp.p).normalize();
    if (craft.current) {
      craft.current.position.copy(tmp.p);
      tmp.quat.setFromUnitVectors(UP, tmp.t);
      craft.current.quaternion.copy(tmp.quat);
    }
    burn.current = Math.max(0, burn.current - step);
    thrust.current = burn.current > 0 ? 1 : 0;

    // Dotted orbit, with the perigee zone in bigger pulsing gold dots.
    const m = dots.current;
    if (m) {
      const pulse = 1 + Math.sin(t * 5) * 0.18;
      for (let i = 0; i < DOTS; i++) {
        const a = (i / DOTS) * Math.PI * 2;
        const inZ = Math.abs(wrapAngle(a)) <= rules.zoneHalfAngle;
        orbitPoint(a, ra.current, tmp.o.position);
        tmp.o.scale.setScalar(inZ ? 1.9 * pulse : 1);
        tmp.o.updateMatrix();
        m.setMatrixAt(i, tmp.o.matrix);
        m.setColorAt(i, inZ ? tmp.gold : tmp.blue);
      }
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    }
    if (perigeeGlow.current) perigeeGlow.current.scale.setScalar(1 + Math.sin(t * 5) * 0.15);
  });

  const shot = useMemo(() => shotFor(raGoal), [raGoal]);
  const entry = useMemo<Shot>(() => ({ target: [0, 0, 0], dir: [0.4, 0.5, 1], fit: [30, 20] }), []);
  const historyPts = useMemo(
    () =>
      history.map((r) => {
        const pts: [number, number, number][] = [];
        const v = new Vector3();
        for (let i = 0; i <= 90; i++) {
          orbitPoint((i / 90) * Math.PI * 2, r, v);
          pts.push([v.x, v.y, v.z]);
        }
        return pts;
      }),
    [history],
  );
  const showHand = phase === 'task' && (band === 'tiny' || assist);

  return (
    <group>
      <ShotCamera shot={shot} entry={entry} reducedMotion={reducedMotion} smooth={1.3} orbit={phase === 'explore'} onSettled={arriving ? onArrive : undefined} />
      <directionalLight position={[SUN[0] * 30, SUN[1] * 30, SUN[2] * 30]} intensity={2.4} color="#fff2dc" />
      <directionalLight position={[10, -4, -12]} intensity={0.8} color="#8fb6ff" />

      <Earth radius={EARTH_R} sun={SUN} rotationY={faceRotationY(SRIHARIKOTA.lon) + 0.3} detail={quality.detail} spin={reducedMotion ? 0 : 0.015} />
      <group position={[24, 1.5, -16]}>
        <Moon radius={1.2} sun={SUN} detail={0.5} />
      </group>

      {historyPts.map((pts, i) => (
        <Line key={i} points={pts} color="#8fd3ff" lineWidth={1.2} transparent opacity={0.28} dashed dashSize={0.2} gapSize={0.15} />
      ))}
      <instancedMesh ref={dots} args={[undefined, undefined, DOTS]} frustumCulled={false}>
        <sphereGeometry args={[0.055, 8, 6]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
      <group ref={perigeeGlow} position={[-RP, 0, 0]}>
        <Glow color="#ffc93c" scale={1.9} opacity={0.6} />
      </group>

      <group ref={craft}>
        <Tappable onTap={() => boost()} hitRadius={1.3} disabled={phase !== 'task'}>
          <group scale={0.38} rotation={[0, Math.PI / 4, 0]}>
            <IntegratedModule thrust={thrust} />
          </group>
          <Particles config={BURN} trigger={puff} scale={quality.particleScale} position={[0, -0.35, 0]} />
        </Tappable>
      </group>
      {showHand && <PointerHand position={[-RP, 1.1, 0]} scale={1.2} />}
    </group>
  );
}
