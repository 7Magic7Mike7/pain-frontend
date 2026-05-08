export type PainLayerId =
  | "environmental"
  | "physical"
  | "emotional"
  | "socioeconomic";

export interface MapLayer {
  id: PainLayerId | string;
  label: string;
  description?: string;
  /** When the pipeline serves files, the client can load this instead of procedural textures. */
  textureUrl?: string;
  /** Human-readable source for the prototype dataset (CSV / pipeline). */
  dataSource?: string;
}

export interface PainPoint {
  id: string;
  lat: number;
  lng: number;
  type: string;
  intensity: number;
  element?: string;
  text?: string;
  metadata?: PainPointMetadata;
  createdAt: string;
}

export interface PainPointMetadata {
  country: string;
  layerLabel: string;
  metricLabel: string;
  rawValue: number;
  year?: number;
  sourceUrl: string;
}

export interface PainSubmission {
  lat: number;
  lng: number;
  type: string;
  intensity?: number;
  element?: string;
  text?: string;
}

export interface LayersResponse {
  layers: MapLayer[];
}

export interface PointsResponse {
  points: PainPoint[];
}

export interface SubmissionResponse {
  point: PainPoint;
}
