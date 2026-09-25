import { Euler, Quaternion, Vector3, type Camera, type PerspectiveCamera } from 'three';
import type { FovKickConfig, ShakeProfile } from '../store/fxStore';
import { approach } from '../store/signals';
import type { FxSignals } from '../store/signals';
import { createShakeOffsets, shakeOffsets } from './shake';

const offset = new Vector3();
const euler = new Euler(0, 0, 0, 'YXZ');
const dq = new Quaternion();

const isPerspective = (c: Camera): c is PerspectiveCamera => (c as PerspectiveCamera).isPerspectiveCamera === true;

/**
 * Applies shake + FOV kick to the camera for ONE render and takes them off again afterwards.
 *
 * Why it never drifts or fights camera controllers: `apply()` runs right before the main render (after every
 * `useFrame`, i.e. after CameraRig / OrbitControls / world directors have placed the camera) and saves the clean
 * pose; `restore()` runs right after the frame (R3F after-effect) and copies the saved pose back. Controllers
 * therefore only ever see — and integrate from — the un-shaken camera.
 */
export class CameraFxRig {
  private applied = false;
  private target: Camera | null = null;
  private readonly savedPosition = new Vector3();
  private readonly savedQuaternion = new Quaternion();
  private savedFov = 0;
  private fovChanged = false;
  private fovCurrent = 0;
  private readonly offsets = createShakeOffsets();

  /** Smoothed FOV kick currently applied (degrees) — exposed for debugging / lab readouts. */
  get fovKick(): number {
    return this.fovCurrent;
  }

  apply(camera: Camera, signals: Readonly<FxSignals>, shake: ShakeProfile, fov: FovKickConfig, dt: number): void {
    if (this.applied) this.restore();
    const goal = fov.enabled ? Math.max(-fov.maxDegrees, Math.min(fov.maxDegrees, signals.fovKick * fov.scale)) : 0;
    this.fovCurrent = approach(this.fovCurrent, goal, 9, dt);
    const doFov = isPerspective(camera) && Math.abs(this.fovCurrent) > 0.01;
    const amount = signals.shake;
    const dip = signals.dip;
    const doShake = amount > 1e-4 || dip > 1e-4;
    if (!doShake && !doFov) return;

    this.target = camera;
    this.applied = true;
    this.savedPosition.copy(camera.position);
    this.savedQuaternion.copy(camera.quaternion);

    if (doShake) {
      const o = shakeOffsets(signals.time, amount, shake, this.offsets);
      // Landing "dip": the camera sinks a touch and springs back as the envelope releases.
      offset.set(o.x, o.y - dip * dip * shake.maxOffset * 2.5, 0).applyQuaternion(camera.quaternion);
      camera.position.add(offset);
      euler.set(o.pitch - dip * 0.012, o.yaw, o.roll);
      dq.setFromEuler(euler);
      camera.quaternion.multiply(dq);
    }
    if (doFov && isPerspective(camera)) {
      this.savedFov = camera.fov;
      camera.fov = Math.max(10, Math.min(150, camera.fov + this.fovCurrent));
      camera.updateProjectionMatrix();
      this.fovChanged = true;
    }
    camera.updateMatrixWorld();
  }

  restore(): void {
    const camera = this.target;
    if (!this.applied || !camera) return;
    camera.position.copy(this.savedPosition);
    camera.quaternion.copy(this.savedQuaternion);
    if (this.fovChanged && isPerspective(camera)) {
      camera.fov = this.savedFov;
      camera.updateProjectionMatrix();
    }
    camera.updateMatrixWorld();
    this.fovChanged = false;
    this.applied = false;
    this.target = null;
  }
}
