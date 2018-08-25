/* Copyright AToxicNinja 2018 */

const Discord = require('discord.js');
const {
    google
} = require('googleapis');
const BOTCONFIG = require('../botconfig.json');

let sheets = google.sheets('v4');

let onCooldown = false;
let cooldownSeconds = 300;

module.exports.help = {
    name: 'leaderboard'
};

module.exports.run = async function (bot, message, args) {
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
    if (onCooldown) {
        return message.reply(`This command has been used recently! Please wait ${cooldown} seconds between use.`);
    }

    // Set cooldown to true
    onCooldown = true;

    // set timeout to reset cooldown
    setTimeout(function () {
       onCooldown = false;
    }, cooldownSeconds * 1000);

    // Authorize Client for spreadsheets
    let authClient = await authorize();
    if (authClient === null) {
        botChannel.send("Authorization for Google Sheets Failed");
        return;
    }

    // Get Top 10 players by weekly vouchers
    let spreadsheetDataRowStart = BOTCONFIG.spreadsheetDataRowStart;
    let userRowEnd = BOTCONFIG.userRowEnd;
    let columnStart = BOTCONFIG.top10ColumnStart;
    let columnEnd = BOTCONFIG.top10ColumnEnd;

    let range = `${BOTCONFIG.spreadsheetTab}!${columnStart}${spreadsheetDataRowStart}:${columnEnd}${userRowEnd}`;
    //let totalCurrentMembers = 
    let userData = await sheets.spreadsheets.values.get({
        auth: authClient,
        spreadsheetId: process.env.spreadsheetID,
        majorDimension: "ROWS",
        range: range
    }).then(function (response) {
        return response.data.values;
    }).catch(function (error) {
        console.error(error);
    });

    userData.sort(sortArrByTotalVouchers);
    let top10Total = userData.slice(0, 10);

    userData.sort(sortArrByWeeklyVouchers);
    let top10Weekly = userData.slice(0, 10);

    //console.log(top10);

    let top10TotalString = "";
    top10Total.forEach(function (entry) {
        top10TotalString += `${entry[0]}: ${entry[2]} vouchers
    `;
    });

    let top10WeeklyString = "";
    top10Weekly.forEach(function (entry) {
        top10WeeklyString += `${entry[0]}: ${entry[3]} vouchers
    `;
    });

    let embedMsg = new Discord.RichEmbed()
        .setDescription("Top 10 Leaderboard")
        .setColor("#fa0ab2")
        .addField("Top 10 Total Vouchers", top10TotalString)
        .addField("Top 10 Weekly Vouchers", top10WeeklyString)
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

let strToInt = function (str) {
    str = str.replace(/\./, '');
    let ret = parseInt(str);
    if (!ret || ret === NaN) {
        return 0;
    }
    return ret;
}

/**
 * Sort function to pass to Arrays.sort() to sort on given index of array
 * @param {*[]} a The first array passed
 * @param {*[]} b The second array passed
 */
let sortArrByTotalVouchers = function (a, b) {
    let aInt = strToInt(a[2]);
    let bInt = strToInt(b[2]);

    if (aInt > bInt) {
        return -1;
    } else if (aInt < bInt) {
        return 1;
    } else {
        return 0;
    }
}

/**
 * Sort function to pass to Arrays.sort() to sort on given index of array
 * @param {*[]} a The first array passed
 * @param {*[]} b The second array passed
 */
let sortArrByWeeklyVouchers = function (a, b) {
    let aInt = strToInt(a[3]);
    let bInt = strToInt(b[3]);

    if (aInt > bInt) {
        return -1;
    } else if (aInt < bInt) {
        return 1;
    } else {
        return 0;
    }
}