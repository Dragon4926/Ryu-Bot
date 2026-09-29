const assistant = require("./assistant");
const briefing = require("./briefing");
const help = require("./help");
const note = require("./note");
const profile = require("./profile");
const reminder = require("./reminder");
const task = require("./task");
const trade = require("./trade");
const workflow = require("./workflow");

const commands = [assistant, briefing, help, note, profile, reminder, task, trade, workflow];
const commandMap = new Map(commands.map((command) => [command.data.name, command]));

module.exports = { commands, commandMap };
