import React from "react";
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { closing, colors, company, fonts } from "./brand";

const rise = (frame: number, start: number) => {
  const p = interpolate(frame, [start, start + 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  return { opacity: p, transform: `translateY(${(1 - p) * 24}px)` };
};

export const ClosingCard: React.FC<{ startFrame: number }> = ({ startFrame }) => {
  const local = useCurrentFrame() - startFrame;
  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.midnightDream,
        alignItems: "center",
        justifyContent: "center",
        gap: closing.gap,
      }}
    >
      <Img
        src={staticFile(company.logoFile)}
        style={{
          width: closing.logoWidth,
          height: closing.logoWidth / company.logoAspect,
          ...rise(local, 2),
        }}
      />
      <div
        style={{
          width: closing.dividerWidth,
          height: closing.dividerHeight,
          backgroundColor: colors.fieldGreen,
          ...rise(local, 6),
        }}
      />
      <div
        style={{
          ...fonts.product,
          fontSize: closing.phoneSize,
          lineHeight: 1,
          color: colors.craftOrange,
          letterSpacing: 2,
          ...rise(local, 10),
        }}
      >
        {company.phone}
      </div>
    </AbsoluteFill>
  );
};
