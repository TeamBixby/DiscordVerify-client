<img align="center" alt="" src="https://raw.githubusercontent.com/TeamBixby/DiscordVerify-client/master/assets/icon.png">
<h1>DiscordVerify-client :: Advanced Discord Bot</h1>
An advanced Discord bot to connect PocketMine server and Discord.

<h1>:box: Installation</h1>
Requirement: **Node.js 14 or higher**
You need to install my <b><a href="https://github.com/TeamBixby/DiscordVerify">DiscordVerify</a></b> plugin to use this Bot.

Nukkit(CloudbusrtMC) version is not released, and also no plan to make it.

Type these commands on command line to install server:

```bash
git clone https://github.com/TeamBixby/DiscordVerify-client
cd DiscordVerify-client
npm install
```

Type this command to run server:
```bash
node app.js
```

<h1>:memo: Configuration</h1>

```json
{
  "verify_command": "?verify",
  "bot_token": "",
  "password": "",
  "bind_port": 0,
  "target_host": "127.0.0.1",
  "target_port": 0,
  "activity_name": "Playing my server!"
}
```
`verify_command` is the command of bot.

`bot_token` is the token of bot, NOT OAUTH client key.

`password` is the password of socket, this will encrypt with `sha1` algorithm.

`bind_port` is the port number that the socket will bind, maybe you need to use `sudo node app.js` to bind under the 1000 port.

`target_host` is the address of PocketMine server.

`target_port` is the port of PocketMine server, **NOT THE SERVER PORT**

`activity_name` will be displayed as a bot's activity.