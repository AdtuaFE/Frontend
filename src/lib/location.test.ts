import { describe, expect, it } from "vitest";
import { parsePlaceName } from "./location";

describe("parsePlaceName", () => {
  it("splits a street address into its parts", () => {
    expect(parsePlaceName("42 Maple Avenue, Bloomington, Indiana 47401, United States")).toEqual({
      addressLine1: "42 Maple Avenue",
      city: "Bloomington",
      region: "Indiana",
      postalCode: "47401",
      country: "United States",
    });
  });

  it("treats a place without a street number as the city", () => {
    expect(parsePlaceName("Bloomington, Indiana, United States")).toEqual({
      addressLine1: "",
      city: "Bloomington",
      region: "Indiana",
      postalCode: "",
      country: "United States",
    });
  });

  it("leaves the region empty for a city and country only", () => {
    expect(parsePlaceName("Paris, France")).toMatchObject({ city: "Paris", region: "", country: "France" });
  });
});
