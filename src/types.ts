// The shape of a job data file (see the jobs folder and your my-jobs folder).
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
  /** Photo filename inside the public folder (stage 1 sample job). */
  photo: string;
  /** Photo size in pixels, upright. Sets the video's shape. Missing = 4:3 wide. */
  photoWidth?: number;
  photoHeight?: number;
  callouts: Callout[];
};

/** What the video component receives. */
export type VideoProps = Job & {
  /** Full web address of the photo; used instead of `photo` when given. */
  photoUrl?: string;
};

export const detailLine = (c: Callout) =>
  c.sheen.trim() ? `${c.color} · ${c.sheen}` : c.color;
