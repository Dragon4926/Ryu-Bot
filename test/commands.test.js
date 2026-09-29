const test = require("node:test");
const assert = require("node:assert/strict");
const { commands, commandMap } = require("../src/commands");

test("all commands serialize and have unique handlers", () => {
  const definitions = commands.map((command) => command.data.toJSON());
  const names = definitions.map((definition) => definition.name);
  assert.equal(new Set(names).size, names.length);
  assert.equal(commandMap.size, commands.length);
  for (const command of commands) assert.equal(typeof command.execute, "function");
});
