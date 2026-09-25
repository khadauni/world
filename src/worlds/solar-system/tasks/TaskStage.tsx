import type { ComponentType } from 'react';
import type { BodyId } from '../layout';
import { EarthFind } from './EarthFind';
import { JupiterMoons } from './JupiterMoons';
import { MarsSamples } from './MarsSamples';
import { MercuryCraters } from './MercuryCraters';
import { NeptuneWinds } from './NeptuneWinds';
import { SaturnIce } from './SaturnIce';
import type { TaskProps } from './common';
import { SunSparks } from './SunSparks';
import { UranusTilt } from './UranusTilt';
import { VenusClouds } from './VenusClouds';

/** One mission per stop. Only the active stop's mission is ever mounted. */
export const TASKS: Readonly<Record<BodyId, ComponentType<TaskProps>>> = {
  sun: SunSparks,
  mercury: MercuryCraters,
  venus: VenusClouds,
  earth: EarthFind,
  mars: MarsSamples,
  jupiter: JupiterMoons,
  saturn: SaturnIce,
  uranus: UranusTilt,
  neptune: NeptuneWinds,
};

export function TaskStage({ stop, ...props }: TaskProps & { stop: BodyId }) {
  const Task = TASKS[stop];
  return <Task {...props} />;
}
