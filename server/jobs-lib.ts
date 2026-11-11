// Small helpers for saving jobs. Kept apart from the server so they can be tested.

export const MAX_CALLOUTS = 8;

export type SavedCallout = {
  surface: string;
  product: string;
  color: string;
  sheen: string;
  /** null until the dot has been placed on the photo */
  x: number | null;
  y: number | null;
};

export type SavedJob = {
  name: string;
  photo: string;
  photoWidth: number;
  photoHeight: number;
  callouts: SavedCallout[];
  createdAt: string;
  updatedAt: string;
};

/** A folder name made from the job name that Windows accepts. */
export const safeFolderName = (name: string): string => {
  const cleaned = name
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[. ]+$/, "")
    .slice(0, 80);
  const reserved = /^(con|prn|aux|nul|com\d|lpt\d)$/i;
  if (!cleaned || reserved.test(cleaned)) return "Job";
  return cleaned;
};

/** First folder name not already taken: "Name", "Name (2)", "Name (3)"... */
export const uniqueFolderName = (base: string, taken: Set<string>): string => {
  const lower = new Set([...taken].map((t) => t.toLowerCase()));
  if (!lower.has(base.toLowerCase())) return base;
  for (let n = 2; ; n++) {
    const candidate = `${base} (${n})`;
    if (!lower.has(candidate.toLowerCase())) return candidate;
  }
};

/** True for a folder name that is safe to use inside the jobs folder. */
export const isSafeId = (id: string) =>
  !!id && id === safeFolderName(id) && !id.includes("..");

const text = (v: unknown) => (typeof v === "string" ? v.slice(0, 120) : "");
const fraction = (v: unknown) =>
  typeof v === "number" && Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : null;

/** Cleans up a job sent by the page before it is saved. */
export const cleanJob = (input: any, existing: SavedJob): SavedJob => {
  const callouts: SavedCallout[] = Array.isArray(input?.callouts)
    ? input.callouts.slice(0, MAX_CALLOUTS).map((c: any) => {
        const x = fraction(c?.x);
        const y = fraction(c?.y);
        return {
          surface: text(c?.surface),
          product: text(c?.product),
          color: text(c?.color),
          sheen: text(c?.sheen),
          x: x === null || y === null ? null : x,
          y: x === null || y === null ? null : y,
        };
      })
    : existing.callouts;
  return {
    ...existing,
    name: text(input?.name).trim() || existing.name,
    callouts,
    updatedAt: new Date().toISOString(),
  };
};

export type Suggestions = { surface: string[]; product: string[]; color: string[]; sheen: string[] };

/**
 * Values used on earlier jobs, most used first. The surface list also
 * starts with the entries from surfaces.txt.
 */
export const buildSuggestions = (
  jobs: { callouts: Partial<SavedCallout>[] }[],
  surfaceList: string[],
): Suggestions => {
  const fields = ["surface", "product", "color", "sheen"] as const;
  const out = {} as Suggestions;
  for (const field of fields) {
    const counts = new Map<string, { value: string; n: number }>();
    for (const job of jobs) {
      for (const c of job.callouts ?? []) {
        const value = (c[field] ?? "").toString().trim();
        if (!value) continue;
        const key = value.toLowerCase();
        const entry = counts.get(key) ?? { value, n: 0 };
        entry.n++;
        counts.set(key, entry);
      }
    }
    const used = [...counts.values()].sort((a, b) => b.n - a.n || a.value.localeCompare(b.value));
    const values = field === "surface" ? [...surfaceList, ...used.map((u) => u.value)] : used.map((u) => u.value);
    const seen = new Set<string>();
    out[field] = values.filter((v) => {
      const key = v.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
  return out;
};

/** Reads surfaces.txt: one surface per line; blank lines and # notes are skipped. */
export const parseSurfaceList = (fileText: string): string[] =>
  fileText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));
