const Discord = require('discord.js');
const {
    google
} = require('googleapis');
const BOTCONFIG = require('../botconfig.json');

let sheets = google.sheets('v4');

let cooldown = new Set();
let cooldownSeconds = 30;

module.exports.help = {
    name: 'members'
};

module.exports.run = async function(bot, message, args){
// Get calling user's guildMember info
let callingUser = message.guild.member(message.author);

// Get bot channel info
let botChannel = message.guild.channels.find(function (val) {
    return val.name === BOTCONFIG.botCmdChannel;
});

if (!botChannel) {
    return message.channel.send(`Couldn't find botCmdChannel: ${BOTCONFIG.botCmdChannel}`);
}

// Check if user is in cooldown, if so return
if (cooldown.has(callingUser.id)) {
    message.reply(`You must wait ${cooldownSeconds} seconds before using this command again`);
    return;
}

// Add user to cooldown list to prevent over-usage of command
cooldown.add(callingUser.id);

// set timeout to remove them
setTimeout(function () {
    cooldown.delete(callingUser.id);
}, cooldownSeconds * 1000);

// Authorize Client for spreadsheets
let authClient = await authorize();
if (authClient === null) {
    botChannel.send("Authorization for Google Sheets Failed");
    return;
}

// Get Member Count
let spreadsheetDataRowStart = BOTCONFIG.spreadsheetDataRowStart;
let userRowEnd = BOTCONFIG.userRowEnd;
let discordNameColumn = BOTCONFIG.discordNameColumn;
let maxMembersRowColumn = BOTCONFIG.maxMemberCountColumnRow;

let range = `${BOTCONFIG.spreadsheetTab}!${discordNameColumn}${spreadsheetDataRowStart}:${discordNameColumn}${userRowEnd}`;
    let totalCurrentMembers = await sheets.spreadsheets.values.get({
        auth: authClient,
        spreadsheetId: process.env.spreadsheetID,
        range: range
    }).then(function (response) {
        let userNames = response.data.values;
        return userNames.length;
    }).catch(function(error){
        console.error(error);
    });

    range = `${BOTCONFIG.spreadsheetTab}!${maxMembersRowColumn}`;
    let maxMembers = await sheets.spreadsheets.values.get({
        auth: authClient,
        spreadsheetId: process.env.spreadsheetID,
        range: range
    }).then(function (response){
        let max = 0;
        try{
            max = parseInt(response.data.values[0][0].replace(".",""));
        }
        catch(e)
        {
        }
        return max;
    }).catch(function(error)
    {
        console.log(error);
    });

    if(!maxMembers || !totalCurrentMembers){
        botChannel.send("There was an error trying to get the member count, please try again later");
        return;
    }

    let embedMsg = new Discord.RichEmbed()
    .setDescription("Member count")
    .setColor("#4286f4")
    .addField("Current Member Count", totalCurrentMembers)
    .addField("Current Max Members", maxMembers)
    .setFooter("Bot created by AToxicNinja#2491", 'https://yt3.ggpht.com/-L3ye7_AKy-0/AAAAAAAAAAI/AAAAAAAAAO4/8hgsbtA1oZo/s100-mo-c-c0xffffffff-rj-k-no/photo.jpg');

    botChannel.send(embedMsg);
};

async function authorize() {
    // configure a JWT auth client
    let jwtClient = new google.auth.JWT(
        process.env.serviceAccountEmail,
        null,
        process.env.serviceAccountPrivateKey.replace(/\\n/g, '\n'),
        'https://www.googleapis.com/auth/spreadsheets.readonly');

    // Authenticate request
    jwtClient.authorize(function (err, tokens) {
        if (err) {
            console.error(err);
            return;
        }
    });
    return jwtClient;
};