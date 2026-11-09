// The ad file (creative) an advertiser attaches when booking a screen or accepting an offer.

/** The types and size the backend accepts for a creative. */
export const CREATIVE_TYPES = "image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime";
export const CREATIVE_MAX_BYTES = 100 * 1024 * 1024;

/** A slot's capacity is counted in 15-second spots. An image always fills exactly one. */
export const SPOT_SECONDS = 15;

/** How many spots one play of an ad this many seconds long uses, counted the way the backend does. */
export function spotsFor(seconds: number): number {
  return Math.max(1, Math.ceil(seconds / SPOT_SECONDS));
}

export const isVideoFile = (file: File) => file.type.startsWith("video/");

/** Why this file can't be used as a creative, or null if it can. */
export function creativeError(file: File): string | null {
  if (!CREATIVE_TYPES.split(",").includes(file.type)) return "Use a JPEG, PNG, WebP or GIF image, or an MP4 or MOV video.";
  if (file.size > CREATIVE_MAX_BYTES) return "That file is over 100 MB.";
  return null;
}

/**
 * A video's length in whole seconds, read in the browser. Rounds up, as the backend's own check
 * does: rounding a 15.4s video down to 15 would price it at 1 spot here and 2 on the server.
 * Chrome reports `Infinity` for some files until it's asked to seek past the end.
 */
export function measureVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(file);
    const done = (seconds: number) => { URL.revokeObjectURL(url); resolve(Math.ceil(seconds)); };
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      if (Number.isFinite(video.duration)) return done(video.duration);
      video.ontimeupdate = () => { video.ontimeupdate = null; done(video.duration); };
      video.currentTime = 1e101;
    };
    video.onerror = () => { URL.revokeObjectURL(url); reject(new Error("We couldn't read that video's length. Try another file.")); };
    video.src = url;
  });
}
