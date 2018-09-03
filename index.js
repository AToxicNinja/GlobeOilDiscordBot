const Discord = require('discord.js');
const fs = require('fs');
const dotenv = require('dotenv');
const bot = new Discord.Client();
const BOTCONFIG = require('./botconfig.json');

dotenv.config();
bot.commands = new Discord.Collection();

fs.readdir('./commands/', function (err, files) {
    if (err) {
        console.log(err);
        return;
    }

    let jsFiles = files.filter(function (file) {
        return file.split('.').pop() === 'js';
    });

    if (jsFiles.length <= 0) {
        console.log("Couldn't Find any commands.");
        return;
    }

    jsFiles.forEach(function (file, index) {
        let properties = require(`./commands/${file}`);
        console.log(`${file} loaded!`);
        bot.commands.set(properties.help.name, properties);
    });
});

bot.on('ready', function () {
    console.log(`Logged in as ${bot.user.tag}`);
    bot.user.setActivity('Transport Tycoon', {
        type: 'PLAYING'
    });

    // Find the discord guild first
    let guild = bot.guilds.find(function (val) {
        return val.name === "Globe oil Company Discord";
    });

    if (!guild) {
        return;
    }
    // Find system channel
    let channel = guild.channels.find(function (val) {
        return val.name.includes('manager-chat');
    });

    if (!channel) {
        return;
    }

    // get CEO role and let them know bot is started/updated
    let role = guild.roles.find(function (val) {
        return val.name === 'CEO';
    });
    if (role) {
        channel.send(`${role} Bot has been started/updated`);
    }

});

bot.on('message', function (msg) {
    if (msg.author.bot) return;
    if (msg.channel === 'dm') return;

    // let guildMemb = msg.guild.member(msg.author);
    // let globeOilRole = guildMemb.roles.find(function (val) {
    //     return val.name === "Globe Oil";
    // });

    // if (!guildMemb || !globeOilRole) {
    //     return msg.reply('Sorry, only Globe Oil employees can use me');
    // }

    let prefix = BOTCONFIG.cmdPrefix;
    let messageArray = msg.content.split(' ');
    let cmd = messageArray[0];
    if (cmd.startsWith(prefix)) {
        let args = messageArray.slice(1);

        let commandFile = bot.commands.get(cmd.slice(prefix.length));

        if (commandFile) {
            commandFile.run(bot, msg, args);
        }
    }
});

bot.login(process.env.botToken);
