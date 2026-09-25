import { describe, expect, it } from 'vitest';
import { AGE_BANDS } from '@/core/types';
import { RULES } from './logic/bands';
import { autopilotWants, createLander, descentProgress, simulate, stepLander, targetDescent } from './logic/landing';
import { advanceAnomaly, anomalyRate, apogeeAfter, ellipseFromApsides, inPerigeeZone, pointOnEllipse, radiusAt, wrapAngle, zoneSeconds } from './logic/orbit';
import { fitDistance, hudFor, hudShiftPx, orbitLimits, usableFraction } from './logic/camera';
import { craterProfile, makeTerrain, valueNoise } from './logic/terrain';
import { faceRotationY, lonLatToPixel, lonLatToVec3, rotateY, SRIHARIKOTA } from './logic/geo';

describe('orbit raising', () => {
  it('builds ellipses with Earth at the focus', () => {
    const el = ellipseFromApsides(2, 6);
    expect(el.a).toBe(4);
    expect(el.e).toBeCloseTo(0.5);
    expect(radiusAt(0, el)).toBeCloseTo(2);
    expect(radiusAt(Math.PI, el)).toBeCloseTo(6);
    const p = pointOnEllipse(Math.PI / 2, el);
    expect(p.x).toBeCloseTo(0);
    expect(p.y).toBeCloseTo(el.a * (1 - el.e * el.e));
  });

  it('moves fastest at perigee', () => {
    expect(anomalyRate(0, 7, 0.5)).toBeGreaterThan(anomalyRate(Math.PI, 7, 0.5));
  });

  it('one full loop takes the configured period', () => {
    let nu = 0;
    let total = 0;
    let t = 0;
    const period = 6;
    while (t < period) {
      const before = nu;
      nu = advanceAnomaly(nu, 1 / 120, period, 0.5);
      total += nu >= before ? nu - before : nu + 2 * Math.PI - before;
      t += 1 / 120;
    }
    expect(total).toBeCloseTo(2 * Math.PI, 1);
  });

  it('gives every band enough time inside the perigee zone to react', () => {
    const minSeconds = { tiny: 2, junior: 0.9, senior: 0.6 } as const;
    for (const band of AGE_BANDS) {
      const o = RULES[band].orbit;
      expect(zoneSeconds(o.zoneHalfAngle, o.period, o.speedup), band).toBeGreaterThan(minSeconds[band]);
    }
  });

  it('checks the zone across the wrap-around', () => {
    expect(wrapAngle(2 * Math.PI - 0.1)).toBeCloseTo(-0.1);
    expect(inPerigeeZone(2 * Math.PI - 0.2, 0.3)).toBe(true);
    expect(inPerigeeZone(Math.PI, 0.3)).toBe(false);
  });

  it('each good boost raises the apogee, and the last one reaches the target', () => {
    const values = [0, 1, 2, 3, 4].map((b) => apogeeAfter(b, 4, 4, 9));
    for (let i = 1; i < values.length; i++) expect(values[i] as number).toBeGreaterThan(values[i - 1] as number);
    expect(values[0]).toBe(4);
    expect(values[4]).toBeCloseTo(9);
  });
});

describe('landing physics', () => {
  it('free fall is a hard landing for manual bands', () => {
    for (const band of ['junior', 'senior'] as const) {
      const s = simulate(RULES[band].landing, () => false);
      expect(s.status, band).toBe('hard');
    }
  });

  it('the autopilot profile always lands softly, in every band', () => {
    for (const band of AGE_BANDS) {
      const rules = RULES[band].landing;
      const s = simulate(rules, (st) => autopilotWants(st, rules), { maxSeconds: 400 });
      expect(s.status, band).toBe('soft');
      expect(s.touchdownSpeed).toBeLessThanOrEqual(rules.safeSpeed);
    }
  });

  it('tiny explorers cannot crash — even without touching anything', () => {
    const rules = RULES.tiny.landing;
    const s = simulate(rules, () => false, { maxSeconds: 400 });
    expect(s.status).toBe('soft');
    expect(s.gate).toBe(rules.gates.length);
  });

  it('tiny gates pass quickly when the child holds', () => {
    const rules = RULES.tiny.landing;
    const idle = simulate(rules, () => false, { maxSeconds: 400 });
    const holding = simulate(rules, () => true, { maxSeconds: 400 });
    expect(holding.status).toBe('soft');
    expect(holding.time).toBeLessThan(idle.time);
  });

  it('a "fall, then brake" senior strategy lands within the fuel budget', () => {
    const rules = RULES.senior.landing;
    const s = simulate(rules, (st) => st.alt < 60 && st.vel < -1.2);
    expect(s.status).toBe('soft');
    expect(s.fuel).toBeGreaterThan(0);
  });

  it('senior fuel runs out if you brake the whole way down', () => {
    const rules = RULES.senior.landing;
    const s = createLander(rules);
    for (let i = 0; i < 30 * 120 && s.status === 'flying'; i++) stepLander(s, { thrust: true, assist: false }, 1 / 120, rules);
    expect(s.fuel).toBe(0);
  });

  it('auto-assist rescues a child who never brakes', () => {
    const rules = RULES.senior.landing;
    const s = simulate(rules, () => false, { assist: true });
    expect(s.status).toBe('soft');
  });

  it('descent profile is gentle near the ground and progress runs 0 → 1', () => {
    expect(Math.abs(targetDescent(0, 2))).toBeLessThan(2);
    expect(Math.abs(targetDescent(100, 2))).toBeGreaterThan(5);
    const rules = RULES.junior.landing;
    const s = createLander(rules);
    expect(descentProgress(s, rules)).toBe(0);
    s.alt = 0;
    expect(descentProgress(s, rules)).toBe(1);
  });

  it('never pushes Vikram back up into the sky', () => {
    const rules = RULES.junior.landing;
    const s = createLander(rules);
    for (let i = 0; i < 600; i++) stepLander(s, { thrust: true, assist: false }, 1 / 60, rules);
    expect(s.alt).toBeLessThanOrEqual(rules.startAlt + 10);
  });
});

describe('camera framing', () => {
  it('pulls back further on portrait screens so the subject still fits', () => {
    const landscape = fitDistance([10, 4], 1280 / 800, 50, usableFraction(800));
    const portrait = fitDistance([10, 4], 768 / 1024, 50, usableFraction(1024));
    expect(portrait).toBeGreaterThan(landscape);
  });

  it('reserves the HUD bands and shifts the image into the free area', () => {
    expect(usableFraction(800)).toBeCloseTo((800 - 410) / 800);
    expect(usableFraction(300)).toBe(0.42);
    expect(hudShiftPx(800)).toBe(55);
    expect(hudShiftPx(300)).toBe(0);
    const [top, bottom] = hudFor('map', 800);
    expect(bottom).toBeGreaterThan(top);
    const [, small] = hudFor('map', 500);
    expect(small).toBeLessThanOrEqual(500 * 0.42);
  });

  it('limits orbiting around the hero angle', () => {
    const lim = orbitLimits({ target: [0, 0, 0], dir: [0, 0, 1], fit: [4, 4] }, 10);
    expect(lim.minAzimuthAngle).toBeLessThan(0);
    expect(lim.maxAzimuthAngle).toBeGreaterThan(0);
    expect(lim.minDistance).toBe(8);
    expect(lim.maxDistance).toBe(13);
  });
});

describe('moon terrain', () => {
  const t = makeTerrain({ seed: 3, size: 60, craters: 40, flats: [{ x: 0, z: 0, r: 4 }] });

  it('keeps the landing spot flat', () => {
    for (const [x, z] of [
      [0, 0],
      [2, 1],
      [-3, 2],
    ] as const)
      expect(Math.abs(t.height(x, z))).toBeLessThan(1e-9);
  });

  it('is deterministic', () => {
    const t2 = makeTerrain({ seed: 3, size: 60, craters: 40, flats: [{ x: 0, z: 0, r: 4 }] });
    expect(t2.height(12.3, -7.1)).toBe(t.height(12.3, -7.1));
    expect(t2.craters.length).toBe(t.craters.length);
  });

  it('craters are bowls with raised rims', () => {
    expect(craterProfile(0)).toBeLessThan(-0.9);
    expect(craterProfile(1)).toBeGreaterThan(0);
    expect(craterProfile(3)).toBeCloseTo(0, 3);
    for (let i = 0; i < 50; i++) {
      const v = valueNoise(i * 0.37, i * 0.91, 1);
      expect(v).toBeGreaterThanOrEqual(-1);
      expect(v).toBeLessThanOrEqual(1);
    }
  });
});

describe('earth geography', () => {
  it('maps lon/lat onto the sphere like three.js UVs', () => {
    const [x, y, z] = lonLatToVec3(0, 0);
    expect(x).toBeCloseTo(1);
    expect(y).toBeCloseTo(0);
    expect(z).toBeCloseTo(0);
    expect(lonLatToVec3(0, 90)[1]).toBeCloseTo(1);
    expect(lonLatToPixel(-180, 90, 1024, 512)).toEqual([0, 0]);
    expect(lonLatToPixel(0, 0, 1024, 512)).toEqual([512, 256]);
  });

  it('can turn the Earth so India faces the camera', () => {
    const rot = faceRotationY(SRIHARIKOTA.lon);
    const v = rotateY(lonLatToVec3(SRIHARIKOTA.lon, 0), rot);
    expect(v[0]).toBeCloseTo(0);
    expect(v[2]).toBeCloseTo(1);
  });
});
