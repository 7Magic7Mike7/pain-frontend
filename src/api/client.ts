import type {
  LayersResponse,
  PainSubmission,
  PointsResponse,
  SubmissionResponse,
} from "../types/api";

async function parseJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status} ${res.statusText}: ${text}`);
  }
  return res.json() as Promise<T>;
}

export async function fetchLayers(): Promise<LayersResponse> {
  const res = await fetch("/api/map/layers");
  return parseJson<LayersResponse>(res);
}

export async function fetchPoints(layerId?: string): Promise<PointsResponse> {
  const q =
    layerId && layerId.length > 0
      ? `?layer=${encodeURIComponent(layerId)}`
      : "";
  const res = await fetch(`/api/map/points${q}`);
  return parseJson<PointsResponse>(res);
}

export async function submitPain(
  body: PainSubmission,
): Promise<SubmissionResponse> {
  const res = await fetch("/api/pain-submission", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return parseJson<SubmissionResponse>(res);
}
