const Discord = require('discord.js');
const fs = require('fs');
const bot = new Discord.Client();
const BOTCONFIG = require('./botconfig.json');

bot.commands = new Discord.Collection();

fs.readdir('./commands/', function (err, files) {
    if (err) {
        console.log(err);
        return;
    }

    let jsFiles = files.filter(function (file) {
        return file.split(".").pop() === "js";
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
    bot.user.setActivity("Transport Tycoon", {
        type: "PLAYING"
    });
});

bot.on('message', function (msg) {
    if (msg.author.bot) return;
    if (msg.channel.type === 'dm') {
        msg.reply("I'm too shy to dm, sorry");
        return;
    }

    let botChannel = msg.guild.channels.find(function (val) {
        return val.name === BOTCONFIG.botCmdChannel;
    });

    if (msg.channel != botChannel) {
        return;
    }

    let prefix = BOTCONFIG.cmdPrefix;
    let messageArray = msg.content.split(" ");
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