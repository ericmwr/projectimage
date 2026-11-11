// Checks the card-placement rules for 1 to 8 callouts in wide and upright videos.
// Every rule is checked at 41 moments across the zoom, not just start and end.
// Run with: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  LayoutError,
  angledLength,
  layoutCards,
  leaderPath,
  levelLength,
  rectsOverlap,
  segmentHitsRect,
  toScreen,
  type LayoutOptions,
  type Point,
  type Rect,
  type Size,
} from "./layout";
import { shapeProblem, videoSize } from "./shape";

// The rules from the brief.
const MIN_ANGLED = 40;
const MIN_LEVEL = 40;
const DOT_SIZE = 11 + 3; // dot radius plus ring

const optionsFor = (w: number, h: number): LayoutOptions => ({
  frame: { w, h },
  margin: 48,
  cardGap: 24,
  dotClearance: DOT_SIZE + 20,
  lineDotClearance: DOT_SIZE + 4,
  minAngled: MIN_ANGLED,
  minLevel: MIN_LEVEL,
  zoomCenter: { x: w / 2, y: h / 2 },
  zoomEnd: 1.04,
});

// Card sizes measured from the real video (widest is the longest product name).
const cardSizes: Size[] = [
  { w: 390, h: 178 },
  { w: 370, h: 178 },
  { w: 400, h: 178 },
  { w: 240, h: 178 },
  { w: 370, h: 178 },
  { w: 300, h: 178 },
  { w: 430, h: 178 },
  { w: 330, h: 178 },
];

// Video shapes: 4:3 wide, 3:4 upright, 16:9 wide, 9:16 upright, and the 2:1 limits.
const SHAPES: [number, number][] = [
  [1920, 1440],
  [1440, 1920],
  [2560, 1440],
  [1440, 2560],
  [2880, 1440],
  [1440, 2880],
];

// Simple repeatable random numbers so failures can be reproduced.
const random = (seed: number) => () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};

const pointToRect = (p: Point, r: Rect) => {
  const dx = Math.max(r.x - p.x, 0, p.x - (r.x + r.w));
  const dy = Math.max(r.y - p.y, 0, p.y - (r.y + r.h));
  return Math.hypot(dx, dy);
};

const pointToSegment = (p: Point, a: Point, b: Point) => {
  const vx = b.x - a.x;
  const vy = b.y - a.y;
  const len2 = vx * vx + vy * vy;
  const t = len2 ? Math.max(0, Math.min(1, ((p.x - a.x) * vx + (p.y - a.y) * vy) / len2)) : 0;
  return Math.hypot(p.x - (a.x + t * vx), p.y - (a.y + t * vy));
};

const ZOOMS = Array.from({ length: 41 }, (_, i) => 1 + (0.04 * i) / 40);
const near = (a: number, b: number) => Math.abs(a - b) < 1e-6;

const checkRules = (dots: Point[], sizes: Size[], w: number, h: number, label: string) => {
  const options = optionsFor(w, h);
  const rects = layoutCards(dots, sizes, options);
  assert.equal(rects.length, dots.length, label);

  rects.forEach((r, i) => {
    const at = `${label}, card ${i}`;
    // Fully on screen.
    assert.ok(r.x >= options.margin - 1e-6, `${at}: off left`);
    assert.ok(r.y >= options.margin - 1e-6, `${at}: off top`);
    assert.ok(r.x + r.w <= w - options.margin + 1e-6, `${at}: off right`);
    assert.ok(r.y + r.h <= h - options.margin + 1e-6, `${at}: off bottom`);
    // No overlapping cards.
    rects.forEach((other, j) => {
      if (j > i) assert.ok(!rectsOverlap(r, other, options.cardGap), `${at}: overlaps card ${j}`);
    });

    for (const z of ZOOMS) {
      const screenDots = dots.map((d) => toScreen(d, z, options.zoomCenter));
      const d = screenDots[i];
      const l = leaderPath(d, r);
      const when = `${at} at zoom ${z.toFixed(3)}`;

      // No card covers any dot.
      screenDots.forEach((sd, j) =>
        assert.ok(pointToRect(sd, r) > DOT_SIZE, `${when}: covers dot ${j}`),
      );
      // Beside the dot, and entirely above or below it.
      assert.ok(d.x < r.x || d.x > r.x + r.w, `${when}: card straight above/below its dot`);
      assert.ok(d.y < r.y || d.y > r.y + r.h, `${when}: card level with its dot`);
      // The shape of the line: 45 degrees, then level into the card's side at mid-height.
      assert.ok(
        near(Math.abs(l.elbow.x - d.x), Math.abs(l.elbow.y - d.y)),
        `${when}: first part not 45 degrees`,
      );
      assert.ok(near(l.elbow.y, l.end.y), `${when}: second part not level`);
      assert.ok(near(l.end.y, r.y + r.h / 2), `${when}: not at card mid-height`);
      assert.ok(near(l.end.x, r.x) || near(l.end.x, r.x + r.w), `${when}: not on card side`);
      // Both parts long enough to see.
      assert.ok(angledLength(l) >= MIN_ANGLED, `${when}: angled part ${angledLength(l)} too short`);
      assert.ok(levelLength(l) >= MIN_LEVEL, `${when}: level part ${levelLength(l)} too short`);
      // The line never passes through another card or another dot.
      rects.forEach((other, j) => {
        if (j === i) return;
        assert.ok(!segmentHitsRect(l.start, l.elbow, other), `${when}: line under card ${j}`);
        assert.ok(!segmentHitsRect(l.elbow, l.end, other), `${when}: line under card ${j}`);
      });
      screenDots.forEach((sd, j) => {
        if (j === i) return;
        const gap = Math.min(pointToSegment(sd, l.start, l.elbow), pointToSegment(sd, l.elbow, l.end));
        assert.ok(gap > DOT_SIZE, `${when}: line runs over dot ${j}`);
      });
    }
  });
};

/** A "does not fit" error must name real callouts and say what to do. */
const checkClearError = (e: unknown, count: number, label: string) => {
  assert.ok(e instanceof LayoutError, `${label}: unexpected error ${e}`);
  assert.ok(e.callouts.length > 0, `${label}: error names no callout`);
  for (const n of e.callouts) assert.ok(n >= 1 && n <= count, `${label}: names callout ${n}`);
  assert.match(e.message, /callout \d/);
  assert.match(e.message, /Move|moving/);
};

test("the sample job's four callouts", () => {
  const dots = [
    { x: 0.25, y: 0.18 },
    { x: 0.75, y: 0.56 },
    { x: 0.8, y: 0.47 },
    { x: 0.72, y: 0.085 },
  ].map((p) => ({ x: p.x * 1920, y: p.y * 1440 }));
  checkRules(dots, cardSizes.slice(0, 4), 1920, 1440, "sample");
});

test("1 to 8 callouts at random positions, wide and upright videos", () => {
  const rand = random(12345);
  let placed = 0;
  let total = 0;
  for (const [w, h] of SHAPES) {
    for (let count = 1; count <= 8; count++) {
      for (let n = 0; n < 6; n++) {
        // Dots at least 150 pixels apart, like callouts on different surfaces.
        const dots: Point[] = [];
        while (dots.length < count) {
          const p = { x: rand() * w, y: rand() * h };
          if (dots.every((d) => Math.hypot(d.x - p.x, d.y - p.y) > 150)) dots.push(p);
        }
        const label = `${w}x${h}, ${count} callouts #${n}`;
        total++;
        try {
          checkRules(dots, cardSizes.slice(0, count), w, h, label);
          placed++;
        } catch (e) {
          if (e instanceof assert.AssertionError) throw e; // a broken rule fails the test
          checkClearError(e, count, label);
        }
      }
    }
  }
  assert.ok(placed / total >= 0.9, `only ${placed} of ${total} random layouts placed`);
});

test("8 callouts spread around the photo fit in every shape", () => {
  for (const [w, h] of SHAPES) {
    // Two columns of four dots, a third and two thirds of the way across.
    const dots: Point[] = [];
    for (let k = 0; k < 4; k++) {
      dots.push({ x: w * 0.3, y: h * (0.15 + 0.23 * k) });
      dots.push({ x: w * 0.7, y: h * (0.12 + 0.23 * k) });
    }
    checkRules(dots, cardSizes, w, h, `spread 8 in ${w}x${h}`);
  }
});

test("corners, rows and columns", () => {
  const cases: Point[][] = [
    [{ x: 0, y: 0 }, { x: 1920, y: 0 }, { x: 0, y: 1440 }, { x: 1920, y: 1440 }],
    [{ x: 200, y: 720 }, { x: 700, y: 720 }, { x: 1200, y: 720 }, { x: 1700, y: 720 }],
    [{ x: 960, y: 100 }, { x: 960, y: 500 }, { x: 960, y: 900 }, { x: 960, y: 1300 }],
  ];
  cases.forEach((dots, i) => checkRules(dots, cardSizes.slice(0, 4), 1920, 1440, `case ${i}`));
});

test("impossible layouts stop with a message naming the callout to move", () => {
  const o = optionsFor(1920, 1440);
  // Four dots almost on top of each other.
  const bunched = [{ x: 960, y: 720 }, { x: 980, y: 730 }, { x: 950, y: 700 }, { x: 970, y: 710 }];
  try {
    layoutCards(bunched, cardSizes.slice(0, 4), o);
    assert.fail("bunched dots should not fit");
  } catch (e) {
    checkClearError(e, 4, "bunched");
  }
  // The sample's four callouts plus a fifth dot right next to the second one:
  // the message must point at the newcomer.
  const sample = [
    { x: 480, y: 259 },
    { x: 1440, y: 806 },
    { x: 1536, y: 677 },
    { x: 1382, y: 122 },
    { x: 1452, y: 800 },
  ];
  try {
    layoutCards(sample, cardSizes.slice(0, 5), o);
    assert.fail("crowded dots should not fit");
  } catch (e) {
    checkClearError(e, 5, "crowded");
    assert.ok((e as LayoutError).callouts.includes(5), `named ${(e as LayoutError).callouts}`);
  }
});

test("video size follows the photo shape with a 1440-pixel short side", () => {
  assert.deepEqual(videoSize(4000, 3000), { width: 1920, height: 1440 });
  assert.deepEqual(videoSize(3000, 4000), { width: 1440, height: 1920 });
  assert.deepEqual(videoSize(4032, 2268), { width: 2560, height: 1440 });
  assert.deepEqual(videoSize(2268, 4032), { width: 1440, height: 2560 });
  for (const [pw, ph] of [[4000, 2999], [3001, 4000], [1234, 999]]) {
    const { width, height } = videoSize(pw, ph);
    assert.equal(Math.min(width, height), 1440);
    assert.equal(width % 2, 0, "width must be even for MP4");
    assert.equal(height % 2, 0, "height must be even for MP4");
  }
  assert.equal(shapeProblem(4000, 2000), null, "exactly 2:1 is allowed");
  assert.equal(shapeProblem(2000, 4000), null, "exactly 1:2 is allowed");
  assert.match(shapeProblem(4000, 1900) ?? "", /very wide/);
  assert.match(shapeProblem(1000, 3000) ?? "", /very tall/);
});
