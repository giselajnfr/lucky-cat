import { describe, expect, it } from "vitest";
import { WinningEventQueue } from "./eventQueue";

const ev = (id: string) => ({ eventId: id });
describe("WinningEventQueue", () => {
  it("keeps order and loses nothing", () => {
    const q = new WinningEventQueue(); ["a", "b", "c"].forEach((i) => q.enqueue(ev(i)));
    expect([q.next(), q.next(), q.next()].map((e) => e?.eventId)).toEqual(["a", "b", "c"]); expect(q.next()).toBeUndefined();
  });
  it("rejects duplicates, even after the event was shown", () => {
    const q = new WinningEventQueue(); expect(q.enqueue(ev("a"))).toBe(true); expect(q.enqueue(ev("a"))).toBe(false);
    q.next(); expect(q.enqueue(ev("a"))).toBe(false); expect(q.size).toBe(0);
  });
  it("forgets the oldest ids beyond its limit", () => {
    const q = new WinningEventQueue(2); ["a", "b", "c"].forEach((i) => q.enqueue(ev(i)));
    expect(q.enqueue(ev("c"))).toBe(false); expect(q.enqueue(ev("a"))).toBe(true);
  });
});
