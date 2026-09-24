import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing';

/** High-tier post-processing: soft bloom for glowing suns, stars and targets, plus a gentle vignette. */
export default function Effects({ intensity, luminanceThreshold }: { intensity: number; luminanceThreshold: number }) {
  return (
    <EffectComposer multisampling={0}>
      <Bloom mipmapBlur intensity={intensity} luminanceThreshold={luminanceThreshold} luminanceSmoothing={0.2} />
      <Vignette eskil={false} offset={0.25} darkness={0.55} />
    </EffectComposer>
  );
}
