// Places the callout cards for a job, using the sizes in brand.ts.
// Both the video and the page call this, so they always agree.
import { dot, leader } from "./brand";
import { measureCard } from "./CalloutCard";
import { layoutCards, type LayoutOptions, type Rect, type Size } from "./layout";
import { ZOOM_END } from "./timing";
import type { Callout } from "./types";

export type Placement = { sizes: Size[]; rects: Rect[] };

// Remembers recent answers (including "does not fit"), so the page and the
// video do not repeat the same work.
const cache = new Map<string, Placement | Error>();

/**
 * Card sizes and positions for these callouts in a video of this size.
 * Only call after the fonts have loaded. Throws LayoutError when the cards
 * cannot all fit.
 */
export const placeCards = (callouts: Callout[], width: number, height: number): Placement => {
  const key = JSON.stringify([callouts, width, height]);
  const known = cache.get(key);
  if (known instanceof Error) throw known;
  if (known) return known;
  try {
    return compute(key, callouts, width, height);
  } catch (e) {
    if (e instanceof Error) remember(key, e);
    throw e;
  }
};

const remember = (key: string, value: Placement | Error) => {
  if (cache.size > 50) cache.clear();
  cache.set(key, value);
};

const compute = (key: string, callouts: Callout[], width: number, height: number) => {

  const sizes = callouts.map(measureCard);
  const dotSize = dot.radius + dot.ringWidth;
  const options: LayoutOptions = {
    frame: { w: width, h: height },
    margin: 48,
    cardGap: 24,
    dotClearance: dotSize + 20,
    lineDotClearance: dotSize + 4,
    minAngled: leader.minAngledLength,
    minLevel: leader.minLevelLength,
    zoomCenter: { x: width / 2, y: height / 2 },
    zoomEnd: ZOOM_END,
  };
  const dots = callouts.map((c) => ({ x: c.x * width, y: c.y * height }));
  const placement = { sizes, rects: layoutCards(dots, sizes, options) };
  remember(key, placement);
  return placement;
};
