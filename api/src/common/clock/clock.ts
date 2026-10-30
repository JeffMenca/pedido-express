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
