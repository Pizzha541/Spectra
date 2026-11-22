import { beforeEach, describe, expect, it } from "vitest";
import { useSpectraStore } from "./useSpectraStore";
import { initialScene } from "../lib/defaults";

describe("SPECTRA staging/live state", () => {
  beforeEach(() => {
    localStorage.clear();
    useSpectraStore.setState({
      staging: structuredClone(initialScene), live: structuredClone(initialScene),
      selectedIds: [], history: [], future: [], mediaQueue: [], currentMediaId: null,
    });
  });

  it("keeps staging isolated until publish", () => {
    const before = useSpectraStore.getState().live.elements.length;
    useSpectraStore.getState().addElement("timer");
    expect(useSpectraStore.getState().staging.elements).toHaveLength(before + 1);
    expect(useSpectraStore.getState().live.elements).toHaveLength(before);
    useSpectraStore.getState().publish();
    expect(useSpectraStore.getState().live.elements).toHaveLength(before + 1);
  });

  it("undoes and redoes document changes", () => {
    const before = useSpectraStore.getState().staging.elements.length;
    useSpectraStore.getState().addElement("poll");
    useSpectraStore.getState().undo();
    expect(useSpectraStore.getState().staging.elements).toHaveLength(before);
    useSpectraStore.getState().redo();
    expect(useSpectraStore.getState().staging.elements).toHaveLength(before + 1);
  });

  it("rejects unsafe media protocols", () => {
    expect(useSpectraStore.getState().addMedia("javascript:alert(1)")).toBe(false);
    expect(useSpectraStore.getState().addMedia("https://youtu.be/example")).toBe(true);
    expect(useSpectraStore.getState().mediaQueue[0].platform).toBe("youtube");
  });
});
