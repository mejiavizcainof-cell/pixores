import { Composition } from "remotion";
import PixoresComposition from "./PixoresComposition";
import type { PixoresVideoProject } from "../types";

/**
 * Remotion root for Pixores server renders.
 *
 * The composition receives PixoresVideoProject through inputProps. Metadata is
 * calculated from that JSON so width, height, and duration stay editor-driven.
 */

const fps = 30;

const defaultProject: PixoresVideoProject = {
  schemaVersion: 1,
  canvas: { width: 1920, height: 1080 },
  duration: 6,
  background: "#0f172a",
  layers: [],
  assets: [],
  transitions: [],
  format: { id: "16_9", label: "16:9", width: 1920, height: 1080 },
  createdAt: "1970-01-01T00:00:00.000Z",
  updatedAt: "1970-01-01T00:00:00.000Z",
};

export default function Root() {
  return (
    <Composition
      id="PixoresComposition"
      component={PixoresComposition}
      fps={fps}
      width={defaultProject.canvas.width}
      height={defaultProject.canvas.height}
      durationInFrames={Math.ceil(defaultProject.duration * fps)}
      defaultProps={{ project: defaultProject }}
      calculateMetadata={({ props }) => {
        const project = props.project as PixoresVideoProject;
        return {
          durationInFrames: Math.max(1, Math.ceil(project.duration * fps)),
          width: Math.max(1, Math.round(project.canvas.width)),
          height: Math.max(1, Math.round(project.canvas.height)),
        };
      }}
    />
  );
}
