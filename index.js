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
});

bot.on('message', function (msg) {
    if (msg.author.bot) return;
    if (msg.channel === 'dm') return;

    let guildMemb = msg.guild.member(msg.author);
    let globeOilRole = guildMemb.roles.find(function (val) {
        return val.name === "Globe Oil";
    });

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
