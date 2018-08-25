/* Copyright AToxicNinja 2018 */

const Discord = require('discord.js');
const {
    google
} = require('googleapis');
const BOTCONFIG = require('../botconfig.json');

let sheets = google.sheets('v4');

let cooldown = new Set();
let cooldownSeconds = 30;

let spreadsheetDataRowStart = BOTCONFIG.spreadsheetDataRowStart;
let userRowEnd = BOTCONFIG.userRowEnd;
let discordNameColumn = BOTCONFIG.discordNameColumn;
let totalVoucherAmountColumn = BOTCONFIG.totalVoucherAmountColumn;
let weeklyVoucherAmountColumn = BOTCONFIG.weeklyVoucherAmountColumn;
let currentRankColumn = BOTCONFIG.currentRankColumn;

let voucherLevels = BOTCONFIG.voucherLevelRequirements;
let voucherLevelNames = BOTCONFIG.voucherLevelNames;

module.exports.help = {
    name: 'vouchers'
};

module.exports.run = async function (bot, message, args) {
    // Get calling user's guildMember info
    let callingUser = message.guild.member(message.author);

    // Get bot channel info
    let botChannel = message.guild.channels.find(function (val) {
        return val.name === BOTCONFIG.botVoucherChannel;
    });

    if (!botChannel) {
        return message.channel.send(`Couldn't find botVoucherChannel: <@${BOTCONFIG.botVoucherChannel}>`);
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

    let userRank;
    let userWeeklyVouchers;
    let userTotalVouchers;

    // Promises array for user's relative ID in spreadsheet, userRank, weeklyVouchers, and totalVouchers
    let promises = [];

    // Get the user's row number from spreadsheet
    let range = `${BOTCONFIG.spreadsheetVoucherTab}!${discordNameColumn}${spreadsheetDataRowStart}:${discordNameColumn}${userRowEnd}`;
    let relativeUserID = await sheets.spreadsheets.values.get({
        auth: authClient,
        spreadsheetId: process.env.spreadsheetID,
        range: range
    }).then(function (response) {
        let userNames = response.data.values;
        let userIndex;
        let idx = -1;
        let found = false;

        while (!found && idx <= userRowEnd) {
            idx++;
            if (userNames[idx] && userNames[idx][0]) {
                let userName = userNames[idx][0];
                if (userName.startsWith("@")) {
                    userName = userName.slice(1);
                }
                if (userName === `${callingUser.user.username}#${callingUser.user.discriminator}`) {
                    found = true;
                    userIndex = idx + spreadsheetDataRowStart;
                }
            }
        }

        if (!found) {
            console.log(`Unable to find user: ${callingUser.user.username}#${callingUser.user.discriminator}`);
            let spreadsheetEditorRole = message.guild.roles.find(function (val) {
                return val.name === 'Spreadsheeteditor';
            });

            message.reply(`Unable to find user's Discord in spreadsheet, a manager is being informed to fix this issue, so please be patient ${spreadsheetEditorRole}`);
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

    // If User was not found in spreadsheet, return
    if (!relativeUserID) {
        return
    }

    // Get user rank
    range = `${BOTCONFIG.spreadsheetVoucherTab}!${currentRankColumn}${relativeUserID}`;
    promises.push(sheets.spreadsheets.values.get({
        auth: authClient,
        spreadsheetId: process.env.spreadsheetID,
        range: range
    }).then(function (response) {
        if (response.data.values && response.data.values[0]) {
            userRank = response.data.values[0][0];
        }
    }));

    // Get User Weekly Vouchers
    range = `${BOTCONFIG.spreadsheetVoucherTab}!${weeklyVoucherAmountColumn}${relativeUserID}`;
    promises.push(sheets.spreadsheets.values.get({
        auth: authClient,
        spreadsheetId: process.env.spreadsheetID,
        range: range
    }).then(function (response) {
        if (response.data.values && response.data.values[0]) {
            userWeeklyVouchers = parseInt(response.data.values[0][0].replace(".", ""), 10);
        }
    }));

    // Get User Total Vouchers
    range = `${BOTCONFIG.spreadsheetVoucherTab}!${totalVoucherAmountColumn}${relativeUserID}`;
    promises.push(sheets.spreadsheets.values.get({
        auth: authClient,
        spreadsheetId: process.env.spreadsheetID,
        range: range
    }).then(function (response) {
        if (response.data.values && response.data.values[0]) {
            userTotalVouchers = parseInt(response.data.values[0][0].replace(".", ""), 10);
        }
    }));

    // Go through all promises
    Promise.all(promises).then(function () {
        // Get next level
        let userNextLevel;
        let userNextLevelVouchersNeeded;
        let nextLevelIndex = voucherLevels.findIndex(function (element) {
            return element > userTotalVouchers;
        });

        if (nextLevelIndex === -1) {
            userNextLevel = "Max Level Reached";
            userNextLevelVouchersNeeded = 0;
        } else {
            userNextLevel = voucherLevelNames[nextLevelIndex];
            userNextLevelVouchersNeeded = voucherLevels[nextLevelIndex] - userTotalVouchers;
        }

        // Print embedded message in bot channel chat
        let voucherEmbed = new Discord.RichEmbed()
            .setDescription("Voucher Information")
            .setColor("#09e213");

        let voucherNum = parseInt(userWeeklyVouchers, 10);

        if ((userRank !== "CEO" && userRank !== "Manager") && (voucherNum === NaN || voucherNum < 200)) {
            voucherEmbed.setColor("#e80000");
            voucherEmbed.addField("WARNING: You have not turned in the weekly quota yet", "You will be fired if you cannot meet this quota");
        }

        voucherEmbed.setThumbnail(callingUser.user.displayAvatarURL)
            .addField("User", `${callingUser}`)
            .addField("Rank", userRank)
            .addField("Weekly Vouchers", userWeeklyVouchers)
            .addField("Total Vouchers", userTotalVouchers)
            .addField("Next Rank", userNextLevel)
            .addField("Vouchers Needed For Next Rank", userNextLevelVouchersNeeded)
            .addField("Spreadsheet Row Number: ", relativeUserID, true)
            .setFooter("Bot created by AToxicNinja#2491", 'https://yt3.ggpht.com/-L3ye7_AKy-0/AAAAAAAAAAI/AAAAAAAAAO4/8hgsbtA1oZo/s100-mo-c-c0xffffffff-rj-k-no/photo.jpg');

        console.log(`Got information for ${callingUser.user.username}#${callingUser.user.discriminator}`);
        botChannel.send(voucherEmbed);
    }).catch(function (error) {
        if (error !== '') {
            console.log('The API returned an error: ' + error);
            message.reply(`There was an error: ${error}`);
        }
    });
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