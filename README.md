A YGOPro server.

Is now used in [swallow card] (https://mycard.moe/) and [YGOPRO 233 service] (http://mercury233.me/ygosrv233/).

### Current functions
* Run on Linux
* Run on Windows
* Players enter the same room name.
* Players do not specify the room name. Automatically matchs the online players
* Room list json
* Broadcast messages
* Summon messages
* Windbot Online AI

### Currently does not support
* Online chat room

### Instructions
* Refer to [wiki] (https://github.com/mercury233/ygopro-server/wiki) to install (Currently a work in progress)
* Manual installation:
  * Install the modified YGOPro server: https: //github.com/mycard/ygopro/tree/server
  * `git clone https: // github.com / mycard / ygopro-server.git`
  * `cd ygopro-server`
  * `npm install`
* Copy `config.json` to` config.user.json` and make changes
  * `port` for the port you want
  * `modules.stop` is text when the server is closed
  * ~ ~ More options see wiki ~ ~
* `node ygopro-server.js` to run
* Easy console at http://mercury233.me/ygosrv233/dashboard.html

### Advanced features
* To be added
* Easy advance card update console at http://mercury233.me/ygosrv233/pre-dashboard.html (See moecube's github)

### Development Plan
* Redo the CTOS and STOC sections
* Modular addition function
  * Room name code
  * Random Battle
  * Summon lines
  * WindBot
* User account system and administrator account system
* Cloud video replacement storage mode

### TODO
* refactoring CTOS and STOC
* change features to modules
  * room name parsing
  * random duel
  * summon dialogues
  * WindBot (To make it more stable)
  * cloud replay
  * tournament mode
  * expansions updater (I have this but not moecube)
* user and admin account system
* new database for cloud replay
