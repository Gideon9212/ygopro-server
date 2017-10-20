var express  = require('express')
  , session  = require('express-session')
  , passport = require('passport')
  , Strategy = require('../lib').Strategy
  , app      = express();

passport.serializeUser(function(user, done) {
  done(null, user);
});
passport.deserializeUser(function(obj, done) {
  done(null, obj);
});

var scopes = ['identify', 'email', /* 'connections', (it is currently broken) */ 'guilds', 'guilds.join'];

passport.use(new Strategy({
    clientID: '370696912640409604',
    clientSecret: 'eY5Tj2ne2ATH7_ZMJTpAVkwIrOqhEqrR',
    callbackURL: 'http://localhost:50451/callback',
    scope: scopes
}, function(accessToken, refreshToken, profile, done) {
    process.nextTick(function() {
        return done(null, profile);
    });
}));

app.use(session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
app.get('/', passport.authenticate('discord', { scope: scopes }), function(req, res) {});
app.get('/callback',
    passport.authenticate('discord', { failureRedirect: '/' }), function(req, res) { res.redirect('/info') } // auth success
);
app.get('/logout', function(req, res) {
    req.logout();
    res.redirect('/');
});
app.get('/info', checkAuth, function(req, res) {
    //console.log(req.user)
    res.json(req.user);
});


function checkAuth(req, res, next) {
    if (req.isAuthenticated()) return next();
    res.send('not logged in :(');
}


app.listen(50451, function (err) {
    if (err) return console.log(err)
    console.log('Listening at http://localhost:50451/')
})

(function() {
  var Cloud_replay_ids, ROOM_all, ROOM_bad_ip, ROOM_ban_player, ROOM_connected_ip, ROOM_find_by_name, ROOM_find_by_port, ROOM_find_by_title, ROOM_find_or_create_ai, ROOM_find_or_create_by_name, ROOM_find_or_create_random, ROOM_players_banned, ROOM_players_oppentlist, ROOM_unwelcome, ROOM_validate, Room, _, addCallback, ban_user, bunyan, cppversion, crypto, date, defaultconfig, execFile, fs, geoip, get_memory_usage, http, http_server, https, https_server, list, load_dialogues, load_tips, log, moment, nconf, net, options, os, path, pgClient, pg_client, pg_query, redis, redisdb, report_to_big_brother, request, requestListener, roomlist, settings, spawn, spawnSync, url, users_cache, wait_room_start, windbot_process, ygopro, zlib;

  bat = null;
  
  net = require('net');

  http = require('http');

  url = require('url');

  path = require('path');

  fs = require('fs');

  os = require('os');

  crypto = require('crypto');

  execFile = require('child_process').execFile;

  spawn = require('child_process').spawn;

  spawnSync = require('child_process').spawnSync;

  _ = require('underscore');

  _.str = require('underscore.string');

  _.mixin(_.str.exports());

  request = require('request');

  bunyan = require('bunyan');

  log = bunyan.createLogger({
    name: "mycard"
  });

  moment = require('moment');

  moment.locale('zh-cn', {
    relativeTime: {
      future: '%s内',
      past: '%s前',
      s: '%d秒',
      m: '1分钟',
      mm: '%d分钟',
      h: '1小时',
      hh: '%d小时',
      d: '1天',
      dd: '%d天',
      M: '1个月',
      MM: '%d个月',
      y: '1年',
      yy: '%d年'
    }
  });

  nconf = require('nconf');

  nconf.file('./config.user.json');

  defaultconfig = require('./config.json');

  nconf.defaults(defaultconfig);

  settings = global.settings = nconf.get();

  nconf.myset = function(settings, path, val) {
    var key, target;
    nconf.set(path, val);
    nconf.save();
    if (_.isString(val)) {
      log.info("setting changed", path, val);
    }
    path = path.split(':');
    if (path.length === 0) {
      settings[path[0]] = val;
    } else {
      target = settings;
      while (path.length > 1) {
        key = path.shift();
        target = target[key];
      }
      key = path.shift();
      target[key] = val;
    }
  };

  try {
    cppversion = parseInt(fs.readFileSync('ygopro/gframe/game.cpp', 'utf8').match(/PRO_VERSION = ([x\dABCDEF]+)/)[1], '16');
    nconf.myset(settings, "version", cppversion);
    log.info("ygopro version 0x" + settings.version.toString(16), "(from source code)");
  } catch (error1) {
    log.info("ygopro version 0x" + settings.version.toString(16), "(from config)");
  }

  settings.lflist = (function() {
    var j, len, ref, results;
    ref = fs.readFileSync('ygopro/lflist.conf', 'utf8').match(/!.*/g);
    results = [];
    for (j = 0, len = ref.length; j < len; j++) {
      list = ref[j];
      date = list.match(/!([\d\.]+)/);
      if (!date) {
        continue;
      }
      results.push({
        date: moment(list.match(/!([\d\.]+)/)[1], 'YYYY.MM.DD').utcOffset("-08:00"),
        tcg: list.indexOf('TCG') !== -1
      });
    }
    return results;
  })();

  if (settings.modules.cloud_replay.enabled) {
    redis = require('redis');
    zlib = require('zlib');
    redisdb = redis.createClient({
      host: "127.0.0.1",
      port: settings.modules.cloud_replay.redis_port
    });
    redisdb.on('error', function(err) {
      log.warn(err);
    });
  }

  if (settings.modules.windbot.enabled) {
    settings.modules.windbots = require(settings.modules.windbot.botlist).windbots;
  }

  ygopro = require('./ygopro.js');

  if (settings.modules.http.websocket_roomlist) {
    roomlist = require('./roomlist.js');
  }

  if (settings.modules.i18n.auto_pick) {
    geoip = require('geoip-country-lite');
  }

  users_cache = {};

  if (settings.modules.mycard.enabled) {
    pgClient = require('pg').Client;
    pg_client = new pgClient(settings.modules.mycard.auth_database);
    pg_client.on('error', function(err) {
      log.warn("PostgreSQL ERROR: ", err);
    });
    pg_query = pg_client.query('SELECT username, id from users');
    pg_query.on('error', function(err) {
      log.warn("PostgreSQL Query ERROR: ", err);
    });
    pg_query.on('row', function(row) {
      users_cache[row.username] = row.id;
    });
    pg_query.on('end', function(result) {
      log.info("users loaded", result.rowCount);
    });
    pg_client.on('drain', pg_client.end.bind(pg_client));
    log.info("loading mycard user...");
    pg_client.connect();
  }

  get_memory_usage = function() {
    var actualFree, buffers, cached, free, line, lines, percentUsed, prc_free, total;
    prc_free = spawnSync("free", []);
    if (prc_free.stdout) {
      lines = prc_free.stdout.toString().split(/\n/g);
      line = lines[1].split(/\s+/);
      total = parseInt(line[1], 10);
      free = parseInt(line[3], 10);
      buffers = parseInt(line[5], 10);
      cached = parseInt(line[6], 10);
      actualFree = free + buffers + cached;
      percentUsed = parseFloat(((1 - (actualFree / total)) * 100).toFixed(2));
    } else {
      percentUsed = 0;
    }
    return percentUsed;
  };

  Cloud_replay_ids = [];

  ROOM_all = [];

  ROOM_players_oppentlist = {};

  ROOM_players_banned = [];

  ROOM_connected_ip = {};

  ROOM_bad_ip = {};

  ban_user = function(name) {
    var bad_ip, j, k, len, len1, player, ref, room;
    settings.ban.banned_user.push(name);
    nconf.myset(settings, "ban:banned_user", settings.ban.banned_user);
    bad_ip = 0;
    for (j = 0, len = ROOM_all.length; j < len; j++) {
      room = ROOM_all[j];
      if (room && room.established) {
        ref = room.players;
        for (k = 0, len1 = ref.length; k < len1; k++) {
          player = ref[k];
          if (player && (player.name === name || player.ip === bad_ip)) {
            bad_ip = player.ip;
            ROOM_bad_ip[bad_ip] = 99;
            settings.ban.banned_ip.push(player.ip);
            ygopro.stoc_send_chat_to_room(room, player.name + " ${kicked_by_system}", ygopro.constants.COLORS.RED);
            player.destroy();
            continue;
          }
        }
      }
    }
  };

  ROOM_ban_player = function(name, ip, reason, countadd) {
    var bannedplayer, bantime;
    if (countadd == null) {
      countadd = 1;
    }
    bannedplayer = _.find(ROOM_players_banned, function(bannedplayer) {
      return ip === bannedplayer.ip;
    });
    if (bannedplayer) {
      bannedplayer.count = bannedplayer.count + countadd;
      bantime = bannedplayer.count > 3 ? Math.pow(2, bannedplayer.count - 3) * 2 : 0;
      bannedplayer.time = moment() < bannedplayer.time ? moment(bannedplayer.time).add(bantime, 'm') : moment().add(bantime, 'm');
      if (!_.find(bannedplayer.reasons, function(bannedreason) {
        return bannedreason === reason;
      })) {
        bannedplayer.reasons.push(reason);
      }
      bannedplayer.need_tip = true;
    } else {
      bannedplayer = {
        "ip": ip,
        "time": moment(),
        "count": countadd,
        "reasons": [reason],
        "need_tip": true
      };
      ROOM_players_banned.push(bannedplayer);
    }
  };

  ROOM_find_or_create_by_name = function(name, player_ip) {
    var room, uname;
    uname = name.toUpperCase();
    if (settings.modules.windbot.enabled && (uname.slice(0, 2) === 'AI' || (!settings.modules.random_duel.enabled && uname === ''))) {
      return ROOM_find_or_create_ai(name);
    }
    if (settings.modules.random_duel.enabled && (uname === '' || uname === 'S' || uname === 'M' || uname === 'T')) {
      return ROOM_find_or_create_random(uname, player_ip);
    }
    if (room = ROOM_find_by_name(name)) {
      return room;
    } else if (get_memory_usage() >= 90) {
      return null;
    } else {
      return new Room(name);
    }
  };

  ROOM_find_or_create_random = function(type, player_ip) {
    var bannedplayer, max_player, name, playerbanned, result;
    bannedplayer = _.find(ROOM_players_banned, function(bannedplayer) {
      return player_ip === bannedplayer.ip;
    });
    if (bannedplayer) {
      if (bannedplayer.count > 6 && moment() < bannedplayer.time) {
        return {
          "error": "${random_banned_part1}" + (bannedplayer.reasons.join('${random_ban_reason_separator}')) + "${random_banned_part2}" + (moment(bannedplayer.time).fromNow(true)) + "${random_banned_part3}"
        };
      }
      if (bannedplayer.count > 3 && moment() < bannedplayer.time && bannedplayer.need_tip && type !== 'T') {
        bannedplayer.need_tip = false;
        return {
          "error": "${random_deprecated_part1}" + (bannedplayer.reasons.join('${random_ban_reason_separator}')) + "${random_deprecated_part2}" + (moment(bannedplayer.time).fromNow(true)) + "${random_deprecated_part3}"
        };
      } else if (bannedplayer.need_tip) {
        bannedplayer.need_tip = false;
        return {
          "error": "${random_warn_part1}" + (bannedplayer.reasons.join('${random_ban_reason_separator}')) + "${random_warn_part2}"
        };
      } else if (bannedplayer.count > 2) {
        bannedplayer.need_tip = true;
      }
    }
    max_player = type === 'T' ? 4 : 2;
    playerbanned = bannedplayer && bannedplayer.count > 3 && moment() < bannedplayer.time;
    result = _.find(ROOM_all, function(room) {
      return room && room.random_type !== '' && !room.started && ((type === '' && room.random_type !== 'T') || room.random_type === type) && room.get_playing_player().length < max_player && (room.get_host() === null || room.get_host().ip !== ROOM_players_oppentlist[player_ip]) && (playerbanned === room.deprecated || type === 'T');
    });
    if (result) {
      result.welcome = '${random_duel_enter_room_waiting}';
    } else if (get_memory_usage() < 90) {
      type = type ? type : 'S';
      name = type + ',RANDOM#' + Math.floor(Math.random() * 100000);
      result = new Room(name);
      result.random_type = type;
      result.max_player = max_player;
      result.welcome = '${random_duel_enter_room_new}';
      result.deprecated = playerbanned;
    } else {
      return null;
    }
    if (result.random_type === 'M') {
      result.welcome = result.welcome + '\n${random_duel_enter_room_match}';
    }
    return result;
  };

  ROOM_find_or_create_ai = function(name) {
    var ainame, namea, result, room, uname, windbot;
    if (name === '') {
      name = 'AI';
    }
    namea = name.split('#');
    uname = name.toUpperCase();
    if (room = ROOM_find_by_name(name)) {
      return room;
    } else if (uname === 'AI') {
      windbot = _.sample(settings.modules.windbots);
      name = 'AI#' + Math.floor(Math.random() * 100000);
    } else if (namea.length > 1) {
      ainame = namea[namea.length - 1];
      windbot = _.sample(_.filter(settings.modules.windbots, function(w) {
        return w.name === ainame || w.deck === ainame;
      }));
      if (!windbot) {
        return {
          "error": "${windbot_deck_not_found}"
        };
      }
      name = name + ',' + Math.floor(Math.random() * 100000);
    } else {
      windbot = _.sample(settings.modules.windbots);
      name = name + '#' + Math.floor(Math.random() * 100000);
    }
    if (name.replace(/[^\x00-\xff]/g, "00").length > 20) {
      log.info("long ai name", name);
      return {
        "error": "${windbot_name_too_long}"
      };
    }
    result = new Room(name);
    result.windbot = windbot;
    result["private"] = true;
    return result;
  };

  ROOM_find_by_name = function(name) {
    var result;
    result = _.find(ROOM_all, function(room) {
      return room && room.name === name;
    });
    return result;
  };

  ROOM_find_by_title = function(title) {
    var result;
    result = _.find(ROOM_all, function(room) {
      return room && room.title === title;
    });
    return result;
  };

  ROOM_find_by_port = function(port) {
    return _.find(ROOM_all, function(room) {
      return room && room.port === port;
    });
  };

  ROOM_validate = function(name) {
    var client_name, client_name_and_pass, client_pass;
    client_name_and_pass = name.split('$', 2);
    client_name = client_name_and_pass[0];
    client_pass = client_name_and_pass[1];
    if (!client_pass) {
      return true;
    }
    return !_.find(ROOM_all, function(room) {
      var room_name, room_name_and_pass, room_pass;
      if (!room) {
        return false;
      }
      room_name_and_pass = room.name.split('$', 2);
      room_name = room_name_and_pass[0];
      room_pass = room_name_and_pass[1];
      return client_name === room_name && client_pass !== room_pass;
    });
  };

  ROOM_unwelcome = function(room, bad_player, reason) {
    var j, len, player, ref;
    if (!room) {
      return;
    }
    ref = room.players;
    for (j = 0, len = ref.length; j < len; j++) {
      player = ref[j];
      if (player && player === bad_player) {
        ygopro.stoc_send_chat(player, "${unwelcome_warn_part1}" + reason + "${unwelcome_warn_part2}", ygopro.constants.COLORS.RED);
      } else if (player && player.pos !== 7 && player !== bad_player) {
        player.flee_free = true;
        ygopro.stoc_send_chat(player, "${unwelcome_tip_part1}" + reason + "${unwelcome_tip_part2}", ygopro.constants.COLORS.BABYBLUE);
      }
    }
  };

  Room = (function() {
    function Room(name, hostinfo) {
      var draw_count, lflist, param, rule, start_hand, start_lp, time_limit;
      this.hostinfo = hostinfo;
      this.name = name;
      this.alive = true;
      this.players = [];
      this.player_datas = [];
      this.status = 'starting';
      this.started = false;
      this.established = false;
      this.watcher_buffers = [];
      this.recorder_buffers = [];
      this.cloud_replay_id = Math.floor(Math.random() * 100000000);
      this.watchers = [];
      this.random_type = '';
      this.welcome = '';
      this.scores = {};
      ROOM_all.push(this);
      this.hostinfo || (this.hostinfo = JSON.parse(JSON.stringify(settings.hostinfo)));
      if (settings.lflist.length) {
        if (this.hostinfo.rule === 1 && this.hostinfo.lflist === 0) {
          this.hostinfo.lflist = _.findIndex(settings.lflist, function(list) {
            return list.tcg;
          });
        }
      } else {
        this.hostinfo.lflist = -1;
      }
      this.hostinfo.replay_mode = settings.modules.tournament_mode.enabled && settings.modules.tournament_mode.replay_safe ? 1 : 0;
      if (name.slice(0, 2) === 'M#') {
        this.hostinfo.mode = 1;
      } else if (name.slice(0, 2) === 'T#') {
        this.hostinfo.mode = 2;
        this.hostinfo.start_lp = 16000;
      } else if (name.slice(0, 3) === 'AI#') {
        this.hostinfo.rule = 2;
        this.hostinfo.lflist = -1;
      } else if ((param = name.match(/^(\d)(\d)(T|F)(T|F)(T|F)(\d+),(\d+),(\d+)/i))) {
        this.hostinfo.rule = parseInt(param[1]);
        this.hostinfo.mode = parseInt(param[2]);
        this.hostinfo.enable_priority = param[3] === 'T';
        this.hostinfo.no_check_deck = param[4] === 'T';
        this.hostinfo.no_shuffle_deck = param[5] === 'T';
        this.hostinfo.start_lp = parseInt(param[6]);
        this.hostinfo.start_hand = parseInt(param[7]);
        this.hostinfo.draw_count = parseInt(param[8]);
      } else if ((param = name.match(/(.+)#/)) !== null) {
        rule = param[1].toUpperCase();
        if (rule.match(/(^|，|,)(M|MATCH)(，|,|$)/)) {
          this.hostinfo.mode = 1;
        }
        if (rule.match(/(^|，|,)(T|TAG)(，|,|$)/)) {
          this.hostinfo.mode = 2;
          this.hostinfo.start_lp = 16000;
        }
        if (rule.match(/(^|，|,)(TCGONLY|TO)(，|,|$)/)) {
          this.hostinfo.rule = 1;
          this.hostinfo.lflist = _.findIndex(settings.lflist, function(list) {
            return list.tcg;
          });
        }
        if (rule.match(/(^|，|,)(OCGONLY|OO)(，|,|$)/)) {
          this.hostinfo.rule = 0;
        }
        if (rule.match(/(^|，|,)(OT|TCG)(，|,|$)/)) {
          this.hostinfo.rule = 2;
        }
        if ((param = rule.match(/(^|，|,)LP(\d+)(，|,|$)/))) {
          start_lp = parseInt(param[2]);
          if (start_lp <= 0) {
            start_lp = 1;
          }
          if (start_lp >= 99999) {
            start_lp = 99999;
          }
          this.hostinfo.start_lp = start_lp;
        }
        if ((param = rule.match(/(^|，|,)(TIME|TM|TI)(\d+)(，|,|$)/))) {
          time_limit = parseInt(param[3]);
          if (time_limit < 0) {
            time_limit = 180;
          }
          if (time_limit >= 1 && time_limit <= 60) {
            time_limit = time_limit * 60;
          }
          if (time_limit >= 999) {
            time_limit = 999;
          }
          this.hostinfo.time_limit = time_limit;
        }
        if ((param = rule.match(/(^|，|,)(START|ST)(\d+)(，|,|$)/))) {
          start_hand = parseInt(param[3]);
          if (start_hand <= 0) {
            start_hand = 1;
          }
          if (start_hand >= 40) {
            start_hand = 40;
          }
          this.hostinfo.start_hand = start_hand;
        }
        if ((param = rule.match(/(^|，|,)(DRAW|DR)(\d+)(，|,|$)/))) {
          draw_count = parseInt(param[3]);
          if (draw_count >= 35) {
            draw_count = 35;
          }
          this.hostinfo.draw_count = draw_count;
        }
        if ((param = rule.match(/(^|，|,)(LFLIST|LF)(\d+)(，|,|$)/))) {
          lflist = parseInt(param[3]) - 1;
          this.hostinfo.lflist = lflist;
        }
        if (rule.match(/(^|，|,)(NOLFLIST|NF)(，|,|$)/)) {
          this.hostinfo.lflist = -1;
        }
        if (rule.match(/(^|，|,)(NOUNIQUE|NU)(，|,|$)/)) {
          this.hostinfo.rule = 3;
        }
        if (rule.match(/(^|，|,)(NOCHECK|NC)(，|,|$)/)) {
          this.hostinfo.no_check_deck = true;
        }
        if (rule.match(/(^|，|,)(NOSHUFFLE|NS)(，|,|$)/)) {
          this.hostinfo.no_shuffle_deck = true;
        }
        if (rule.match(/(^|，|,)(IGPRIORITY|PR)(，|,|$)/)) {
          this.hostinfo.enable_priority = true;
        }
      }
      param = [0, this.hostinfo.lflist, this.hostinfo.rule, this.hostinfo.mode, (this.hostinfo.enable_priority ? 'T' : 'F'), (this.hostinfo.no_check_deck ? 'T' : 'F'), (this.hostinfo.no_shuffle_deck ? 'T' : 'F'), this.hostinfo.start_lp, this.hostinfo.start_hand, this.hostinfo.draw_count, this.hostinfo.time_limit, this.hostinfo.replay_mode];
      try {
	    if(bat===null){
           bat = spawn('cmd.exe', ['/c', 'update.bat']);

            bat.on('exit', (code) => {
                bat = null;
                console.log(`Expansions updated`);
              });
        }
        this.process = spawn('./ygopro', param, {
          cwd: 'ygopro'
       });
        this.process.on('error', (function(_this) {
          return function(err) {
            _.each(_this.players, function(player) {
              return ygopro.stoc_die(player, "${create_room_failed}");
            });
            _this["delete"]();
          };
        })(this));
        this.process.on('exit', (function(_this) {
          return function(code) {
            if (!_this.disconnector) {
              _this.disconnector = 'server';
            }
            _this["delete"]();
          };
        })(this));
        this.process.stdout.setEncoding('utf8');
        this.process.stdout.once('data', (function(_this) {
          return function(data) {
            _this.established = true;
            if (!_this.windbot && settings.modules.http.websocket_roomlist) {
              roomlist.create(_this);
            }
            _this.port = parseInt(data);
            _.each(_this.players, function(player) {
              player.server.connect(_this.port, '127.0.0.1', function() {
                var buffer, j, len, ref;
                ref = player.pre_establish_buffers;
                for (j = 0, len = ref.length; j < len; j++) {
                  buffer = ref[j];
                  player.server.write(buffer);
                }
                player.established = true;
                player.pre_establish_buffers = [];
              });
            });
            if (_this.windbot) {
              setTimeout(function() {
                return _this.add_windbot(_this.windbot);
              }, 200);
            }
          };
        })(this));
        this.process.stderr.on('data', (function(_this) {
          return function(data) {
            data = "Debug: " + data;
            data = data.replace(/\n$/, "");
            log.info("YGOPRO " + data);
            ygopro.stoc_send_chat_to_room(_this, data, ygopro.constants.COLORS.RED);
            _this.has_ygopro_error = true;
          };
        })(this));
      } catch (error1) {
        this.error = "${create_room_failed}";
      }
    }

    Room.prototype["delete"] = function() {
      var index, log_rep_id, name, player_ips, player_names, recorder_buffer, ref, replay_id, score, score_array;
      if (this.deleted) {
        return;
      }
      if (this.started && settings.modules.arena_mode.enabled && this.arena) {
        score_array = [];
        ref = this.scores;
        for (name in ref) {
          score = ref[name];
          score_array.push({
            name: name,
            score: score
          });
        }
        if (score_array.length === 2) {
          request.post({
            url: settings.modules.arena_mode.post_score,
            form: {
              accesskey: settings.modules.arena_mode.accesskey,
              usernameA: score_array[0].name,
              usernameB: score_array[1].name,
              userscoreA: score_array[0].score,
              userscoreB: score_array[1].score,
              start: this.start_time,
              end: moment().format(),
              arena: this.arena
            }
          }, (function(_this) {
            return function(error, response, body) {
              if (error) {
                log.warn('SCORE POST ERROR', error);
              } else {
                if (response.statusCode !== 204 && response.statusCode !== 200) {
                  log.warn('SCORE POST FAIL', response.statusCode, response.statusMessage, _this.name, body);
                }
              }
            };
          })(this));
        }
      }
      if (this.player_datas.length && settings.modules.cloud_replay.enabled) {
        replay_id = this.cloud_replay_id;
        if (this.has_ygopro_error) {
          log_rep_id = true;
        }
        player_names = this.player_datas[0].name + (this.player_datas[2] ? "+" + this.player_datas[2].name : "") + " VS " + (this.player_datas[1] ? this.player_datas[1].name : "AI") + (this.player_datas[3] ? "+" + this.player_datas[3].name : "");
        player_ips = [];
        _.each(this.player_datas, function(player) {
          player_ips.push(player.ip);
        });
        recorder_buffer = Buffer.concat(this.recorder_buffers);
        zlib.deflate(recorder_buffer, function(err, replay_buffer) {
          var date_time, recorded_ip;
          replay_buffer = replay_buffer.toString('binary');
          date_time = moment().format('YYYY-MM-DD HH:mm:ss');
          redisdb.hmset("replay:" + replay_id, "replay_id", replay_id, "replay_buffer", replay_buffer, "player_names", player_names, "date_time", date_time);
          if (!log_rep_id) {
            redisdb.expire("replay:" + replay_id, 60 * 60 * 24);
          }
          recorded_ip = [];
          _.each(player_ips, function(player_ip) {
            if (_.contains(recorded_ip, player_ip)) {
              return;
            }
            recorded_ip.push(player_ip);
            redisdb.lpush(player_ip + ":replays", replay_id);
          });
          if (log_rep_id) {
            log.info("error replay: R#" + replay_id);
          }
        });
      }
      this.watcher_buffers = [];
      this.recorder_buffers = [];
      this.players = [];
      if (this.watcher) {
        this.watcher.destroy();
      }
      if (this.recorder) {
        this.recorder.destroy();
      }
      this.deleted = true;
      index = _.indexOf(ROOM_all, this);
      if (index !== -1) {
        ROOM_all[index] = null;
      }
      if (!this.windbot && this.established && settings.modules.http.websocket_roomlist) {
        roomlist["delete"](this);
      }
    };

    Room.prototype.get_playing_player = function() {
      var playing_player;
      playing_player = [];
      _.each(this.players, function(player) {
        if (player.pos < 4) {
          playing_player.push(player);
        }
      });
      return playing_player;
    };

    Room.prototype.get_host = function() {
      var host_player;
      host_player = null;
      _.each(this.players, function(player) {
        if (player.is_host) {
          host_player = player;
        }
      });
      return host_player;
    };

    Room.prototype.add_windbot = function(botdata) {
      this.windbot = botdata;
      request({
        url: "http://127.0.0.1:" + settings.modules.windbot.port + "/?name=" + (encodeURIComponent(botdata.name)) + "&deck=" + (encodeURIComponent(botdata.deck)) + "&host=127.0.0.1&port=" + settings.port + "&dialog=" + (encodeURIComponent(botdata.dialog)) + "&version=" + settings.version + "&password=" + (encodeURIComponent(this.name))
      }, (function(_this) {
        return function(error, response, body) {
          if (error) {
            log.warn('windbot add error', error, _this.name);
            ygopro.stoc_send_chat_to_room(_this, "${add_windbot_failed}", ygopro.constants.COLORS.RED);
          }
        };
      })(this));
    };

    Room.prototype.connect = function(client) {
      var host_player;
      this.players.push(client);
      if (this.random_type) {
        client.abuse_count = 0;
        host_player = this.get_host();
        if (host_player && (host_player !== client)) {
          ROOM_players_oppentlist[host_player.ip] = client.ip;
          ROOM_players_oppentlist[client.ip] = host_player.ip;
        } else {
          ROOM_players_oppentlist[client.ip] = null;
        }
      }
      if (this.established) {
        if (!this.windbot && !this.started && settings.modules.http.websocket_roomlist) {
          roomlist.update(this);
        }
        client.server.connect(this.port, '127.0.0.1', function() {
          var buffer, j, len, ref;
          ref = client.pre_establish_buffers;
          for (j = 0, len = ref.length; j < len; j++) {
            buffer = ref[j];
            client.server.write(buffer);
          }
          client.established = true;
          client.pre_establish_buffers = [];
        });
      }
    };

    Room.prototype.disconnect = function(client, error) {
      var index;
      if (client.is_post_watcher) {
        ygopro.stoc_send_chat_to_room(this, (client.name + " ${quit_watch}") + (error ? ": " + error : ''));
        index = _.indexOf(this.watchers, client);
        if (index !== -1) {
          this.watchers.splice(index, 1);
        }
      } else {
        index = _.indexOf(this.players, client);
        if (index !== -1) {
          this.players.splice(index, 1);
        }
        if (this.started && this.disconnector !== 'server' && (client.pos < 4 || client.is_host)) {
          this.finished = true;
          this.scores[client.name] = -9;
          if (this.random_type && !client.flee_free) {
            ROOM_ban_player(client.name, client.ip, "${random_ban_reason_flee}");
          }
        }
        if (this.players.length && !(this.windbot && client.is_host)) {
          ygopro.stoc_send_chat_to_room(this, (client.name + " ${left_game}") + (error ? ": " + error : ''));
          if (!this.windbot && !this.started && settings.modules.http.websocket_roomlist) {
            roomlist.update(this);
          }
        } else {
          this.process.kill();
          this["delete"]();
        }
      }
    };

    return Room;

  })();

  net.createServer(function(client) {
    var connect_count, server;
    client.ip = client.remoteAddress;
    connect_count = ROOM_connected_ip[client.ip] || 0;
    if (client.ip !== '::ffff:127.0.0.1') {
      connect_count++;
    }
    ROOM_connected_ip[client.ip] = connect_count;
    server = new net.Socket();
    client.server = server;
    client.setTimeout(2000);
    client.on('close', function(had_error) {
      var room;
      room = ROOM_all[client.rid];
      connect_count = ROOM_connected_ip[client.ip];
      if (connect_count > 0) {
        connect_count--;
      }
      ROOM_connected_ip[client.ip] = connect_count;
      if (!client.closed) {
        client.closed = true;
        if (room) {
          room.disconnect(client);
        }
      }
      server.destroy();
    });
    client.on('error', function(error) {
      var room;
      room = ROOM_all[client.rid];
      connect_count = ROOM_connected_ip[client.ip];
      if (connect_count > 0) {
        connect_count--;
      }
      ROOM_connected_ip[client.ip] = connect_count;
      if (!client.closed) {
        client.closed = error;
        if (room) {
          room.disconnect(client, error);
        }
      }
      server.destroy();
    });
    client.on('timeout', function() {
      server.destroy();
    });
    server.on('close', function(had_error) {
      var room;
      room = ROOM_all[client.rid];
      if (room) {
        room.disconnector = 'server';
      }
      if (!server.closed) {
        server.closed = true;
      }
      if (!client.closed) {
        ygopro.stoc_send_chat(client, "${server_closed}", ygopro.constants.COLORS.RED);
        client.destroy();
      }
    });
    server.on('error', function(error) {
      var room;
      room = ROOM_all[client.rid];
      if (room) {
        room.disconnector = 'server';
      }
      server.closed = error;
      if (!client.closed) {
        ygopro.stoc_send_chat(client, "${server_error}: " + error, ygopro.constants.COLORS.RED);
        client.destroy();
      }
    });
    if (ROOM_bad_ip[client.ip] > 5 || ROOM_connected_ip[client.ip] > 10) {
      log.info('BAD IP', client.ip);
      client.destroy();
      return;
    }
    if (settings.modules.cloud_replay.enabled) {
      client.open_cloud_replay = function(err, replay) {
        var buffer;
        if (err || !replay) {
          ygopro.stoc_die(client, "${cloud_replay_no}");
          return;
        }
        redisdb.expire("replay:" + replay.replay_id, 60 * 60 * 48);
        buffer = new Buffer(replay.replay_buffer, 'binary');
        zlib.unzip(buffer, function(err, replay_buffer) {
          if (err) {
            log.info("cloud replay unzip error: " + err);
            ygopro.stoc_send_chat(client, "${cloud_replay_error}", ygopro.constants.COLORS.RED);
            client.destroy();
            return;
          }
          ygopro.stoc_send_chat(client, "${cloud_replay_playing} R#" + replay.replay_id + " " + replay.player_names + " " + replay.date_time, ygopro.constants.COLORS.BABYBLUE);
          client.write(replay_buffer, function() {
            client.destroy();
          });
        });
      };
    }
    client.pre_establish_buffers = new Array();
    client.on('data', function(ctos_buffer) {
      var b, bad_ip_count, buffer, cancel, ctos_message_length, ctos_proto, datas, info, j, k, len, len1, looplimit, room, struct;
      if (client.is_post_watcher) {
        room = ROOM_all[client.rid];
        if (room) {
          room.watcher.write(ctos_buffer);
        }
      } else {
        ctos_message_length = 0;
        ctos_proto = 0;
        datas = [];
        looplimit = 0;
        while (true) {
          if (ctos_message_length === 0) {
            if (ctos_buffer.length >= 2) {
              ctos_message_length = ctos_buffer.readUInt16LE(0);
            } else {
              if (ctos_buffer.length !== 0) {
                log.warn("bad ctos_buffer length", client.ip);
              }
              break;
            }
          } else if (ctos_proto === 0) {
            if (ctos_buffer.length >= 3) {
              ctos_proto = ctos_buffer.readUInt8(2);
            } else {
              log.warn("bad ctos_proto length", client.ip);
              break;
            }
          } else {
            if (ctos_buffer.length >= 2 + ctos_message_length) {
              cancel = false;
              if (ygopro.ctos_follows[ctos_proto]) {
                b = ctos_buffer.slice(3, ctos_message_length - 1 + 3);
                info = null;
                if (struct = ygopro.structs[ygopro.proto_structs.CTOS[ygopro.constants.CTOS[ctos_proto]]]) {
                  struct._setBuff(b);
                  info = _.clone(struct.fields);
                }
                if (ygopro.ctos_follows[ctos_proto].synchronous) {
                  cancel = ygopro.ctos_follows[ctos_proto].callback(b, info, client, server);
                } else {
                  ygopro.ctos_follows[ctos_proto].callback(b, info, client, server);
                }
              }
              if (!cancel) {
                datas.push(ctos_buffer.slice(0, 2 + ctos_message_length));
              }
              ctos_buffer = ctos_buffer.slice(2 + ctos_message_length);
              ctos_message_length = 0;
              ctos_proto = 0;
            } else {
              if (ctos_message_length !== 17735) {
                log.warn("bad ctos_message length", client.ip, ctos_buffer.length, ctos_message_length, ctos_proto);
              }
              break;
            }
          }
          looplimit++;
          if (looplimit > 800 || ROOM_bad_ip[client.ip] > 5) {
            log.info("error ctos", client.name, client.ip);
            bad_ip_count = ROOM_bad_ip[client.ip];
            if (bad_ip_count) {
              ROOM_bad_ip[client.ip] = bad_ip_count + 1;
            } else {
              ROOM_bad_ip[client.ip] = 1;
            }
            client.destroy();
            break;
          }
        }
        if (client.established) {
          for (j = 0, len = datas.length; j < len; j++) {
            buffer = datas[j];
            server.write(buffer);
          }
        } else {
          for (k = 0, len1 = datas.length; k < len1; k++) {
            buffer = datas[k];
            client.pre_establish_buffers.push(buffer);
          }
        }
      }
    });
    server.on('data', function(stoc_buffer) {
      var b, buffer, cancel, datas, info, j, len, looplimit, stanzas, stoc_message_length, stoc_proto, struct;
      stoc_message_length = 0;
      stoc_proto = 0;
      datas = [];
      looplimit = 0;
      while (true) {
        if (stoc_message_length === 0) {
          if (stoc_buffer.length >= 2) {
            stoc_message_length = stoc_buffer.readUInt16LE(0);
          } else {
            if (stoc_buffer.length !== 0) {
              log.warn("bad stoc_buffer length", client.ip);
            }
            break;
          }
        } else if (stoc_proto === 0) {
          if (stoc_buffer.length >= 3) {
            stoc_proto = stoc_buffer.readUInt8(2);
          } else {
            log.warn("bad stoc_proto length", client.ip);
            break;
          }
        } else {
          if (stoc_buffer.length >= 2 + stoc_message_length) {
            cancel = false;
            stanzas = stoc_proto;
            if (ygopro.stoc_follows[stoc_proto]) {
              b = stoc_buffer.slice(3, stoc_message_length - 1 + 3);
              info = null;
              if (struct = ygopro.structs[ygopro.proto_structs.STOC[ygopro.constants.STOC[stoc_proto]]]) {
                struct._setBuff(b);
                info = _.clone(struct.fields);
              }
              if (ygopro.stoc_follows[stoc_proto].synchronous) {
                cancel = ygopro.stoc_follows[stoc_proto].callback(b, info, client, server);
              } else {
                ygopro.stoc_follows[stoc_proto].callback(b, info, client, server);
              }
            }
            if (!cancel) {
              datas.push(stoc_buffer.slice(0, 2 + stoc_message_length));
            }
            stoc_buffer = stoc_buffer.slice(2 + stoc_message_length);
            stoc_message_length = 0;
            stoc_proto = 0;
          } else {
            log.warn("bad stoc_message length", client.ip);
            break;
          }
        }
        looplimit++;
        if (looplimit > 800) {
          log.info("error stoc", client.name);
          server.destroy();
          break;
        }
      }
      for (j = 0, len = datas.length; j < len; j++) {
        buffer = datas[j];
        client.write(buffer);
      }
    });
  }).listen(settings.port, function() {
    log.info("server started", settings.port);
  });

  ygopro.ctos_follow('PLAYER_INFO', true, function(buffer, info, client, server) {
    var geo, lang, name, struct;
    name = info.name.split("$")[0];
    if (_.any(settings.ban.illegal_id, function(badid) {
      var matchs, regexp;
      regexp = new RegExp(badid, 'i');
      matchs = name.match(regexp);
      if (matchs) {
        name = matchs[1];
        return true;
      }
      return false;
    }, name)) {
      client.rag = true;
    }
    struct = ygopro.structs["CTOS_PlayerInfo"];
    struct._setBuff(buffer);
    struct.set("name", name);
    buffer = struct.buffer;
    client.name = name;
    if (!settings.modules.i18n.auto_pick || client.ip === "::ffff:127.0.0.1") {
      client.lang = settings.modules.i18n["default"];
    } else {
      geo = geoip.lookup(client.ip);
      if (!geo) {
        log.warn("fail to locate ip", client.name, client.ip);
        client.lang = settings.modules.i18n.fallback;
      } else {
        if (lang = settings.modules.i18n.map[geo.country]) {
          client.lang = lang;
        } else {
          client.lang = settings.modules.i18n.fallback;
        }
      }
    }
    return false;
  });

  ygopro.ctos_follow('JOIN_GAME', false, function(buffer, info, client, server) {
    var check, decrypted_buffer, finish, i, id, j, k, len, len1, name, ref, ref1, replay_id, room, secret, struct;
    if (settings.modules.stop) {
      ygopro.stoc_die(client, settings.modules.stop);
    } else if (info.pass.toUpperCase() === "R" && settings.modules.cloud_replay.enabled) {
      ygopro.stoc_send_chat(client, "${cloud_replay_hint}", ygopro.constants.COLORS.BABYBLUE);
      redisdb.lrange(client.ip + ":replays", 0, 2, function(err, result) {
        _.each(result, function(replay_id, id) {
          redisdb.hgetall("replay:" + replay_id, function(err, replay) {
            if (err || !replay) {
              if (err) {
                log.info("cloud replay getall error: " + err);
              }
              return;
            }
            ygopro.stoc_send_chat(client, "<" + (id - 0 + 1) + "> R#" + replay_id + " " + replay.player_names + " " + replay.date_time, ygopro.constants.COLORS.BABYBLUE);
          });
        });
      });
      setTimeout((function() {
        ygopro.stoc_send(client, 'ERROR_MSG', {
          msg: 1,
          code: 9
        });
        client.destroy();
      }), 500);
    } else if (info.pass.slice(0, 2).toUpperCase() === "R#" && settings.modules.cloud_replay.enabled) {
      replay_id = info.pass.split("#")[1];
      if (replay_id > 0 && replay_id <= 9) {
        redisdb.lindex(client.ip + ":replays", replay_id - 1, function(err, replay_id) {
          if (err || !replay_id) {
            if (err) {
              log.info("cloud replay replayid error: " + err);
            }
            ygopro.stoc_die(client, "${cloud_replay_no}");
            return;
          }
          redisdb.hgetall("replay:" + replay_id, client.open_cloud_replay);
        });
      } else if (replay_id) {
        redisdb.hgetall("replay:" + replay_id, client.open_cloud_replay);
      } else {
        ygopro.stoc_die(client, "${cloud_replay_no}");
      }
    } else if (info.pass.toUpperCase() === "W" && settings.modules.cloud_replay.enabled) {
      replay_id = Cloud_replay_ids[Math.floor(Math.random() * Cloud_replay_ids.length)];
      redisdb.hgetall("replay:" + replay_id, client.open_cloud_replay);
      client.destroy();
    } else if (!info.pass.length && !settings.modules.random_duel.enabled && !settings.modules.windbot.enabled) {
      ygopro.stoc_die(client, "${blank_room_name}");
    } else if (info.pass.length && settings.modules.mycard.enabled && info.pass.slice(0, 3) !== 'AI#') {
      ygopro.stoc_send_chat(client, '${loading_user_info}', ygopro.constants.COLORS.BABYBLUE);
      if (info.pass.length <= 8) {
        ygopro.stoc_die(client, '${invalid_password_length}');
        return;
      }
      if (info.version >= 9020 && settings.version === 4927) {
        info.version = settings.version;
        struct = ygopro.structs["CTOS_JoinGame"];
        struct._setBuff(buffer);
        struct.set("version", info.version);
        buffer = struct.buffer;
      }
      buffer = new Buffer(info.pass.slice(0, 8), 'base64');
      if (buffer.length !== 6) {
        ygopro.stoc_die(client, '${invalid_password_payload}');
        return;
      }
      check = function(buf) {
        var checksum, i, j, ref;
        checksum = 0;
        for (i = j = 0, ref = buf.length; 0 <= ref ? j < ref : j > ref; i = 0 <= ref ? ++j : --j) {
          checksum += buf.readUInt8(i);
        }
        return (checksum & 0xFF) === 0;
      };
      finish = function(buffer) {
        var action, j, len, name, opt1, opt2, opt3, options, ref, room, title;
        action = buffer.readUInt8(1) >> 4;
        if (buffer !== decrypted_buffer && (action === 1 || action === 2 || action === 4)) {
          ygopro.stoc_die(client, '${invalid_password_unauthorized}');
          return;
        }
        switch (action) {
          case 1:
          case 2:
            name = crypto.createHash('md5').update(info.pass + client.name).digest('base64').slice(0, 10).replace('+', '-').replace('/', '_');
            if (ROOM_find_by_name(name)) {
              ygopro.stoc_die(client, '${invalid_password_existed}');
              return;
            }
            opt1 = buffer.readUInt8(2);
            opt2 = buffer.readUInt16LE(3);
            opt3 = buffer.readUInt8(5);
            options = {
              lflist: 0,
              time_limit: 180,
              rule: (opt1 >> 5) & 3,
              mode: (opt1 >> 3) & 3,
              enable_priority: !!((opt1 >> 2) & 1),
              no_check_deck: !!((opt1 >> 1) & 1),
              no_shuffle_deck: !!(opt1 & 1),
              start_lp: opt2,
              start_hand: opt3 >> 4,
              draw_count: opt3 & 0xF
            };
            options.lflist = _.findIndex(settings.lflist, function(list) {
              return ((options.rule === 1) === list.tcg) && list.date.isBefore();
            });
            room = new Room(name, options);
            room.title = info.pass.slice(8).replace(String.fromCharCode(0xFEFF), ' ');
            room["private"] = action === 2;
            break;
          case 3:
            name = info.pass.slice(8);
            room = ROOM_find_by_name(name);
            if (!room) {
              ygopro.stoc_die(client, '${invalid_password_not_found}');
              return;
            }
            break;
          case 4:
            room = ROOM_find_or_create_by_name('M#' + info.pass.slice(8));
            room["private"] = true;
            room.arena = settings.modules.arena_mode.mode;
            break;
          case 5:
            title = info.pass.slice(8).replace(String.fromCharCode(0xFEFF), ' ');
            room = ROOM_find_by_title(title);
            if (!room) {
              ygopro.stoc_die(client, '${invalid_password_not_found}');
              return;
            }
            break;
          default:
            ygopro.stoc_die(client, '${invalid_password_action}');
            return;
        }
        if (!room) {
          ygopro.stoc_die(client, "${server_full}");
        } else if (room.error) {
          ygopro.stoc_die(client, room.error);
        } else if (room.started) {
          if (settings.modules.cloud_replay.enable_halfway_watch) {
            client.setTimeout(300000);
            client.rid = _.indexOf(ROOM_all, room);
            client.is_post_watcher = true;
            ygopro.stoc_send_chat_to_room(room, client.name + " ${watch_join}");
            room.watchers.push(client);
            ygopro.stoc_send_chat(client, "${watch_watching}", ygopro.constants.COLORS.BABYBLUE);
            ref = room.watcher_buffers;
            for (j = 0, len = ref.length; j < len; j++) {
              buffer = ref[j];
              client.write(buffer);
            }
          } else {
            ygopro.stoc_die(client, "${watch_denied}");
          }
        } else {
          client.setTimeout(300000);
          client.rid = _.indexOf(ROOM_all, room);
          room.connect(client);
        }
      };
      if (id = users_cache[client.name]) {
        secret = id % 65535 + 1;
        decrypted_buffer = new Buffer(6);
        ref = [0, 2, 4];
        for (j = 0, len = ref.length; j < len; j++) {
          i = ref[j];
          decrypted_buffer.writeUInt16LE(buffer.readUInt16LE(i) ^ secret, i);
        }
        if (check(decrypted_buffer)) {
          return finish(decrypted_buffer);
        }
      }
      request({
        baseUrl: settings.modules.mycard.auth_base_url,
        url: '/users/' + encodeURIComponent(client.name) + '.json',
        qs: {
          api_key: settings.modules.mycard.auth_key,
          api_username: client.name,
          skip_track_visit: true
        },
        json: true
      }, function(error, response, body) {
        var k, len1, ref1;
        if (body && body.user) {
          users_cache[client.name] = body.user.id;
          secret = body.user.id % 65535 + 1;
          decrypted_buffer = new Buffer(6);
          ref1 = [0, 2, 4];
          for (k = 0, len1 = ref1.length; k < len1; k++) {
            i = ref1[k];
            decrypted_buffer.writeUInt16LE(buffer.readUInt16LE(i) ^ secret, i);
          }
          if (check(decrypted_buffer)) {
            buffer = decrypted_buffer;
          }
        }
        if (!check(buffer)) {
          ygopro.stoc_die(client, '${invalid_password_checksum}');
          return;
        }
        return finish(buffer);
      });
    } else if (!client.name || client.name === "") {
      ygopro.stoc_die(client, "${bad_user_name}");
    } else if (ROOM_connected_ip[client.ip] > 5) {
      log.warn("MULTI LOGIN", client.name, client.ip);
      ygopro.stoc_die(client, "${too_much_connection}" + client.ip);
    } else if (_.indexOf(settings.ban.banned_user, client.name) > -1) {
      settings.ban.banned_ip.push(client.ip);
      log.warn("BANNED USER LOGIN", client.name, client.ip);
      ygopro.stoc_die(client, "${banned_user_login}");
    } else if (_.indexOf(settings.ban.banned_ip, client.ip) > -1) {
      log.warn("BANNED IP LOGIN", client.name, client.ip);
      ygopro.stoc_die(client, "${banned_ip_login}");
    } else if (_.any(settings.ban.badword_level3, function(badword) {
      var regexp;
      regexp = new RegExp(badword, 'i');
      return name.match(regexp);
    }, name = client.name)) {
      log.warn("BAD NAME LEVEL 3", client.name, client.ip);
      ygopro.stoc_die(client, "${bad_name_level3}");
    } else if (_.any(settings.ban.badword_level2, function(badword) {
      var regexp;
      regexp = new RegExp(badword, 'i');
      return name.match(regexp);
    }, name = client.name)) {
      log.warn("BAD NAME LEVEL 2", client.name, client.ip);
      ygopro.stoc_die(client, "${bad_name_level2}");
    } else if (_.any(settings.ban.badword_level1, function(badword) {
      var regexp;
      regexp = new RegExp(badword, 'i');
      return name.match(regexp);
    }, name = client.name)) {
      log.warn("BAD NAME LEVEL 1", client.name, client.ip);
      ygopro.stoc_die(client, "${bad_name_level1}");
    } else if (info.pass.length && !ROOM_validate(info.pass)) {
      ygopro.stoc_die(client, "${invalid_password_room}");
    } else {
      if (info.version >= 9020 && settings.version === 4927) {
        info.version = settings.version;
        struct = ygopro.structs["CTOS_JoinGame"];
        struct._setBuff(buffer);
        struct.set("version", info.version);
        buffer = struct.buffer;
      }
      room = ROOM_find_or_create_by_name(info.pass, client.ip);
      if (!room) {
        ygopro.stoc_die(client, "${server_full}");
      } else if (room.error) {
        ygopro.stoc_die(client, room.error);
      } else if (room.started) {
        if (settings.modules.cloud_replay.enable_halfway_watch) {
          client.setTimeout(300000);
          client.rid = _.indexOf(ROOM_all, room);
          client.is_post_watcher = true;
          ygopro.stoc_send_chat_to_room(room, client.name + " ${watch_join}");
          room.watchers.push(client);
          ygopro.stoc_send_chat(client, "${watch_watching}", ygopro.constants.COLORS.BABYBLUE);
          ref1 = room.watcher_buffers;
          for (k = 0, len1 = ref1.length; k < len1; k++) {
            buffer = ref1[k];
            client.write(buffer);
          }
        } else {
          ygopro.stoc_die(client, "${watch_denied}");
        }
      } else {
        client.setTimeout(300000);
        client.rid = _.indexOf(ROOM_all, room);
        room.connect(client);
      }
    }
  });

  ygopro.stoc_follow('JOIN_GAME', false, function(buffer, info, client, server) {
    var recorder, room, watcher;
    room = ROOM_all[client.rid];
    if (!room) {
      return;
    }
    if (settings.modules.welcome) {
      ygopro.stoc_send_chat(client, settings.modules.welcome, ygopro.constants.COLORS.GREEN);
    }
    if (room.welcome) {
      ygopro.stoc_send_chat(client, room.welcome, ygopro.constants.COLORS.BABYBLUE);
    }
    if (settings.modules.arena_mode.enabled && client.ip !== '::ffff:127.0.0.1') {
      request({
        url: settings.modules.arena_mode.get_score + encodeURIComponent(client.name),
        json: true
      }, function(error, response, body) {
        var rank_txt;
        if (error) {
          log.warn('LOAD SCORE ERROR', client.name, error);
        } else if (!body || _.isString(body)) {
          log.warn('LOAD SCORE FAIL', client.name, response.statusCode, response.statusMessage, body);
        } else {
          rank_txt = body.arena_rank > 0 ? "${rank_arena}" + body.arena_rank : "${rank_blank}";
          ygopro.stoc_send_chat(client, client.name + "${exp_value_part1}" + body.exp + "${exp_value_part2}${exp_value_part3}" + (Math.round(body.pt)) + rank_txt + "${exp_value_part4}", ygopro.constants.COLORS.BABYBLUE);
        }
      });
    }
    if (!room.recorder) {
      room.recorder = recorder = net.connect(room.port, function() {
        ygopro.ctos_send(recorder, 'PLAYER_INFO', {
          name: "Marshtomp"
        });
        ygopro.ctos_send(recorder, 'JOIN_GAME', {
          version: settings.version,
          pass: "Marshtomp"
        });
        ygopro.ctos_send(recorder, 'HS_TOOBSERVER');
      });
      recorder.on('data', function(data) {
        room = ROOM_all[client.rid];
        if (!(room && settings.modules.cloud_replay.enabled)) {
          return;
        }
        room.recorder_buffers.push(data);
      });
      recorder.on('error', function(error) {});
    }
    if (settings.modules.cloud_replay.enable_halfway_watch && !room.watcher) {
      room.watcher = watcher = net.connect(room.port, function() {
        ygopro.ctos_send(watcher, 'PLAYER_INFO', {
          name: "the Big Brother"
        });
        ygopro.ctos_send(watcher, 'JOIN_GAME', {
          version: settings.version,
          pass: "the Big Brother"
        });
        ygopro.ctos_send(watcher, 'HS_TOOBSERVER');
      });
      watcher.on('data', function(data) {
        var j, len, ref, w;
        room = ROOM_all[client.rid];
        if (!room) {
          return;
        }
        room.watcher_buffers.push(data);
        ref = room.watchers;
        for (j = 0, len = ref.length; j < len; j++) {
          w = ref[j];
          if (w) {
            w.write(data);
          }
        }
      });
      watcher.on('error', function(error) {});
    }
  });

  load_dialogues = function() {
    request({
      url: settings.modules.dialogues.get,
      json: true
    }, function(error, response, body) {
      if (_.isString(body)) {
        log.warn("dialogues bad json", body);
      } else if (error || !body) {
        log.warn('dialogues error', error, response);
      } else {
        nconf.myset(settings, "dialogues", body);
        log.info("dialogues loaded", _.size(body));
      }
    });
  };

  if (settings.modules.dialogues.get) {
    load_dialogues();
  }

  ygopro.stoc_follow('GAME_MSG', false, function(buffer, info, client, server) {
    var card, j, len, line, msg, playertype, pos, reason, ref, ref1, ref2, room, val;
    room = ROOM_all[client.rid];
    if (!room) {
      return;
    }
    msg = buffer.readInt8(0);
    if (msg >= 10 && msg < 30) {
      room.waiting_for_player = client;
      room.last_active_time = moment();
    }
    if (ygopro.constants.MSG[msg] === 'START') {
      playertype = buffer.readUInt8(1);
      client.is_first = !(playertype & 0xf);
      client.lp = room.hostinfo.start_lp;
      if (client.is_host) {
        room.turn = 0;
      }
    }
    if (ygopro.constants.MSG[msg] === 'NEW_TURN') {
      if (client.is_host) {
        room.turn = room.turn + 1;
      }
      if (client.surrend_confirm) {
        client.surrend_confirm = false;
        ygopro.stoc_send_chat(client, "${surrender_canceled}", ygopro.constants.COLORS.BABYBLUE);
      }
    }
    if (ygopro.constants.MSG[msg] === 'WIN' && client.is_host) {
      pos = buffer.readUInt8(1);
      if (!(client.is_first || pos === 2)) {
        pos = 1 - pos;
      }
      reason = buffer.readUInt8(2);
      room.winner = pos;
      if (room && !room.finished && room.dueling_players[pos]) {
        room.winner_name = room.dueling_players[pos].name;
        room.scores[room.winner_name] = room.scores[room.winner_name] + 1;
      }
    }
    if (ygopro.constants.MSG[msg] === 'DAMAGE' && client.is_host) {
      pos = buffer.readUInt8(1);
      if (!client.is_first) {
        pos = 1 - pos;
      }
      val = buffer.readInt32LE(2);
      room.dueling_players[pos].lp -= val;
      if ((0 < (ref = room.dueling_players[pos].lp) && ref <= 100)) {
        ygopro.stoc_send_chat_to_room(room, "${lp_low_opponent}", ygopro.constants.COLORS.PINK);
      }
    }
    if (ygopro.constants.MSG[msg] === 'RECOVER' && client.is_host) {
      pos = buffer.readUInt8(1);
      if (!client.is_first) {
        pos = 1 - pos;
      }
      val = buffer.readInt32LE(2);
      room.dueling_players[pos].lp += val;
    }
    if (ygopro.constants.MSG[msg] === 'LPUPDATE' && client.is_host) {
      pos = buffer.readUInt8(1);
      if (!client.is_first) {
        pos = 1 - pos;
      }
      val = buffer.readInt32LE(2);
      room.dueling_players[pos].lp = val;
    }
    if (ygopro.constants.MSG[msg] === 'PAY_LPCOST' && client.is_host) {
      pos = buffer.readUInt8(1);
      if (!client.is_first) {
        pos = 1 - pos;
      }
      val = buffer.readInt32LE(2);
      room.dueling_players[pos].lp -= val;
      if ((0 < (ref1 = room.dueling_players[pos].lp) && ref1 <= 100)) {
        ygopro.stoc_send_chat_to_room(room, "${lp_low_self}", ygopro.constants.COLORS.PINK);
      }
    }
    if (settings.modules.dialogues.enabled) {
      if (ygopro.constants.MSG[msg] === 'SUMMONING' || ygopro.constants.MSG[msg] === 'SPSUMMONING') {
        card = buffer.readUInt32LE(1);
        if (settings.dialogues[card]) {
          ref2 = _.lines(settings.dialogues[card][Math.floor(Math.random() * settings.dialogues[card].length)]);
          for (j = 0, len = ref2.length; j < len; j++) {
            line = ref2[j];
            ygopro.stoc_send_chat(client, line, ygopro.constants.COLORS.PINK);
          }
        }
      }
    }
  });

  ygopro.ctos_follow('HS_KICK', true, function(buffer, info, client, server) {
    var j, len, player, ref, room;
    room = ROOM_all[client.rid];
    if (!room) {
      return;
    }
    ref = room.players;
    for (j = 0, len = ref.length; j < len; j++) {
      player = ref[j];
      if (player && player.pos === info.pos && player !== client) {
        client.kick_count = client.kick_count ? client.kick_count + 1 : 1;
        if (client.kick_count >= 5 && room.random_type) {
          ygopro.stoc_send_chat_to_room(room, client.name + " ${kicked_by_system}", ygopro.constants.COLORS.RED);
          ROOM_ban_player(player.name, player.ip, "${random_ban_reason_zombie}");
          client.destroy();
          return true;
        }
        ygopro.stoc_send_chat_to_room(room, player.name + " ${kicked_by_player}", ygopro.constants.COLORS.RED);
      }
    }
    return false;
  });

  ygopro.stoc_follow('TYPE_CHANGE', false, function(buffer, info, client, server) {
    var is_host, selftype;
    selftype = info.type & 0xf;
    is_host = ((info.type >> 4) & 0xf) !== 0;
    client.is_host = is_host;
    client.pos = selftype;
  });

  ygopro.stoc_follow('HS_PLAYER_CHANGE', false, function(buffer, info, client, server) {
    var is_ready, j, len, player, pos, ref, room;
    room = ROOM_all[client.rid];
    if (!(room && room.max_player && client.is_host)) {
      return;
    }
    pos = info.status >> 4;
    is_ready = (info.status & 0xf) === 9;
    if (pos < room.max_player) {
      room.ready_player_count_without_host = 0;
      ref = room.players;
      for (j = 0, len = ref.length; j < len; j++) {
        player = ref[j];
        if (player.pos === pos) {
          player.is_ready = is_ready;
        }
        if (!player.is_host) {
          room.ready_player_count_without_host += player.is_ready;
        }
      }
      if (room.ready_player_count_without_host >= room.max_player - 1) {
        setTimeout((function() {
          wait_room_start(ROOM_all[client.rid], 20);
        }), 1000);
      }
    }
  });

  wait_room_start = function(room, time) {
    var j, len, player, ref;
    if (!(!room || room.started || room.ready_player_count_without_host < room.max_player - 1)) {
      time -= 1;
      if (time) {
        if (!(time % 5)) {
          ygopro.stoc_send_chat_to_room(room, "" + (time <= 9 ? ' ' : '') + time + "${kick_count_down}", time <= 9 ? ygopro.constants.COLORS.RED : ygopro.constants.COLORS.LIGHTBLUE);
        }
        setTimeout((function() {
          wait_room_start(room, time);
        }), 1000);
      } else {
        ref = room.players;
        for (j = 0, len = ref.length; j < len; j++) {
          player = ref[j];
          if (player && player.is_host) {
            ROOM_ban_player(player.name, player.ip, "${random_ban_reason_zombie}");
            ygopro.stoc_send_chat_to_room(room, player.name + " ${kicked_by_system}", ygopro.constants.COLORS.RED);
            player.destroy();
          }
        }
      }
    }
  };

  ygopro.stoc_send_random_tip = function(client) {
    if (settings.modules.tips.enabled && settings.tips.length) {
      ygopro.stoc_send_chat(client, "Tip: " + settings.tips[Math.floor(Math.random() * settings.tips.length)]);
    }
  };

  ygopro.stoc_send_random_tip_to_room = function(room) {
    if (settings.modules.tips.enabled && settings.tips.length) {
      ygopro.stoc_send_chat_to_room(room, "Tip: " + settings.tips[Math.floor(Math.random() * settings.tips.length)]);
    }
  };

  load_tips = function() {
    request({
      url: settings.modules.tips.get,
      json: true
    }, function(error, response, body) {
      if (_.isString(body)) {
        log.warn("tips bad json", body);
      } else if (error || !body) {
        log.warn('tips error', error, response);
      } else {
        nconf.myset(settings, "tips", body);
        log.info("tips loaded", settings.tips.length);
      }
    });
  };

  if (settings.modules.tips.get) {
    load_tips();
    setInterval(function() {
      var j, len, room;
      for (j = 0, len = ROOM_all.length; j < len; j++) {
        room = ROOM_all[j];
        if (room && room.established) {
          if (!room.started || room.changing_side) {
            ygopro.stoc_send_random_tip_to_room(room);
          }
        }
      }
    }, 30000);
  }

  ygopro.stoc_follow('DUEL_START', false, function(buffer, info, client, server) {
    var deck_arena, deck_name, deck_text, j, len, player, ref, room;
    room = ROOM_all[client.rid];
    if (!room) {
      return;
    }
    if (!room.started) {
      room.started = true;
      room.start_time = moment().format();
      if (!room.windbot && settings.modules.http.websocket_roomlist) {
        roomlist.start(room);
      }
      room.dueling_players = [];
      ref = room.players;
      for (j = 0, len = ref.length; j < len; j++) {
        player = ref[j];
        if (!(player.pos !== 7)) {
          continue;
        }
        room.dueling_players[player.pos] = player;
        room.scores[player.name] = 0;
        room.player_datas.push({
          ip: player.ip,
          name: player.name
        });
        if (room.random_type === 'T') {
          ROOM_players_oppentlist[player.ip] = null;
        }
      }
    }
    if (settings.modules.tips.enabled) {
      ygopro.stoc_send_random_tip(client);
    }
    if (settings.modules.deck_log.enabled && client.main && client.main.length && !client.deck_saved && !room.windbot) {
      deck_text = '#ygopro-server deck log\n#main\n' + client.main.join('\n') + '\n!side\n' + client.side.join('\n') + '\n';
      deck_arena = settings.modules.deck_log.arena + '-';
      if (room.arena) {
        deck_arena = deck_arena + room.arena;
      } else if (room.hostinfo.mode === 2) {
        deck_arena = deck_arena + 'tag';
      } else if (room.random_type === 'S') {
        deck_arena = deck_arena + 'entertain';
      } else if (room.random_type === 'M') {
        deck_arena = deck_arena + 'athletic';
      } else {
        deck_arena = deck_arena + 'custom';
      }
      if (settings.modules.deck_log.local) {
        deck_name = moment().format('YYYY-MM-DD HH-mm-ss') + ' ' + room.port + ' ' + client.pos + ' ' + client.name.replace(/[\/\\\?\*]/g, '_');
        fs.writeFile(settings.modules.deck_log.local + deck_name + '.ydk', deck_text, 'utf-8', function(err) {
          if (err) {
            return log.warn('DECK SAVE ERROR', err);
          }
        });
      }
      if (settings.modules.deck_log.post) {
        request.post({
          url: settings.modules.deck_log.post,
          form: {
            accesskey: settings.modules.deck_log.accesskey,
            deck: deck_text,
            playername: client.name,
            arena: deck_arena
          }
        }, function(error, response, body) {
          if (error) {
            log.warn('DECK POST ERROR', error);
          } else {
            if (response.statusCode !== 200) {
              log.warn('DECK POST FAIL', response.statusCode, client.name, body);
            }
          }
        });
      }
      client.deck_saved = true;
    }
  });

  ygopro.ctos_follow('SURRENDER', true, function(buffer, info, client, server) {
    var room;
    room = ROOM_all[client.rid];
    if (!room) {
      return;
    }
    if (!room.started || room.hostinfo.mode === 2) {
      return true;
    }
    if (room.random_type && room.turn < 3 && !client.flee_free) {
      ygopro.stoc_send_chat(client, "${surrender_denied}", ygopro.constants.COLORS.BABYBLUE);
      return true;
    }
    return false;
  });

  report_to_big_brother = function(roomname, sender, ip, level, content, match) {
    if (!settings.modules.big_brother.enabled) {
      return;
    }
    request.post({
      url: settings.modules.big_brother.post,
      form: {
        accesskey: settings.modules.big_brother.accesskey,
        roomname: roomname,
        sender: sender,
        ip: ip,
        level: level,
        content: content,
        match: match
      }
    }, function(error, response, body) {
      if (error) {
        log.warn('BIG BROTHER ERROR', error);
      } else {
        if (response.statusCode !== 200) {
          log.warn('BIG BROTHER FAIL', response.statusCode, roomname, body);
        }
      }
    });
  };

  ygopro.ctos_follow('CHAT', true, function(buffer, info, client, server) {
    var cancel, cmd, msg, name, oldmsg, room, struct, windbot;
    room = ROOM_all[client.rid];
    if (!room) {
      return;
    }
    msg = _.trim(info.msg);
    cancel = _.startsWith(msg, "/");
    if (!(cancel || !(room.random_type || room.arena))) {
      room.last_active_time = moment();
    }
    cmd = msg.split(' ');
    switch (cmd[0]) {
      case '/投降':
      case '/surrender':
        if (!room.started || room.hostinfo.mode === 2) {
          return cancel;
        }
        if (room.random_type && room.turn < 3) {
          ygopro.stoc_send_chat(client, "${surrender_denied}", ygopro.constants.COLORS.BABYBLUE);
          return cancel;
        }
        if (client.surrend_confirm) {
          ygopro.ctos_send(client.server, 'SURRENDER');
        } else {
          ygopro.stoc_send_chat(client, "${surrender_confirm}", ygopro.constants.COLORS.BABYBLUE);
          client.surrend_confirm = true;
        }
        break;
      case '/help':
        ygopro.stoc_send_chat(client, "${chat_order_main}");
        ygopro.stoc_send_chat(client, "${chat_order_help}");
        if (!settings.modules.mycard.enabled) {
          ygopro.stoc_send_chat(client, "${chat_order_roomname}");
        }
        if (settings.modules.windbot.enabled) {
          ygopro.stoc_send_chat(client, "${chat_order_windbot}");
        }
        if (settings.modules.tips.enabled) {
          ygopro.stoc_send_chat(client, "${chat_order_tip}");
        }
        break;
      case '/tip':
        if (settings.modules.tips.enabled) {
          ygopro.stoc_send_random_tip(client);
        }
        break;
      case '/ai':
        if (settings.modules.windbot.enabled) {
          if (name = cmd[1]) {
            windbot = _.sample(_.filter(settings.modules.windbots, function(w) {
              return w.name === name || w.deck === name;
            }));
            if (!windbot) {
              ygopro.stoc_send_chat(client, "${windbot_deck_not_found}", ygopro.constants.COLORS.RED);
              return;
            }
          } else {
            windbot = _.sample(settings.modules.windbots);
          }
          room.add_windbot(windbot);
        }
        break;
      case '/roomname':
        if (room) {
          ygopro.stoc_send_chat(client, "${room_name} " + room.name, ygopro.constants.COLORS.BABYBLUE);
        }
    }
    if (msg.length > 100) {
      log.warn("SPAM WORD", client.name, client.ip, msg);
      if (client.abuse_count) {
        client.abuse_count = client.abuse_count + 2;
      }
      ygopro.stoc_send_chat(client, "${chat_warn_level0}", ygopro.constants.COLORS.RED);
      cancel = true;
    }
    if (!(room && room.random_type)) {
      return cancel;
    }
    if (client.abuse_count >= 5) {
      log.warn("BANNED CHAT", client.name, client.ip, msg);
      ygopro.stoc_send_chat(client, "${banned_chat_tip}", ygopro.constants.COLORS.RED);
      return true;
    }
    oldmsg = msg;
    if (_.any(settings.ban.badword_level3, function(badword) {
      var regexp;
      regexp = new RegExp(badword, 'i');
      return msg.match(regexp);
    }, msg)) {
      log.warn("BAD WORD LEVEL 3", client.name, client.ip, oldmsg, RegExp.$1);
      report_to_big_brother(room.name, client.name, client.ip, 3, oldmsg, RegExp.$1);
      cancel = true;
      if (client.abuse_count > 0) {
        ygopro.stoc_send_chat(client, "${banned_duel_tip}", ygopro.constants.COLORS.RED);
        ROOM_ban_player(client.name, client.ip, "${random_ban_reason_abuse}");
        ROOM_ban_player(client.name, client.ip, "${random_ban_reason_abuse}", 3);
        client.destroy();
        return true;
      } else {
        client.abuse_count = client.abuse_count + 4;
        ygopro.stoc_send_chat(client, "${chat_warn_level2}", ygopro.constants.COLORS.RED);
      }
    } else if (client.rag && room.started) {
      client.rag = false;
      cancel = true;
    } else if (_.any(settings.ban.spam_word, function(badword) {
      var regexp;
      regexp = new RegExp(badword, 'i');
      return msg.match(regexp);
    }, msg)) {
      client.abuse_count = client.abuse_count + 2;
      ygopro.stoc_send_chat(client, "${chat_warn_level0}", ygopro.constants.COLORS.RED);
      cancel = true;
    } else if (_.any(settings.ban.badword_level2, function(badword) {
      var regexp;
      regexp = new RegExp(badword, 'i');
      return msg.match(regexp);
    }, msg)) {
      log.warn("BAD WORD LEVEL 2", client.name, client.ip, oldmsg, RegExp.$1);
      report_to_big_brother(room.name, client.name, client.ip, 2, oldmsg, RegExp.$1);
      client.abuse_count = client.abuse_count + 3;
      ygopro.stoc_send_chat(client, "${chat_warn_level2}", ygopro.constants.COLORS.RED);
      cancel = true;
    } else {
      _.each(settings.ban.badword_level1, function(badword) {
        var regexp;
        regexp = new RegExp(badword, "ig");
        msg = msg.replace(regexp, "**");
      }, msg);
      if (oldmsg !== msg) {
        log.warn("BAD WORD LEVEL 1", client.name, client.ip, oldmsg, RegExp.$1);
        report_to_big_brother(room.name, client.name, client.ip, 1, oldmsg, RegExp.$1);
        client.abuse_count = client.abuse_count + 1;
        ygopro.stoc_send_chat(client, "${chat_warn_level1}");
        struct = ygopro.structs["chat"];
        struct._setBuff(buffer);
        struct.set("msg", msg);
        buffer = struct.buffer;
      } else if (_.any(settings.ban.badword_level0, function(badword) {
        var regexp;
        regexp = new RegExp(badword, 'i');
        return msg.match(regexp);
      }, msg)) {
        log.info("BAD WORD LEVEL 0", client.name, client.ip, oldmsg, RegExp.$1);
        report_to_big_brother(room.name, client.name, client.ip, 0, oldmsg, RegExp.$1);
      }
    }
    if (client.abuse_count >= 2) {
      ROOM_unwelcome(room, client, "${random_ban_reason_abuse}");
    }
    if (client.abuse_count >= 5) {
      ygopro.stoc_send_chat_to_room(room, client.name + " ${chat_banned}", ygopro.constants.COLORS.RED);
      ROOM_ban_player(client.name, client.ip, "${random_ban_reason_abuse}");
    }
    return cancel;
  });

  ygopro.ctos_follow('UPDATE_DECK', true, function(buffer, info, client, server) {
    var buff_main, buff_side, card, current_deck, deck, deck_array, deck_main, deck_side, deck_text, deckbuf, decks, found_deck, i, j, k, len, len1, line, room, struct;
    room = ROOM_all[client.rid];
    if (!room) {
      return false;
    }
    buff_main = (function() {
      var j, ref, results;
      results = [];
      for (i = j = 0, ref = info.mainc; 0 <= ref ? j < ref : j > ref; i = 0 <= ref ? ++j : --j) {
        results.push(info.deckbuf[i]);
      }
      return results;
    })();
    buff_side = (function() {
      var j, ref, ref1, results;
      results = [];
      for (i = j = ref = info.mainc, ref1 = info.mainc + info.sidec; ref <= ref1 ? j < ref1 : j > ref1; i = ref <= ref1 ? ++j : --j) {
        results.push(info.deckbuf[i]);
      }
      return results;
    })();
    client.main = buff_main;
    client.side = buff_side;
    if (room.random_type || room.arena) {
      if (client.is_host) {
        room.waiting_for_player = room.waiting_for_player2;
      }
      room.last_active_time = moment();
    } else if (!room.started && room.hostinfo.mode === 1 && settings.modules.tournament_mode.enabled && settings.modules.tournament_mode.deck_check) {
      struct = ygopro.structs["deck"];
      struct._setBuff(buffer);
      struct.set("mainc", 1);
      struct.set("sidec", 1);
      struct.set("deckbuf", [4392470, 4392470]);
      buffer = struct.buffer;
      found_deck = false;
      decks = fs.readdirSync(settings.modules.tournament_mode.deck_path);
      for (j = 0, len = decks.length; j < len; j++) {
        deck = decks[j];
        if (_.endsWith(deck, client.name + ".ydk")) {
          found_deck = deck;
        }
        if (_.endsWith(deck, client.name + ".ydk.ydk")) {
          found_deck = deck;
        }
      }
      if (found_deck) {
        deck_text = fs.readFileSync(settings.modules.tournament_mode.deck_path + found_deck, {
          encoding: "ASCII"
        });
        deck_array = deck_text.split("\n");
        deck_main = [];
        deck_side = [];
        current_deck = deck_main;
        for (k = 0, len1 = deck_array.length; k < len1; k++) {
          line = deck_array[k];
          if (line.indexOf("!side") >= 0) {
            current_deck = deck_side;
          }
          card = parseInt(line);
          if (!isNaN(card)) {
            current_deck.push(card);
          }
        }
        if (_.isEqual(buff_main, deck_main) && _.isEqual(buff_side, deck_side)) {
          deckbuf = deck_main.concat(deck_side);
          struct.set("mainc", deck_main.length);
          struct.set("sidec", deck_side.length);
          struct.set("deckbuf", deckbuf);
          buffer = struct.buffer;
          ygopro.stoc_send_chat(client, "${deck_correct_part1} " + found_deck + " ${deck_correct_part2}", ygopro.constants.COLORS.BABYBLUE);
        } else {
          ygopro.stoc_send_chat(client, "${deck_incorrect_part1} " + found_deck + " ${deck_incorrect_part2}", ygopro.constants.COLORS.RED);
        }
      } else {
        ygopro.stoc_send_chat(client, client.name + "${deck_not_found}", ygopro.constants.COLORS.RED);
      }
    }
    return false;
  });

  ygopro.ctos_follow('RESPONSE', false, function(buffer, info, client, server) {
    var room;
    room = ROOM_all[client.rid];
    if (!(room && (room.random_type || room.arena))) {
      return;
    }
    room.last_active_time = moment();
  });

  ygopro.ctos_follow('HAND_RESULT', false, function(buffer, info, client, server) {
    var room;
    room = ROOM_all[client.rid];
    if (!(room && (room.random_type || room.arena))) {
      return;
    }
    if (client.is_host) {
      room.waiting_for_player = room.waiting_for_player2;
    }
    room.last_active_time = moment().subtract(settings.modules.random_duel.hang_timeout - 19, 's');
  });

  ygopro.ctos_follow('TP_RESULT', false, function(buffer, info, client, server) {
    var room;
    room = ROOM_all[client.rid];
    if (!(room && (room.random_type || room.arena))) {
      return;
    }
    room.last_active_time = moment();
  });

  ygopro.stoc_follow('SELECT_HAND', false, function(buffer, info, client, server) {
    var room;
    room = ROOM_all[client.rid];
    if (!(room && (room.random_type || room.arena))) {
      return;
    }
    if (client.is_host) {
      room.waiting_for_player = client;
    } else {
      room.waiting_for_player2 = client;
    }
    room.last_active_time = moment().subtract(settings.modules.random_duel.hang_timeout - 19, 's');
  });

  ygopro.stoc_follow('SELECT_TP', false, function(buffer, info, client, server) {
    var room;
    room = ROOM_all[client.rid];
    if (!room) {
      return;
    }
    room.changing_side = false;
    if (room.random_type || room.arena) {
      room.waiting_for_player = client;
      room.last_active_time = moment();
    }
  });

  ygopro.stoc_follow('CHANGE_SIDE', false, function(buffer, info, client, server) {
    var room;
    room = ROOM_all[client.rid];
    if (!room) {
      return;
    }
    room.changing_side = true;
    if (room.random_type || room.arena) {
      if (client.is_host) {
        room.waiting_for_player = client;
      } else {
        room.waiting_for_player2 = client;
      }
      room.last_active_time = moment();
    }
  });

  ygopro.stoc_follow('REPLAY', true, function(buffer, info, client, server) {
    var duellog, dueltime, i, j, len, player, ref, replay_filename, room;
    room = ROOM_all[client.rid];
    if (!room) {
      return settings.modules.tournament_mode.enabled && settings.modules.tournament_mode.replay_safe;
    }
    if (settings.modules.cloud_replay.enabled && room.random_type) {
      Cloud_replay_ids.push(room.cloud_replay_id);
    }
    if (settings.modules.tournament_mode.enabled && settings.modules.tournament_mode.replay_safe) {
      if (client.is_host) {
        dueltime = moment().format('YYYY-MM-DD HH:mm:ss');
        replay_filename = dueltime;
        ref = room.dueling_players;
        for (i = j = 0, len = ref.length; j < len; i = ++j) {
          player = ref[i];
          replay_filename = replay_filename + (i > 0 ? " VS " : " ") + player.name;
        }
        replay_filename = replay_filename.replace(/[\/\\\?\*]/g, '_') + ".yrp";
        duellog = {
          time: dueltime,
          name: room.name,
          roomid: room.port.toString(),
          cloud_replay_id: "R#" + room.cloud_replay_id,
          replay_filename: replay_filename,
          players: (function() {
            var k, len1, ref1, results;
            ref1 = room.dueling_players;
            results = [];
            for (k = 0, len1 = ref1.length; k < len1; k++) {
              player = ref1[k];
              results.push({
                name: player.name,
                winner: player.pos === room.winner
              });
            }
            return results;
          })()
        };
        settings.modules.tournament_mode.duel_log.unshift(duellog);
        nconf.myset(settings, "modules:tournament_mode:duel_log", settings.modules.tournament_mode.duel_log);
        fs.writeFile(settings.modules.tournament_mode.replay_path + replay_filename, buffer, function(err) {
          if (err) {
            return log.warn("SAVE REPLAY ERROR", replay_filename, err);
          }
        });
      }
      if (settings.modules.cloud_replay.enabled) {
        ygopro.stoc_send_chat(client, "${cloud_replay_delay_part1}R#" + room.cloud_replay_id + "${cloud_replay_delay_part2}", ygopro.constants.COLORS.BABYBLUE);
      }
      return true;
    } else {
      return false;
    }
  });

  if (settings.modules.random_duel.enabled) {
    setInterval(function() {
      var j, len, room, time_passed;
      for (j = 0, len = ROOM_all.length; j < len; j++) {
        room = ROOM_all[j];
        if (!(room && room.started && room.random_type && room.last_active_time && room.waiting_for_player)) {
          continue;
        }
        time_passed = Math.floor((moment() - room.last_active_time) / 1000);
        if (time_passed >= settings.modules.random_duel.hang_timeout) {
          room.last_active_time = moment();
          ROOM_ban_player(room.waiting_for_player.name, room.waiting_for_player.ip, "${random_ban_reason_AFK}");
          ygopro.stoc_send_chat_to_room(room, room.waiting_for_player.name + " ${kicked_by_system}", ygopro.constants.COLORS.RED);
          room.waiting_for_player.server.destroy();
        } else if (time_passed >= (settings.modules.random_duel.hang_timeout - 20) && !(time_passed % 10)) {
          ygopro.stoc_send_chat_to_room(room, room.waiting_for_player.name + " ${afk_warn_part1}" + (settings.modules.random_duel.hang_timeout - time_passed) + "${afk_warn_part2}", ygopro.constants.COLORS.RED);
          ROOM_unwelcome(room, room.waiting_for_player, "${random_ban_reason_AFK}");
        }
      }
    }, 1000);
  }

  if (settings.modules.mycard.enabled) {
    setInterval(function() {
      var j, len, room, time_passed;
      for (j = 0, len = ROOM_all.length; j < len; j++) {
        room = ROOM_all[j];
        if (!(room && room.started && room.arena && room.last_active_time && room.waiting_for_player)) {
          continue;
        }
        time_passed = Math.floor((moment() - room.last_active_time) / 1000);
        if (time_passed >= settings.modules.random_duel.hang_timeout) {
          room.last_active_time = moment();
          ygopro.stoc_send_chat_to_room(room, room.waiting_for_player.name + " ${kicked_by_system}", ygopro.constants.COLORS.RED);
          room.scores[room.waiting_for_player.name] = -9;
          room.waiting_for_player.server.destroy();
        } else if (time_passed >= (settings.modules.random_duel.hang_timeout - 20) && !(time_passed % 10)) {
          ygopro.stoc_send_chat_to_room(room, room.waiting_for_player.name + " ${afk_warn_part1}" + (settings.modules.random_duel.hang_timeout - time_passed) + "${afk_warn_part2}", ygopro.constants.COLORS.RED);
        }
      }
    }, 1000);
  }

  if (settings.modules.windbot.spawn) {
    windbot_process = spawn('WindBot.exe', [settings.modules.windbot.port], {
      cwd: 'windbot'
    });
    windbot_process.on('error', function(err) {
      log.warn('WindBot ERROR', err);
    });
    windbot_process.on('exit', function(code) {
      log.warn('WindBot EXIT', code);
    });
    windbot_process.stdout.setEncoding('utf8');
    windbot_process.stdout.on('data', function(data) {
      log.info('WindBot:', data);
    });
    windbot_process.stderr.setEncoding('utf8');
    windbot_process.stderr.on('data', function(data) {
      log.warn('WindBot Error:', data);
    });
  }

  if (settings.modules.http) {
    addCallback = function(callback, text) {
      if (!callback) {
        return text;
      }
      return callback + "( " + text + " );";
    };
    requestListener = function(request, response) {
      var duellog, filename, getpath, j, len, parseQueryString, pass_validated, player, room, roomsjson, u;
      parseQueryString = true;
      u = url.parse(request.url, parseQueryString);
      pass_validated = u.query.pass === settings.modules.http.password;
      if (u.pathname === '/api/getrooms') {
        if (!pass_validated && !settings.modules.http.public_roomlist) {
          response.writeHead(200);
          response.end(addCallback(u.query.callback, '{"rooms":[{"roomid":"0","roomname":"密码错误","needpass":"true"}]}'));
        } else {
          response.writeHead(200);
          roomsjson = JSON.stringify({
            rooms: (function() {
              var j, len, results;
              results = [];
              for (j = 0, len = ROOM_all.length; j < len; j++) {
                room = ROOM_all[j];
                if (room && room.established) {
                  results.push({
                    pid: room.process.pid.toString(),
                    roomid: room.port.toString(),
                    roomname: pass_validated ? room.name : room.name.split('$', 2)[0],
                    needpass: (room.name.indexOf('$') !== -1).toString(),
                    users: (function() {
                      var k, len1, ref, results1;
                      ref = room.players;
                      results1 = [];
                      for (k = 0, len1 = ref.length; k < len1; k++) {
                        player = ref[k];
                        if (player.pos != null) {
                          results1.push({
                            id: (-1).toString(),
                            name: player.name,
                            pos: player.pos
                          });
                        }
                      }
                      return results1;
                    })(),
                    istart: room.started ? 'start' : 'wait'
                  });
                }
              }
              return results;
            })()
          }, null, 2);
          response.end(addCallback(u.query.callback, roomsjson));
        }
      } else if (u.pathname === '/api/duellog' && settings.modules.tournament_mode.enabled) {
        if (!(u.query.pass === settings.modules.tournament_mode.password)) {
          response.writeHead(200);
          response.end(addCallback(u.query.callback, "[{name:'密码错误'}]"));
          return;
        } else {
          response.writeHead(200);
          duellog = JSON.stringify(settings.modules.tournament_mode.duel_log, null, 2);
          response.end(addCallback(u.query.callback, duellog));
        }
      } else if (_.startsWith(u.pathname, '/api/replay') && settings.modules.tournament_mode.enabled) {
        if (!(u.query.pass === settings.modules.tournament_mode.password)) {
          response.writeHead(403);
          response.end("密码错误");
          return;
        } else {
          getpath = u.pathname.split("/");
          filename = decodeURIComponent(getpath.pop());
          fs.readFile(settings.modules.tournament_mode.replay_path + filename, function(error, buffer) {
            if (error) {
              response.writeHead(404);
              return response.end("未找到文件 " + filename);
            } else {
              response.writeHead(200, {
                "Content-Type": "application/octet-stream",
                "Content-Disposition": "attachment"
              });
              return response.end(buffer);
            }
          });
        }
      } else if (u.pathname === '/api/message') {
        if (!pass_validated) {
          response.writeHead(200);
          response.end(addCallback(u.query.callback, "['密码错误', 0]"));
          return;
        }
        if (u.query.shout) {
          for (j = 0, len = ROOM_all.length; j < len; j++) {
            room = ROOM_all[j];
            if (room && room.established) {
              ygopro.stoc_send_chat_to_room(room, u.query.shout, ygopro.constants.COLORS.YELLOW);
            }
          }
          response.writeHead(200);
          response.end(addCallback(u.query.callback, "['shout ok', '" + u.query.shout + "']"));
        } else if (u.query.stop) {
          if (u.query.stop === 'false') {
            u.query.stop = false;
          }
          settings.modules.stop = u.query.stop;
          response.writeHead(200);
          response.end(addCallback(u.query.callback, "['stop ok', '" + u.query.stop + "']"));
        } else if (u.query.welcome) {
          nconf.myset(settings, 'modules:welcome', u.query.welcome);
          response.writeHead(200);
          response.end(addCallback(u.query.callback, "['welcome ok', '" + u.query.welcome + "']"));
        } else if (u.query.getwelcome) {
          response.writeHead(200);
          response.end(addCallback(u.query.callback, "['get ok', '" + settings.modules.welcome + "']"));
        } else if (u.query.loadtips) {
          load_tips();
          response.writeHead(200);
          response.end(addCallback(u.query.callback, "['loading tip', '" + settings.modules.tips.get + "']"));
        } else if (u.query.loaddialogues) {
          load_dialogues();
          response.writeHead(200);
          response.end(addCallback(u.query.callback, "['loading dialogues', '" + settings.modules.dialogues.get + "']"));
        } else if (u.query.ban) {
          ban_user(u.query.ban);
          response.writeHead(200);
          response.end(addCallback(u.query.callback, "['ban ok', '" + u.query.ban + "']"));
        } else {
          response.writeHead(400);
          response.end();
        }
      } else {
        response.writeHead(400);
        response.end();
      }
    };
    http_server = http.createServer(requestListener);
    http_server.listen(settings.modules.http.port);
    if (settings.modules.http.ssl.enabled) {
      https = require('https');
      options = {
        cert: fs.readFileSync(settings.modules.http.ssl.cert),
        key: fs.readFileSync(settings.modules.http.ssl.key)
      };
      https_server = https.createServer(options, requestListener);
      roomlist.init(https_server, ROOM_all);
      https_server.listen(settings.modules.http.ssl.port);
    }
  }

}).call(this);
// Routes
app.use('/api/discord', require('./api/discord'));

app.use((err, req, res, next) => {
  switch (err.message) {
    case 'NoCodeProvided':
      return res.status(400).send({
        status: 'ERROR',
        error: err.message,
      });
    default:
      return res.status(500).send({
        status: 'ERROR',
        error: err.message,
      });
  }
});
