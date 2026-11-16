import { describe, expect, it } from "vitest";
import { blocksFor, money, subscribeTotal, type BillingPlan } from "./billing";

const premium: BillingPlan = {
  code: "premium",
  name: "Premium",
  base_price_cents: 5000,
  included_screens: 10,
  block_price_cents: 500,
  block_size: 10,
};

describe("blocksFor", () => {
  it.each([[0, 0], [10, 0], [11, 1], [20, 1], [21, 2]])("%i screens need %i blocks", (screens, blocks) => {
    expect(blocksFor(premium, screens)).toBe(blocks);
  });
});

describe("subscribeTotal", () => {
  it("is the base alone up to 10 screens", () => {
    expect(subscribeTotal(premium, 3)).toEqual({ blocks: 0, blocksCents: 0, totalCents: 5000 });
  });

  it("adds a block per 10 screens past 10", () => {
    expect(subscribeTotal(premium, 23)).toEqual({ blocks: 2, blocksCents: 1000, totalCents: 6000 });
  });
});

describe("money", () => {
  it("formats cents as dollars", () => {
    expect(money(5500)).toBe("$55.00");
    expect(money(250)).toBe("$2.50");
  });
});
