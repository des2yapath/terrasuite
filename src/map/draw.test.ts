import { describe, it, expect } from "vitest";
import { addVertex, undoVertex, closeRing } from "@/map/draw";

describe("draw helpers", () => {
  const v: [number, number][] = [[0, 0], [1, 1]];

  it("addVertex appends immutably", () => {
    const next = addVertex(v, [2, 2]);
    expect(next).toHaveLength(3);
    expect(v).toHaveLength(2); // original untouched
  });

  it("undoVertex pops the last vertex", () => {
    expect(undoVertex(v)).toEqual([[0, 0]]);
  });

  it("undoVertex on empty stays empty", () => {
    expect(undoVertex([])).toEqual([]);
  });

  it("closeRing requires 3 vertices", () => {
    expect(closeRing([[0, 0], [1, 1]])).toBeNull();
  });

  it("closeRing repeats the first vertex", () => {
    const ring = closeRing([[0, 0], [1, 0], [1, 1]]);
    expect(ring).toEqual([[0, 0], [1, 0], [1, 1], [0, 0]]);
  });
});
