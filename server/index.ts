import cors from "cors";
import express from "express";
import type { MapLayer, PainPoint, PainSubmission } from "../src/types/api";
import { loadPainRepoPoints } from "./loadPainPoints";

const PORT = Number(process.env.PAIN_API_PORT ?? 3947);
const PPP_MAP_API_BASE = process.env.PPP_MAP_API_BASE ?? "http://127.0.0.1:3000";
const PPP_MAP_SAMPLE_SIZE = Number(process.env.PPP_MAP_SAMPLE_SIZE ?? 2500);
const PPP_MAP_ID_MAX = Number(process.env.PPP_MAP_ID_MAX ?? 39000);
const PPP_MAP_TIMEOUT_MS = Number(process.env.PPP_MAP_TIMEOUT_MS ?? 2500);

const PAIN_DATA_TREE =
  "https://github.com/7Magic7Mike7/pain/tree/main/data";

const layers: MapLayer[] = [
  {
    id: "environmental",
    label: "Environmental",
    description:
      "Prototype markers from Red List Index (latest year per country).",
    dataSource: `${PAIN_DATA_TREE}/env_earth.csv`,
  },
  {
    id: "physical",
    label: "Physical / Physiological",
    description:
      "Prototype markers from aggregated pain-related DALYs (IHME-style export).",
    dataSource: `${PAIN_DATA_TREE}/painful_disease_prevalence_vs_environment.csv`,
  },
  {
    id: "emotional",
    label: "Emotional",
    description:
      "Prototype markers from country-level emotional text pain scores.",
    dataSource: `${PAIN_DATA_TREE}/emotional.csv`,
  },
  {
    id: "socioeconomic",
    label: "Socio-economic",
    description: "Prototype markers from national Gini coefficients.",
    dataSource: `${PAIN_DATA_TREE}/gini-coefficient-by-country-2025.csv`,
  },
];

const staticPoints = loadPainRepoPoints();
let remotePoints: PainPoint[] = [];
let userPoints: PainPoint[] = [];
let remoteLoadInFlight: Promise<void> | null = null;

const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: "256kb" }));

type PppMapRow = {
  id: number;
  x: number;
  y: number;
  value: number;
  datatype: string;
  painorigin: string;
};

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

function mapPainOriginToLayer(origin: string): PainPoint["type"] {
  const k = origin.toLowerCase();
  if (k.includes("emo")) return "emotional";
  if (k.includes("phys")) return "physical";
  if (k.includes("socio")) return "socioeconomic";
  return "environmental";
}

function pppMapRowToPoint(r: PppMapRow): PainPoint {
  // DummyPain coordinates are grid-like; map into world lon/lat ranges.
  const lng = (r.x / 999) * 360 - 180;
  const lat = 90 - (r.y / 499) * 180;
  const type = mapPainOriginToLayer(r.painorigin);
  return {
    id: `ppp-${r.id}`,
    lat,
    lng,
    type,
    intensity: clamp01(Number(r.value)),
    element: r.datatype,
    text: `${r.datatype} · ${r.painorigin}`,
    metadata: {
      country: "PPP map record",
      layerLabel:
        type === "emotional"
          ? "Emotional"
          : type === "physical"
            ? "Physical"
            : type === "socioeconomic"
              ? "Socioeconomic"
              : "Environmental",
      metricLabel: r.datatype,
      rawValue: Number(r.value),
      sourceUrl: `${PPP_MAP_API_BASE}/db/${r.id}`,
    },
    createdAt: new Date().toISOString(),
  };
}

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

async function loadRemotePppMapPoints(): Promise<void> {
  if (remoteLoadInFlight) return remoteLoadInFlight;
  remoteLoadInFlight = (async () => {
    const points: PainPoint[] = [];
    const max = Math.max(1, PPP_MAP_ID_MAX);
    const target = Math.max(1, PPP_MAP_SAMPLE_SIZE);
    const stride = Math.max(1, Math.floor(max / target));
    const ids: number[] = [];
    for (let id = 0; id < max; id += stride) ids.push(id);
    const concurrency = 16;
    let cursor = 0;
    async function worker() {
      while (cursor < ids.length) {
        const id = ids[cursor++]!;
        try {
          const res = await fetchWithTimeout(`${PPP_MAP_API_BASE}/db/${id}`, PPP_MAP_TIMEOUT_MS);
          if (!res.ok) continue;
          const row = (await res.json()) as Partial<PppMapRow>;
          if (
            typeof row.id !== "number" ||
            typeof row.x !== "number" ||
            typeof row.y !== "number" ||
            typeof row.value !== "number" ||
            typeof row.datatype !== "string" ||
            typeof row.painorigin !== "string"
          ) {
            continue;
          }
          points.push(pppMapRowToPoint(row as PppMapRow));
        } catch {
          // Ignore individual record errors; partial data is acceptable.
        }
      }
    }
    await Promise.all(new Array(concurrency).fill(0).map(() => worker()));
    remotePoints = points;
  })()
    .catch((e) => {
      console.warn(`[ppp-map] remote load failed from ${PPP_MAP_API_BASE}:`, e);
      remotePoints = [];
    })
    .finally(() => {
      remoteLoadInFlight = null;
    });
  return remoteLoadInFlight;
}

app.get("/api/map/layers", (_req, res) => {
  res.json({ layers });
});

app.get("/api/map/points", async (req, res) => {
  await loadRemotePppMapPoints();
  const layer =
    typeof req.query.layer === "string" && req.query.layer.length > 0
      ? req.query.layer
      : undefined;
  const pick = (p: PainPoint) => !layer || p.type === layer;
  const source = remotePoints.length ? remotePoints : staticPoints;
  const points = [...userPoints.filter(pick), ...source.filter(pick)];
  res.json({ points });
});

app.post("/api/pain-submission", (req, res) => {
  const body = req.body as Partial<PainSubmission>;
  const lat = Number(body.lat);
  const lng = Number(body.lng);
  const type = body.type;

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    res.status(400).json({ error: "lat and lng must be numbers" });
    return;
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    res.status(400).json({ error: "lat/lng out of range" });
    return;
  }
  if (!type || typeof type !== "string") {
    res.status(400).json({ error: "type is required" });
    return;
  }

  const point: PainPoint = {
    id: `pt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    lat,
    lng,
    type,
    intensity:
      body.intensity === undefined
        ? 0.5
        : Math.min(1, Math.max(0, Number(body.intensity))),
    element: typeof body.element === "string" ? body.element : undefined,
    text: typeof body.text === "string" ? body.text : undefined,
    createdAt: new Date().toISOString(),
  };

  if (!Number.isFinite(point.intensity)) {
    point.intensity = 0.5;
  }

  userPoints = [point, ...userPoints];
  res.status(201).json({ point });
});

app.listen(PORT, () => {
  console.log(`PAIN mock API http://127.0.0.1:${PORT}`);
  console.log(`[ppp-map] source API: ${PPP_MAP_API_BASE}`);
  void loadRemotePppMapPoints().then(() => {
    console.log(
      `[ppp-map] loaded ${remotePoints.length} point(s) from remote DB adapter`,
    );
  });
  console.log(
    `[pain data] ${staticPoints.length} static point(s) from ${PAIN_DATA_TREE}`,
  );
});
