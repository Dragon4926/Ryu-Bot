require("dotenv").config();
const { Client, IntentsBitField, EmbedBuilder } = require("discord.js");
const client = new Client({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.GuildMembers,
    IntentsBitField.Flags.MessageContent,
  ],
});

client.on("ready", (c) => {
  console.log(`${c.user.username} is ready 👌`);
});

client.on("interactionCreate", async (interaction) => {
  try {
    if (!interaction.isButton()) return;

    await interaction.deferReply({  ephemeral: true });
  
    const role = interaction.guild.roles.cache.get(interaction.customId);
  
    if(!role){
      interaction.editReply({
          content: "Role not found"
      })
      return;
    }
  
    const hasrole = interaction.member.roles.cache.has(role.id);
  
    if (hasrole){
       await interaction.member.roles.remove(role);
       await interaction.editReply(`The role ${role} has been removed~`);
       return;
    }
  
    await interaction.member.roles.add(role);
       await interaction.editReply(`The role ${role} has been added~`);
    
  } catch (error) {
      console.log(error);
  }
})

client.on("interactionCreate", (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "hey")
    interaction.reply(
      "osmanthas wine tastes\n the same as I remember \n but where are those\n who share the memories..."
    );

  if (interaction.commandName === "add") {
    const num1 = interaction.options.get("first-number").value;
    const num2 = interaction.options.get("second-number").value;

    interaction.reply(
      `The sum of ${num1} and ${num2} is \n --> ${num1 + num2}`
    );
  }

  if (interaction.commandName === "embed") {
    const embed = new EmbedBuilder()
      .setTitle("Welcome")
      .setDescription("Glad to have you~")
      .setColor('Random');

    interaction.reply({ embeds: [embed] });
  }

});



client.on("messageCreate", (msg) => {
    if (msg.content === "embed") {
        const embed = new EmbedBuilder()
          .setTitle("Welcome")
          .setDescription("Glad to have you~")
          .setColor('Random');
    
        msg.channel.send({ embeds: [embed] });
      }
  });

client.on("messageCreate", (msg) => {
  if (msg.author.bot) {
    return;
  }
  if (msg.content === "hello") {
    msg.reply("Heya Comrade! 😎");
  }
});

client.login(process.env.TOKEN);
