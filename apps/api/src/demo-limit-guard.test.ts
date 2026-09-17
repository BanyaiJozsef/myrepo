import { describe, expect, it } from "vitest";
import { DemoLimitElerveHiba, ellenorizDemoLimit } from "./demo-limit-guard.js";

describe("ellenorizDemoLimit", () => {
  it("allows creation below the demo limit", () => {
    expect(() => ellenorizDemoLimit("demo", "maxUgyfelek", 4)).not.toThrow();
  });

  it("blocks creation at the demo limit", () => {
    expect(() => ellenorizDemoLimit("demo", "maxUgyfelek", 5)).toThrow(DemoLimitElerveHiba);
  });

  it("never limits an active (paid) tenant", () => {
    expect(() => ellenorizDemoLimit("aktiv", "maxUgyfelek", 10_000)).not.toThrow();
  });

  it("never limits a lejart tenant creation check here (read-only is enforced elsewhere)", () => {
    expect(() => ellenorizDemoLimit("lejart", "maxUgyfelek", 10_000)).not.toThrow();
  });
});
