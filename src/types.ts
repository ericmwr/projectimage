// The shape of a job data file (see the jobs folder).
export type Callout = {
  surface: string;
  product: string;
  color: string;
  /** Leave as "" to show only the color on line 3. */
  sheen: string;
  /** Left-to-right position on the photo: 0 = left edge, 1 = right edge. */
  x: number;
  /** Top-to-bottom position on the photo: 0 = top edge, 1 = bottom edge. */
  y: number;
};

export type Job = {
  /** Photo filename inside the public folder. */
  photo: string;
  callouts: Callout[];
};

export const detailLine = (c: Callout) =>
  c.sheen.trim() ? `${c.color} · ${c.sheen}` : c.color;
