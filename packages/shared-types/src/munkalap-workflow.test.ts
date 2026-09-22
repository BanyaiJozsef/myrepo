import { describe, expect, it } from "vitest";
import {
  ErvenytelenAllapotAtmenetHiba,
  ervenyesAtmenetE,
  valtasMunkalapStatusz,
} from "./munkalap-workflow.js";

describe("munkalap state machine", () => {
  it("allows the standard forward flow", () => {
    expect(valtasMunkalapStatusz("felvett", "folyamatban")).toBe("folyamatban");
    expect(valtasMunkalapStatusz("folyamatban", "kesz")).toBe("kesz");
    expect(valtasMunkalapStatusz("kesz", "lezart")).toBe("lezart");
  });

  it("allows reopening from kesz back to folyamatban", () => {
    expect(valtasMunkalapStatusz("kesz", "folyamatban")).toBe("folyamatban");
  });

  it("rejects skipping stages", () => {
    expect(ervenyesAtmenetE("felvett", "kesz")).toBe(false);
    expect(() => valtasMunkalapStatusz("felvett", "kesz")).toThrow(ErvenytelenAllapotAtmenetHiba);
  });

  it("rejects any transition out of lezart (terminal state)", () => {
    expect(ervenyesAtmenetE("lezart", "folyamatban")).toBe(false);
    expect(() => valtasMunkalapStatusz("lezart", "felvett")).toThrow();
  });

  it("rejects going backwards from folyamatban to felvett", () => {
    expect(ervenyesAtmenetE("folyamatban", "felvett")).toBe(false);
  });
});
