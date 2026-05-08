import * as THREE from "three";

/**
 * Equirectangular UV for a unit direction, aligned with Three.js default
 * {@link THREE.SphereGeometry} (phiLength 2π, thetaLength π). Use this for
 * displacement maps, stipple land sampling, and scar sampling so data lines
 * up with the mesh and with GeoJSON built from the same `latLngToVector3`.
 *
 * (The common mistake `atan2(z, x) + 0.5` shifts longitude vs this sphere.)
 */
export function unitDirectionToGlobeEquirectUV(dir: THREE.Vector3): {
  u: number;
  v: number;
} {
  const n = dir.clone().normalize();
  let u = Math.atan2(n.z, -n.x) / (2 * Math.PI);
  if (u < 0) u += 1;
  if (u >= 1) u -= 1;
  const v = 0.5 - Math.asin(THREE.MathUtils.clamp(n.y, -1, 1)) / Math.PI;
  return { u, v };
}
