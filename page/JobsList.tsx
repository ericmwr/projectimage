import React, { useEffect, useRef, useState } from "react";
import { api, type JobSummary } from "./api";
import { go } from "./App";
import { suggestJobName } from "./names";
import { preparePhoto, type PreparedPhoto } from "./photo";

const when = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

export const JobsList: React.FC = () => {
  const [jobs, setJobs] = useState<JobSummary[] | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [picked, setPicked] = useState<{ prepared: PreparedPhoto; name: string; preview: string } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.listJobs().then(setJobs, (e) => setError(e.message));
  }, []);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setError("");
    setBusy("Opening the photo…");
    try {
      const prepared = await preparePhoto(file);
      setPicked({ prepared, name: suggestJobName(file.name), preview: URL.createObjectURL(prepared.thumb) });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  const create = async () => {
    if (!picked) return;
    setBusy("Copying the photo into your jobs folder…");
    try {
      const { prepared, name } = picked;
      const { id } = await api.createJob(name.trim() || "New job", prepared.photo, prepared.width, prepared.height);
      await api.saveThumb(id, prepared.thumb);
      go(`/job/${encodeURIComponent(id)}`);
    } catch (e) {
      setError((e as Error).message);
      setBusy("");
    }
  };

  const openExample = async () => {
    setBusy("Copying the example…");
    try {
      const { id } = await api.copyExample();
      go(`/job/${encodeURIComponent(id)}`);
    } catch (e) {
      setError((e as Error).message);
      setBusy("");
    }
  };

  return (
    <div className="page">
      <div className="page-head">
        <h1>Your jobs</h1>
        <button className="primary" onClick={() => fileInput.current?.click()} disabled={!!busy}>
          + New job
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/*"
          hidden
          onChange={(e) => onFile(e.target.files?.[0])}
          data-testid="photo-input"
        />
      </div>

      {error && <p className="alert">{error}</p>}
      {busy && <p className="note">{busy}</p>}

      {picked && (
        <div className="dialog-backdrop">
          <div className="dialog" role="dialog" aria-label="Name the new job">
            <h2>New job</h2>
            <img src={picked.preview} alt="" className="dialog-photo" />
            <p className="note">
              {picked.prepared.width > picked.prepared.height ? "Wide" : picked.prepared.width < picked.prepared.height ? "Upright" : "Square"}{" "}
              photo. The video will have the same shape.
            </p>
            <label className="field">
              <span>Job name</span>
              <input
                autoFocus
                value={picked.name}
                onChange={(e) => setPicked({ ...picked, name: e.target.value })}
                onKeyDown={(e) => e.key === "Enter" && create()}
              />
            </label>
            <div className="dialog-buttons">
              <button onClick={() => setPicked(null)} disabled={!!busy}>
                Cancel
              </button>
              <button className="primary" onClick={create} disabled={!!busy}>
                Create job
              </button>
            </div>
          </div>
        </div>
      )}

      {jobs === null ? (
        <p className="note">Loading…</p>
      ) : (
        <div className="job-grid">
          {jobs.map((j) => (
            <a key={j.id} className="job-card" href={`#/job/${encodeURIComponent(j.id)}`}>
              <div className="job-thumb">
                <img src={j.thumbUrl} alt="" onError={(e) => (e.currentTarget.style.visibility = "hidden")} />
              </div>
              <div className="job-info">
                <strong>{j.name}</strong>
                <span>
                  {j.calloutCount} callout{j.calloutCount === 1 ? "" : "s"} · {when(j.updatedAt)}
                </span>
                {j.hasVideo && <span className="tag">Video made</span>}
              </div>
            </a>
          ))}
          <button className="job-card example-card" onClick={openExample} disabled={!!busy}>
            <div className="job-thumb example-thumb">Example</div>
            <div className="job-info">
              <strong>Try the example</strong>
              <span>Opens a copy of the sample kitchen job</span>
            </div>
          </button>
        </div>
      )}
      {jobs?.length === 0 && (
        <p className="note">No jobs yet. Click “+ New job” and pick a photo from anywhere on your PC.</p>
      )}
    </div>
  );
};
