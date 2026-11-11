// The video takes the shape of the photo, with no cropping.
// Its short side is always 1440 pixels, so text, dot and line sizes
// (which are set in pixels in brand.ts) look the same in every shape.

export const SHORT_SIDE = 1440;
/** Longest side allowed, as a multiple of the short side. */
export const MAX_STRETCH = 2;

/** Video width and height for a photo of this size. Both are even numbers. */
export const videoSize = (photoWidth: number, photoHeight: number) => {
  const even = (n: number) => Math.round(n / 2) * 2;
  if (photoWidth >= photoHeight) {
    return { width: even((SHORT_SIDE * photoWidth) / photoHeight), height: SHORT_SIDE };
  }
  return { width: SHORT_SIDE, height: even((SHORT_SIDE * photoHeight) / photoWidth) };
};

/** A plain-words problem with the photo's shape, or null if it is fine. */
export const shapeProblem = (photoWidth: number, photoHeight: number): string | null => {
  const long = Math.max(photoWidth, photoHeight);
  const short = Math.min(photoWidth, photoHeight);
  if (long > short * MAX_STRETCH) {
    const stretch = (long / short).toFixed(1);
    return (
      `This photo is very ${photoWidth > photoHeight ? "wide" : "tall"}: its long side is ` +
      `${stretch} times its short side. The most this tool allows is ${MAX_STRETCH} times, ` +
      "because callout cards would not fit well. Please crop the photo first, " +
      "or pick a different one."
    );
  }
  return null;
};
