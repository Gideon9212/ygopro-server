var Discord = require('discord.io');
  
  var bot = new Discord.Client({
	token: "Add token here",
	autorun: true
  });
  
  bot.on('ready',function(){
    console.log('Logged in as %s - %s\n', bot.username, bot.id);
    require("./ygopro-server.js")(write,write2);
});

	write = function(output){
		bot.sendMessage({
			to: "Add channel ID here",
			message: "```" + output + "```"
		}, function(err, res){ if (err) { console.log(err); } return res});
	}; 
	write2 = function(output){
		var j, len1, line, o, r, re, ref, ref1;
		
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