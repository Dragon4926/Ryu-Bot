function truncate(text, max = 1900) {
  const value = String(text);
  return value.length <= max ? value : `${value.slice(0, max - 1)}…`;
}

function chunkText(text, max = 1900) {
  const chunks = [];
  let remaining = String(text).trim();
  while (remaining.length > max) {
    let split = remaining.lastIndexOf("\n", max);
    if (split < max * 0.5) split = remaining.lastIndexOf(" ", max);
    if (split < max * 0.5) split = max;
    chunks.push(remaining.slice(0, split).trim());
    remaining = remaining.slice(split).trim();
  }
  if (remaining) chunks.push(remaining);
  return chunks.length ? chunks : ["No response was generated."];
}

function shortId(id) {
  return id.split("-")[0];
}

module.exports = { chunkText, shortId, truncate };
