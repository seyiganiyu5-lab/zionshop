const timeZone = process.env.SHOP_TIMEZONE || "Africa/Lagos";
const DAY = 86_400_000;

/** The shop's local calendar date and time at `at`, plus its UTC offset in ms. */
function shopClock(at: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(at);
  const get = (t: string) => Number(parts.find((p) => p.type === t)!.value);
  const year = get("year");
  const month = get("month");
  const day = get("day");
  const localAsUtc = Date.UTC(year, month - 1, day, get("hour"), get("minute"), get("second"));
  return { year, month, day, offset: localAsUtc - Math.floor(at.getTime() / 1000) * 1000 };
}

/** Start of "today" in the shop's time zone, as a UTC Date. */
export function startOfShopDay(now = new Date()) {
  const { year, month, day, offset } = shopClock(now);
  return new Date(Date.UTC(year, month - 1, day) - offset);
}

/** Start of a shop-local date given as "YYYY-MM-DD", or null if it isn't one. */
export function parseShopDate(value: string | null | undefined) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? "");
  if (!m) return null;
  const guess = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (Number.isNaN(guess)) return null;
  return new Date(guess - shopClock(new Date(guess)).offset);
}

/** "YYYY-MM-DD" for the shop-local date at `at`. */
export function shopDateString(at: Date) {
  const { year, month, day } = shopClock(at);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * A Date whose UTC fields read as the shop's wall-clock time, for writing into
 * spreadsheets, which have no notion of time zones.
 */
export function asShopWallClock(at: Date) {
  return new Date(at.getTime() + shopClock(at).offset);
}

/** Named report periods, as [start, end) in UTC. */
export function periodRange(period: string, now = new Date()) {
  const today = startOfShopDay(now);
  const { year, month } = shopClock(now);
  const monthStart = (y: number, m: number) => parseShopDate(`${y}-${String(m).padStart(2, "0")}-01`)!;
  switch (period) {
    case "today":
      return { from: today, to: new Date(today.getTime() + DAY) };
    case "7d":
      return { from: new Date(today.getTime() - 6 * DAY), to: new Date(today.getTime() + DAY) };
    case "30d":
      return { from: new Date(today.getTime() - 29 * DAY), to: new Date(today.getTime() + DAY) };
    case "month":
      return { from: monthStart(year, month), to: new Date(today.getTime() + DAY) };
    case "lastMonth": {
      const [y, m] = month === 1 ? [year - 1, 12] : [year, month - 1];
      return { from: monthStart(y, m), to: monthStart(year, month) };
    }
    default:
      return null;
  }
}
