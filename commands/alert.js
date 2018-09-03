/* Copyright AToxicNinja 2018 */

const Discord = require('discord.js');
const {
    google
} = require('googleapis');
const BOTCONFIG = require('../botconfig.json');

let sheets = google.sheets('v4');

let cooldown = false;
let cooldownSeconds = 60;

let voucherSheetDataRowStart = BOTCONFIG.voucherSheetDataRowStart;
let userRowEnd = BOTCONFIG.userRowEnd;
let discordNameColumn = BOTCONFIG.discordNameColumn;
let weeklyVoucherAmountColumn = BOTCONFIG.weeklyVoucherAmountColumn;

module.exports.help = {
    name: 'alert'
};

module.exports.run = async function (bot, message, args) {
    // Get calling user's guildMember info
    let callingUser = message.channel.guild.member(message.author);

    // Make sure calling user is a manager or above
    let acceptableRoles = BOTCONFIG.managerRoles;
    let role = callingUser.roles.find(function (val) {
        if (acceptableRoles.indexOf(val.name) > -1) {
            return true;
        }
        return false;
    });

    if (!role) {
        console.log(`${callingUser.user.username}#${callingUser.user.discriminator} tried to use alert command`);
        return;
    }

    // Get bot channel info
    let botChannel = message.guild.channels.find(function (val) {
        return val.name.includes(BOTCONFIG.alertChannel);
    });

    if (!botChannel) {
        return message.channel.send(`Couldn't find alertChannel: ${BOTCONFIG.botVoucherChannel}`);
    }

    // Check if user is in cooldown, if so return
    if (cooldown) {
        message.reply(`You can only use this command every ${cooldownSeconds} seconds.`);
        return;
    }

    // set cooldown to true to prevent over-usage of command
    cooldown = true;

    // set timeout to stop cooldown
    setTimeout(function () {
        cooldown = false;
    }, cooldownSeconds * 1000);

    // Authorize Client for spreadsheets
    let authClient = await authorize();
    if (authClient === null) {
        botChannel.send('Authorization for Google Sheets Failed');
        return;
    }

    // Get Users and weekly vouchers
    let range = `${BOTCONFIG.spreadsheetVoucherTab}!${discordNameColumn}${voucherSheetDataRowStart}:${weeklyVoucherAmountColumn}${userRowEnd}`;
    let atRiskUsers = await sheets.spreadsheets.values.get({
        auth: authClient,
        spreadsheetId: process.env.spreadsheetID,
        range: range
    }).then(function (response) {
        let data = response.data.values;
        return data.filter(function (data) {
            let vouchers = data[data.length - 1];
            if (vouchers.includes('manager') || vouchers.includes('ceo')) {
                return false;
            }

            return parseInt(vouchers.replace(/\./g, ''), 10) < 200;
        });
    }).catch(function (err) {
        console.error("Alert: " + err);
    });

    // Create message to send alerting all users who are at risk of being fired
    if (!atRiskUsers) {
        return;
    }

    let alertMsg = 'ALERT: At Risk of being fired unless 200 vouchers are turned in by the end of the week!\n';
    botChannel.send(alertMsg);
    alertMsg = '';
    let userCount = 0;

    for (let i = 0; i < atRiskUsers.length; i++) {
        let atRiskUser = atRiskUsers[i][0];
        if (atRiskUser === '') {
            continue;
        }

        if (atRiskUser.startsWith('@')) {
            atRiskUser = atRiskUser.substring(1);
        }

        let user = message.channel.guild.members.find(function (val) {
            return (val.user.username + "#" + val.user.discriminator) === atRiskUser;
        });

        if (!user) {
            continue;
        }

        let strToAdd = ` ${user}`;
        if ((alertMsg.length + strToAdd.length) > 2000) {
            botChannel.send(alertMsg);
            alertMsg = '';
        }
        alertMsg += strToAdd;
        userCount++;
    }

    botChannel.send(alertMsg);
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