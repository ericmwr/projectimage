// =====================================================================
// Card placement. Pure math, no drawing, so it can be tested on its own.
//
// Each card is joined to its dot by a drafting-style leader line: it leaves
// the dot at 45 degrees, bends, and runs level into the near side of the
// card at the card's mid-height.
//
// Rules every layout must meet, at every moment of the slow zoom:
//   - every card is fully on screen (inside a safe margin),
//   - no two cards overlap (with a gap between them),
//   - no card covers any dot,
//   - each card sits diagonally from its dot: to one side, and entirely
//     above or entirely below it (never straight above, below or level),
//   - the 45-degree part and the level part are each long enough to see,
//   - no leader line passes through another card or another dot.
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
  /** Minimum space between a dot's center and another callout's line. */
  lineDotClearance: number;
  /** Shortest allowed 45-degree part of a leader line. */
  minAngled: number;
  /** Shortest allowed level part of a leader line. */
  minLevel: number;
  /** Center of the zoom, in screen pixels. */
  zoomCenter: Point;
  /** Largest zoom reached during the video (1.04 = 4 percent). */
  zoomEnd: number;
};

/** The three points of a bent leader line. */
export type Leader = {
  start: Point; // at the dot
  elbow: Point; // where the 45-degree part turns level
  end: Point; // on the card's side, at mid-height
};

/** Where a photo point (in pixels at zoom 1) lands on screen at a given zoom. */
export const toScreen = (p: Point, zoom: number, center: Point): Point => ({
  x: center.x + (p.x - center.x) * zoom,
  y: center.y + (p.y - center.y) * zoom,
});

/**
 * The bent leader from a dot to a card. The card's side is chosen by which
 * side of the dot the card is on; the bend is recalculated from wherever the
 * dot currently is, so the first part always stays at exactly 45 degrees.
 */
export const leaderPath = (dot: Point, card: Rect): Leader => {
  const toRight = card.x + card.w / 2 >= dot.x;
  const end = { x: toRight ? card.x : card.x + card.w, y: card.y + card.h / 2 };
  const rise = Math.abs(end.y - dot.y);
  const elbow = { x: dot.x + (toRight ? rise : -rise), y: end.y };
  return { start: dot, elbow, end };
};

export const angledLength = (l: Leader) =>
  Math.hypot(l.elbow.x - l.start.x, l.elbow.y - l.start.y);

/** Length of the level part; negative if it would run backwards. */
export const levelLength = (l: Leader) =>
  l.end.x >= l.start.x ? l.end.x - l.elbow.x : l.elbow.x - l.end.x;

export const rectsOverlap = (a: Rect, b: Rect, gap = 0): boolean =>
  a.x < b.x + b.w + gap &&
  b.x < a.x + a.w + gap &&
  a.y < b.y + b.h + gap &&
  b.y < a.y + a.h + gap;

const grow = (r: Rect, by: number): Rect => ({
  x: r.x - by,
  y: r.y - by,
  w: r.w + by * 2,
  h: r.h + by * 2,
});

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

const pointToSegment = (p: Point, a: Point, b: Point) => {
  const vx = b.x - a.x;
  const vy = b.y - a.y;
  const len2 = vx * vx + vy * vy;
  const t = len2 ? Math.max(0, Math.min(1, ((p.x - a.x) * vx + (p.y - a.y) * vy) / len2)) : 0;
  return Math.hypot(p.x - (a.x + t * vx), p.y - (a.y + t * vy));
};

/** Closest the leader line comes to point p. */
export const leaderDistance = (l: Leader, p: Point) =>
  Math.min(pointToSegment(p, l.start, l.elbow), pointToSegment(p, l.elbow, l.end));

export const leaderHitsRect = (l: Leader, r: Rect) =>
  segmentHitsRect(l.start, l.elbow, r) || segmentHitsRect(l.elbow, l.end, r);

const segmentsCross = (a: Point, b: Point, c: Point, d: Point): boolean => {
  const cross = (p: Point, q: Point, r: Point) =>
    (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
  const d1 = cross(c, d, a);
  const d2 = cross(c, d, b);
  const d3 = cross(a, b, c);
  const d4 = cross(a, b, d);
  return d1 * d2 < 0 && d3 * d4 < 0;
};

const leadersCross = (a: Leader, b: Leader) =>
  segmentsCross(a.start, a.elbow, b.start, b.elbow) ||
  segmentsCross(a.start, a.elbow, b.elbow, b.end) ||
  segmentsCross(a.elbow, a.end, b.start, b.elbow) ||
  segmentsCross(a.elbow, a.end, b.elbow, b.end);

/** The box a dot sweeps across during the zoom, grown by `clearance`. */
export const dotSweep = (dot: Point, o: LayoutOptions, clearance: number): Rect => {
  const a = toScreen(dot, 1, o.zoomCenter);
  const b = toScreen(dot, o.zoomEnd, o.zoomCenter);
  const x0 = Math.min(a.x, b.x) - clearance;
  const y0 = Math.min(a.y, b.y) - clearance;
  const x1 = Math.max(a.x, b.x) + clearance;
  const y1 = Math.max(a.y, b.y) + clearance;
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
};

/** Zoom levels the layout is checked at (start, end and points between). */
const zoomSamples = (o: LayoutOptions, count = 9) =>
  Array.from({ length: count }, (_, i) => 1 + ((o.zoomEnd - 1) * i) / (count - 1));

/**
 * Does the bent line fit this card and dot? The dot moves in a straight line
 * during the zoom, so checking the first and last zoom covers every frame.
 */
export const leaderFits = (dot: Point, card: Rect, o: LayoutOptions): boolean => {
  for (const z of [1, o.zoomEnd]) {
    const d = toScreen(dot, z, o.zoomCenter);
    // Diagonal from the dot: to one side, and entirely above or below it.
    const besides = d.x < card.x || d.x > card.x + card.w;
    const aboveOrBelow = d.y < card.y || d.y > card.y + card.h;
    if (!besides || !aboveOrBelow) return false;
    const l = leaderPath(d, card);
    if (angledLength(l) < o.minAngled) return false;
    if (levelLength(l) < o.minLevel) return false;
  }
  return true;
};

type Candidate = { index: number; rect: Rect; cost: number; leaders: Leader[] };

const fitsOnScreen = (r: Rect, o: LayoutOptions) =>
  r.x >= o.margin - 1e-6 &&
  r.y >= o.margin - 1e-6 &&
  r.x + r.w <= o.frame.w - o.margin + 1e-6 &&
  r.y + r.h <= o.frame.h - o.margin + 1e-6;

/** Every workable spot for one card, cheapest (shortest line) first. */
const candidatesFor = (
  index: number,
  dots: Point[],
  size: Size,
  o: LayoutOptions,
  /** 0 = spots near the dot; otherwise a grid over the whole screen with this spacing. */
  gridStep: number,
): Candidate[] => {
  const cardKeepOuts = dots.map((d) => dotSweep(d, o, o.dotClearance));
  const mid = toScreen(dots[index], (1 + o.zoomEnd) / 2, o.zoomCenter);
  const rects: Rect[] = [];

  if (gridStep > 0) {
    const step = gridStep;
    for (let y = o.margin; y <= o.frame.h - o.margin - size.h; y += step) {
      for (let x = o.margin; x <= o.frame.w - o.margin - size.w; x += step) {
        rects.push({ x, y, w: size.w, h: size.h });
      }
    }
  } else {
    for (const across of [-1, 1]) {
      for (const up of [-1, 1]) {
        for (const extra of [14, 25, 40, 60, 85, 120, 160, 210, 270, 350, 450]) {
          const rise = size.h / 2 + extra;
          for (const level of [o.minLevel + 12, 70, 100, 140, 190, 260, 350]) {
            const midY = mid.y + up * rise;
            const x = across > 0 ? mid.x + rise + level : mid.x - rise - level - size.w;
            rects.push({ x, y: midY - size.h / 2, w: size.w, h: size.h });
          }
        }
      }
    }
  }

  const zooms = zoomSamples(o, 17);
  const out: Candidate[] = [];
  for (const rect of rects) {
    if (!fitsOnScreen(rect, o)) continue;
    if (cardKeepOuts.some((k) => rectsOverlap(rect, k))) continue;
    if (!leaderFits(dots[index], rect, o)) continue;
    const leaders = zooms.map((z) => leaderPath(toScreen(dots[index], z, o.zoomCenter), rect));
    // Keep the line clear of every other dot at each sampled moment. The extra
    // 5 pixels covers how far things move between two samples.
    const hitsDot = dots.some(
      (d, j) =>
        j !== index &&
        zooms.some(
          (z, k) => leaderDistance(leaders[k], toScreen(d, z, o.zoomCenter)) < o.lineDotClearance + 5,
        ),
    );
    if (hitsDot) continue;
    const l = leaderPath(mid, rect);
    const cost = angledLength(l) + levelLength(l);
    out.push({ index, rect, cost, leaders });
  }
  return out.sort((a, b) => a.cost - b.cost);
};

/** Can these two cards (with their lines) be used together? */
const compatible = (a: Candidate, b: Candidate, o: LayoutOptions): boolean => {
  if (rectsOverlap(a.rect, b.rect, o.cardGap)) return false;
  // Grow each card a little: the lines move slightly between samples.
  const aGrown = grow(a.rect, 6);
  const bGrown = grow(b.rect, 6);
  if (a.leaders.some((l) => leaderHitsRect(l, bGrown))) return false;
  if (b.leaders.some((l) => leaderHitsRect(l, aGrown))) return false;
  return true;
};

const crossingCost = (a: Candidate, b: Candidate): number => {
  const mid = Math.floor(a.leaders.length / 2);
  return leadersCross(a.leaders[mid], b.leaders[mid]) ? 1500 : 0;
};

/**
 * Try combinations of spots, one per card. After each pick, spots that no
 * longer work for the remaining cards are crossed off, so dead ends are
 * spotted straight away. With `firstFound` it stops at the first layout that
 * works; otherwise it keeps looking for the one with the lowest cost.
 */
const search = (
  lists: Candidate[][],
  o: LayoutOptions,
  firstFound: boolean,
): Candidate[] | null => {
  let best: Candidate[] | null = null;
  let bestCost = Infinity;
  let steps = 0;
  const chosen: Candidate[] = [];

  const walk = (remaining: Candidate[][], cost: number): boolean => {
    if (++steps > 2_000_000) return true; // safety stop
    if (remaining.length === 0) {
      best = [...chosen];
      bestCost = cost;
      return firstFound;
    }
    // Lowest possible cost of what is left (each list is sorted by cost).
    const floor = remaining.reduce((sum, list) => sum + list[0].cost, 0);
    if (cost + floor >= bestCost) return false;
    // Fill the card with the fewest options first.
    let pick = 0;
    remaining.forEach((list, i) => {
      if (list.length < remaining[pick].length) pick = i;
    });
    const rest = remaining.filter((_, i) => i !== pick);
    const restFloor = floor - remaining[pick][0].cost;
    for (const c of remaining[pick]) {
      if (cost + c.cost + restFloor >= bestCost) break;
      const narrowed = rest.map((list) => list.filter((other) => compatible(c, other, o)));
      if (narrowed.some((list) => list.length === 0)) continue;
      const added = c.cost + chosen.reduce((sum, other) => sum + crossingCost(c, other), 0);
      chosen.push(c);
      const stop = walk(narrowed, cost + added);
      chosen.pop();
      if (stop) return true;
    }
    return false;
  };

  if (lists.some((list) => list.length === 0)) return null;
  walk(lists, 0);
  if (!best) return null;
  // Put the cards back in the same order as the dots.
  return [...(best as Candidate[])].sort((a, b) => a.index - b.index);
};

/**
 * Pick a rectangle for every card.
 * @param dots  each dot's position in screen pixels at zoom 1
 * @param sizes each card's width and height in pixels
 */
export const layoutCards = (dots: Point[], sizes: Size[], o: LayoutOptions): Rect[] => {
  if (dots.length !== sizes.length) {
    throw new Error("layoutCards: dots and sizes must be the same length");
  }
  if (dots.length === 0) return [];

  // First try: spots near each dot, and find the best combination.
  const near = dots.map((_, i) => candidatesFor(i, dots, sizes[i], o, 0).slice(0, 60));
  const nearResult = search(near, o, false);
  if (nearResult) return nearResult.map((c) => c.rect);

  // Fallback: try spots on a grid across the whole screen, coarse then fine.
  let noRoom: number[] = [];
  for (const step of [40, 12]) {
    const all = dots.map((_, i) => candidatesFor(i, dots, sizes[i], o, step));
    noRoom = all.flatMap((list, i) => (list.length === 0 ? [i + 1] : []));
    if (noRoom.length) break;
    const gridResult = search(all, o, true);
    if (gridResult) return gridResult.map((c) => c.rect);
  }

  throw new Error(
    noRoom.length
      ? `There is no room for the card of callout ${noRoom.join(" and ")}. ` +
          "Its dot is too close to the edge of the photo or to another dot. " +
          "Move that dot, or shorten its text."
      : "Could not place all the callout cards together. " +
          "Some dots are too close to each other. Move them apart, or shorten the text.",
  );
};
