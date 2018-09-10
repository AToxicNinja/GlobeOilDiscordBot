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

# LICENSE

Copyright 2018 Brad Friebe A.K.A. AToxicNinja

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
