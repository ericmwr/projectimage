import React from "react";
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { colors, company, fonts } from "./brand";

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
  const logoWidth = 760;
  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.midnightDream,
        alignItems: "center",
        justifyContent: "center",
        gap: 40,
      }}
    >
      <Img
        src={staticFile(company.logoFile)}
        style={{
          width: logoWidth,
          height: logoWidth / company.logoAspect,
          ...rise(local, 2),
        }}
      />
      <div style={{ width: 120, height: 6, backgroundColor: colors.fieldGreen, ...rise(local, 6) }} />
      <div
        style={{
          ...fonts.surface,
          fontSize: 120,
          lineHeight: 1,
          color: colors.pureWhite,
          textTransform: "uppercase",
          letterSpacing: 4,
          ...rise(local, 8),
        }}
      >
        {company.name}
      </div>
      <div
        style={{
          ...fonts.product,
          fontSize: 76,
          lineHeight: 1,
          color: colors.craftOrange,
          letterSpacing: 2,
          ...rise(local, 12),
        }}
      >
        {company.phone}
      </div>
    </AbsoluteFill>
  );
};
