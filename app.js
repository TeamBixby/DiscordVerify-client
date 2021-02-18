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

		const role = await createRole(message.guild);

		const player = res[args];

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
				password: config.password
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
		console.error(e);
	}
}

recvSock.bind(config.bind_port, () => {
	console.log("Receive socket is running on " + config.bind_port);
});

recvSock.on("message", async (message) => {
	console.log(message);
	const data = JSON.parse(message);
	if(!data.password || !data.data){
		return;
	}
	if(data.password !== config.password){
		return;
	}
	const player = data.data.player;
	const random_token = data.data.random_token;
	res[random_token] = player;
});

client.login(config.bot_token);