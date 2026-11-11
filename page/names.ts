/**
 * Suggests a job name from a photo's file name.
 * "20260922_103817.jpg" or "IMG_20260922_103817.jpg" -> "Job 2026-09-22"
 * "smith-kitchen_final.jpg" -> "smith kitchen final"
 */
export const suggestJobName = (fileName: string): string => {
  const base = fileName.replace(/\.[^.]+$/, "");
  const dated = base.match(/(?:^|[^0-9])(20\d{2})(\d{2})(\d{2})(?:[_-]?\d{6})?(?:[^0-9]|$)/);
  if (dated) return `Job ${dated[1]}-${dated[2]}-${dated[3]}`;
  const words = base.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  return words || "New job";
};
