/** FIFO queue of winning-hand events. Never loses an event, never shows the same eventId twice. */
export class WinningEventQueue<T extends { eventId: string }> {
  private items: T[] = [];
  private seen = new Set<string>();
  constructor(private maxSeen = 500) {}

  /** Returns false if this event was already queued or shown. */
  enqueue(e: T): boolean {
    if (this.seen.has(e.eventId)) return false;
    this.seen.add(e.eventId);
    if (this.seen.size > this.maxSeen) this.seen.delete(this.seen.values().next().value as string); // forget the oldest id
    this.items.push(e);
    return true;
  }
  next(): T | undefined { return this.items.shift(); }
  get size() { return this.items.length; }
}
