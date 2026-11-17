// Last time the user did something (or the app sent an AI request), for the away timer that forgets the keys.

let last_activity = Date.now();

/** Records activity now. */
export function mark_activity(): void {
  last_activity = Date.now();
}

/** Milliseconds since the last activity. */
export function idle_ms(now = Date.now()): number {
  return now - last_activity;
}
