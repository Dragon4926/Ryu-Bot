class ReminderScheduler {
  constructor({ client, store, logger }) {
    this.client = client;
    this.store = store;
    this.logger = logger;
    this.timer = null;
    this.running = false;
  }

  start() {
    if (this.timer) return;
    this.tick().catch((error) => this.logger.error("Reminder tick failed", { error: error.message }));
    this.timer = setInterval(() => {
      this.tick().catch((error) => this.logger.error("Reminder tick failed", { error: error.message }));
    }, 30_000);
    this.timer.unref();
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  async tick() {
    if (this.running) return;
    this.running = true;
    try {
      const now = new Date();
      let changed = false;
      for (const [key, data] of this.store.allUsers()) {
        const userId = key.split(":")[1];
        for (const reminder of data.reminders) {
          if (reminder.status !== "pending" || new Date(reminder.when) > now) continue;
          if (reminder.lastAttemptAt && now - new Date(reminder.lastAttemptAt) < 5 * 60_000) continue;
          try {
            const message = `⏰ **Executive reminder**\n${reminder.text}\n\nScheduled for <t:${Math.floor(new Date(reminder.when).getTime() / 1000)}:f>`;
            if (reminder.delivery === "channel" && reminder.channelId) {
              const channel = await this.client.channels.fetch(reminder.channelId);
              if (!channel?.isTextBased()) throw new Error("Reminder channel is unavailable");
              await channel.send({ content: `<@${userId}>\n${message}`, allowedMentions: { users: [userId] } });
            } else {
              const user = await this.client.users.fetch(userId);
              await user.send(message);
            }
            reminder.status = "delivered";
            reminder.deliveredAt = new Date().toISOString();
            changed = true;
          } catch (error) {
            reminder.attempts = (reminder.attempts || 0) + 1;
            reminder.lastError = error.message;
            if (reminder.attempts >= 3) reminder.status = "failed";
            changed = true;
            this.logger.warn("Could not deliver reminder", { userId, reminderId: reminder.id, attempts: reminder.attempts });
          }
        }
      }
      if (changed) await this.store.persist();
    } finally {
      this.running = false;
    }
  }
}

module.exports = { ReminderScheduler };
