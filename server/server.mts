// =====================================================================
// Callout Studio: the small program behind the page.
// It runs only on this PC and only answers this PC (address 127.0.0.1).
// It saves jobs into the my-jobs folder and makes the final videos with
// the same video code as `npm run render`.
// =====================================================================
import express from "express";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { createServer as createVite } from "vite";
import react from "@vitejs/plugin-react";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import {
  buildSuggestions,
  cleanJob,
  isSafeId,
  parseSurfaceList,
  safeFolderName,
  uniqueFolderName,
  type SavedJob,
} from "./jobs-lib.ts";
import { localOnly } from "./local-only.ts";

const ROOT = path.resolve(import.meta.dirname, "..");
const JOBS_DIR = path.join(ROOT, "my-jobs");
const SAMPLE_JOB = path.join(ROOT, "jobs", "20260922_103817.json");
const SURFACES_FILE = path.join(ROOT, "surfaces.txt");
const PORT = Number(process.env.PORT ?? 4710);
const ADDRESS = `http://localhost:${PORT}`;

fs.mkdirSync(JOBS_DIR, { recursive: true });

// ---------------------------------------------------------------- jobs on disk

const jobDir = (id: string) => path.join(JOBS_DIR, id);
const jobFile = (id: string) => path.join(jobDir(id), "job.json");

const readJob = (id: string): SavedJob | null => {
  try {
    return JSON.parse(fs.readFileSync(jobFile(id), "utf8"));
  } catch {
    return null;
  }
};

const writeJob = (id: string, job: SavedJob) => {
  const tmp = jobFile(id) + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(job, null, 2) + "\n");
  fs.renameSync(tmp, jobFile(id));
};

const listJobIds = () =>
  fs
    .readdirSync(JOBS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && fs.existsSync(jobFile(d.name)))
    .map((d) => d.name);

const surfaceList = () => {
  try {
    return parseSurfaceList(fs.readFileSync(SURFACES_FILE, "utf8"));
  } catch {
    return [];
  }
};

// ---------------------------------------------------------------- rendering

type RenderState = {
  state: "preparing" | "rendering" | "done" | "error";
  progress: number;
  message: string;
};
const renders = new Map<string, RenderState>();
let bundled: Promise<string> | null = null;

/** Packs the video code once per start; later videos reuse it. */
const getBundle = (onProgress: (p: number) => void) => {
  bundled ??= bundle({
    entryPoint: path.join(ROOT, "src", "index.ts"),
    publicDir: path.join(ROOT, "public"),
    onProgress: (p) => onProgress(p / 100),
  }).catch((e) => {
    bundled = null;
    throw e;
  });
  return bundled;
};

const startRender = async (id: string) => {
  const status: RenderState = { state: "preparing", progress: 0, message: "Getting ready" };
  renders.set(id, status);
  const job = readJob(id);
  if (!job) throw new Error("Job not found");
  const placed = job.callouts.filter((c) => c.x !== null && c.y !== null);
  const inputProps = {
    photo: job.photo,
    // The renderer is a browser on this PC; it loads the photo from this server.
    photoUrl: `${ADDRESS}/job-files/${encodeURIComponent(id)}/${job.photo}?v=${Date.parse(job.createdAt)}`,
    photoWidth: job.photoWidth,
    photoHeight: job.photoHeight,
    callouts: placed,
  };
  const serveUrl = await getBundle((p) => {
    status.progress = p * 0.1;
  });
  const composition = await selectComposition({ serveUrl, id: "ProjectVideo", inputProps });
  status.state = "rendering";
  status.message = "Making the video";
  const finalFile = path.join(jobDir(id), "video.mp4");
  const tmpFile = path.join(jobDir(id), "video.rendering.mp4");
  await renderMedia({
    composition,
    serveUrl,
    codec: "h264",
    outputLocation: tmpFile,
    inputProps,
    imageFormat: "jpeg",
    jpegQuality: 92,
    overwrite: true,
    onProgress: ({ progress }) => {
      status.progress = 0.1 + progress * 0.9;
    },
  });
  fs.rmSync(finalFile, { force: true });
  fs.renameSync(tmpFile, finalFile);
  status.state = "done";
  status.progress = 1;
  status.message = "Video ready";
};

// ---------------------------------------------------------------- web server

const app = express();
// First, before every route: only answer this PC's own Callout Studio page.
app.use(localOnly(PORT));
const json = express.json({ limit: "1mb" });
const jpeg = express.raw({ type: "image/jpeg", limit: "80mb" });

/** Looks up the job named in the address, or answers "not found". */
const withJob = (req: express.Request, res: express.Response): [string, SavedJob] | null => {
  const id = String(req.params.id ?? "");
  const job = isSafeId(id) ? readJob(id) : null;
  if (!job) {
    res.status(404).json({ error: "That job could not be found." });
    return null;
  }
  return [id, job];
};

app.get("/api/jobs", (_req, res) => {
  const jobs = listJobIds()
    .map((id) => {
      const job = readJob(id)!;
      return {
        id,
        name: job.name,
        calloutCount: job.callouts.length,
        updatedAt: job.updatedAt,
        hasVideo: fs.existsSync(path.join(jobDir(id), "video.mp4")),
        thumbUrl: `/job-files/${encodeURIComponent(id)}/thumb.jpg?v=${Date.parse(job.createdAt)}`,
      };
    })
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  res.json(jobs);
});

// New job: the page sends the photo, already turned upright and saved as JPG.
app.post("/api/jobs", jpeg, (req, res) => {
  const name = String(req.query.name ?? "").trim() || "New job";
  const width = Number(req.query.width);
  const height = Number(req.query.height);
  if (!Buffer.isBuffer(req.body) || !req.body.length || !(width > 0) || !(height > 0)) {
    res.status(400).json({ error: "The photo did not arrive. Please try again." });
    return;
  }
  const id = uniqueFolderName(safeFolderName(name), new Set(fs.readdirSync(JOBS_DIR)));
  fs.mkdirSync(jobDir(id));
  fs.writeFileSync(path.join(jobDir(id), "photo.jpg"), req.body);
  const now = new Date().toISOString();
  writeJob(id, {
    name,
    photo: "photo.jpg",
    photoWidth: width,
    photoHeight: height,
    callouts: [],
    createdAt: now,
    updatedAt: now,
  });
  res.json({ id });
});

app.post("/api/jobs/:id/thumb", jpeg, (req, res) => {
  const found = withJob(req, res);
  if (!found) return;
  fs.writeFileSync(path.join(jobDir(found[0]), "thumb.jpg"), req.body);
  res.json({ ok: true });
});

// The example job: copies the sample from the jobs folder into a new job.
app.post("/api/example", (_req, res) => {
  const sample = JSON.parse(fs.readFileSync(SAMPLE_JOB, "utf8"));
  const id = uniqueFolderName("Example job", new Set(fs.readdirSync(JOBS_DIR)));
  fs.mkdirSync(jobDir(id));
  fs.copyFileSync(path.join(ROOT, "public", sample.photo), path.join(jobDir(id), "photo.jpg"));
  const now = new Date().toISOString();
  writeJob(id, {
    name: id,
    photo: "photo.jpg",
    photoWidth: sample.photoWidth,
    photoHeight: sample.photoHeight,
    callouts: sample.callouts,
    createdAt: now,
    updatedAt: now,
  });
  res.json({ id, needsThumb: true });
});

app.get("/api/jobs/:id", (req, res) => {
  const found = withJob(req, res);
  if (!found) return;
  const [id, job] = found;
  res.json({
    id,
    job,
    photoUrl: `/job-files/${encodeURIComponent(id)}/${job.photo}?v=${Date.parse(job.createdAt)}`,
    hasVideo: fs.existsSync(path.join(jobDir(id), "video.mp4")),
  });
});

app.put("/api/jobs/:id", json, (req, res) => {
  const found = withJob(req, res);
  if (!found) return;
  const [id, job] = found;
  const saved = cleanJob(req.body, job);
  writeJob(id, saved);
  res.json({ ok: true, updatedAt: saved.updatedAt });
});

app.get("/api/suggestions", (_req, res) => {
  const jobs = listJobIds()
    .map(readJob)
    .filter((j): j is SavedJob => !!j);
  res.json(buildSuggestions(jobs, surfaceList()));
});

app.post("/api/jobs/:id/render", (req, res) => {
  const found = withJob(req, res);
  if (!found) return;
  const [id] = found;
  const current = renders.get(id);
  if (current && (current.state === "preparing" || current.state === "rendering")) {
    res.json(current);
    return;
  }
  startRender(id).catch((e) => {
    console.error(e);
    renders.set(id, {
      state: "error",
      progress: 0,
      message: e instanceof Error ? e.message : String(e),
    });
  });
  res.json(renders.get(id));
});

app.get("/api/jobs/:id/render", (req, res) => {
  const found = withJob(req, res);
  if (!found) return;
  res.json(renders.get(found[0]) ?? { state: "idle", progress: 0, message: "" });
});

// Opens the job's folder in File Explorer, with the video selected.
app.post("/api/jobs/:id/open-folder", (req, res) => {
  const found = withJob(req, res);
  if (!found) return;
  const video = path.join(jobDir(found[0]), "video.mp4");
  // Explorer wants exactly: /select,"C:\path with spaces\video.mp4"
  const args = fs.existsSync(video) ? `/select,"${video}"` : `"${jobDir(found[0])}"`;
  spawn("explorer.exe", [args], {
    detached: true,
    stdio: "ignore",
    windowsVerbatimArguments: true,
  }).unref();
  res.json({ ok: true });
});

app.use("/job-files", express.static(JOBS_DIR, { index: false }));

// The page itself.
const vite = await createVite({
  root: path.join(ROOT, "page"),
  publicDir: path.join(ROOT, "public"),
  plugins: [react()],
  appType: "spa",
  logLevel: "warn",
  server: { middlewareMode: true },
});
app.use(vite.middlewares);

const server = app.listen(PORT, "127.0.0.1", () => {
  console.log("");
  console.log("  Callout Studio is running.");
  console.log(`  Your browser should open by itself. If not, go to ${ADDRESS}`);
  console.log("  To stop it, close this window.");
  console.log("");
  if (!process.env.NO_OPEN) spawn("explorer.exe", [ADDRESS], { detached: true, stdio: "ignore" }).unref();
});

server.on("error", (e: NodeJS.ErrnoException) => {
  if (e.code === "EADDRINUSE") {
    // Already running in another window: just open the page.
    console.log(`Callout Studio is already running. Opening ${ADDRESS}`);
    if (!process.env.NO_OPEN) spawn("explorer.exe", [ADDRESS], { detached: true, stdio: "ignore" }).unref();
    setTimeout(() => process.exit(0), 500);
  } else {
    throw e;
  }
});
