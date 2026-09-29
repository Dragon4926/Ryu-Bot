const test = require("node:test");
const assert = require("node:assert/strict");
const { isValidTimezone, parseMoment } = require("../src/utils/time");

test("parseMoment parses relative durations", () => {
  const now = new Date("2026-01-01T00:00:00.000Z");
  assert.equal(parseMoment("30m", now).toISOString(), "2026-01-01T00:30:00.000Z");
  assert.equal(parseMoment("2 hours", now), null);
  assert.equal(parseMoment("2h", now).toISOString(), "2026-01-01T02:00:00.000Z");
  assert.equal(parseMoment("3 days", now).toISOString(), "2026-01-04T00:00:00.000Z");
});

test("timezone validation recognizes IANA zones", () => {
  assert.equal(isValidTimezone("Asia/Kolkata"), true);
  assert.equal(isValidTimezone("Not/AZone"), false);
});
