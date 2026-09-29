const levels = { debug: 10, info: 20, warn: 30, error: 40 };

function createLogger(level = "info") {
  const threshold = levels[level] ?? levels.info;

  function write(name, message, meta = {}) {
    if (levels[name] < threshold) return;
    const record = { time: new Date().toISOString(), level: name, message, ...meta };
    const output = JSON.stringify(record);
    (name === "error" ? console.error : console.log)(output);
  }

  return {
    debug: (message, meta) => write("debug", message, meta),
    info: (message, meta) => write("info", message, meta),
    warn: (message, meta) => write("warn", message, meta),
    error: (message, meta) => write("error", message, meta),
  };
}

module.exports = { createLogger };
