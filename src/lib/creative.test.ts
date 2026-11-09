import { describe, expect, it } from "vitest";
import { creativeError, spotsFor } from "./creative";

describe("spotsFor", () => {
  it("uses one spot for anything up to 15 seconds", () => {
    expect(spotsFor(0)).toBe(1);
    expect(spotsFor(1)).toBe(1);
    expect(spotsFor(15)).toBe(1);
  });

  it("starts a new spot each time 15 seconds runs over", () => {
    expect(spotsFor(16)).toBe(2);
    expect(spotsFor(30)).toBe(2);
    expect(spotsFor(31)).toBe(3);
  });
});

describe("creativeError", () => {
  const file = (type: string, bytes = 10) => new File([new Uint8Array(bytes)], "ad", { type });

  it("accepts the image and video types the backend takes", () => {
    for (const type of ["image/jpeg", "image/png", "image/webp", "image/gif", "video/mp4", "video/quicktime"]) {
      expect(creativeError(file(type))).toBeNull();
    }
  });

  it("rejects other types", () => {
    expect(creativeError(file("video/webm"))).toMatch(/MP4 or MOV/);
    expect(creativeError(file("application/pdf"))).toMatch(/JPEG/);
  });

  it("rejects files over 100 MB", () => {
    const big = file("image/png");
    Object.defineProperty(big, "size", { value: 100 * 1024 * 1024 + 1 });
    expect(creativeError(big)).toMatch(/100 MB/);
  });
});
