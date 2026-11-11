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
import { colors, dot, fontsReady, leader, withOpacity } from "./brand";
import { CalloutCard, measureCard } from "./CalloutCard";
import { ClosingCard } from "./ClosingCard";
import {
  angledLength,
  layoutCards,
  leaderPath,
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

/** The part of the bent line drawn so far (progress 0 to 1), as SVG points. */
const partialLeader = (start: Point, card: Rect, progress: number): string => {
  const l = leaderPath(start, card);
  const first = angledLength(l);
  const second = Math.abs(l.end.x - l.elbow.x);
  let drawn = (first + second) * progress;
  const pts: Point[] = [l.start];
  if (drawn <= first) {
    const t = first ? drawn / first : 1;
    pts.push({ x: l.start.x + (l.elbow.x - l.start.x) * t, y: l.start.y + (l.elbow.y - l.start.y) * t });
  } else {
    drawn -= first;
    const t = second ? drawn / second : 1;
    pts.push(l.elbow, { x: l.elbow.x + (l.end.x - l.elbow.x) * t, y: l.end.y });
  }
  return pts.map((p) => `${p.x},${p.y}`).join(" ");
};

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
        const dotSize = dot.radius + dot.ringWidth;
        const options: LayoutOptions = {
          frame: { w: width, h: height },
          margin: 48,
          cardGap: 24,
          dotClearance: dotSize + 20,
          lineDotClearance: dotSize + 4,
          minAngled: leader.minAngledLength,
          minLevel: leader.minLevelLength,
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
              // Where the dot is right now; the bend is worked out from here.
              const d = toScreen(dots[i], zoom, center);
              const lineP = interpolate(local, [...LINE_IN], [0, 1], { ...clamp, easing: easeOut });
              const dotP = interpolate(local, [...DOT_IN], [0, 1], {
                ...clamp,
                easing: Easing.out(Easing.back(2)),
              });
              const points = lineP > 0 ? partialLeader(d, placed.rects[i], lineP) : "";
              return (
                <g key={i}>
                  {lineP > 0 && (
                    <>
                      <polyline
                        points={points}
                        fill="none"
                        stroke={withOpacity(colors.charcoal, leader.edgeOpacity)}
                        strokeWidth={leader.width + leader.edgeWidth * 2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <polyline
                        points={points}
                        fill="none"
                        stroke={colors.pureWhite}
                        strokeWidth={leader.width}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </>
                  )}
                  {dotP > 0 && (
                    <circle
                      cx={d.x}
                      cy={d.y}
                      r={dot.radius * dotP}
                      fill={colors.charcoal}
                      stroke={colors.pureWhite}
                      strokeWidth={dot.ringWidth * dotP}
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
            // Slide in sideways, toward the end of the line.
            const toRight = r.x + r.w / 2 >= dots[i].x;
            const shift = (1 - p) * 14 * (toRight ? 1 : -1);
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: r.x,
                  top: r.y,
                  opacity: p,
                  transform: `translateX(${shift}px)`,
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
