// Checks the card-placement rules for many random dot positions.
// Every rule is checked at 41 moments across the zoom, not just start and end.
// Run with: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
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

// The rules from the brief.
const MIN_ANGLED = 40;
const MIN_LEVEL = 40;
const DOT_SIZE = 11 + 3; // dot radius plus ring

const options: LayoutOptions = {
  frame: { w: 1920, h: 1440 },
  margin: 48,
  cardGap: 24,
  dotClearance: DOT_SIZE + 20,
  lineDotClearance: DOT_SIZE + 4,
  minAngled: MIN_ANGLED,
  minLevel: MIN_LEVEL,
  zoomCenter: { x: 960, y: 720 },
  zoomEnd: 1.04,
};

// Card sizes close to the real ones.
const cardSizes: Size[] = [
  { w: 500, h: 170 },
  { w: 470, h: 170 },
  { w: 540, h: 170 },
  { w: 380, h: 170 },
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

const checkRules = (dots: Point[], sizes: Size[], label: string) => {
  const rects = layoutCards(dots, sizes, options);
  assert.equal(rects.length, dots.length, label);

  rects.forEach((r, i) => {
    const at = `${label}, card ${i}`;
    // Fully on screen.
    assert.ok(r.x >= options.margin - 1e-6, `${at}: off left`);
    assert.ok(r.y >= options.margin - 1e-6, `${at}: off top`);
    assert.ok(r.x + r.w <= 1920 - options.margin + 1e-6, `${at}: off right`);
    assert.ok(r.y + r.h <= 1440 - options.margin + 1e-6, `${at}: off bottom`);
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

test("the sample job's four callouts", () => {
  const dots = [
    { x: 0.25, y: 0.18 },
    { x: 0.75, y: 0.56 },
    { x: 0.8, y: 0.47 },
    { x: 0.72, y: 0.085 },
  ].map((p) => ({ x: p.x * 1920, y: p.y * 1440 }));
  checkRules(dots, cardSizes, "sample");
});

// With the bent-line rules, a few dot arrangements have no possible layout
// (for example two dots almost touching, or a dot hard against an edge with
// no room for a card diagonally from it). For those the tool must stop with
// a clear message, never produce a layout that breaks a rule.
const isClearError = (e: unknown) =>
  e instanceof Error && /no room for the card|Could not place all the callout cards/.test(e.message);

test("1 to 4 callouts at random positions (300 layouts each)", () => {
  const rand = random(12345);
  let placed = 0;
  let total = 0;
  for (let count = 1; count <= 4; count++) {
    for (let n = 0; n < 300; n++) {
      const dots = Array.from({ length: count }, () => ({
        x: rand() * 1920,
        y: rand() * 1440,
      }));
      total++;
      try {
        checkRules(dots, cardSizes.slice(0, count), `count ${count} #${n}`);
        placed++;
      } catch (e) {
        if (!isClearError(e)) throw e; // a broken rule fails the test
      }
    }
  }
  assert.ok(placed / total >= 0.98, `only ${placed} of ${total} random layouts placed`);
});

test("spread-out cases: corners, in a row, in a column, around the middle", () => {
  const cases: Point[][] = [
    [{ x: 0, y: 0 }, { x: 1920, y: 0 }, { x: 0, y: 1440 }, { x: 1920, y: 1440 }],
    [{ x: 200, y: 720 }, { x: 700, y: 720 }, { x: 1200, y: 720 }, { x: 1700, y: 720 }],
    [{ x: 960, y: 100 }, { x: 960, y: 500 }, { x: 960, y: 900 }, { x: 960, y: 1300 }],
    [{ x: 860, y: 620 }, { x: 1060, y: 620 }, { x: 860, y: 820 }, { x: 1060, y: 820 }],
  ];
  cases.forEach((dots, i) => checkRules(dots, cardSizes, `spread case ${i}`));
});

test("impossible cases stop with a clear message", () => {
  const cases: Point[][] = [
    // four dots almost on top of each other
    [{ x: 960, y: 720 }, { x: 980, y: 730 }, { x: 950, y: 700 }, { x: 970, y: 710 }],
    // four dots bunched in a corner
    [{ x: 10, y: 10 }, { x: 30, y: 20 }, { x: 20, y: 40 }, { x: 40, y: 40 }],
  ];
  cases.forEach((dots) =>
    assert.throws(() => layoutCards(dots, cardSizes, options), isClearError),
  );
});
