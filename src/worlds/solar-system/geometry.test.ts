import { describe, expect, it } from 'vitest';
import { Group, PerspectiveCamera, Quaternion, Vector3 } from 'three';
import { turnToFace } from './parts/Facing';
import { stopStatus } from './status';
import { MARS_SITE } from './layout';
import { TUNING } from './tasks/rules';
import { azimuth, capPoints, easeAngle, marsLayout, minSeparation, slerpDir, spinToFace, spreadPhases } from './tasks/geometry';
import { sameSpec, useLabelStore, type LabelSpec } from './labels';

describe('task placement', () => {
  it('spreads targets over the camera-facing cap, never bunched or at the edge', () => {
    for (const n of [1, 2, 3, 5, 8]) {
      const pts = capPoints(n, 0.8, 7);
      expect(pts).toHaveLength(n);
      for (const p of pts) {
        expect(p.length()).toBeCloseTo(1, 6);
        expect(p.angleTo(new Vector3(0, 0, 1))).toBeLessThanOrEqual(0.8 + 1e-6);
      }
      if (n > 1) expect(minSeparation(pts), `n=${n}`).toBeGreaterThan(0.2);
    }
  });

  it('is deterministic for a seed', () => {
    expect(capPoints(4, 0.7, 3)).toEqual(capPoints(4, 0.7, 3));
    expect(spreadPhases(5, 2)).toEqual(spreadPhases(5, 2));
  });

  it('spreads orbit phases around the circle', () => {
    const p = spreadPhases(6, 1);
    for (let i = 1; i < p.length; i++) expect((p[i] as number) - (p[i - 1] as number)).toBeGreaterThan(0.5);
  });

  it('turns a surface feature to face the camera (Great Red Spot, hurricanes)', () => {
    const feature = new Vector3(Math.cos(-0.4), -0.35, Math.sin(-0.4)).normalize();
    const view = new Vector3(0.2, 0.1, 0.97).normalize();
    for (const tiltAngle of [0, 0.05, 0.4]) {
      const tilt = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), tiltAngle);
      const spin = spinToFace(feature, view, tilt);
      const world = feature.clone().applyQuaternion(new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), spin)).applyQuaternion(tilt);
      // Same azimuth as the view in the body's frame → the feature is on the visible hemisphere, centred.
      const local = view.clone().applyQuaternion(tilt.clone().invert());
      const rotated = feature.clone().applyQuaternion(new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), spin));
      expect(Math.cos(azimuth(rotated) - azimuth(local))).toBeCloseTo(1, 6);
      expect(world.dot(view)).toBeGreaterThan(0.6);
    }
  });

  it('starts the Mars rover clear of every rock, with the rocks spread around the framed work site', () => {
    const site = new Vector3(...MARS_SITE).normalize();
    for (const band of ['tiny', 'junior', 'senior'] as const) {
      const { start, rocks } = marsLayout(TUNING['collect-samples'][band].count, site);
      expect(rocks).toHaveLength(TUNING['collect-samples'][band].count);
      // Rover (~0.13 radii long) + rock (~0.1) never overlap, so the child sees it drive out to each one.
      for (const r of rocks) expect(r.angleTo(start), band).toBeGreaterThan(0.2);
      // Every rock stays near the work site the camera frames (fit radius 0.5 body radii).
      for (const r of rocks) expect(r.angleTo(site), band).toBeLessThan(0.45);
      if (rocks.length > 1) expect(minSeparation(rocks), band).toBeGreaterThan(0.12);
      // The rover starts on the near (camera) side of the site, low on the screen.
      expect(start.z).toBeGreaterThan(site.z);
      expect(start.y).toBeLessThan(site.y);
    }
  });

  it('glides moons to their spots the short way round', () => {
    expect(easeAngle(0.1, 0.5, 1)).toBeCloseTo(0.5, 9);
    expect(easeAngle(0.1, 0.5, 0.5)).toBeCloseTo(0.3, 9);
    // From just below 2π to just above 0: a small step forward, not a whole turn backwards.
    expect(easeAngle(6.2, 0.1, 1)).toBeCloseTo(6.2 + (0.1 + 2 * Math.PI - 6.2), 9);
    expect(easeAngle(3, 3, 0.7)).toBe(3);
  });

  it('moves the rover along the planet surface (great circle)', () => {
    const a = new Vector3(0, 0, 1);
    const b = new Vector3(1, 0, 0);
    const out = new Vector3();
    for (const t of [0, 0.25, 0.5, 1]) {
      slerpDir(a, b, t, out);
      expect(out.length()).toBeCloseTo(1, 6);
      expect(out.angleTo(a)).toBeCloseTo((Math.PI / 2) * t, 6);
    }
  });
});

describe('map status', () => {
  it('marks finished stops done, the first unfinished one next, and the rest locked', () => {
    const s = stopStatus(['sun', 'mercury']);
    expect(s.sun).toBe('done');
    expect(s.mercury).toBe('done');
    expect(s.venus).toBe('next');
    expect(s.earth).toBe('locked');
    expect(s.neptune).toBe('locked');
  });

  it('keeps out-of-order finished stops done and open', () => {
    const s = stopStatus(['sun', 'mars']);
    expect(s.mercury).toBe('next');
    expect(s.mars).toBe('done');
    expect(s.venus).toBe('locked');
  });

  it('has no next stop once everything is done', () => {
    const s = stopStatus(['sun', 'mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune']);
    expect(Object.values(s).every((v) => v === 'done')).toBe(true);
  });
});

describe('name tags', () => {
  const spec: LabelSpec = { id: 'a', text: 'Mars', emoji: '🔴', variant: 'next', placement: 'above' };

  it('only re-renders when a tag really changes', () => {
    const { put, remove } = useLabelStore.getState();
    put(spec);
    const first = useLabelStore.getState().labels;
    put({ ...spec });
    expect(useLabelStore.getState().labels).toBe(first);
    put({ ...spec, variant: 'done' });
    expect(useLabelStore.getState().labels.a?.variant).toBe('done');
    remove('a');
    expect(useLabelStore.getState().labels.a).toBeUndefined();
    expect(sameSpec(spec, { ...spec, text: 'Venus' })).toBe(false);
  });
});

describe('camera-facing rings and halos', () => {
  it('face the camera exactly, whatever their parents’ rotation and scale', () => {
    const camera = new PerspectiveCamera();
    camera.position.set(3, 4, 9);
    camera.lookAt(0, 0, 0);
    const stage = new Group();
    stage.quaternion.setFromAxisAngle(new Vector3(0.3, 1, 0.2).normalize(), 1.1);
    stage.scale.setScalar(4.5);
    const target = new Group();
    target.rotation.set(0.4, -0.7, 0.2);
    target.scale.setScalar(1.5);
    const outer = new Group();
    const inner = new Group();
    stage.add(target);
    target.add(outer);
    outer.add(inner);
    turnToFace(outer, inner, camera);
    const got = inner.getWorldQuaternion(new Quaternion());
    const want = camera.getWorldQuaternion(new Quaternion());
    expect(Math.abs(got.dot(want))).toBeCloseTo(1, 6);
  });
});
