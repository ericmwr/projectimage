import React from "react";
import { Composition } from "remotion";
import { ProjectVideo } from "./ProjectVideo";
import { FPS, HEIGHT, WIDTH, totalFrames } from "./timing";
import type { Job } from "./types";
// The job shown in the preview and rendered by default.
import sampleJob from "../jobs/20260922_103817.json";

export const RemotionRoot: React.FC = () => (
  <Composition
    id="ProjectVideo"
    component={ProjectVideo}
    width={WIDTH}
    height={HEIGHT}
    fps={FPS}
    durationInFrames={totalFrames(sampleJob.callouts.length)}
    defaultProps={sampleJob as Job}
    calculateMetadata={({ props }) => ({
      durationInFrames: totalFrames(props.callouts.length),
    })}
  />
);
