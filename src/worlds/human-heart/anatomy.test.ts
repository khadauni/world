import { CatmullRomCurve3, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { CHAMBERS, PARTS, PART_SIDE, type PartId } from './logic/ids';
import { HEART_HALF_WIDTH, LAB_GRID, labFit, labLayout, type PartShape, type Parking } from './logic/lab';
import { heartBuild } from './parts/anatomy';
import { LOOP_PORTRAIT, mapStopPosition, mapTagPlacement } from './stops/MapSet';
import { LUNG_STOP, MUSCLE_STOP, RIDE_POINTS, RIDE_HEART_SCALE, forwardGap, oxygenSmooth, placeAt, rideArrive, rideBubble, rideDeliver, rideProgress, rideStart, waypointU } from './logic/ride';
import { CHAMBER_CENTER, FLOW_PATHS, LEFT_HOLE, OUTLINE, RIGHT_HOLE, SECTION_VALVES, chamberAt, closedSpline, inside, signedArea, type P2 } from './logic/section';
import { dragToYaw, makeSpin, rubber, stepSpin } from './logic/spin';
import { fitDistance, hudFor, hudShiftPx, usableFraction } from './logic/camera';

describe('cut-away heart section', () => {
  it('keeps both cavities inside the heart outline, apart from each other', () => {
    for (const p of [...RIGHT_HOLE, ...LEFT_HOLE]) expect(inside(OUTLINE, p[0], p[1]), `${p}`).toBe(true);
    for (const p of RIGHT_HOLE) expect(inside(LEFT_HOLE, p[0], p[1])).toBe(false);
    for (const p of LEFT_HOLE) expect(inside(RIGHT_HOLE, p[0], p[1])).toBe(false);
    expect(Math.abs(signedArea(OUTLINE))).toBeGreaterThan(Math.abs(signedArea(RIGHT_HOLE)) + Math.abs(signedArea(LEFT_HOLE)));
  });

  it('puts the right side on the viewer’s LEFT (mirror image) and names each cavity correctly', () => {
    for (const id of CHAMBERS) {
      const c = CHAMBER_CENTER[id] as P2;
      const side = id === 'ra' || id === 'rv' ? 'right' : 'left';
      expect(chamberAt(side, c[0], c[1])).toBe(id);
      expect(inside(side === 'right' ? RIGHT_HOLE : LEFT_HOLE, c[0], c[1]), id).toBe(true);
    }
    expect((CHAMBER_CENTER.ra as P2)[0]).toBeLessThan(0);
    expect((CHAMBER_CENTER.lv as P2)[0]).toBeGreaterThan(0);
    // Outflow channels belong to the ventricles even though they rise above the valves.
    expect(chamberAt('right', -0.12, 0.4)).toBe('rv');
    expect(chamberAt('left', 0.32, 0.4)).toBe('lv');
  });

  it('gives the left ventricle a clearly thicker wall than the right ventricle', () => {
    const outline = closedSpline(OUTLINE, 12);
    const wall = (hole: readonly P2[], y: number, dir: 1 | -1) => {
      // Walk outwards from the cavity's edge at height y until we leave the heart.
      const xs = closedSpline(hole, 12).filter((p) => Math.abs(p[1] - y) < 0.06).map((p) => p[0]);
      const edge = dir > 0 ? Math.max(...xs) : Math.min(...xs);
      let x = edge;
      while (inside(outline, x + dir * 0.01, y)) x += dir * 0.01;
      return Math.abs(x - edge);
    };
    const lvWall = wall(LEFT_HOLE, -0.5, 1);
    const rvWall = wall(RIGHT_HOLE, -0.5, -1);
    expect(lvWall).toBeGreaterThan(rvWall * 1.8);
  });

  it('draws the flow arrows inside the cavities, from atrium to exit valve', () => {
    for (const p of FLOW_PATHS.right) expect(inside(RIGHT_HOLE, p[0], p[1]), `right ${p}`).toBe(true);
    for (const p of FLOW_PATHS.left) expect(inside(LEFT_HOLE, p[0], p[1]), `left ${p}`).toBe(true);
    const r0 = FLOW_PATHS.right[0] as P2;
    const l0 = FLOW_PATHS.left[0] as P2;
    expect(chamberAt('right', r0[0], r0[1])).toBe('ra');
    expect(chamberAt('left', l0[0], l0[1])).toBe('la');
  });

  it('places every valve at a cavity opening', () => {
    for (const [id, v] of Object.entries(SECTION_VALVES)) {
      const hole = id === 'tricuspid' || id === 'pulmonary' ? RIGHT_HOLE : LEFT_HOLE;
      const near = closedSpline(hole, 8).some((p) => Math.hypot(p[0] - v.at[0], p[1] - v.at[1]) < 0.2);
      expect(near || inside(hole, v.at[0], v.at[1]), id).toBe(true);
    }
  });
});

describe('blood cell ride', () => {
  const ORDER = ['muscle', 'vena-cava', 'right-atrium', 'tricuspid', 'right-ventricle', 'pulmonary-valve', 'pulmonary-artery', 'lungs', 'pulmonary-vein', 'left-atrium', 'mitral', 'left-ventricle', 'aortic-valve', 'aorta', 'body'];

  it('follows the double circulation in the correct order', () => {
    const seen: string[] = [];
    for (const w of RIDE_POINTS) if (seen[seen.length - 1] !== w.place) seen.push(w.place);
    expect(seen).toEqual(ORDER);
    expect(RIDE_POINTS[LUNG_STOP]?.place).toBe('lungs');
    expect(RIDE_POINTS[MUSCLE_STOP]?.place).toBe('muscle');
  });

  it('runs through the chambers of the cut-away heart', () => {
    const pts = (place: string) => RIDE_POINTS.filter((w) => w.place === place).map((w) => [w.p[0] / RIDE_HEART_SCALE, w.p[1] / RIDE_HEART_SCALE] as P2);
    for (const p of pts('right-atrium')) expect(chamberAt('right', p[0], p[1])).toBe('ra');
    for (const p of pts('right-ventricle')) expect(inside(RIGHT_HOLE, p[0], p[1])).toBe(true);
    for (const p of pts('left-atrium')) expect(chamberAt('left', p[0], p[1])).toBe('la');
    for (const p of pts('left-ventricle')) expect(inside(LEFT_HOLE, p[0], p[1])).toBe(true);
  });

  it('maps positions on the loop to places, and colours blood by oxygen', () => {
    const curve = new CatmullRomCurve3(RIDE_POINTS.map((w) => new Vector3(...w.p)), true, 'centripetal');
    const us = waypointU(curve.getLengths(RIDE_POINTS.length * 24));
    for (let i = 1; i < us.length; i++) expect(us[i] as number).toBeGreaterThan(us[i - 1] as number);
    expect(placeAt((us[LUNG_STOP] as number) + 1e-4, us)).toBe('lungs');
    // Oxygen-poor before the lungs, rich after, poor again after the muscle.
    expect(oxygenSmooth(us[8] as number, us)).toBe(0);
    expect(oxygenSmooth(us[20] as number, us)).toBe(1);
    expect(oxygenSmooth(us[3] as number, us)).toBe(0);
    for (let u = 0; u < 1; u += 0.01) {
      const o = oxygenSmooth(u, us);
      expect(o).toBeGreaterThanOrEqual(0);
      expect(o).toBeLessThanOrEqual(1);
    }
    expect(forwardGap(0.9, 0.1)).toBeCloseTo(0.2, 6);
  });

  it('runs the task: lungs → bubbles → muscle → deliver', () => {
    let s = rideStart(2);
    expect(rideBubble(s).event).toBe('ignored');
    s = rideArrive(s).state;
    expect(s.stage).toBe('lungs');
    s = rideBubble(s).state;
    const loaded = rideBubble(s);
    expect(loaded.event).toBe('loaded');
    s = rideArrive(loaded.state).state;
    expect(s.stage).toBe('muscle');
    const done = rideDeliver(s);
    expect(done.event).toBe('delivered');
    expect(rideProgress(done.state)).toEqual({ done: 3, total: 3 });
  });
});

describe('camera framing and turntable', () => {
  it('fits a box in portrait and landscape and reserves room for the HUD', () => {
    // A wide subject needs the camera further back on a portrait tablet; a tall one in landscape.
    expect(fitDistance([8, 4], 768 / 1024, 42, usableFraction(1024, 80, 245))).toBeGreaterThan(fitDistance([8, 4], 1280 / 800, 42, usableFraction(800, 80, 245)));
    expect(fitDistance([3, 6], 1280 / 800, 42, usableFraction(800, 80, 245))).toBeGreaterThan(fitDistance([3, 6], 768 / 1024, 42, usableFraction(1024, 80, 245)));
    // Less free height (bigger HUD) → camera further back.
    expect(fitDistance([4, 4], 1.6, 42, usableFraction(800, 150, 300))).toBeGreaterThan(fitDistance([4, 4], 1.6, 42, usableFraction(800, 80, 100)));
    expect(hudShiftPx(800, 80, 245)).toBeGreaterThan(0);
    const [top, bottom] = hudFor('task', 'take-apart', 800);
    expect(top).toBeGreaterThan(100);
    expect(bottom).toBeGreaterThan(150);
    expect(hudFor('explore', null, 800, true)[1]).toBeGreaterThan(hudFor('explore', null, 800)[1]);
    expect(hudFor('map', null, 500)[1]).toBeLessThanOrEqual(500 * 0.42);
  });

  it('springs back to the teaching angle after a swipe', () => {
    const s = makeSpin();
    s.yaw = dragToYaw(600, 1200);
    expect(s.yaw).toBeGreaterThan(0.5);
    for (let i = 0; i < 600; i++) stepSpin(s, 1 / 60, 0.8);
    expect(Math.abs(s.yaw)).toBeLessThan(0.05);
    expect(Math.abs(rubber(5, 0.8))).toBeLessThan(1.5);
    expect(rubber(0.5, 0.8)).toBe(0.5);
  });
});

describe('Heart Lab exploded view', () => {
  const build = heartBuild(0.75);
  const shapes = Object.fromEntries(PARTS.map((id) => [id, { side: PART_SIDE[id], center: build.parts[id].center, size: build.parts[id].size }])) as Record<PartId, PartShape>;
  const box = (id: PartId, p: Parking) => {
    const s = shapes[id].size;
    return { x0: p.slot[0] - (s[0] * p.scale) / 2, x1: p.slot[0] + (s[0] * p.scale) / 2, y0: p.slot[1] - (s[1] * p.scale) / 2, y1: p.slot[1] + (s[1] * p.scale) / 2 };
  };

  it.each([false, true])('parks every pulled part clear of the heart and of each other (portrait: %s)', (portrait) => {
    const layout = labLayout(PARTS, shapes, portrait);
    const placed = PARTS.map((id) => [id, layout[id]] as const);
    for (const [id, p] of placed) {
      if (!p) throw new Error(`${id} has no slot`);
      const b = box(id, p);
      expect(p.scale).toBeLessThanOrEqual(1);
      expect(Math.min(Math.abs(b.x0), Math.abs(b.x1)), `${id} clear of the heart`).toBeGreaterThan(HEART_HALF_WIDTH);
      // Blue (right-side) parts go to the viewer's left, red ones to the right.
      expect(Math.sign(p.slot[0])).toBe(PART_SIDE[id] === 'right' ? -1 : 1);
    }
    for (let i = 0; i < placed.length; i++) {
      for (let j = i + 1; j < placed.length; j++) {
        const [a, pa] = placed[i] as (typeof placed)[number];
        const [b, pb] = placed[j] as (typeof placed)[number];
        if (!pa || !pb) continue;
        const A = box(a, pa);
        const B = box(b, pb);
        const overlap = A.x0 < B.x1 && B.x0 < A.x1 && A.y0 < B.y1 && B.y0 < A.y1;
        expect(overlap, `${a} overlaps ${b}`).toBe(false);
      }
    }
  });

  it('keeps the exploded diagram in anatomical order and re-flows as parts come back', () => {
    const two = labLayout(['svc', 'ivc'], shapes, false);
    expect(two.svc?.slot[1]).toBeGreaterThan(two.ivc?.slot[1] ?? 0);
    const one = labLayout(['ivc'], shapes, false);
    expect(one.ivc?.slot[1]).toBeCloseTo(LAB_GRID.landscape.centerY);
    expect(labLayout([], shapes, true)).toEqual({});
  });

  it('frames wider as more parts come out, and taller on portrait screens', () => {
    const few = labFit(labLayout(['aorta'], shapes, false), false);
    const many = labFit(labLayout(PARTS, shapes, false), false);
    expect(many.fit[0]).toBeGreaterThan(few.fit[0]);
    const tall = labFit(labLayout(PARTS, shapes, true), true);
    expect(tall.fit[1] / tall.fit[0]).toBeGreaterThan(many.fit[1] / many.fit[0]);
  });
});

describe('world map layout', () => {
  const n = 7;
  it('keeps neighbouring side stops far enough apart that a tag never covers a bubble', () => {
    // Portrait: tags sit above the side bubbles, so stacked neighbours need a clear vertical gap
    // (bubble radius 0.52 + tag offset 0.7 + tag height ≈ 0.45).
    for (const [a, b] of [
      [0, 1],
      [n - 1, n - 2],
    ] as const) {
      const pa = mapStopPosition(a, n, LOOP_PORTRAIT);
      const pb = mapStopPosition(b, n, LOOP_PORTRAIT);
      expect(pa[1] - pb[1]).toBeGreaterThan(0.52 + 0.7 + 0.45);
    }
  });

  it('puts side tags beside the bubbles on wide screens and above them on tall ones', () => {
    expect(mapTagPlacement(0, n, false)).toBe('left');
    expect(mapTagPlacement(1, n, false)).toBe('left');
    expect(mapTagPlacement(n - 1, n, false)).toBe('right');
    expect(mapTagPlacement(3, n, false)).toBe('below');
    expect(mapTagPlacement(1, n, true)).toBe('above');
    expect(mapTagPlacement(3, n, true)).toBe('below');
  });
});
