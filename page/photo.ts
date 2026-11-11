// Getting a photo ready for a job, all inside the browser on this PC.
import { shapeProblem } from "../src/shape";

/** Longest side kept for the job's photo. Plenty for a 1440-pixel video. */
const MAX_SIDE = 3840;

const toJpeg = (canvas: HTMLCanvasElement, quality: number) =>
  new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not save the photo."))), "image/jpeg", quality),
  );

const draw = (source: CanvasImageSource, width: number, height: number) => {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")!.drawImage(source, 0, 0, width, height);
  return canvas;
};

export type PreparedPhoto = { photo: Blob; thumb: Blob; width: number; height: number };

/**
 * Opens a photo and returns an upright copy plus a small picture for the jobs list.
 * Phone photos often store "turn me sideways" as a hidden setting instead of
 * turning the picture itself. This applies that setting and saves the picture
 * already turned, so the preview and the final video always show it upright.
 */
export const preparePhoto = async (file: Blob): Promise<PreparedPhoto> => {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error(
      "This file could not be opened as a photo. Please pick a JPG or PNG photo. " +
        "(iPhone HEIC photos need to be saved as JPG first.)",
    );
  }
  const problem = shapeProblem(bitmap.width, bitmap.height);
  if (problem) {
    bitmap.close();
    throw new Error(problem);
  }
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const photo = await toJpeg(draw(bitmap, width, height), 0.92);
  const thumbScale = 480 / Math.max(width, height);
  const thumb = await toJpeg(
    draw(bitmap, Math.round(width * thumbScale), Math.round(height * thumbScale)),
    0.82,
  );
  bitmap.close();
  return { photo, thumb, width, height };
};

/** Makes the small list picture from a photo that is already upright. */
export const thumbFromUrl = async (url: string): Promise<Blob> => {
  const blob = await (await fetch(url)).blob();
  return (await preparePhoto(blob)).thumb;
};
