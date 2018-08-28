/* Copyright AToxicNinja 2018 */

const Discord = require('discord.js');
const {
    google
} = require('googleapis');
const BOTCONFIG = require('../botconfig.json');

let sheets = google.sheets('v4');

let cooldown = new Set();
let cooldownSeconds = 30;

let spreadSheetRowStart = 1;

module.exports.help = {
    name: 'ref'
};

module.exports.run = async function (bot, message, args) {
    // Get calling user's guildMember info
    let callingUser = message.guild.member(message.author);

    // Get bot channel info
    let botChannel = message.guild.channels.find(function (val) {
        return val.name === BOTCONFIG.botReferralChannel;
    });

    if (!botChannel) {
        return message.channel.send(`Couldn't find botReferralChannel: <@${BOTCONFIG.botReferralChannel}>`);
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
        botChannel.send('Authorization for Google Sheets Failed');
        return;
    }

    // Get the member count
    let range = `${BOTCONFIG.spreadsheetVoucherTab}!${BOTCONFIG.maxMemberCountColumnRow}`;
    let maxMemberCount = await sheets.spreadsheets.values.get({
        auth: authClient,
        spreadsheetId: process.env.spreadsheetID,
        range: range
    }).then(function (response) {
        let max = 0;
        try {
            max = parseInt(response.data.values[0][0].replace('.', ''));
        } catch (e) {
            console.log(e);
        }
        return max;
    }).catch(function (error) {
        console.log(error);
    });
    if (!maxMemberCount) {
        maxMemberCount = 155; // Default to 155 if cannot get count
    }

    let spreadSheetRowEnd = maxMemberCount + spreadSheetRowStart;
    let discordNameColumn = BOTCONFIG.referralDiscordNameColumn;

    range = `${BOTCONFIG.spreadsheetReferralTab}!${discordNameColumn}${spreadSheetRowStart}:${discordNameColumn}${spreadSheetRowEnd}`;
    let relativeUserID = await sheets.spreadsheets.values.get({
        auth: authClient,
        spreadsheetId: process.env.spreadsheetID,
        range: range
    }).then(function (response) {
        let userNames = response.data.values;
        let userIndex;
        let idx = -1;
        let found = false;

        while (!found && idx <= spreadSheetRowEnd) {
            idx++;
            if (userNames[idx] && userNames[idx][0]) {
                let userName = userNames[idx][0];
                if (userName.startsWith('@')) {
                    userName = userName.slice(1);
                }
                if (userName === `${callingUser.user.username}#${callingUser.user.discriminator}`) {
                    found = true;
                    userIndex = idx + spreadSheetRowStart;
                }
            }
        }

        if (!found) {
            console.log(`Unable to find user: ${callingUser.user.username}#${callingUser.user.discriminator}`);
            let spreadsheetEditorRole = message.guild.roles.find(function (val) {
                return val.name === 'Spreadsheeteditor';
            });

            message.reply(`Unable to find user's Discord in referral spreadsheet, a manager is being informed to fix this issue, so please be patient ${spreadsheetEditorRole}`);
            return;
        }

        return userIndex;
    }).catch(function (error) {
        if (error.errors) {
            console.log(error.errors);
        } else {
            console.error(error);
        }
    });

    let referredByColumn = BOTCONFIG.referralReferredByColumn;
    let referralJoinDateColumn = BOTCONFIG.referralJoinDateColumn;
    let referralBankBalance = BOTCONFIG.referralBankColumn;

    range = `${BOTCONFIG.spreadsheetReferralTab}!${referredByColumn}${spreadSheetRowStart}:${discordNameColumn}${spreadSheetRowEnd}`;
    let referredUsers = await sheets.spreadsheets.values.get({
        auth: authClient,
        spreadsheetId: process.env.spreadsheetID,
        range: range
    }).then(function (response) {
        let userNames = response.data.values;
        let callingUserFormatted = `${callingUser.user.username}#${callingUser.user.discriminator}`;
        let referrals = [];

        for (let i = 0; i < userNames.length; i++) {
            let user = userNames[i][0].startsWith('@') ? userNames[i][0].slice(1) : userNames[i][0];
            if (user !== '' && user === callingUserFormatted) {
                referrals.push(userNames[i][userNames[i].length - 1]);
            }
        }
        return referrals;
    }).catch(function (err) {
        console.error('Failed to retrieve referred users: ' + err);
    });

    if (!referredUsers) {
        return message.reply('Sorry, something went wrong! Try again later');
    }

    let numberReferred = referredUsers.length;

    range = `${BOTCONFIG.spreadsheetReferralTab}!${referralJoinDateColumn}${relativeUserID}`;
    let joinDate = await sheets.spreadsheets.values.get({
        auth: authClient,
        spreadsheetId: process.env.spreadsheetID,
        range: range
    }).then(function (response) {
        let joinDate = response.data.values;
        if (!joinDate) {
            console.log("Couldn't Find Join Date of " + callingUser.user.userName);
            return null;
        }
        return joinDate[0][0];
    }).catch(function (err) {
        console.error(err);
    });

    if (!joinDate || joinDate === '') {
        return message.reply('Join date format is bad/Non-Existant');
    }

    // Get user's Total Referral Bank
    range = `${BOTCONFIG.spreadsheetReferralTab}!${referralBankBalance}${relativeUserID}`;
    let bankBalance = await sheets.spreadsheets.values.get({
        auth: authClient,
        spreadsheetId: process.env.spreadsheetID,
        range: range
    }).then(function (response) {
        let balance = response.data.values;
        if (!balance) {
            return 0;
        }
        return balance[0][0].replace('.', '');
    }).catch(function (err) {
        console.log("Couldn't find bank balance for user: " + callingUser.user.userName);
        console.error(err);
    });

    if (bankBalance === null || bankBalance === undefined) {
        return message.reply('Could not find referral bank balance');
    }

    // really bad code to get Date object without timestamp, only month, day, year
    let tempDate = new Date();
    let currentDate = new Date(tempDate.getFullYear(), tempDate.getMonth(), tempDate.getDate());

    let joinDateFormatted = formatDate(joinDate);
    let timeDiff = Math.abs(currentDate.getTime() - joinDateFormatted.getTime());
    let diffDays = Math.ceil(timeDiff / (1000 * 3600 * 24));

    let referredMemberString = '';

    for (let j = 0; j < referredUsers.length; j++) {
        referredMemberString += '' + (j + 1) + '. ' + referredUsers[j] + '\n';
    }

    if (referredMemberString === '') {
        referredMemberString = 'No Users Referred';
    }

    let canRedeemBalance = (diffDays >= 14) ? 'YES' : 'NO';

    let embedMessage = new Discord.RichEmbed()
        .setDescription('User Referrals')
        .setColor('#fd7b12')
        .addField('User', callingUser)
        .addField('Number Referrals', numberReferred)
        .addField('Referred Members', referredMemberString)
        .addField('Referral Bank', '$' + bankBalance)
        .addField('Referral Bank Redeemable', canRedeemBalance);

    botChannel.send(embedMessage);
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

function formatDate(joinDate) {
    let year, month, date;
    if (joinDate.indexOf('.') > -1) {
        date = joinDate.substring(0, 2);
        month = joinDate.substring(3, 5);
        year = joinDate.substring(6);
    } else {
        month = joinDate.substring(0, 2);
        date = joinDate.substring(3, 5);
        year = joinDate.substring(6);
    }

    let retDate = new Date(year, parseInt(month, 10) - 1, date);
    return retDate;
}