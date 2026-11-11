// =====================================================================
// BRAND FILE: every color, font, size and opacity used in the video.
// Change the look of the whole video here, in one place.
// =====================================================================
import { loadFont as loadBebasNeue } from "@remotion/google-fonts/BebasNeue";
import { loadFont as loadOswald } from "@remotion/google-fonts/Oswald";
// "Source Sans Pro" was renamed "Source Sans 3" on Google Fonts. Same design.
import { loadFont as loadSourceSans } from "@remotion/google-fonts/SourceSans3";

export const colors = {
  midnightDream: "#0b2d66", // closing card background
  pureWhite: "#ffffff", // card text, card edge, dot ring, leader lines
  charcoal: "#26282c", // card background, dot fill, leader line edge
  greySkies: "#d6d6d6", // not used at the moment
  fieldGreen: "#91c17c", // small divider on the closing card
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

let fontsLoaded = false;
/** Resolves once every brand font has finished loading. */
export const fontsReady = (): Promise<unknown> =>
  Promise.all([
    bebas.waitUntilDone(),
    oswald.waitUntilDone(),
    sourceSans.waitUntilDone(),
  ]).then(() => {
    fontsLoaded = true;
  });
/** True once fontsReady() has finished. */
export const fontsAreLoaded = () => fontsLoaded;

// Text sizes in pixels for a 1440-pixel-tall video.
// Rules: line 1 at least 2.6% of video height (37.4px),
//        lines 2 and 3 at least 1.9% (27.4px).
export const textSizes = {
  surface: 50, // 3.5% of 1440
  product: 30, // 2.1% of 1440
  detail: 28, // 1.9% of 1440
};

// Callout cards.
export const card = {
  // How see-through the charcoal card is. 0 = invisible, 1 = solid.
  // Raise it (e.g. 0.7) for darker cards, lower it (e.g. 0.4) for lighter.
  backgroundOpacity: 0.55,
  edgeWidth: 3, // white edge on the left side of the card
  textSoftness: 0.94, // lines 2 and 3 are white at this strength
  textShadow: "0 1px 3px rgba(0, 0, 0, 0.65), 0 0 10px rgba(0, 0, 0, 0.35)",
  paddingX: 28,
  paddingY: 22,
  cornerRadius: 4,
  lineGap: 6, // space between lines of text
};

// Dots on the photo.
export const dot = {
  radius: 11,
  ringWidth: 3, // white ring
};

// Leader lines (the bent line from dot to card).
export const leader = {
  width: 2.5, // white line
  edgeWidth: 1.5, // charcoal edge on each side
  edgeOpacity: 0.7,
  minAngledLength: 40, // shortest the 45-degree part may be
  minLevelLength: 40, // shortest the level part may be
};

// Closing card.
export const closing = {
  logoWidth: 760,
  dividerWidth: 120,
  dividerHeight: 6,
  phoneSize: 76,
  gap: 48, // space between logo, divider and phone number
};

export const company = {
  phone: "(989) 657-5446",
  logoFile: "logo-white.svg", // lives in the public folder
  logoAspect: 227 / 105, // width divided by height of the logo artwork
};

/** Turns a color like #26282c plus an opacity into rgba(...). */
export const withOpacity = (hex: string, opacity: number) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${opacity})`;
};
