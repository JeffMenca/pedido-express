export abstract class Clock {
  abstract now(): Date;
}

export class SystemClock extends Clock {
  now(): Date {
    return new Date();
  }
}

/** Pins the business date (noon, Guatemala time) for demos while keeping the real time of day irrelevant. */
export class FixedDateClock extends Clock {
  constructor(private readonly isoDate: string) {
    super();
  }

  now(): Date {
    return new Date(`${this.isoDate.slice(0, 10)}T18:00:00Z`);
  }
}

const GUATEMALA_UTC_OFFSET_MS = -6 * 60 * 60 * 1000;

/** Calendar date (YYYY-MM-DD) in Guatemala time, which has no daylight saving. */
export const guatemalaDate = (instant: Date): string =>
  new Date(instant.getTime() + GUATEMALA_UTC_OFFSET_MS)
    .toISOString()
    .slice(0, 10);
