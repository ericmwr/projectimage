import React from "react";
import { measureText } from "@remotion/layout-utils";
import { card, colors, fonts, textSizes, withOpacity } from "./brand";
import type { Size } from "./layout";
import { detailLine, type Callout } from "./types";

// Fixed line heights, so the measured card size matches what is drawn.
const LINE_HEIGHT = {
  surface: textSizes.surface * 1.0,
  product: textSizes.product * 1.25,
  detail: textSizes.detail * 1.25,
};

/** Width and height a card needs for its text. Call only after fonts load. */
export const measureCard = (c: Callout): Size => {
  const widths = [
    measureText({ text: c.surface.toUpperCase(), fontSize: textSizes.surface, ...fonts.surface }).width,
    measureText({ text: c.product, fontSize: textSizes.product, ...fonts.product }).width,
    measureText({ text: detailLine(c), fontSize: textSizes.detail, ...fonts.detail }).width,
  ];
  const w = card.edgeWidth + card.paddingX * 2 + Math.ceil(Math.max(...widths)) + 4;
  const h =
    card.paddingY * 2 +
    LINE_HEIGHT.surface +
    LINE_HEIGHT.product +
    LINE_HEIGHT.detail +
    card.lineGap * 2;
  return { w, h: Math.ceil(h) };
};

const line: React.CSSProperties = {
  whiteSpace: "nowrap",
  margin: 0,
  textShadow: card.textShadow,
};
const softWhite = withOpacity(colors.pureWhite, card.textSoftness);

export const CalloutCard: React.FC<{ callout: Callout; size: Size }> = ({
  callout,
  size,
}) => (
  <div
    style={{
      width: size.w,
      height: size.h,
      boxSizing: "border-box",
      backgroundColor: withOpacity(colors.charcoal, card.backgroundOpacity),
      borderLeft: `${card.edgeWidth}px solid ${colors.pureWhite}`,
      borderRadius: card.cornerRadius,
      padding: `${card.paddingY}px ${card.paddingX}px`,
      display: "flex",
      flexDirection: "column",
      gap: card.lineGap,
    }}
  >
    <div
      style={{
        ...line,
        ...fonts.surface,
        fontSize: textSizes.surface,
        lineHeight: `${LINE_HEIGHT.surface}px`,
        color: colors.pureWhite,
        textTransform: "uppercase",
      }}
    >
      {callout.surface}
    </div>
    <div
      style={{
        ...line,
        ...fonts.product,
        fontSize: textSizes.product,
        lineHeight: `${LINE_HEIGHT.product}px`,
        color: softWhite,
      }}
    >
      {callout.product}
    </div>
    <div
      style={{
        ...line,
        ...fonts.detail,
        fontSize: textSizes.detail,
        lineHeight: `${LINE_HEIGHT.detail}px`,
        color: softWhite,
      }}
    >
      {detailLine(callout)}
    </div>
  </div>
);
