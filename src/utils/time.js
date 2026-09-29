function isValidTimezone(timezone) {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

function parseMoment(input, now = new Date()) {
  const value = input.trim().toLowerCase();
  const relative = value.match(/^(\d+)\s*(m|min|mins|h|hr|hrs|d|day|days)$/);
  if (relative) {
    const amount = Number(relative[1]);
    const unit = relative[2][0];
    const milliseconds = amount * ({ m: 60_000, h: 3_600_000, d: 86_400_000 }[unit]);
    return new Date(now.getTime() + milliseconds);
  }

  const parsed = new Date(input);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function discordTimestamp(date, style = "f") {
  return `<t:${Math.floor(new Date(date).getTime() / 1000)}:${style}>`;
}

function formatInTimezone(date, timezone) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: timezone,
  }).format(new Date(date));
}

module.exports = { discordTimestamp, formatInTimezone, isValidTimezone, parseMoment };
