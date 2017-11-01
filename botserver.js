var Discord = require('discord.io');
var fs = require('fs');

var channelids = fs.readFileSync('channels.txt', 'utf8');
var channels = channelids.split("\n");
for (let i = channels.length; i > -1; i--){
	if(channels[i]===""){
		channels.splice(i,1);
	}
}
  
  var bot = new Discord.Client({
	token: "Add token here",
	autorun: true
  });
  
  bot.on('ready',function(){
    console.log('Logged in as %s - %s\n', bot.username, bot.id);
    require("./ygopro-server.js")(write,write2);
});

	bot.on('message',function(user, userID, channelID, message, event){
		if(message===".addlogging") {
			let chk=true;
			for (let i = 0; i < channels.length; i++) {
				if(channels[i]===channelID){
					chk = false;
					break;
				}
			}
			if (chk){
				console.log('adding '+channelID + ' as a valid channel');
				channels.push(channelID);
				bot.sendMessage({
				to: channelID,
				message: "logging enabled in this channel"
			}, function(err, res){ if (err) { console.log(err); } return res});
			savechannels();
			} else {
				bot.sendMessage({
				to: channelID,
				message: "channel is already used for logging"
				}, function(err, res){ if (err) { console.log(err); } return res});
			}
		}
		if(message===".removelogging") {
			let chk=false;
			for (let i = channels.length; i > -1; i--) {
				if(channels[i]===channelID){
					chk = true;
					channels.splice(i,1);
				}
			}
			if(chk){
				console.log(channelID + ' removed from logging channels');
				bot.sendMessage({
				to: channelID,
				message: "logging disabled in this channel"
			}, function(err, res){ if (err) { console.log(err); } return res});
			savechannels();
			} else {
				bot.sendMessage({
				to: channelID,
				message: "this channel wasn't used for logging"
				}, function(err, res){ if (err) { console.log(err); } return res});
			}
		}
	});

	write = function(output){
		for (let i = 0; i < channels.length; i++) {
			bot.sendMessage({
				to: channels[i],
				message: "```" + output + "```"
			}, function(err, res){ if (err) { console.log(err); } return res});
		}
	}; 
	write2 = function(output){
		let j, len1, line, o, r, re, ref, ref1;
		
		ref = (require('underscore')).lines(output);
		for (j = 0, len1 = ref.length; j < len1; j++) {
			if ((line + "\n" + ref[j]).length > 2000-6){
				write(line);
				line="";
			}
		  line = line + "\n" + ref[j];
		}
	  write(line);
	};
	
	savechannels = function(){
		let buffer = "";
		for (let i = 0; i < channels.length; i++) {
			buffer=buffer+channels[i]+"\n";
		}
		fs.writeFile('channels.txt', buffer, function(err) {
          if (err) {
			console.log("couldn't save channel list\n" + err);
          }
        });
	}
