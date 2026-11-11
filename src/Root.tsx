import React from "react";
import { Composition } from "remotion";
import { ProjectVideo } from "./ProjectVideo";
import { videoSize } from "./shape";
import { FPS, totalFrames } from "./timing";
import type { VideoProps } from "./types";
// The example job shown by `npm run preview` and rendered by `npm run render`.
import sampleJob from "../jobs/20260922_103817.json";

/** Video size and length for a job. Used here and by the page. */
export const videoMetadata = (props: VideoProps) => ({
  ...videoSize(props.photoWidth ?? 4, props.photoHeight ?? 3),
  durationInFrames: totalFrames(props.callouts.length),
});

const defaults = videoMetadata(sampleJob as VideoProps);

export const RemotionRoot: React.FC = () => (
  <Composition
    id="ProjectVideo"
    component={ProjectVideo}
    fps={FPS}
    width={defaults.width}
    height={defaults.height}
    durationInFrames={defaults.durationInFrames}
    defaultProps={sampleJob as VideoProps}
    calculateMetadata={({ props }) => videoMetadata(props)}
  />
);
