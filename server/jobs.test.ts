// Checks the job-saving helpers. Run with: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildSuggestions,
  cleanJob,
  isSafeId,
  parseSurfaceList,
  safeFolderName,
  uniqueFolderName,
  type SavedJob,
} from "./jobs-lib.ts";
import { suggestJobName } from "../page/names.ts";

test("job names become safe Windows folder names", () => {
  assert.equal(safeFolderName("Smith kitchen"), "Smith kitchen");
  assert.equal(safeFolderName('Smith: "kitchen" / bath?'), "Smith kitchen bath");
  assert.equal(safeFolderName("  ..  "), "Job");
  assert.equal(safeFolderName("CON"), "Job");
  assert.equal(uniqueFolderName("Smith", new Set(["smith", "Smith (2)"])), "Smith (3)");
  assert.ok(!isSafeId("../secrets"));
  assert.ok(!isSafeId("a/b"));
  assert.ok(isSafeId("Smith kitchen (2)"));
});

test("job names are suggested from photo file names", () => {
  assert.equal(suggestJobName("20260922_103817.jpg"), "Job 2026-09-22");
  assert.equal(suggestJobName("IMG_20260101_090000.JPG"), "Job 2026-01-01");
  assert.equal(suggestJobName("PXL_20251231_235959123.jpg"), "Job 2025-12-31");
  assert.equal(suggestJobName("smith-kitchen_final.jpeg"), "smith kitchen final");
  assert.equal(suggestJobName(".jpg"), "New job");
});

test("suggestions come from earlier jobs, most used first, plus the surface list", () => {
  const jobs = [
    { callouts: [{ surface: "Walls", product: "Emerald", color: "Accessible Beige", sheen: "Matte" }] },
    { callouts: [{ surface: "Shutters", product: "Emerald", color: "Tricorn Black", sheen: "" }] },
    { callouts: [{ surface: "walls", product: "Duration", color: "Accessible Beige", sheen: "Satin" }] },
  ];
  const s = buildSuggestions(jobs, ["Walls", "Ceiling"]);
  assert.deepEqual(s.surface, ["Walls", "Ceiling", "Shutters"]);
  assert.deepEqual(s.product, ["Emerald", "Duration"]);
  assert.deepEqual(s.color, ["Accessible Beige", "Tricorn Black"]);
  assert.deepEqual(s.sheen, ["Matte", "Satin"]);
});

test("the surface list file skips notes and blank lines", () => {
  assert.deepEqual(parseSurfaceList("# note\nWalls\r\n\n  Trim  \n"), ["Walls", "Trim"]);
});

test("saved jobs are cleaned up: at most 8 callouts, dots kept inside the photo", () => {
  const existing: SavedJob = {
    name: "Old",
    photo: "photo.jpg",
    photoWidth: 4000,
    photoHeight: 3000,
    callouts: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
  const many = Array.from({ length: 10 }, (_, i) => ({ surface: `S${i}`, x: 1.5, y: -0.2 }));
  const cleaned = cleanJob({ name: "New", callouts: many, photo: "../../evil.jpg" }, existing);
  assert.equal(cleaned.name, "New");
  assert.equal(cleaned.photo, "photo.jpg", "the photo file name cannot be changed");
  assert.equal(cleaned.callouts.length, 8);
  assert.equal(cleaned.callouts[0].x, 1);
  assert.equal(cleaned.callouts[0].y, 0);
  const unplaced = cleanJob({ callouts: [{ surface: "Walls", x: null, y: null }] }, existing);
  assert.equal(unplaced.callouts[0].x, null);
});
