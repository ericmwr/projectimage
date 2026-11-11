// When things happen, in frames (30 frames = 1 second).
export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1440;

/** Total photo zoom over the whole video: 1.04 = 4 percent. */
export const ZOOM_END = 1.04;

export const FIRST_CALLOUT_START = 6;
/** Gap between one callout starting and the next: 36 frames = 1.2 s. */
export const CALLOUT_STAGGER = 36;

// Inside each callout, counted from that callout's start:
export const DOT_IN = [0, 8] as const; // dot pops in
export const LINE_IN = [6, 16] as const; // line draws from dot to card
export const CARD_IN = [14, 24] as const; // card fades and slides in

/** How long all callouts stay on screen together: 90 frames = 3 s. */
export const HOLD_ALL = 90;
/** Fade from the photo to the closing card. */
export const CLOSING_FADE = 9;
/** How long the closing card is fully shown: 75 frames = 2.5 s. */
export const CLOSING_HOLD = 75;

export const calloutStart = (index: number) =>
  FIRST_CALLOUT_START + index * CALLOUT_STAGGER;

export const closingStart = (calloutCount: number) =>
  calloutStart(Math.max(calloutCount, 1) - 1) + CARD_IN[1] + HOLD_ALL;

export const totalFrames = (calloutCount: number) =>
  closingStart(calloutCount) + CLOSING_FADE + CLOSING_HOLD;
