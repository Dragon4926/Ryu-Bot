require("dotenv").config();

const { Client, IntentsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

const client = new Client({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.GuildMembers,
    IntentsBitField.Flags.MessageContent,
  ],
});

const roles = [
    {
        id: '1083751302397440110',
        label: 'Bronze'
    }
]

client.on("ready",async (c) => {

    console.log(`${c.user.username} is ready 👌`);
    
    try {
        const channel = await client.channels.cache.get('1076061379380920413');
        
        if(!channel) return;

        const row = new ActionRowBuilder();

        roles.forEach((role) => {
            row.components.push(
                new ButtonBuilder().setCustomId(role.id).setLabel(role.label).setStyle(ButtonStyle.Success)
            )
        })

        await channel.send({
            content: 'Claim or remove the following role: ',
            components: [row]
        })

        process.exit();
    } catch (error) {
        console.log(error);
    }
  
});

client.login(process.env.TOKEN);
