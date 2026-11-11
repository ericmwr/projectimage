import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Player, type PlayerRef } from "@remotion/player";
import { fontsReady } from "../src/brand";
import { LayoutError } from "../src/layout";
import { placeCards } from "../src/placement";
import { ProjectVideo } from "../src/ProjectVideo";
import { videoMetadata } from "../src/Root";
import { FPS } from "../src/timing";
import type { Callout, VideoProps } from "../src/types";
import { MAX_CALLOUTS, type SavedCallout, type SavedJob, type Suggestions } from "../server/jobs-lib";
import { api, type RenderStatus } from "./api";
import { thumbFromUrl } from "./photo";

const FIELDS = [
  { key: "surface", label: "Surface", placeholder: "Walls" },
  { key: "product", label: "Product", placeholder: "Emerald Interior Wall Finish" },
  { key: "color", label: "Color", placeholder: "Accessible Beige" },
  { key: "sheen", label: "Sheen", placeholder: "Matte (or leave empty)" },
] as const;

const emptyCallout = (): SavedCallout => ({ surface: "", product: "", color: "", sheen: "", x: null, y: null });

const isPlaced = (c: SavedCallout): c is SavedCallout & { x: number; y: number } =>
  c.x !== null && c.y !== null;

const calloutName = (c: SavedCallout, n: number) =>
  `callout ${n}${c.surface.trim() ? ` (${c.surface.trim()})` : ""}`;

/** Gives back `value`, but only after it has stopped changing for `ms`. */
const useSettled = <T,>(value: T, ms: number) => {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setSettled(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return settled;
};

export const Editor: React.FC<{ id: string }> = ({ id }) => {
  const [job, setJob] = useState<SavedJob | null>(null);
  const [photoUrl, setPhotoUrl] = useState("");
  const [loadError, setLoadError] = useState("");
  const [saveState, setSaveState] = useState<"saved" | "saving" | "error">("saved");
  const [active, setActive] = useState(0);
  const [hover, setHover] = useState<number | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestions | null>(null);
  const [fontsOk, setFontsOk] = useState(false);
  const [hasVideo, setHasVideo] = useState(false);
  const edits = useRef(0);

  useEffect(() => {
    api.getJob(id).then(
      (d) => {
        setJob(d.job);
        setPhotoUrl(d.photoUrl);
        setHasVideo(d.hasVideo);
        // Jobs made from the example have no list picture yet.
        const img = new Image();
        img.onerror = () => thumbFromUrl(d.photoUrl).then((t) => api.saveThumb(id, t)).catch(() => {});
        img.src = `/job-files/${encodeURIComponent(id)}/thumb.jpg?check=${Date.now()}`;
      },
      (e) => setLoadError(e.message),
    );
    api.suggestions().then(setSuggestions, () => {});
    fontsReady().then(() => setFontsOk(true));
  }, [id]);

  // Save automatically, shortly after each change.
  const update = useCallback((change: (j: SavedJob) => SavedJob) => {
    edits.current++;
    setJob((j) => (j ? change(j) : j));
  }, []);
  useEffect(() => {
    if (!job || edits.current === 0) return;
    setSaveState("saving");
    const t = setTimeout(() => {
      api.saveJob(id, job).then(
        () => setSaveState("saved"),
        () => setSaveState("error"),
      );
    }, 500);
    return () => clearTimeout(t);
  }, [job, id]);

  const setCallout = (i: number, change: Partial<SavedCallout>) =>
    update((j) => ({ ...j, callouts: j.callouts.map((c, k) => (k === i ? { ...c, ...change } : c)) }));

  const addCallout = () => {
    if (!job || job.callouts.length >= MAX_CALLOUTS) return;
    update((j) => ({ ...j, callouts: [...j.callouts, emptyCallout()] }));
    setActive(job.callouts.length);
  };

  const removeCallout = (i: number) => {
    if (!job) return;
    if (!window.confirm(`Delete ${calloutName(job.callouts[i], i + 1)}?`)) return;
    update((j) => ({ ...j, callouts: j.callouts.filter((_, k) => k !== i) }));
    setActive((a) => (a > i ? a - 1 : a === i ? Math.max(0, i - 1) : a));
  };

  const moveCallout = (i: number, by: -1 | 1) => {
    const to = i + by;
    update((j) => {
      if (to < 0 || to >= j.callouts.length) return j;
      const list = [...j.callouts];
      [list[i], list[to]] = [list[to], list[i]];
      return { ...j, callouts: list };
    });
    setActive(to);
  };

  // What the video sees: only callouts whose dot has been placed, in order.
  // It waits until typing or dragging pauses, so the preview stays smooth.
  const settledJob = useSettled(job, 350);
  const videoProps: VideoProps | null = useMemo(() => {
    if (!settledJob) return null;
    return {
      photo: settledJob.photo,
      photoUrl,
      photoWidth: settledJob.photoWidth,
      photoHeight: settledJob.photoHeight,
      callouts: settledJob.callouts.filter(isPlaced) as Callout[],
    };
  }, [settledJob, photoUrl]);
  const meta = videoProps ? videoMetadata(videoProps) : null;

  // Check whether the cards fit, with the same code the video uses.
  const fitProblem = useMemo(() => {
    if (!fontsOk || !videoProps || !meta || !settledJob) return null;
    try {
      placeCards(videoProps.callouts, meta.width, meta.height);
      return null;
    } catch (e) {
      if (!(e instanceof LayoutError)) return { message: String(e), listNumbers: [] as number[] };
      // Turn video numbers (placed callouts only) back into list numbers.
      const listIndexes = settledJob.callouts.flatMap((c, i) => (isPlaced(c) ? [i] : []));
      const listNumbers = e.callouts.map((n) => listIndexes[n - 1] + 1);
      const names = listNumbers.map((n) => calloutName(settledJob.callouts[n - 1], n));
      const message =
        e.kind === "no-room"
          ? names.length === 1
            ? `There is no room for the card of ${names[0]}. Its dot is too close to the edge of the photo or to another dot. Drag that dot a little, or shorten its text.`
            : `There is no room for the cards of ${names.join(" and ")}. Their dots are too close to the edge of the photo or to each other. Drag one of them a little, or shorten the text.`
          : `The cards don't all fit. Try dragging ${names.join(" or ")} away from the other dots, or shortening its text.`;
      return { message, listNumbers };
    }
  }, [fontsOk, videoProps, meta, settledJob]);

  if (loadError) return <div className="page"><p className="alert">{loadError}</p><a href="#/">Back to jobs</a></div>;
  if (!job) return <div className="page"><p className="note">Loading…</p></div>;

  const unplaced = job.callouts.flatMap((c, i) => (isPlaced(c) ? [] : [i + 1]));
  const listFor = (key: string) => `list-${key}`;

  return (
    <div className="editor">
      <section className="side">
        <a href="#/" className="back">← All jobs</a>
        <label className="field job-name">
          <span>Job name</span>
          <input value={job.name} onChange={(e) => update((j) => ({ ...j, name: e.target.value }))} />
        </label>
        <p className={`save-state ${saveState}`}>
          {saveState === "saving" ? "Saving…" : saveState === "error" ? "Could not save. Is the black window still open?" : "All changes saved"}
        </p>

        <h2>Callouts</h2>
        <p className="note">They appear in the video in this order.</p>
        {FIELDS.map((f) => (
          <datalist key={f.key} id={listFor(f.key)}>
            {(suggestions?.[f.key] ?? []).map((v) => (
              <option key={v} value={v} />
            ))}
          </datalist>
        ))}

        <ol className="callouts">
          {job.callouts.map((c, i) => {
            const n = i + 1;
            const problem = fitProblem?.listNumbers.includes(n);
            return (
              <li
                key={i}
                className={`callout ${active === i ? "active" : ""} ${hover === i ? "hover" : ""} ${problem ? "problem" : ""}`}
                onClick={() => setActive(i)}
                onFocus={() => setActive(i)}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
              >
                <div className="callout-head">
                  <span className="badge">{n}</span>
                  <span className="callout-title">{c.surface.trim() || "New callout"}</span>
                  <span className="callout-tools">
                    <button title="Move up" aria-label={`Move callout ${n} up`} disabled={i === 0} onClick={(e) => { e.stopPropagation(); moveCallout(i, -1); }}>↑</button>
                    <button title="Move down" aria-label={`Move callout ${n} down`} disabled={i === job.callouts.length - 1} onClick={(e) => { e.stopPropagation(); moveCallout(i, 1); }}>↓</button>
                    <button title="Delete" aria-label={`Delete callout ${n}`} className="danger" onClick={(e) => { e.stopPropagation(); removeCallout(i); }}>✕</button>
                  </span>
                </div>
                <div className="callout-fields">
                  {FIELDS.map((f) => (
                    <label key={f.key} className="field small">
                      <span>{f.label}</span>
                      <input
                        list={listFor(f.key)}
                        value={c[f.key]}
                        placeholder={f.placeholder}
                        aria-label={`Callout ${n} ${f.label}`}
                        onChange={(e) => setCallout(i, { [f.key]: e.target.value })}
                      />
                    </label>
                  ))}
                </div>
                {!isPlaced(c) && <p className="hint">Click the photo to place this dot.</p>}
              </li>
            );
          })}
        </ol>
        <button className="primary wide" onClick={addCallout} disabled={job.callouts.length >= MAX_CALLOUTS}>
          + Add callout
        </button>
        {job.callouts.length >= MAX_CALLOUTS && <p className="note">8 callouts is the most for one photo.</p>}
      </section>

      <section className="main-col">
        <h2>1. Place the dots</h2>
        <DotPlacer
          job={job}
          photoUrl={photoUrl}
          active={active}
          hover={hover}
          onHover={setHover}
          onPick={setActive}
          onMove={(i, x, y) => setCallout(i, { x, y })}
        />

        <h2>2. Preview</h2>
        {fitProblem && <p className="alert" role="alert">{fitProblem.message}</p>}
        {videoProps && meta && (
          <Preview props={videoProps} width={meta.width} height={meta.height} frames={meta.durationInFrames} />
        )}
        {videoProps?.callouts.length === 0 && (
          <p className="note">Add a callout and place its dot to see it here.</p>
        )}

        <h2>3. Make the video</h2>
        <RenderPanel
          id={id}
          job={job}
          hadVideo={hasVideo}
          blocked={
            job.callouts.length === 0
              ? "Add at least one callout first."
              : unplaced.length
                ? `Place the dot for callout ${unplaced.join(", ")} first (click on the photo).`
                : fitProblem
                  ? "Fix the problem shown above the preview first."
                  : saveState !== "saved"
                    ? "Saving…"
                    : null
          }
        />
      </section>
    </div>
  );
};

// ------------------------------------------------------------ placing dots

const DotPlacer: React.FC<{
  job: SavedJob;
  photoUrl: string;
  active: number;
  hover: number | null;
  onHover: (i: number | null) => void;
  onPick: (i: number) => void;
  onMove: (i: number, x: number, y: number) => void;
}> = ({ job, photoUrl, active, hover, onHover, onPick, onMove }) => {
  const box = useRef<HTMLDivElement>(null);
  const dragging = useRef<number | null>(null);

  const at = (e: React.PointerEvent) => {
    const r = box.current!.getBoundingClientRect();
    const clamp = (v: number) => Math.min(1, Math.max(0, v));
    return { x: clamp((e.clientX - r.left) / r.width), y: clamp((e.clientY - r.top) / r.height) };
  };

  const activeCallout = job.callouts[active];
  const tip =
    job.callouts.length === 0
      ? "Add a callout on the left, then click here to place its dot."
      : activeCallout && !isPlaced(activeCallout)
        ? `Click the photo where ${calloutName(activeCallout, active + 1)} should point.`
        : "Drag any dot to move it. The numbers match the callouts on the left.";

  return (
    <div className="placer-wrap">
      <p className="hint">{tip}</p>
      <div
        ref={box}
        className="placer"
        style={{ aspectRatio: `${job.photoWidth} / ${job.photoHeight}` }}
        data-testid="placer"
        onPointerDown={(e) => {
          // A click only places a dot that has not been placed yet;
          // placed dots move only by dragging, so they can't jump by accident.
          if (e.button !== 0 || !activeCallout || isPlaced(activeCallout)) return;
          const p = at(e);
          onMove(active, p.x, p.y);
          dragging.current = active;
          box.current!.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (dragging.current === null) return;
          const p = at(e);
          onMove(dragging.current, p.x, p.y);
        }}
        onPointerUp={() => (dragging.current = null)}
        onPointerCancel={() => (dragging.current = null)}
      >
        <img src={photoUrl} alt="Job photo" draggable={false} />
        {job.callouts.map((c, i) =>
          isPlaced(c) ? (
            <div
              key={i}
              className={`marker ${i === active ? "active" : ""} ${i === hover ? "hover" : ""}`}
              style={{ left: `${c.x * 100}%`, top: `${c.y * 100}%` }}
              data-testid={`marker-${i + 1}`}
              onPointerDown={(e) => {
                if (e.button !== 0) return;
                e.stopPropagation();
                onPick(i);
                dragging.current = i;
                box.current!.setPointerCapture(e.pointerId);
              }}
              onMouseEnter={() => onHover(i)}
              onMouseLeave={() => onHover(null)}
              title={`Callout ${i + 1}: drag to move`}
            >
              <span className="marker-dot" />
              <span className="marker-label">
                {i + 1}
                {c.surface.trim() ? ` ${c.surface.trim()}` : ""}
              </span>
            </div>
          ) : null,
        )}
      </div>
    </div>
  );
};

// ------------------------------------------------------------ preview

const Preview: React.FC<{ props: VideoProps; width: number; height: number; frames: number }> = ({
  props,
  width,
  height,
  frames,
}) => {
  const ref = useRef<PlayerRef>(null);
  useEffect(() => {
    // Lets the automatic checks jump to a frame; harmless otherwise.
    (window as any).__previewPlayer = ref.current;
  });
  return (
    <div className="preview" style={{ maxWidth: width >= height ? "100%" : `min(100%, ${(70 * width) / height}vh)` }}>
      <Player
        ref={ref}
        component={ProjectVideo}
        inputProps={props}
        durationInFrames={frames}
        compositionWidth={width}
        compositionHeight={height}
        fps={FPS}
        controls
        clickToPlay
        style={{ width: "100%", aspectRatio: `${width} / ${height}` }}
        acknowledgeRemotionLicense
      />
      <p className="note">
        {width} × {height} pixels · {(frames / FPS).toFixed(1)} seconds
      </p>
    </div>
  );
};

// ------------------------------------------------------------ rendering

const RenderPanel: React.FC<{ id: string; job: SavedJob; hadVideo: boolean; blocked: string | null }> = ({
  id,
  job,
  hadVideo,
  blocked,
}) => {
  const [status, setStatus] = useState<RenderStatus | null>(null);
  const working = status?.state === "preparing" || status?.state === "rendering";

  useEffect(() => {
    api.renderStatus(id).then(setStatus, () => {});
  }, [id]);

  useEffect(() => {
    if (!working) return;
    const t = setInterval(() => api.renderStatus(id).then(setStatus, () => {}), 700);
    return () => clearInterval(t);
  }, [working, id]);

  const start = async () => {
    await api.saveJob(id, job); // make sure the latest changes are on disk
    setStatus(await api.startRender(id));
  };

  const pct = Math.round((status?.progress ?? 0) * 100);
  return (
    <div className="render">
      <button className="primary big" onClick={start} disabled={!!blocked || working}>
        {working ? "Making the video…" : "Make video"}
      </button>
      {blocked && !working && <p className="note">{blocked}</p>}
      {working && (
        <div className="progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <div className="progress-bar" style={{ width: `${pct}%` }} />
          <span>
            {status!.state === "preparing"
              ? "Getting ready… (the first video after starting takes a little longer)"
              : `Making the video: ${pct}%`}
          </span>
        </div>
      )}
      {status?.state === "done" && (
        <div className="done">
          <p>✓ Your video is ready. It is saved as video.mp4 in this job's folder.</p>
          <button onClick={() => api.openFolder(id)}>Open the folder</button>
        </div>
      )}
      {hadVideo && (!status || status.state === "idle") && (
        <div className="done">
          <p>A video was made for this job earlier. Make it again to include your latest changes.</p>
          <button onClick={() => api.openFolder(id)}>Open the folder</button>
        </div>
      )}
      {status?.state === "error" && <p className="alert">The video could not be made: {status.message}</p>}
    </div>
  );
};
