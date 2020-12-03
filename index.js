// Importing Packages
const Discord = require("discord.js")
const SQLite = require("better-sqlite3")
const sql = new SQLite('./mainDB.sqlite')
const { join } = require("path")
const { readdirSync } = require("fs");

const client = new Discord.Client()

client.commands = new Discord.Collection();
const cooldowns = new Discord.Collection();
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Token, Prefix, and Owner ID
require('dotenv').config
const config = process.env

// Events
client.login(config.token) 

client.on("ready", () => {
// Check if the table "points" exists.
  const levelTable = sql.prepare("SELECT count(*) FROM sqlite_master WHERE type='table' AND name = 'levels';").get();
  if (!levelTable['count(*)']) {
    sql.prepare("CREATE TABLE levels (id TEXT PRIMARY KEY, user TEXT, guild TEXT, xp INTEGER, level INTEGER, totalXP INTEGER);").run();
  }

  client.getLevel = sql.prepare("SELECT * FROM levels WHERE user = ? AND guild = ?");
  client.setLevel = sql.prepare("INSERT OR REPLACE INTO levels (id, user, guild, xp, level, totalXP) VALUES (@id, @user, @guild, @xp, @level, @totalXP);");
// Role table for levels
  const roleTable = sql.prepare("SELECT count(*) FROM sqlite_master WHERE type='table' AND name = 'roles';").get();
  if (!roleTable['count(*)']) {
    sql.prepare("CREATE TABLE roles (guildID TEXT, roleID TEXT, level INTEGER);").run();
  }
    console.log(`${client.user.username} 開啓成功！`)
	console.clear
});

// Command Handler
const commandFiles = readdirSync(join(__dirname, "commands")).filter((file) => file.endsWith(".js"));
for (const file of commandFiles) {
  const command = require(join(__dirname, "commands", `${file}`));
  client.commands.set(command.name, command);
}

// Message Events
client.on("message", (message) => {
    if (message.author.bot) return;
    if (!message.guild) return;

    const prefixRegex = new RegExp(`^(<@!?${client.user.id}>|${escapeRegex(config.prefix)})\\s*`);
  if (!prefixRegex.test(message.content)) return;

  const [, matchedPrefix] = message.content.match(prefixRegex);

  const args = message.content.slice(matchedPrefix.length).trim().split(/ +/);
  const commandName = args.shift().toLowerCase();

  const command =
    client.commands.get(commandName) ||
    client.commands.find((cmd) => cmd.aliases && cmd.aliases.includes(commandName));

  if (!command) return;

  if (!cooldowns.has(command.name)) {
    cooldowns.set(command.name, new Discord.Collection());
  }

  const now = Date.now();
  const timestamps = cooldowns.get(command.name);
  const cooldownAmount = (command.cooldown || 1) * 1000;

  if (timestamps.has(message.author.id)) {
    const expirationTime = timestamps.get(message.author.id) + cooldownAmount;

    if (now < expirationTime) {
      const timeLeft = (expirationTime - now) / 1000;
      return message.reply(
        `你需要等待 ${timeLeft.toFixed(1)} 秒才能使用 \`${command.name}\` 指令！.`
      );
    }
  }

  timestamps.set(message.author.id, now);
  setTimeout(() => timestamps.delete(message.author.id), cooldownAmount);

  try {
    command.execute(message, args);
  } catch (error) {
    console.error(error);
    message.reply("There was an error executing that command.").catch(console.error);
  }
});

// XP Messages 
client.on("message", message => {
	if (message.author.bot) return;
        // get level and set level
        const level = client.getLevel.get(message.author.id, message.guild.id) 
        if(!level) {
          let insertLevel = sql.prepare("INSERT OR REPLACE INTO levels (id, user, guild, xp, level, totalXP) VALUES (?,?,?,?,?,?);");
          insertLevel.run(`${message.author.id}-${message.guild.id}`, message.author.id, message.guild.id, 0, 0, 0)
          return;
        }
      
        const lvl = level.level;
      // xp system
        const generatedXp = Math.floor(Math.random() * 16);
        const nextXP = level.level * 2 * 250 + 250
        // message content or characters length has to be more than 4 characters
        if(message.content.length > 4) {
            level.xp += generatedXp;
            level.totalXP += generatedXp;
            }
      
      // level up!
        if(level.xp >= nextXP) {
                level.xp = 0;
                level.level += 1;
        let embed = new Discord.MessageEmbed()
              .setAuthor(message.author.tag, message.author.displayAvatarURL({ dynamic: true }))
              .setDescription(`**恭喜** ${message.author} 剛剛升級到等級 **${level.level}** 了！`)
              .setColor("RANDOM")
              .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
              .setTimestamp();
        if (!message.guild.me.hasPermission("SEND_MESSAGES") || !message.guild.me.hasPermission("EMBED_LINKS")) {
            return message.author.send(embed);
        }
        message.channel.send(embed);
        };
      client.setLevel.run(level); 
      })
	  
	  
	  
	  