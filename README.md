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

### License
SRVPro

Copyright (C) 2013-2017  MoeCube Team

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.
