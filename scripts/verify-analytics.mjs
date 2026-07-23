/**
 * Lightweight verification for analytics pure-function logic.
 * Run: npm run analytics:verify
 */

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function parseNumber(value) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function safePercent(numerator, denominator) {
  if (denominator <= 0) return 0;
  return (numerator / denominator) * 100;
}

function average(values) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function getRangeStart(dateRange) {
  const now = new Date();
  if (dateRange === "all") return null;
  if (dateRange === "ytd") return new Date(now.getFullYear(), 0, 1);
  const days = { "7d": 7, "30d": 30, "90d": 90, "12m": 365 };
  const offset = days[dateRange] ?? 365;
  const start = new Date(now);
  start.setDate(start.getDate() - offset);
  return start;
}

function buildTimeBuckets(dateRange) {
  const now = new Date();
  const buckets = [];

  if (dateRange === "7d") {
    for (let index = 6; index >= 0; index -= 1) {
      const date = new Date(now);
      date.setDate(date.getDate() - index);
      buckets.push(date.toISOString().slice(0, 10));
    }
    return buckets;
  }

  if (dateRange === "30d") {
    return Array.from({ length: 30 }, (_, index) => {
      const date = new Date(now);
      date.setDate(date.getDate() - (29 - index));
      return date.toISOString().slice(0, 10);
    });
  }

  const monthCount = dateRange === "ytd" ? now.getMonth() + 1 : 12;
  for (let index = monthCount - 1; index >= 0; index -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
    buckets.push(
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
    );
  }

  return buckets;
}

function run() {
  assert(parseNumber("12.5") === 12.5, "parseNumber should parse strings");
  assert(parseNumber(null) === 0, "parseNumber should default invalid values to 0");
  assert(safePercent(2, 4) === 50, "safePercent should compute percentages");
  assert(safePercent(2, 0) === 0, "safePercent should handle zero denominator");
  assert(average([2, 4]) === 3, "average should compute mean");
  assert(getRangeStart("all") === null, "all-time range should have no start");
  assert(buildTimeBuckets("7d").length === 7, "7d range should produce 7 buckets");
  assert(buildTimeBuckets("12m").length === 12, "12m range should produce 12 buckets");

  console.log("Analytics verification passed.");
}

run();
