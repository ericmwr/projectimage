// =====================================================================
// Card placement. Pure math, no drawing, so it can be tested on its own.
//
// Given where each dot is and how big each card is, pick a spot for every
// card so that:
//   - every card is fully on screen (inside a safe margin),
//   - no two cards overlap (with a gap between them),
//   - no card covers any dot, at any moment of the slow zoom,
//   - no leader line runs underneath another card.
// Among all layouts that meet those rules, it picks the one with the
// shortest leader lines and fewest crossing lines.
// =====================================================================

export type Point = { x: number; y: number };
export type Size = { w: number; h: number };
export type Rect = { x: number; y: number; w: number; h: number };

export type LayoutOptions = {
  frame: Size;
  /** Space kept clear at every edge of the video. */
  margin: number;
  /** Minimum space between two cards. */
  cardGap: number;
  /** Minimum space between any dot's center and any card. */
  dotClearance: number;
  /** Center of the zoom, in screen pixels. */
  zoomCenter: Point;
  /** Largest zoom reached during the video (1.04 = 4 percent). */
  zoomEnd: number;
};

/** Where a photo point (in pixels at zoom 1) lands on screen at a given zoom. */
export const toScreen = (p: Point, zoom: number, center: Point): Point => ({
  x: center.x + (p.x - center.x) * zoom,
  y: center.y + (p.y - center.y) * zoom,
});

export const rectsOverlap = (a: Rect, b: Rect, gap = 0): boolean =>
  a.x < b.x + b.w + gap &&
  b.x < a.x + a.w + gap &&
  a.y < b.y + b.h + gap &&
  b.y < a.y + a.h + gap;

export const nearestPointOnRect = (p: Point, r: Rect): Point => ({
  x: Math.min(Math.max(p.x, r.x), r.x + r.w),
  y: Math.min(Math.max(p.y, r.y), r.y + r.h),
});

const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

/** True if the line segment a-b passes through rectangle r. */
export const segmentHitsRect = (a: Point, b: Point, r: Rect): boolean => {
  // Liang-Barsky clipping.
  let t0 = 0;
  let t1 = 1;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const checks: [number, number][] = [
    [-dx, a.x - r.x],
    [dx, r.x + r.w - a.x],
    [-dy, a.y - r.y],
    [dy, r.y + r.h - a.y],
  ];
  for (const [p, q] of checks) {
    if (p === 0) {
      if (q < 0) return false;
    } else {
      const t = q / p;
      if (p < 0) {
        if (t > t1) return false;
        if (t > t0) t0 = t;
      } else {
        if (t < t0) return false;
        if (t < t1) t1 = t;
      }
    }
  }
  return t1 - t0 > 1e-9;
};

const segmentsCross = (a: Point, b: Point, c: Point, d: Point): boolean => {
  const cross = (p: Point, q: Point, r: Point) =>
    (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
  const d1 = cross(c, d, a);
  const d2 = cross(c, d, b);
  const d3 = cross(a, b, c);
  const d4 = cross(a, b, d);
  return d1 * d2 < 0 && d3 * d4 < 0;
};

/**
 * The area a dot sweeps across during the zoom, grown by the clearance.
 * A card touching this box could cover the dot at some moment.
 */
export const dotKeepOut = (dot: Point, o: LayoutOptions): Rect => {
  const a = toScreen(dot, 1, o.zoomCenter);
  const b = toScreen(dot, o.zoomEnd, o.zoomCenter);
  const x0 = Math.min(a.x, b.x) - o.dotClearance;
  const y0 = Math.min(a.y, b.y) - o.dotClearance;
  const x1 = Math.max(a.x, b.x) + o.dotClearance;
  const y1 = Math.max(a.y, b.y) + o.dotClearance;
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
};

type Candidate = { rect: Rect; cost: number; anchor: Point; end: Point };

const clampRect = (r: Rect, o: LayoutOptions): Rect => ({
  ...r,
  x: Math.min(Math.max(r.x, o.margin), o.frame.w - o.margin - r.w),
  y: Math.min(Math.max(r.y, o.margin), o.frame.h - o.margin - r.h),
});

const fitsOnScreen = (r: Rect, o: LayoutOptions) =>
  r.x >= o.margin - 1e-6 &&
  r.y >= o.margin - 1e-6 &&
  r.x + r.w <= o.frame.w - o.margin + 1e-6 &&
  r.y + r.h <= o.frame.h - o.margin + 1e-6;

/** Every reasonable spot for one card, cheapest (closest) first. */
const candidatesFor = (
  index: number,
  dots: Point[],
  size: Size,
  o: LayoutOptions,
  grid: boolean,
): Candidate[] => {
  const keepOuts = dots.map((d) => dotKeepOut(d, o));
  // Measure leader lines from the dot's middle-of-zoom position.
  const anchor = toScreen(dots[index], (1 + o.zoomEnd) / 2, o.zoomCenter);
  const rects: Rect[] = [];

  if (grid) {
    const step = 40;
    for (let y = o.margin; y <= o.frame.h - o.margin - size.h; y += step) {
      for (let x = o.margin; x <= o.frame.w - o.margin - size.w; x += step) {
        rects.push({ x, y, w: size.w, h: size.h });
      }
    }
  } else {
    for (let deg = 0; deg < 360; deg += 15) {
      const ux = Math.cos((deg * Math.PI) / 180);
      const uy = Math.sin((deg * Math.PI) / 180);
      for (const d of [70, 110, 160, 230, 320, 440]) {
        const cx = anchor.x + ux * (d + size.w / 2);
        const cy = anchor.y + uy * (d + size.h / 2);
        rects.push(
          clampRect(
            { x: cx - size.w / 2, y: cy - size.h / 2, w: size.w, h: size.h },
            o,
          ),
        );
      }
    }
  }

  const seen = new Set<string>();
  const out: Candidate[] = [];
  for (const rect of rects) {
    const key = `${Math.round(rect.x)},${Math.round(rect.y)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (!fitsOnScreen(rect, o)) continue;
    if (keepOuts.some((k) => rectsOverlap(rect, k))) continue;
    const end = nearestPointOnRect(anchor, rect);
    const len = distance(anchor, end);
    // Prefer short lines, but not so short the line disappears.
    const cost = len + (len < 80 ? 200 : 0);
    out.push({ rect, cost, anchor, end });
  }
  return out.sort((a, b) => a.cost - b.cost);
};

/** Can `c` be added to the already chosen cards? */
const compatible = (
  c: Candidate,
  chosen: Candidate[],
  o: LayoutOptions,
): boolean => {
  for (const other of chosen) {
    if (rectsOverlap(c.rect, other.rect, o.cardGap)) return false;
    if (segmentHitsRect(c.anchor, c.end, other.rect)) return false;
    if (segmentHitsRect(other.anchor, other.end, c.rect)) return false;
  }
  return true;
};

const extraCost = (c: Candidate, chosen: Candidate[]): number => {
  let extra = 0;
  for (const other of chosen) {
    if (segmentsCross(c.anchor, c.end, other.anchor, other.end)) extra += 1500;
  }
  return extra;
};

const search = (
  lists: Candidate[][],
  o: LayoutOptions,
  firstFound: boolean,
): Candidate[] | null => {
  let best: Candidate[] | null = null;
  let bestCost = Infinity;
  let steps = 0;
  const chosen: Candidate[] = [];
  const walk = (i: number, cost: number): boolean => {
    if (++steps > 3_000_000) return true; // safety stop
    if (cost >= bestCost) return false;
    if (i === lists.length) {
      best = [...chosen];
      bestCost = cost;
      return firstFound;
    }
    for (const c of lists[i]) {
      if (cost + c.cost >= bestCost) break; // list is sorted by cost
      if (!compatible(c, chosen, o)) continue;
      chosen.push(c);
      const stop = walk(i + 1, cost + c.cost + extraCost(c, chosen.slice(0, -1)));
      chosen.pop();
      if (stop) return true;
    }
    return false;
  };
  walk(0, 0);
  return best;
};

/**
 * Pick a rectangle for every card.
 * @param dots  each dot's position in screen pixels at zoom 1
 * @param sizes each card's width and height in pixels
 */
export const layoutCards = (
  dots: Point[],
  sizes: Size[],
  o: LayoutOptions,
): Rect[] => {
  if (dots.length !== sizes.length) {
    throw new Error("layoutCards: dots and sizes must be the same length");
  }
  if (dots.length === 0) return [];

  // First try: spots near each dot, and find the best combination.
  const near = dots.map((_, i) =>
    candidatesFor(i, dots, sizes[i], o, false).slice(0, 40),
  );
  const nearResult = search(near, o, false);
  if (nearResult) return nearResult.map((c) => c.rect);

  // Fallback: try every spot on a grid across the whole screen.
  const all = dots.map((_, i) => candidatesFor(i, dots, sizes[i], o, true));
  const gridResult = search(all, o, true);
  if (gridResult) return gridResult.map((c) => c.rect);

  throw new Error(
    "Could not place the callout cards without overlapping. " +
      "Try moving the dots apart or shortening the text.",
  );
};
