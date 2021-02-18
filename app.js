const discord = require("discord.js");
const dgram = require("dgram");
const fs = require("fs");

const sendSock = dgram.createSocket({type: "udp4"});

const recvSock = dgram.createSocket({type: "udp4"});

const config = JSON.parse(fs.readFileSync("config.json"));

if(config.bot_token === ""){
	console.log("Please fill the bot token");
	process.exit(1);
}
if(config.password === ""){
	console.log("Please fill the password");
	process.exit(1);
}

if(config.target_host === "" || config.target_port === 0){
	console.log("Please fill the host and port");
	process.exit(1);
}
if(config.bind_port === 0){
	console.log("Please fill the bind port");
	process.exit(1);
}

const client = new discord.Client();

client.on("ready", async () => {
	console.log("Discord client is ready");
	await client.user.setActivity({
		type: "PLAYING",
		name: config.activity_name
	});
});

const res = {};

client.on("message", async (message) => {
	if(message.content.startsWith(config.verify_command)){
		const chunk = message.content.split(" ");

		const roleExists = await message.member.roles.cache.find((role) => role.name === "verified");

		if(typeof roleExists !== "undefined"){
			await message.reply("You are already verified");
			return;
		}

		if(chunk.length !== 2){
			await message.reply("Usage: " + config.verify_command + " <token>");
			return;
		}
		[command, args] = chunk;
		if(!res[args]){
			await message.reply("You entered invalid token");
			return;

		}

		try{
			const role = await createRole(message.guild);
		}catch(e){
			await message.reply("Failed to create role, Check the bot has `MANAGE_ROLE` permission!");
			return;
		}

		const player = res[args].player;

		delete res[args];

		try{
			await message.member.roles.add(role);
			await message.reply("You've linked account with `" + player + "`");
			await sendSock.send(JSON.stringify({
				action: "verified",
				data: {
					discordId: message.member.id,
					player: player
				},
				password: sha1(config.password)
			}), config.target_port, config.target_host, () => {});
		}catch(e){
			await message.reply("Failed to apply role");
		}
	}
});

async function createRole(guild){
	try{
		if(guild instanceof discord.Guild){
			const role = await guild.roles.cache.find(r => r.name === "verified");
			if(!role){
				return await guild.roles.create({
					data: {
						color: "GREEN",
						name: "verified"
					},
					reason: "Bot created role"
				});
			}
			return role;
		}
	}catch(e){
		throw e;
	}
}

recvSock.bind(config.bind_port, () => {
	console.log("Receive socket is running on " + config.bind_port);
});

recvSock.on("message", async (message) => {
	const data = JSON.parse(message);
	if(!data.password || !data.data){
		console.log("Invalid socket received: Response body is empty");
		return;
	}
	if(data.password !== sha1(config.password)){
		console.log("Invalid socket received: Password does not match");
		return;
	}
	const player = data.data.player;
	const random_token = data.data.random_token;
	res[random_token] = {
		player: player,
		expiredAt: new Date().getTime() + (60 * 1000)
	};
});

setInterval(() => {
	for(let token in res){
		if(res[token].expiredAt - new Date().getTime() <= 0){
			delete res[token];
			console.log("Deleted unused token " + token);
		}
	}
}, 1000);

client.login(config.bot_token);

function sha1(str){
	// http://jsphp.co/jsphp/fn/view/sha1
	// +   original by: Webtoolkit.info (http://www.webtoolkit.info/)
	// + namespaced by: Michael White (http://getsprink.com)
	// +      input by: Brett Zamir (http://brett-zamir.me)
	// +   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
	// -    depends on: utf8_encode
	// *     example 1: sha1('Kevin van Zonneveld');
	// *     returns 1: '54916d2e62f65b3afa6e192e6a601cdbe5cb5897'
	const rotate_left = function(n, s){
		return (n << s) | (n >>> (32 - s));
	};

	/*var lsb_hex = function (val) { // Not in use; needed?
			var str="";
			var i;
			var vh;
			var vl;

			for ( i=0; i<=6; i+=2 ) {
				vh = (val>>>(i*4+4))&0x0f;
				vl = (val>>>(i*4))&0x0f;
				str += vh.toString(16) + vl.toString(16);
			}
			return str;
		};*/

	const cvt_hex = function(val){
		let str = "";
		let i;
		let v;

		for(i = 7; i >= 0; i--){
			v = (val >>> (i * 4)) & 0x0f;
			str += v.toString(16);
		}
		return str;
	};

	let blockstart;
	let i, j;
	const W = new Array(80);
	let H0 = 0x67452301;
	let H1 = 0xEFCDAB89;
	let H2 = 0x98BADCFE;
	let H3 = 0x10325476;
	let H4 = 0xC3D2E1F0;
	let A, B, C, D, E;
	let temp;

	function utf8_encode(str){
		return unescape(encodeURIComponent(str));
	}

	str = utf8_encode(str);
	const str_len = str.length;

	const word_array = [];
	for(i = 0; i < str_len - 3; i += 4){
		j = str.charCodeAt(i) << 24 | str.charCodeAt(i + 1) << 16 | str.charCodeAt(i + 2) << 8 | str.charCodeAt(i + 3);
		word_array.push(j);
	}

	switch(str_len % 4){
		case 0:
			i = 0x080000000;
			break;
		case 1:
			i = str.charCodeAt(str_len - 1) << 24 | 0x0800000;
			break;
		case 2:
			i = str.charCodeAt(str_len - 2) << 24 | str.charCodeAt(str_len - 1) << 16 | 0x08000;
			break;
		case 3:
			i = str.charCodeAt(str_len - 3) << 24 | str.charCodeAt(str_len - 2) << 16 | str.charCodeAt(str_len - 1) << 8 | 0x80;
			break;
	}

	word_array.push(i);

	while((word_array.length % 16) !== 14){
		word_array.push(0);
	}

	word_array.push(str_len >>> 29);
	word_array.push((str_len << 3) & 0x0ffffffff);

	for(blockstart = 0; blockstart < word_array.length; blockstart += 16){
		for(i = 0; i < 16; i++){
			W[i] = word_array[blockstart + i];
		}
		for(i = 16; i <= 79; i++){
			W[i] = rotate_left(W[i - 3] ^ W[i - 8] ^ W[i - 14] ^ W[i - 16], 1);
		}


		A = H0;
		B = H1;
		C = H2;
		D = H3;
		E = H4;

		for(i = 0; i <= 19; i++){
			temp = (rotate_left(A, 5) + ((B & C) | (~B & D)) + E + W[i] + 0x5A827999) & 0x0ffffffff;
			E = D;
			D = C;
			C = rotate_left(B, 30);
			B = A;
			A = temp;
		}

		for(i = 20; i <= 39; i++){
			temp = (rotate_left(A, 5) + (B ^ C ^ D) + E + W[i] + 0x6ED9EBA1) & 0x0ffffffff;
			E = D;
			D = C;
			C = rotate_left(B, 30);
			B = A;
			A = temp;
		}

		for(i = 40; i <= 59; i++){
			temp = (rotate_left(A, 5) + ((B & C) | (B & D) | (C & D)) + E + W[i] + 0x8F1BBCDC) & 0x0ffffffff;
			E = D;
			D = C;
			C = rotate_left(B, 30);
			B = A;
			A = temp;
		}

		for(i = 60; i <= 79; i++){
			temp = (rotate_left(A, 5) + (B ^ C ^ D) + E + W[i] + 0xCA62C1D6) & 0x0ffffffff;
			E = D;
			D = C;
			C = rotate_left(B, 30);
			B = A;
			A = temp;
		}

		H0 = (H0 + A) & 0x0ffffffff;
		H1 = (H1 + B) & 0x0ffffffff;
		H2 = (H2 + C) & 0x0ffffffff;
		H3 = (H3 + D) & 0x0ffffffff;
		H4 = (H4 + E) & 0x0ffffffff;
	}

	temp = cvt_hex(H0) + cvt_hex(H1) + cvt_hex(H2) + cvt_hex(H3) + cvt_hex(H4);
	return temp.toLowerCase();
}