const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { JsonStore } = require("../src/storage/jsonStore");

const logger = { error() {} };

test("JsonStore persists per-user data", async (t) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "ryu-store-"));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const file = path.join(directory, "assistant.json");
  const store = new JsonStore(file, logger);
  await store.init();
  await store.update("guild", "user", "UTC", (data) => data.tasks.push({ id: "task-1" }));

  const reloaded = new JsonStore(file, logger);
  await reloaded.init();
  assert.deepEqual(reloaded.getUser("guild", "user").tasks, [{ id: "task-1" }]);
  assert.equal((await fs.stat(file)).mode & 0o777, 0o600);
});
