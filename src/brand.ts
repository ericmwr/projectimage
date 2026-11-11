// =====================================================================
// BRAND FILE: every color, font and text size used in the video.
// Change the look of the whole video here, in one place.
// =====================================================================
import { loadFont as loadBebasNeue } from "@remotion/google-fonts/BebasNeue";
import { loadFont as loadOswald } from "@remotion/google-fonts/Oswald";
// "Source Sans Pro" was renamed "Source Sans 3" on Google Fonts. Same design.
import { loadFont as loadSourceSans } from "@remotion/google-fonts/SourceSans3";

export const colors = {
  midnightDream: "#0b2d66", // card background, closing card background
  pureWhite: "#ffffff", // text on Midnight Dream
  greySkies: "#d6d6d6", // lines 2 and 3 text, leader lines
  fieldGreen: "#91c17c", // dots and the accent bar on each card
  craftOrange: "#fb9e52", // used sparingly: phone number on closing card
};

const bebas = loadBebasNeue("normal", { weights: ["400"], subsets: ["latin"] });
const oswald = loadOswald("normal", { weights: ["600"], subsets: ["latin"] });
const sourceSans = loadSourceSans("normal", {
  weights: ["400"],
  subsets: ["latin"],
});

export const fonts = {
  // Line 1 (surface)
  surface: { fontFamily: bebas.fontFamily, fontWeight: "400" },
  // Line 2 (product): Oswald Semi-Bold
  product: { fontFamily: oswald.fontFamily, fontWeight: "600" },
  // Line 3 (color and sheen): Source Sans Regular
  detail: { fontFamily: sourceSans.fontFamily, fontWeight: "400" },
} as const;

/** Resolves once every brand font has finished loading. */
export const fontsReady = (): Promise<unknown> =>
  Promise.all([
    bebas.waitUntilDone(),
    oswald.waitUntilDone(),
    sourceSans.waitUntilDone(),
  ]);

// Text sizes in pixels for a 1440-pixel-tall video.
// Rules: line 1 at least 2.6% of video height (37.4px),
//        lines 2 and 3 at least 1.9% (27.4px).
export const textSizes = {
  surface: 56, // 3.9% of 1440
  product: 34, // 2.4% of 1440
  detail: 32, // 2.2% of 1440
};

// Card shape, in pixels.
export const card = {
  paddingX: 30,
  paddingY: 24,
  accentBarWidth: 10, // Field Green bar on the left edge
  cornerRadius: 6,
  lineGap: 8, // space between lines of text
  dotRadius: 15,
  dotRingWidth: 5, // Midnight Dream ring around each dot
  leaderWidth: 3,
  leaderOutline: 2.5, // thin Midnight Dream edge so the line shows on white walls
};

export const company = {
  name: "Ideal Painting",
  phone: "(989) 657-5446",
  logoFile: "logo-white.svg", // lives in the public folder
  logoAspect: 227 / 105, // width divided by height of the logo artwork
};
