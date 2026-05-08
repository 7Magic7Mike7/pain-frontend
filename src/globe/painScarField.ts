import * as THREE from "three";
import type { PainPoint } from "../types/api";
import { unitDirectionToGlobeEquirectUV } from "./globeEquirectUV";
import { latLngToVector3 } from "./latLng";

/** Equirect resolution; must align with sphere UVs (same convention as stipple globe). */
const MAP_W = 1024;
const MAP_H = 512;
const NEUTRAL_DEPTH = 128;

function latLngToEquirectUV(lat: number, lng: number): { u: number; v: number } {
  return unitDirectionToGlobeEquirectUV(latLngToVector3(lat, lng, 1));
}

function makeRedDataTexture(bytes: Uint8Array): THREE.DataTexture {
  const tex = new THREE.DataTexture(
    bytes as unknown as ArrayBufferView<ArrayBuffer>,
    MAP_W,
    MAP_H,
    THREE.RedFormat,
    THREE.UnsignedByteType,
  );
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  tex.colorSpace = THREE.NoColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Single-channel height texture for MeshStandardMaterial.displacementMap and for the
 * stipple globe vertex shader. Mid grey = neutral; lower values = inward dents.
 */
export function createPainScarDisplacementTexture(
  points: PainPoint[],
): THREE.DataTexture {
  const depthAcc = new Float32Array(MAP_W * MAP_H);
  depthAcc.fill(NEUTRAL_DEPTH);

  for (const p of points) {
    const { u, v } = latLngToEquirectUV(p.lat, p.lng);
    const cx = Math.floor(((u % 1) + 1) % 1 * (MAP_W - 1));
    const cy = Math.floor(THREE.MathUtils.clamp(v, 0, 1) * (MAP_H - 1));
    const inten = THREE.MathUtils.clamp(p.intensity, 0, 1);
    const radiusPx = Math.round(20 + 52 * (0.25 + 0.75 * inten));
    const peakDent = 52 + 105 * (0.2 + 0.8 * inten);

    for (let dy = -radiusPx; dy <= radiusPx; dy++) {
      const iy = cy + dy;
      if (iy < 0 || iy >= MAP_H) continue;
      for (let dx = -radiusPx; dx <= radiusPx; dx++) {
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > radiusPx) continue;
        let ix = cx + dx;
        ix = ((ix % MAP_W) + MAP_W) % MAP_W;
        const idx = iy * MAP_W + ix;
        const t = dist / radiusPx;
        const falloffDepth = (1 - t) * (1 - t) * (1 - t);
        const sub = peakDent * falloffDepth;
        depthAcc[idx] = Math.max(4, depthAcc[idx]! - sub);
      }
    }
  }

  const depthBytes = new Uint8Array(MAP_W * MAP_H);
  for (let i = 0; i < depthAcc.length; i++) {
    depthBytes[i] = Math.round(THREE.MathUtils.clamp(depthAcc[i]!, 0, 255));
  }

  return makeRedDataTexture(depthBytes);
}
