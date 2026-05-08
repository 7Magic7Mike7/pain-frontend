import * as THREE from "three";

const W = 1024;
const H = 512;

function hash01(n: number): number {
  const x = Math.sin(n * 127.1) * 43758.5453;
  return x - Math.floor(x);
}

export type VisualTheme = "dark" | "blue";

const PALETTES_DARK: Record<string, [number, number, number]> = {
  environmental: [34, 120, 95],
  physical: [160, 70, 110],
  emotional: [90, 110, 200],
  socioeconomic: [190, 130, 40],
};

const PALETTES_BLUE: Record<string, [number, number, number]> = {
  environmental: [30, 110, 140],
  physical: [100, 75, 165],
  emotional: [70, 130, 220],
  socioeconomic: [45, 140, 175],
};

/** Layer accent in 0–1 (shared by canvas “data texture” and point-globe tint). */
export function getLayerBaseColorLinear(
  layerId: string,
  visualTheme: VisualTheme = "dark",
): [number, number, number] {
  const palettes = visualTheme === "blue" ? PALETTES_BLUE : PALETTES_DARK;
  const base =
    palettes[layerId] ??
    (visualTheme === "blue" ? [45, 95, 140] : [80, 80, 90]);
  let r = base[0] / 255;
  let g = base[1] / 255;
  let b = base[2] / 255;
  if (visualTheme === "blue") {
    r *= 0.88;
    g *= 0.98;
    b = Math.min(1, b * 1.12 + 8 / 255);
  }
  return [r, g, b];
}

/**
 * Stand-in equirectangular-style maps for the sphere until real pipeline textures are wired.
 * Each layer gets a distinct hue + noise so you can verify swapping works.
 *
 * This is **not** a PNG/JPG: it is drawn at runtime on a 2D canvas (`CanvasTexture`),
 * using procedural noise + the palette above so layer changes are obvious before real pipeline textures exist.
 */
export function createLayerCanvasTexture(
  layerId: string,
  visualTheme: VisualTheme = "dark",
): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("2D canvas unsupported");
  }

  const [br, bg, bb] = getLayerBaseColorLinear(layerId, visualTheme);
  const base: [number, number, number] = [
    br * 255,
    bg * 255,
    bb * 255,
  ];
  const img = ctx.createImageData(W, H);
  const d = img.data;
  let p = 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const u = x / W;
      const v = y / H;
      const n =
        hash01(u * 73.2 + v * 19.7 + layerId.length * 0.01) * 0.35 +
        hash01(u * 13.1 + v * 91.3) * 0.25;
      const band = 0.15 * Math.sin((u + v) * Math.PI * 4);
      const r = Math.min(255, base[0] * (0.45 + n + band));
      const g = Math.min(255, base[1] * (0.45 + n * 0.9 + band));
      const b = Math.min(255, base[2] * (0.55 + n * 0.85));
      d[p++] = r;
      d[p++] = g;
      d[p++] = b;
      d[p++] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}
