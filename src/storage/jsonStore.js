const fs = require("node:fs/promises");
const path = require("node:path");

const EMPTY_STATE = { version: 1, users: {} };

class JsonStore {
  constructor(file, logger) {
    this.file = file;
    this.logger = logger;
    this.state = structuredClone(EMPTY_STATE);
    this.writeQueue = Promise.resolve();
  }

  async init() {
    await fs.mkdir(path.dirname(this.file), { recursive: true });
    try {
      const content = await fs.readFile(this.file, "utf8");
      this.state = JSON.parse(content);
      if (!this.state.users || this.state.version !== 1) {
        throw new Error("Unsupported or malformed data file");
      }
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      await this.persist();
    }
  }

  userKey(guildId, userId) {
    return `${guildId}:${userId}`;
  }

  getUser(guildId, userId, defaultTimezone = "UTC") {
    const key = this.userKey(guildId, userId);
    if (!this.state.users[key]) {
      this.state.users[key] = {
        profile: { timezone: defaultTimezone },
        tasks: [],
        reminders: [],
        notes: [],
        assistantHistory: [],
      };
    }
    return this.state.users[key];
  }

  allUsers() {
    return Object.entries(this.state.users);
  }

  async update(guildId, userId, defaultTimezone, mutator) {
    const user = this.getUser(guildId, userId, defaultTimezone);
    const result = await mutator(user);
    await this.persist();
    return result;
  }

  async persist() {
    const operation = this.writeQueue.then(async () => {
      const temp = `${this.file}.${process.pid}.tmp`;
      await fs.writeFile(temp, `${JSON.stringify(this.state, null, 2)}\n`, { mode: 0o600 });
      await fs.rename(temp, this.file);
    });
    this.writeQueue = operation.catch((error) => {
      this.logger.error("Failed to persist assistant data", { error: error.message });
    });
    return operation;
  }
}

module.exports = { JsonStore };
