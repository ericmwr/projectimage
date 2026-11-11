// Talks to the Callout Studio program running on this PC.
import type { SavedJob, Suggestions } from "../server/jobs-lib";

export type JobSummary = {
  id: string;
  name: string;
  calloutCount: number;
  updatedAt: string;
  hasVideo: boolean;
  thumbUrl: string;
};

export type JobDetails = { id: string; job: SavedJob; photoUrl: string; hasVideo: boolean };

export type RenderStatus = {
  state: "idle" | "preparing" | "rendering" | "done" | "error";
  progress: number;
  message: string;
};

const call = async <T,>(url: string, init?: RequestInit): Promise<T> => {
  const res = await fetch(url, init);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? `Something went wrong (${res.status}).`);
  return body as T;
};

export const api = {
  listJobs: () => call<JobSummary[]>("/api/jobs"),
  getJob: (id: string) => call<JobDetails>(`/api/jobs/${encodeURIComponent(id)}`),
  createJob: (name: string, photo: Blob, width: number, height: number) =>
    call<{ id: string }>(
      `/api/jobs?${new URLSearchParams({ name, width: String(width), height: String(height) })}`,
      { method: "POST", headers: { "Content-Type": "image/jpeg" }, body: photo },
    ),
  saveThumb: (id: string, thumb: Blob) =>
    call(`/api/jobs/${encodeURIComponent(id)}/thumb`, {
      method: "POST",
      headers: { "Content-Type": "image/jpeg" },
      body: thumb,
    }),
  copyExample: () => call<{ id: string }>("/api/example", { method: "POST" }),
  saveJob: (id: string, job: SavedJob) =>
    call<{ ok: true }>(`/api/jobs/${encodeURIComponent(id)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(job),
    }),
  suggestions: () => call<Suggestions>("/api/suggestions"),
  startRender: (id: string) =>
    call<RenderStatus>(`/api/jobs/${encodeURIComponent(id)}/render`, { method: "POST" }),
  renderStatus: (id: string) => call<RenderStatus>(`/api/jobs/${encodeURIComponent(id)}/render`),
  openFolder: (id: string) =>
    call(`/api/jobs/${encodeURIComponent(id)}/open-folder`, { method: "POST" }),
};
