require('dotenv').config();
const { Client, IntentsBitField } = require('discord.js');
const client = new Client(
    {
        intents: [
            IntentsBitField.Flags.Guilds,
            IntentsBitField.Flags.GuildMessages,
            IntentsBitField.Flags.GuildMembers,
            IntentsBitField.Flags.MessageContent,
        ]       
    }
)

client.on('ready', (c)=> {
    console.log(`${c.user.username} is ready 👌`);
})

client.on('messageCreate', (msg)=> {
    if(msg.author.bot){ 
        return;
    }
    if(msg.content === 'hello'){ 
        msg.reply('Heya Comrade! 😎');
    }
})

client.login(process.env.TOKEN);