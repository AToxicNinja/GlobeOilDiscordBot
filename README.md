# GlobeOilDiscordBot
This is a Discord bot created for a game server company's discord.
It lets users use a few commands to grab user data from a google spreadsheet using google apis and displays it to the user

## Commands
- new commands can be added easily by adding a new .js file in the commands folder
- The new command will automatically be picked up/loaded when bot is restarted
- Commands must have:
```
module.exports.help = { name: 'name of command' };

module.exports.run = async function(bot, message, args) {};
```

