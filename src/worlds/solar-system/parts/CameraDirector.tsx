import { OrbitControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef, type ComponentRef } from 'react';
import { Euler, Matrix4, Quaternion, Vector3, type PerspectiveCamera } from 'three';
import type { AgeBand, FlowPhase, WorldActions } from '@/core/types';
import { bezierPoint, bezierTangent, createFlight, damp, easeInOut, planFlight, rocketStretch, smoothstep } from '../flight';
import {
  BODIES,
  FEATURES,
  HERO,
  STOP_IDS,
  fitDistance,
  fitView,
  framingDirection,
  freeFraction,
  isBodyId,
  lensShiftPx,
  orbitAngle,
  overviewDir,
  safeFrame,
  stageBasis,
  sunViewYaw,
  taskFraming,
  tiltAxis,
  type BodyId,
  type FitPoint,
  type StageBasis,
} from '../layout';
import { latLonDir } from '../shaders/mars';
import { useSolar } from '../state';
import { spinToFace } from '../tasks/geometry';

type Mode = 'overview' | 'travel' | 'hero' | 'task';

function modeFor(phase: FlowPhase): Mode {
  if (phase === 'travel') return 'travel';
  if (phase === 'task') return 'task';
  if (phase === 'explore' || phase === 'quiz' || phase === 'reward') return 'hero';
  return 'overview';
}

// Scratch objects (never allocate per frame).
const UP = new Vector3(0, 1, 0);
const heroDir = new Vector3();
const taskDir = new Vector3();
const heroCam = new Vector3();
const taskCam = new Vector3();
const taskLook = new Vector3();
const parking = new Vector3();
const desired = new Vector3();
const desiredLook = new Vector3();
const tangent = new Vector3();
const chase = new Vector3();
const chaseLook = new Vector3();
const dirH = new Vector3();
const side = new Vector3();
const toCam = new Vector3();
const hover = new Vector3();
const tmp = new Vector3();
const euler = new Euler();
const qTmp = new Quaternion();
const heroBasis: StageBasis = { right: new Vector3(), up: new Vector3(), fwd: new Vector3() };
const overview = { target: new Vector3(), distance: 50 };
const fitPoints: FitPoint[] = STOP_IDS.map(() => ({ p: new Vector3(), r: 1 }));
const ORIGIN = new Vector3();
const INNER = ['mercury', 'venus', 'earth', 'mars'] as const;
const camRight = new Vector3();
const featureDir = new Vector3();
const MAT = new Matrix4();

/** Where the rocket parks in a close-up, in units of the framed radius (x right, y up, z toward camera). */
const PARK = { x: 1.12, y: -0.5, z: 0.45 } as const;
const PARK_TASK: readonly [number, number, number] = [1.5, -0.62, 0.1];
/** Rocket size on the overview map (world units) — big enough to spot as a "you are here" marker. */
const MAP_ROCKET = 2.4;

export function CameraDirector({
  phase,
  stopId,
  band,
  reducedMotion,
  actions,
}: {
  phase: FlowPhase;
  stopId: string | null;
  band: AgeBand;
  reducedMotion: boolean;
  actions: WorldActions;
}) {
  const sys = useSolar();
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const size = useThree((s) => s.size);
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);

  const st = useRef({
    phase: null as FlowPhase | null,
    stopId: null as string | null,
    first: true,
    look: new Vector3(),
    flight: createFlight(),
    flightActive: false,
    elapsed: 0,
    t: 1,
    startScale: 1,
    arrived: true,
    settled: false,
    shift: 0,
    lastShift: Number.NaN,
    lastW: 0,
    lastH: 0,
    focus: null as BodyId | null,
    parkedScale: 1,
    introT: 0,
    sunYaw: 0,
    launched: false,
  });

  useEffect(() => {
    if (controls.current) controls.current.enabled = false;
    return () => camera.clearViewOffset();
  }, [camera]);

  useFrame((_, delta) => {
    const s = st.current;
    // Generous clamp: on slow devices big moves skip ahead instead of crawling.
    const dt = Math.min(delta, 0.25);
    const mode = modeFor(phase);
    const focus: BodyId | null = isBodyId(stopId) ? stopId : null;
    const W = size.width;
    const H = size.height;
    const aspect = W / Math.max(1, H);
    const fov = camera.fov;
    const entered = phase !== s.phase || stopId !== s.stopId;
    s.phase = phase;
    s.stopId = stopId;
    if (entered && focus === 'sun' && (phase === 'travel' || s.first)) {
      s.sunYaw = sunViewYaw(INNER.map((id) => orbitAngle(id, sys.clock)));
    }
    const yawBase = focus === 'sun' ? s.sunYaw : 0;
    s.introT += dt;

    // ---------------------------------------------------------------- framings for the focused stop
    let heroDist = 10;
    let fitR = 1;
    let taskFitR = 1;
    if (focus) {
      const b = BODIES[focus];
      const pos = sys.positions[focus];
      const hero = HERO[focus];
      framingDirection(focus, pos, hero.yaw + yawBase, hero.pitch, heroDir);
      fitR = b.radius * hero.fit;
      heroDist = fitDistance(fitR, fov, aspect, freeFraction(safeFrame('explore', focus, H), H) * 0.8, 0.7);
      heroCam.copy(pos).addScaledVector(heroDir, heroDist);
      stageBasis(heroDir, heroBasis);
      parking
        .copy(pos)
        .addScaledVector(heroBasis.right, PARK.x * fitR)
        .addScaledVector(heroBasis.up, PARK.y * fitR)
        .addScaledVector(heroBasis.fwd, PARK.z * fitR);

      const tf = taskFraming(focus, band);
      framingDirection(focus, pos, tf.yaw + yawBase, tf.pitch, taskDir);
      const taskR = b.radius * tf.fit;
      taskFitR = taskR;
      const taskDist = fitDistance(taskR, fov, aspect, freeFraction(safeFrame('task', focus, H), H) * 0.9, 0.86);
      // Publish the task stage (screen-aligned basis) for the task components.
      const stage = sys.stage;
      stage.origin.copy(pos);
      stageBasis(taskDir, stage);
      taskLook.copy(pos);
      if (tf.look) {
        taskLook
          .addScaledVector(stage.right, tf.look[0] * b.radius)
          .addScaledVector(stage.up, tf.look[1] * b.radius)
          .addScaledVector(stage.fwd, tf.look[2] * b.radius);
      }
      taskCam.copy(taskLook).addScaledVector(taskDir, taskDist);
      stage.quat.setFromRotationMatrix(MAT.makeBasis(stage.right, stage.up, stage.fwd));
      stage.unit = b.radius;
      stage.body = focus;
      if (mode === 'task') {
        const pk = tf.park ?? PARK_TASK;
        parking
          .copy(taskLook)
          .addScaledVector(stage.right, pk[0] * taskR)
          .addScaledVector(stage.up, pk[1] * taskR)
          .addScaledVector(stage.fwd, pk[2] * taskR);
      }
    }
    // Rocket size scales with what's framed, so it reads the same on screen next to Mercury or Jupiter.
    const parkedScale = !focus ? MAP_ROCKET : mode === 'task' ? Math.max(0.1, Math.min(fitR * 0.3, taskFitR * 0.4)) : Math.max(0.12, fitR * 0.3);

    // ---------------------------------------------------------------- overview framing
    for (let i = 0; i < STOP_IDS.length; i++) {
      const id = STOP_IDS[i];
      if (id === undefined) continue;
      const fp = fitPoints[i] as { p: Vector3; r: number };
      fp.p.copy(sys.positions[id]);
      fp.r = id === 'sun' ? BODIES.sun.radius * 1.25 : BODIES[id].radius * 1.4 + 1.6;
    }
    const ovDir = overviewDir(aspect);
    dirH.copy(ovDir);
    if (phase === 'intro' && !reducedMotion) dirH.applyAxisAngle(UP, Math.sin(s.introT * 0.12) * 0.12);
    fitView(fitPoints, dirH, fov, aspect, 0.94, freeFraction(safeFrame(phase === 'intro' ? 'intro' : 'map', null, H), H) * 0.94, overview);

    // ---------------------------------------------------------------- phase transitions
    const ctl = controls.current;
    if (entered) {
      s.settled = false;
      if (ctl) ctl.enabled = false;
      if (mode === 'travel' && focus) {
        // Turn the planet so its famous feature swings into view just as we arrive.
        const feature = FEATURES[focus];
        if (feature) {
          tiltAxis(focus, sys.positions[focus], tmp);
          qTmp.setFromAxisAngle(tmp, BODIES[focus].tilt);
          sys.spin[focus] = spinToFace(latLonDir(feature.lat, feature.lon, featureDir), heroDir, qTmp) - feature.lead;
        }
        sys.rocket.home = focus;
        s.startScale = sys.rocket.scale;
        planFlight(sys.rocket.pos, parking, ORIGIN, BODIES.sun.radius * 1.55, s.flight);
        s.elapsed = 0;
        s.t = 0;
        s.launched = false;
        s.flightActive = true;
        s.arrived = false;
        s.parkedScale = parkedScale;
        if (reducedMotion) {
          s.t = 1;
          s.flightActive = false;
          sys.rocket.pos.copy(parking);
          sys.rocket.scale = parkedScale;
          camera.position.copy(heroCam);
          s.look.copy(sys.positions[focus]);
          camera.lookAt(s.look);
          s.arrived = true;
          actions.arrive();
        }
      }
    }
    if (s.first) {
      s.first = false;
      // Opening shot: start on the rocket waiting beside Earth (home!), then pull out to the whole system.
      sys.rocket.pos.copy(sys.positions.earth).add(tmp.set(3, 0.8, 0));
      sys.rocket.scale = MAP_ROCKET;
      if (reducedMotion) {
        camera.position.copy(overview.target).addScaledVector(dirH, overview.distance);
        s.look.copy(overview.target);
      } else {
        s.look.copy(sys.rocket.pos).lerp(sys.positions.earth, 0.5);
        camera.position.copy(s.look).addScaledVector(ovDir, 14).add(tmp.set(0, 1.5, 0));
      }
      camera.lookAt(s.look);
    }

    // ---------------------------------------------------------------- rocket + camera per mode
    const r = sys.rocket;
    let k = 2.4;
    let driveCamera = true;
    if (mode === 'travel' && focus && s.flightActive) {
      // The flight runs on real time: a struggling device arrives on schedule instead of crawling.
      s.elapsed += Math.min(delta, 10);
      const windup = 0.35;
      if (!s.launched && s.elapsed >= windup) {
        s.launched = true;
        actions.sfx('launch');
      }
      s.t = Math.min(1, Math.max(0, (s.elapsed - windup) / s.flight.duration));
      const e = easeInOut(s.t);
      bezierPoint(s.flight, e, r.pos);
      bezierTangent(s.flight, Math.min(0.999, Math.max(0.001, e)), tangent);
      qTmp.setFromUnitVectors(UP, tangent);
      r.quat.slerp(qTmp, damp(8, dt));
      r.scale = s.startScale + (s.parkedScale - s.startScale) * e;
      r.stretch = reducedMotion ? 1 : rocketStretch(s.t, s.elapsed);
      r.throttle.value = s.elapsed < windup ? 0.5 + s.elapsed : 0.45 + 0.55 * Math.sin(Math.PI * Math.min(1, s.t * 1.2));
      r.flying = s.t > 0 && s.t < 0.97;
      r.speed = r.flying ? Math.sin(Math.PI * s.t) : 0;
      // Chase camera: behind and a little above/beside the rocket, looking ahead.
      dirH.copy(s.flight.p3).sub(s.flight.p0).setY(0);
      if (dirH.lengthSq() < 1e-6) dirH.set(1, 0, 0);
      dirH.normalize();
      side.crossVectors(UP, dirH).normalize();
      const sc = Math.max(r.scale, 0.3);
      chase
        .copy(r.pos)
        .addScaledVector(dirH, -(3.2 * sc + 1.4))
        .addScaledVector(UP, 1.1 * sc + 0.5)
        .addScaledVector(side, 0.9 * sc);
      chaseLook.copy(r.pos).addScaledVector(dirH, 1.5 * sc);
      const w = smoothstep(0.52, 1, s.t);
      desired.copy(chase).lerp(heroCam, w);
      desiredLook.copy(chaseLook).lerp(sys.positions[focus], w);
      k = s.t < 0.15 ? 2.2 : 3.4;
      if (s.t >= 1) {
        r.flying = false;
        r.speed = 0;
        const close = camera.position.distanceTo(heroCam) < heroDist * 0.05 && s.look.distanceTo(sys.positions[focus]) < heroDist * 0.05;
        if (!s.arrived && (close || s.elapsed > s.flight.duration + 1.9)) {
          s.arrived = true;
          s.flightActive = false;
          actions.arrive();
        }
      }
    } else if (mode === 'hero' || mode === 'task' || (mode === 'travel' && focus)) {
      // Parked beside the planet (also covers a skipped flight).
      s.flightActive = false;
      r.flying = false;
      r.speed = 0;
      const bob = reducedMotion ? 0 : Math.sin(sys.time.value * 1.7) * 0.05 * parkedScale;
      hover.copy(parking).addScaledVector(UP, bob);
      r.pos.lerp(hover, delta > 0.5 ? 1 : damp(mode === 'travel' ? 8 : 3.5, dt));
      r.scale += (parkedScale - r.scale) * damp(4, dt);
      r.stretch += (1 - r.stretch) * damp(6, dt);
      r.throttle.value += (0.22 - r.throttle.value) * damp(3, dt);
      toCam.copy(camera.position).sub(r.pos);
      const spinJoy = phase === 'reward' && !reducedMotion ? sys.time.value * 3 : 0;
      euler.set(0, Math.atan2(toCam.x, toCam.z) + spinJoy, reducedMotion ? 0 : Math.sin(sys.time.value * 1.1) * 0.12 - 0.15);
      r.quat.slerp(qTmp.setFromEuler(euler), damp(4, dt));
      if (focus) {
        if (mode === 'task') {
          desired.copy(taskCam);
          desiredLook.copy(taskLook);
        } else {
          desired.copy(heroCam);
          desiredLook.copy(sys.positions[focus]);
        }
        if (mode === 'hero' && phase === 'explore') {
          if (!s.settled && camera.position.distanceTo(heroCam) < heroDist * 0.04) {
            s.settled = true;
            if (ctl) {
              ctl.target.copy(sys.positions[focus]);
              ctl.minDistance = heroDist * 0.72;
              ctl.maxDistance = heroDist * 1.4;
              const polar = Math.acos(Math.min(1, Math.max(-1, heroDir.y)));
              ctl.minPolarAngle = Math.max(0.2, polar - 0.55);
              ctl.maxPolarAngle = Math.min(Math.PI - 0.2, polar + 0.5);
              const az = Math.atan2(heroDir.x, heroDir.z);
              ctl.minAzimuthAngle = az - 1.3;
              ctl.maxAzimuthAngle = az + 1.3;
              ctl.enableDamping = !reducedMotion;
              ctl.enabled = true;
              ctl.update();
            }
          }
          if (s.settled) driveCamera = false;
        }
      }
    } else {
      // Overview: the rocket hovers beside its current planet like a "you are here" marker.
      s.flightActive = false;
      r.flying = false;
      r.speed = 0;
      const home = r.home;
      const bob = reducedMotion ? 0 : Math.sin(sys.time.value * 2) * 0.25;
      // Beside (not above) its planet, so it never hides under the name tag.
      camRight.setFromMatrixColumn(camera.matrixWorld, 0);
      const reach = home === 'sun' ? BODIES.sun.radius * 1.15 + 2.2 : BODIES[home].radius * 1.5 + 2;
      hover
        .copy(sys.positions[home])
        .addScaledVector(camRight, reach)
        .add(tmp.set(0, 0.8 + bob, 0));
      r.pos.lerp(hover, damp(2.5, dt));
      r.scale += (MAP_ROCKET - r.scale) * damp(3, dt);
      r.stretch += (1 - r.stretch) * damp(6, dt);
      r.throttle.value += (0.3 - r.throttle.value) * damp(3, dt);
      toCam.copy(camera.position).sub(r.pos);
      euler.set(0, Math.atan2(toCam.x, toCam.z), reducedMotion ? 0 : Math.sin(sys.time.value * 1.3) * 0.1);
      r.quat.slerp(qTmp.setFromEuler(euler), damp(4, dt));
      desired.copy(overview.target).addScaledVector(dirH.copy(ovDir), overview.distance);
      if (phase === 'intro' && !reducedMotion) desired.sub(overview.target).applyAxisAngle(UP, Math.sin(s.introT * 0.12) * 0.12).add(overview.target);
      desiredLook.copy(overview.target);
      k = phase === 'intro' ? 0.9 : 1.6;
    }

    // ---------------------------------------------------------------- focus mode
    let focusTarget = 0;
    if (mode === 'hero' || mode === 'task') focusTarget = 1;
    else if (mode === 'travel') focusTarget = s.flightActive ? smoothstep(0.55, 0.92, s.t) : 1;
    if (focus && mode !== 'overview') sys.focus = focus;
    sys.focusMix += (focusTarget - sys.focusMix) * (reducedMotion || delta > 0.5 ? 1 : damp(4, dt));

    if (driveCamera) {
      // A frame slower than half a second can't animate smoothly anyway (or the tab was hidden): just cut.
      const f = reducedMotion || delta > 0.5 ? 1 : damp(k, dt);
      camera.position.lerp(desired, f);
      s.look.lerp(desiredLook, f);
      camera.lookAt(s.look);
    }

    // ---------------------------------------------------------------- HUD-aware lens shift
    const targetShift = lensShiftPx(safeFrame(phase, stopId, H));
    s.shift += (targetShift - s.shift) * (reducedMotion ? 1 : damp(3, dt));
    if (Math.abs(s.shift - s.lastShift) > 0.25 || W !== s.lastW || H !== s.lastH) {
      s.lastShift = s.shift;
      s.lastW = W;
      s.lastH = H;
      camera.setViewOffset(W, H, 0, s.shift, W, H);
    }
  }, -1);

  return <OrbitControls ref={controls} enablePan={false} rotateSpeed={0.55} zoomSpeed={0.6} dampingFactor={0.08} />;
}

