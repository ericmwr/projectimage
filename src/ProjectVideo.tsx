import React, { useEffect, useState } from "react";
import {
  AbsoluteFill,
  Easing,
  Img,
  cancelRender,
  continueRender,
  delayRender,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { card, colors, fontsReady } from "./brand";
import { CalloutCard, measureCard } from "./CalloutCard";
import { ClosingCard } from "./ClosingCard";
import {
  layoutCards,
  nearestPointOnRect,
  toScreen,
  type LayoutOptions,
  type Point,
  type Rect,
  type Size,
} from "./layout";
import {
  CARD_IN,
  CLOSING_FADE,
  DOT_IN,
  LINE_IN,
  ZOOM_END,
  calloutStart,
  closingStart,
} from "./timing";
import type { Job } from "./types";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const easeOut = Easing.out(Easing.cubic);

type Placed = { sizes: Size[]; rects: Rect[] };

export const ProjectVideo: React.FC<Job> = ({ photo, callouts }) => {
  const frame = useCurrentFrame();
  const { width, height, durationInFrames } = useVideoConfig();
  const center: Point = { x: width / 2, y: height / 2 };

  // Dot positions in screen pixels before any zoom.
  const dots: Point[] = callouts.map((c) => ({ x: c.x * width, y: c.y * height }));

  // Card sizes depend on the fonts, so wait for them, then place the cards.
  const [placed, setPlaced] = useState<Placed | null>(null);
  const [handle] = useState(() => delayRender("Loading fonts and placing cards"));
  useEffect(() => {
    fontsReady()
      .then(() => {
        const sizes = callouts.map(measureCard);
        const options: LayoutOptions = {
          frame: { w: width, h: height },
          margin: 48,
          cardGap: 24,
          dotClearance: card.dotRadius + card.dotRingWidth + 20,
          zoomCenter: center,
          zoomEnd: ZOOM_END,
        };
        setPlaced({ sizes, rects: layoutCards(dots, sizes, options) });
        continueRender(handle);
      })
      .catch((err) => cancelRender(err));
    // Layout only depends on the job data and video size.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(callouts), width, height, handle]);

  // Slow zoom: 1.00 at the first frame, 1.04 at the last.
  const zoom = interpolate(frame, [0, durationInFrames - 1], [1, ZOOM_END], clamp);
  const closingOpacity = interpolate(
    frame,
    [closingStart(callouts.length), closingStart(callouts.length) + CLOSING_FADE],
    [0, 1],
    clamp,
  );

  return (
    <AbsoluteFill style={{ backgroundColor: colors.midnightDream }}>
      <Img
        src={staticFile(photo)}
        style={{
          position: "absolute",
          width,
          height,
          objectFit: "cover",
          transform: `scale(${zoom})`,
          transformOrigin: `${center.x}px ${center.y}px`,
        }}
      />

      {placed && (
        <>
          <svg width={width} height={height} style={{ position: "absolute", inset: 0 }}>
            {callouts.map((_, i) => {
              const local = frame - calloutStart(i);
              const dot = toScreen(dots[i], zoom, center);
              const target = nearestPointOnRect(dot, placed.rects[i]);
              const lineP = interpolate(local, [...LINE_IN], [0, 1], { ...clamp, easing: easeOut });
              const dotP = interpolate(local, [...DOT_IN], [0, 1], {
                ...clamp,
                easing: Easing.out(Easing.back(2)),
              });
              const end = {
                x: dot.x + (target.x - dot.x) * lineP,
                y: dot.y + (target.y - dot.y) * lineP,
              };
              return (
                <g key={i}>
                  {lineP > 0 && (
                    <>
                      <line
                        x1={dot.x} y1={dot.y} x2={end.x} y2={end.y}
                        stroke={colors.midnightDream}
                        strokeWidth={card.leaderWidth + card.leaderOutline * 2}
                        strokeLinecap="round"
                      />
                      <line
                        x1={dot.x} y1={dot.y} x2={end.x} y2={end.y}
                        stroke={colors.greySkies}
                        strokeWidth={card.leaderWidth}
                        strokeLinecap="round"
                      />
                    </>
                  )}
                  {dotP > 0 && (
                    <circle
                      cx={dot.x}
                      cy={dot.y}
                      r={card.dotRadius * dotP}
                      fill={colors.fieldGreen}
                      stroke={colors.midnightDream}
                      strokeWidth={card.dotRingWidth * dotP}
                    />
                  )}
                </g>
              );
            })}
          </svg>

          {callouts.map((c, i) => {
            const local = frame - calloutStart(i);
            const p = interpolate(local, [...CARD_IN], [0, 1], { ...clamp, easing: easeOut });
            if (p <= 0) return null;
            const r = placed.rects[i];
            // Slide in a little from the dot's side.
            const dot = toScreen(dots[i], zoom, center);
            const cx = r.x + r.w / 2;
            const cy = r.y + r.h / 2;
            const len = Math.hypot(cx - dot.x, cy - dot.y) || 1;
            const shift = (1 - p) * 16;
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: r.x,
                  top: r.y,
                  opacity: p,
                  transform: `translate(${((dot.x - cx) / len) * shift}px, ${((dot.y - cy) / len) * shift}px)`,
                }}
              >
                <CalloutCard callout={c} size={placed.sizes[i]} />
              </div>
            );
          })}
        </>
      )}

      {closingOpacity > 0 && (
        <AbsoluteFill style={{ opacity: closingOpacity }}>
          <ClosingCard startFrame={closingStart(callouts.length)} />
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
