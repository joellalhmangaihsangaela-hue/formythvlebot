const {
  Client,
  GatewayIntentBits,
  Partials,
  PermissionsBitField,
  EmbedBuilder
} = require("discord.js");

const PREFIX = ",";

const TOKEN = process.env.TOKEN;

if (!TOKEN) {
  console.error("❌ TOKEN environment variable is missing!");
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ],
  partials: [Partials.Channel]
});

const commands = new Map();

function command(name, callback) {
  commands.set(name, callback);
}

function hasPerm(message, permission) {
  return message.member?.permissions.has(permission);
}

/* =========================
   BASIC
========================= */

command("ping", async (message) => {
  message.reply(`🏓 Pong! ${client.ws.ping}ms`);
});

command("help", async (message) => {
  const list = [...commands.keys()]
    .sort()
    .map(cmd => `\`${PREFIX}${cmd}\``)
    .join(" • ");

  const embed = new EmbedBuilder()
    .setTitle("Bot Commands")
    .setDescription(list)
    .setFooter({
      text: `Prefix: ${PREFIX} • ${commands.size} commands`
    });

  message.reply({ embeds: [embed] });
});

command("botinfo", async (message) => {
  const embed = new EmbedBuilder()
    .setTitle("Bot Information")
    .addFields(
      {
        name: "Bot",
        value: client.user.tag,
        inline: true
      },
      {
        name: "Servers",
        value: `${client.guilds.cache.size}`,
        inline: true
      },
      {
        name: "Commands",
        value: `${commands.size}`,
        inline: true
      }
    );

  message.reply({ embeds: [embed] });
});

/* =========================
   SAY
========================= */

command("say", async (message, args) => {
  if (!hasPerm(message, PermissionsBitField.Flags.ManageMessages)) {
    return message.reply("❌ You don't have permission to use this.");
  }

  const text = args.join(" ");

  if (!text) {
    return message.reply(`Usage: \`${PREFIX}say <message>\``);
  }

  await message.delete().catch(() => {});
  message.channel.send(text);
});

/* =========================
   DM
========================= */

command("dm", async (message, args) => {
  if (!hasPerm(message, PermissionsBitField.Flags.ManageMessages)) {
    return message.reply("❌ You don't have permission to use this.");
  }

  const member = message.mentions.members.first();

  if (!member) {
    return message.reply(
      `Usage: \`${PREFIX}dm @user <message>\``
    );
  }

  const text = args.slice(1).join(" ");

  if (!text) {
    return message.reply(
      `Usage: \`${PREFIX}dm @user <message>\``
    );
  }

  try {
    await member.send(text);
    message.reply(`✅ DM sent to ${member.user.tag}`);
  } catch {
    message.reply("❌ I couldn't DM that user.");
  }
});

/* =========================
   EMBED
========================= */

command("embed", async (message, args) => {
  if (!hasPerm(message, PermissionsBitField.Flags.ManageMessages)) {
    return message.reply("❌ You don't have permission to use this.");
  }

  const text = args.join(" ");

  if (!text) {
    return message.reply(`Usage: \`${PREFIX}embed <message>\``);
  }

  const embed = new EmbedBuilder()
    .setDescription(text);

  await message.delete().catch(() => {});

  message.channel.send({
    embeds: [embed]
  });
});

/* =========================
   CLEAR
========================= */

command("clear", async (message, args) => {
  if (!hasPerm(message, PermissionsBitField.Flags.ManageMessages)) {
    return message.reply("❌ You don't have permission to use this.");
  }

  const amount = Number(args[0]);

  if (!amount || amount < 1 || amount > 100) {
    return message.reply(
      `Usage: \`${PREFIX}clear <1-100>\``
    );
  }

  const deleted = await message.channel.bulkDelete(amount, true);

  const msg = await message.channel.send(
    `🧹 Deleted **${deleted.size}** messages.`
  );

  setTimeout(() => {
    msg.delete().catch(() => {});
  }, 3000);
});

/* =========================
   BAN
========================= */

command("ban", async (message, args) => {
  if (!hasPerm(message, PermissionsBitField.Flags.BanMembers)) {
    return message.reply("❌ You don't have permission to use this.");
  }

  const member = message.mentions.members.first();

  if (!member) {
    return message.reply(
      `Usage: \`${PREFIX}ban @user [reason]\``
    );
  }

  if (!member.bannable) {
    return message.reply("❌ I can't ban that member.");
  }

  const reason =
    args.slice(1).join(" ") || "No reason provided";

  await member.ban({ reason });

  message.reply(
    `🔨 **${member.user.tag}** has been banned.\nReason: ${reason}`
  );
});

/* =========================
   KICK
========================= */

command("kick", async (message, args) => {
  if (!hasPerm(message, PermissionsBitField.Flags.KickMembers)) {
    return message.reply("❌ You don't have permission to use this.");
  }

  const member = message.mentions.members.first();

  if (!member) {
    return message.reply(
      `Usage: \`${PREFIX}kick @user [reason]\``
    );
  }

  if (!member.kickable) {
    return message.reply("❌ I can't kick that member.");
  }

  const reason =
    args.slice(1).join(" ") || "No reason provided";

  await member.kick(reason);

  message.reply(
    `👢 **${member.user.tag}** has been kicked.\nReason: ${reason}`
  );
});

/* =========================
   WARN
========================= */

const warnings = new Map();

command("warn", async (message, args) => {
  if (!hasPerm(message, PermissionsBitField.Flags.ModerateMembers)) {
    return message.reply("❌ You don't have permission to use this.");
  }

  const member = message.mentions.members.first();

  if (!member) {
    return message.reply(
      `Usage: \`${PREFIX}warn @user <reason>\``
    );
  }

  const reason =
    args.slice(1).join(" ") || "No reason provided";

  if (!warnings.has(member.id)) {
    warnings.set(member.id, []);
  }

  warnings.get(member.id).push({
    moderator: message.author.id,
    reason,
    date: Date.now()
  });

  message.reply(
    `⚠️ **${member.user.tag}** has been warned.\nReason: ${reason}`
  );
});

command("warnings", async (message) => {
  const member =
    message.mentions.members.first() || message.member;

  const data = warnings.get(member.id) || [];

  if (!data.length) {
    return message.reply("✅ This user has no warnings.");
  }

  const text = data
    .map(
      (w, i) =>
        `**${i + 1}.** ${w.reason} — <@${w.moderator}>`
    )
    .join("\n");

  message.reply({
    embeds: [
      new EmbedBuilder()
        .setTitle(`Warnings — ${member.user.tag}`)
        .setDescription(text)
    ]
  });
});

/* =========================
   TIMEOUT
========================= */

command("mute", async (message, args) => {
  if (!hasPerm(message, PermissionsBitField.Flags.ModerateMembers)) {
    return message.reply("❌ You don't have permission to use this.");
  }

  const member = message.mentions.members.first();

  if (!member) {
    return message.reply(
      `Usage: \`${PREFIX}mute @user <minutes>\``
    );
  }

  const minutes = Number(args[1]) || 10;

  if (!member.moderatable) {
    return message.reply("❌ I can't mute that member.");
  }

  await member.timeout(
    minutes * 60 * 1000,
    "Moderator mute"
  );

  message.reply(
    `🔇 **${member.user.tag}** muted for **${minutes} minutes**.`
  );
});

command("unmute", async (message) => {
  if (!hasPerm(message, PermissionsBitField.Flags.ModerateMembers)) {
    return message.reply("❌ You don't have permission to use this.");
  }

  const member = message.mentions.members.first();

  if (!member) {
    return message.reply(`Usage: \`${PREFIX}unmute @user\``);
  }

  await member.timeout(null);

  message.reply(
    `🔊 Timeout removed from **${member.user.tag}**.`
  );
});

/* =========================
   LOCK / UNLOCK
========================= */

command("lock", async (message) => {
  if (!hasPerm(message, PermissionsBitField.Flags.ManageChannels)) {
    return message.reply("❌ You don't have permission to use this.");
  }

  await message.channel.permissionOverwrites.edit(
    message.guild.roles.everyone,
    {
      SendMessages: false
    }
  );

  message.reply("🔒 Channel locked.");
});

command("unlock", async (message) => {
  if (!hasPerm(message, PermissionsBitField.Flags.ManageChannels)) {
    return message.reply("❌ You don't have permission to use this.");
  }

  await message.channel.permissionOverwrites.edit(
    message.guild.roles.everyone,
    {
      SendMessages: null
    }
  );

  message.reply("🔓 Channel unlocked.");
});

/* =========================
   SLOWMODE
========================= */

command("slowmode", async (message, args) => {
  if (!hasPerm(message, PermissionsBitField.Flags.ManageChannels)) {
    return message.reply("❌ You don't have permission to use this.");
  }

  const seconds = Number(args[0]);

  if (
    Number.isNaN(seconds) ||
    seconds < 0 ||
    seconds > 21600
  ) {
    return message.reply(
      `Usage: \`${PREFIX}slowmode <0-21600>\``
    );
  }

  await message.channel.setRateLimitPerUser(seconds);

  message.reply(
    `🐌 Slowmode set to **${seconds} seconds**.`
  );
});

/* =========================
   NICKNAME
========================= */

command("nick", async (message, args) => {
  if (!hasPerm(message, PermissionsBitField.Flags.ManageNicknames)) {
    return message.reply("❌ You don't have permission to use this.");
  }

  const member = message.mentions.members.first();

  if (!member) {
    return message.reply(
      `Usage: \`${PREFIX}nick @user <nickname>\``
    );
  }

  const nickname = args.slice(1).join(" ");

  await member.setNickname(nickname || null);

  message.reply(
    `✅ Nickname updated for **${member.user.tag}**.`
  );
});

/* =========================
   USER INFO
========================= */

command("userinfo", async (message) => {
  const member =
    message.mentions.members.first() || message.member;

  const embed = new EmbedBuilder()
    .setTitle(member.user.tag)
    .setThumbnail(member.user.displayAvatarURL())
    .addFields(
      {
        name: "User ID",
        value: member.id,
        inline: true
      },
      {
        name: "Joined",
        value: `<t:${Math.floor(
          member.joinedTimestamp / 1000
        )}:R>`,
        inline: true
      },
      {
        name: "Account Created",
        value: `<t:${Math.floor(
          member.user.createdTimestamp / 1000
        )}:R>`,
        inline: true
      }
    );

  message.reply({ embeds: [embed] });
});

/* =========================
   SERVER INFO
========================= */

command("serverinfo", async (message) => {
  const guild = message.guild;

  const embed = new EmbedBuilder()
    .setTitle(guild.name)
    .setThumbnail(guild.iconURL())
    .addFields(
      {
        name: "Members",
        value: `${guild.memberCount}`,
        inline: true
      },
      {
        name: "Channels",
        value: `${guild.channels.cache.size}`,
        inline: true
      },
      {
        name: "Roles",
        value: `${guild.roles.cache.size}`,
        inline: true
      }
    );

  message.reply({ embeds: [embed] });
});

/* =========================
   AFK
========================= */

const afkUsers = new Map();

command("afk", async (message, args) => {
  const reason =
    args.join(" ") || "AFK";

  afkUsers.set(message.author.id, reason);

  message.reply(
    `💤 ${message.author} is now AFK: **${reason}**`
  );
});

/* =========================
   FUN
========================= */

command("coinflip", async (message) => {
  message.reply(
    Math.random() < 0.5
      ? "🪙 Heads!"
      : "🪙 Tails!"
  );
});

command("dice", async (message) => {
  const roll =
    Math.floor(Math.random() * 6) + 1;

  message.reply(`🎲 You rolled **${roll}**`);
});

command("8ball", async (message) => {
  const answers = [
    "Yes.",
    "No.",
    "Definitely.",
    "Probably.",
    "Maybe.",
    "Ask again later."
  ];

  const answer =
    answers[Math.floor(Math.random() * answers.length)];

  message.reply(`🎱 ${answer}`);
});

/* =========================
   MESSAGE HANDLER
========================= */

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  if (afkUsers.has(message.author.id)) {
    afkUsers.delete(message.author.id);

    message.reply(
      "👋 Welcome back! Your AFK has been removed."
    ).catch(() => {});
  }

  for (const user of message.mentions.users.values()) {
    if (afkUsers.has(user.id)) {
      message.reply(
        `💤 **${user.tag}** is AFK: ${afkUsers.get(user.id)}`
      ).catch(() => {});

      break;
    }
  }

  if (!message.content.startsWith(PREFIX)) return;

  const args =
    message.content
      .slice(PREFIX.length)
      .trim()
      .split(/\s+/);

  const commandName =
    args.shift()?.toLowerCase();

  if (!commandName) return;

  const cmd =
    commands.get(commandName);

  if (!cmd) return;

  try {
    await cmd(message, args);
  } catch (error) {
    console.error(error);

    message.reply(
      "❌ An error occurred while running this command."
    ).catch(() => {});
  }
});

/* =========================
   READY
========================= */

client.once("ready", () => {
  console.log("================================");
  console.log(`✅ Logged in as ${client.user.tag}`);
  console.log(`📌 Prefix: ${PREFIX}`);
  console.log(`📦 Commands loaded: ${commands.size}`);
  console.log("================================");

  client.user.setActivity(
    `${PREFIX}help`,
    { type: 0 }
  );
});

client.login(TOKEN);
