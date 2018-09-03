/* Copyright AToxicNinja 2018 */

//const Discord = require('discord.js');
const BOTCONFIG = require('../botconfig.json');

module.exports.help = {
    name: 'weekly'
};

module.exports.quotaOn = true;

module.exports.run = async function (bot, message, args) {

    // Check user's role, only managers+ can use this command
    // Get calling user's guildMember info
    let callingUser = message.guild.member(message.author);

    let acceptableRoles = BOTCONFIG.managerRoles;
    let role = callingUser.roles.find(function (val) {
        if (acceptableRoles.indexOf(val.name) > -1) {
            return true;
        }
        return false;
    });

    if (!role) {
        console.log(`${callingUser.user.username}#${callingUser.user.discriminator} tried to use weekly command`);
        return;
    }

    // Handle setting quota on or off based on args
    if (!args || !args[0]) {
        return message.reply("You must specify an argument. Can only be 'on' or 'off'");
    }
    if (args[0].toLowerCase() === 'on') {
        module.exports.quotaOn = true;
        return message.reply("Turned weekly quota ON");
    } else if (args[0].toLowerCase() === 'off') {
        module.exports.quotaOn = false;
        return message.reply("Turned weekly quota OFF");
    } else {
        return message.reply("Unknown arguments. Can only be 'on' or 'off'");
    }
};