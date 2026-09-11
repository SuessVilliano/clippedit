import { describe, expect, it } from "vitest";
import {
  KANBAN_COLUMNS,
  assertTransition,
  canTransition,
  isHumanGate,
  isJobStatus,
  isTerminal,
  statusLabel,
  type JobStatus
} from "../src/lib/video-factory/status";

describe("video factory state machine", () => {
  it("allows the happy-path pipeline", () => {
    const path: JobStatus[] = [
      "detected",
      "content_generating",
      "content_ready",
      "voice_generating",
      "assets_generating",
      "ready_to_render",
      "rendering",
      "ready_for_review",
      "approved",
      "scheduled",
      "published"
    ];
    for (let i = 0; i < path.length - 1; i++) {
      expect(canTransition(path[i], path[i + 1])).toBe(true);
    }
  });

  it("permits same-state idempotent writes", () => {
    expect(canTransition("rendering", "rendering")).toBe(true);
  });

  it("rejects illegal skips", () => {
    expect(canTransition("detected", "published")).toBe(false);
    expect(canTransition("content_ready", "rendering")).toBe(false);
    expect(() => assertTransition("detected", "approved")).toThrow(/Illegal/);
  });

  it("lets any active state fail and a failed job retry into a generating step", () => {
    expect(canTransition("rendering", "failed")).toBe(true);
    expect(canTransition("failed", "rendering")).toBe(true);
    expect(canTransition("failed", "content_generating")).toBe(true);
  });

  it("marks approve/schedule/publish as human-gated", () => {
    expect(isHumanGate("approved")).toBe(true);
    expect(isHumanGate("scheduled")).toBe(true);
    expect(isHumanGate("published")).toBe(true);
    expect(isHumanGate("ready_for_review")).toBe(false);
  });

  it("treats only published as terminal", () => {
    expect(isTerminal("published")).toBe(true);
    expect(isTerminal("ready_for_review")).toBe(false);
  });

  it("validates status strings", () => {
    expect(isJobStatus("ready_for_review")).toBe(true);
    expect(isJobStatus("nonsense")).toBe(false);
  });

  it("covers every job status in exactly the Kanban board", () => {
    const columned = KANBAN_COLUMNS.flatMap((c) => c.key);
    expect(new Set(columned).size).toBe(columned.length); // no status in two columns
    expect(statusLabel("waiting_for_screen_capture")).toBe("Waiting For Screen Capture");
  });
});
