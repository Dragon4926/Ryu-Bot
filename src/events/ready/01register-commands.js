require("dotenv").config();
const { REST, Routes, ApplicationCommandOptionType } = require("discord.js");

const commands = [
  {
    name: "hey",
    description: "The basic form of greetings",
  },
  {
    name: "embed",
    description: "sends an embed",
  },
  {
    name: "add",
    description: "Adds two numbers..",
    options: [
      {
        name: "first-number",
        description: "The first number",
        type: ApplicationCommandOptionType.Number,
        required: true,
      },
      {
        name: "second-number",
        description: "The 2nd number",
        type: ApplicationCommandOptionType.Number,
        required: true,
      },
    ],
  },
];

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

(async () => {
  try {
    console.log("Registering slash commands.....");

    await rest.put(
      Routes.applicationGuildCommands(
        process.env.CLIENT_ID,
        process.env.GUILD_ID
      ),
      { body: commands }
    );

    console.log("Slash commands Registered successfully..");
  } catch (error) {
    console.log(`Error found: ${error}`);
  }
})();
