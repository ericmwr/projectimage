// Checks the card-placement rules for many random dot positions.
// Run with: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  dotKeepOut,
  layoutCards,
  nearestPointOnRect,
  rectsOverlap,
  segmentHitsRect,
  toScreen,
  type LayoutOptions,
  type Point,
  type Size,
} from "./layout";

const options: LayoutOptions = {
  frame: { w: 1920, h: 1440 },
  margin: 48,
  cardGap: 24,
  dotClearance: 40,
  zoomCenter: { x: 960, y: 720 },
  zoomEnd: 1.04,
};

// Card sizes close to the real ones (widest product name is about 560px).
const cardSizes: Size[] = [
  { w: 560, h: 200 },
  { w: 520, h: 200 },
  { w: 600, h: 200 },
  { w: 420, h: 200 },
];

// Simple repeatable random numbers so failures can be reproduced.
const random = (seed: number) => () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};

const checkRules = (dots: Point[], sizes: Size[], label: string) => {
  const rects = layoutCards(dots, sizes, options);
  assert.equal(rects.length, dots.length, label);
  rects.forEach((r, i) => {
    assert.equal(r.w, sizes[i].w);
    assert.ok(r.x >= options.margin - 1e-6, `${label}: card ${i} off left`);
    assert.ok(r.y >= options.margin - 1e-6, `${label}: card ${i} off top`);
    assert.ok(r.x + r.w <= 1920 - options.margin + 1e-6, `${label}: card ${i} off right`);
    assert.ok(r.y + r.h <= 1440 - options.margin + 1e-6, `${label}: card ${i} off bottom`);
    rects.forEach((other, j) => {
      if (j > i) {
        assert.ok(!rectsOverlap(r, other, options.cardGap), `${label}: cards ${i},${j} overlap`);
      }
    });
    dots.forEach((d, j) => {
      assert.ok(!rectsOverlap(r, dotKeepOut(d, options)), `${label}: card ${i} covers dot ${j}`);
    });
    const anchor = toScreen(dots[i], 1.02, options.zoomCenter);
    const end = nearestPointOnRect(anchor, r);
    rects.forEach((other, j) => {
      if (j !== i) {
        assert.ok(!segmentHitsRect(anchor, end, other), `${label}: line ${i} under card ${j}`);
      }
    });
  });
};

test("the sample job's four callouts", () => {
  const dots = [
    { x: 0.25, y: 0.18 },
    { x: 0.75, y: 0.575 },
    { x: 0.8, y: 0.47 },
    { x: 0.72, y: 0.085 },
  ].map((p) => ({ x: p.x * 1920, y: p.y * 1440 }));
  checkRules(dots, cardSizes, "sample");
});

test("1 to 4 callouts at random positions (400 layouts each)", () => {
  const rand = random(12345);
  for (let count = 1; count <= 4; count++) {
    for (let n = 0; n < 400; n++) {
      const dots = Array.from({ length: count }, () => ({
        x: rand() * 1920,
        y: rand() * 1440,
      }));
      checkRules(dots, cardSizes.slice(0, count), `count ${count} #${n}`);
    }
  }
});

test("hard cases: all dots bunched together, in corners, on edges", () => {
  const cases: Point[][] = [
    [{ x: 960, y: 720 }, { x: 980, y: 730 }, { x: 950, y: 700 }, { x: 970, y: 710 }],
    [{ x: 0, y: 0 }, { x: 1920, y: 0 }, { x: 0, y: 1440 }, { x: 1920, y: 1440 }],
    [{ x: 10, y: 10 }, { x: 30, y: 20 }, { x: 20, y: 40 }, { x: 40, y: 40 }],
    [{ x: 200, y: 720 }, { x: 700, y: 720 }, { x: 1200, y: 720 }, { x: 1700, y: 720 }],
    [{ x: 960, y: 100 }, { x: 960, y: 500 }, { x: 960, y: 900 }, { x: 960, y: 1300 }],
  ];
  cases.forEach((dots, i) => checkRules(dots, cardSizes, `hard case ${i}`));
});
