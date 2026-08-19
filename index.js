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
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildVoiceStates
  ],
  partials: [Partials.Channel]
});

/* =========================
   STORAGE
========================= */

const commands = new Map();
const warnings = new Map();
const afkUsers = new Map();
const cases = new Map();

/* =========================
   EMBEDS
========================= */

function embed(title, description) {
  return new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setTimestamp()
    .setFooter({
      text: "BestBot"
    });
}

function success(title, description) {
  return {
    embeds: [
      embed(`✅ ${title}`, description)
    ]
  };
}

function error(title, description) {
  return {
    embeds: [
      embed(`❌ ${title}`, description)
    ]
  };
}

function warning(title, description) {
  return {
    embeds: [
      embed(`⚠️ ${title}`, description)
    ]
  };
}

function info(title, description) {
  return {
    embeds: [
      embed(`ℹ️ ${title}`, description)
    ]
  };
}

/* =========================
   COMMAND SYSTEM
========================= */

function add(names, callback) {
  for (const name of names.split("|")) {
    commands.set(name.toLowerCase(), callback);
  }
}

function hasPermission(message, permission) {
  if (!message.member?.permissions.has(permission)) {
    message.reply(
      error(
        "Permission Denied",
        "You don't have permission to use this command."
      )
    );
    return false;
  }

  return true;
}

function getMember(message, value) {
  return (
    message.mentions.members.first() ||
    message.guild.members.cache.get(value)
  );
}

function getUser(message) {
  return message.mentions.users.first() || message.author;
}

function createCase(guildId, type, target, moderator, reason) {
  if (!cases.has(guildId)) {
    cases.set(guildId, []);
  }

  const list = cases.get(guildId);

  const caseData = {
    id: list.length + 1,
    type,
    target,
    moderator,
    reason,
    timestamp: Date.now()
  };

  list.push(caseData);

  return caseData;
}

/* =========================
   HELP
========================= */

add("help|commands|cmds", async message => {
  const categories = {
    "🛡️ Moderation": [
      "ban",
      "unban",
      "kick",
      "warn",
      "warnings",
      "clear",
      "mute",
      "unmute",
      "lock",
      "unlock",
      "slowmode",
      "nick"
    ],

    "👤 User": [
      "userinfo",
      "avatar",
      "userid",
      "username",
      "afk"
    ],

    "🏠 Server": [
      "serverinfo",
      "membercount",
      "roles",
      "channels",
      "emojis",
      "serverid",
      "owner"
    ],

    "🧰 Utility": [
      "say",
      "embed",
      "dm",
      "announce",
      "poll",
      "remind"
    ],

    "🎮 Fun": [
      "8ball",
      "coinflip",
      "dice",
      "choose",
      "reverse",
      "uppercase",
      "lowercase"
    ],

    "🤖 Bot": [
      "ping",
      "uptime",
      "botinfo",
      "prefix"
    ]
  };

  const pages = [];

  for (const [category, list] of Object.entries(categories)) {
    pages.push(
      `${category}\n${list
        .map(command => `\`${PREFIX}${command}\``)
        .join(" • ")}`
    );
  }

  message.reply({
    embeds: [
      new EmbedBuilder()
        .setTitle("📚 BestBot Commands")
        .setDescription(pages.join("\n\n"))
        .setFooter({
          text: `${commands.size} command names • Prefix ${PREFIX}`
        })
        .setTimestamp()
    ]
  });
});

/* =========================
   BOT
========================= */

add("ping|latency", message => {
  message.reply(
    info(
      "Pong!",
      `🏓 Bot latency: **${client.ws.ping}ms**`
    )
  );
});

add("uptime|runtime", message => {
  const seconds = Math.floor(client.uptime / 1000);

  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  message.reply(
    info(
      "Bot Uptime",
      `⏱️ **${days}d ${hours}h ${minutes}m**`
    )
  );
});

add("botinfo|about|stats", message => {
  message.reply({
    embeds: [
      new EmbedBuilder()
        .setTitle("🤖 BestBot")
        .setDescription("Professional Discord management bot.")
        .addFields(
          {
            name: "Servers",
            value: `${client.guilds.cache.size}`,
            inline: true
          },
          {
            name: "Commands",
            value: `${commands.size}`,
            inline: true
          },
          {
            name: "Prefix",
            value: PREFIX,
            inline: true
          }
        )
        .setTimestamp()
        .setFooter({ text: "BestBot" })
    ]
  });
});

add("prefix", message => {
  message.reply(
    info(
      "Prefix",
      `My prefix is \`${PREFIX}\``
    )
  );
});

/* =========================
   SAY
========================= */

add("say|echo|repeat", async (message, args) => {
  if (
    !hasPermission(
      message,
      PermissionsBitField.Flags.ManageMessages
    )
  ) return;

  const text = args.join(" ");

  if (!text) {
    return message.reply(
      error(
        "Missing Message",
        `Usage: \`${PREFIX}say <message>\``
      )
    );
  }

  await message.delete().catch(() => {});

  message.channel.send(text);
});

/* =========================
   EMBED MESSAGE
========================= */

add("embed|embedmsg", async (message, args) => {
  if (
    !hasPermission(
      message,
      PermissionsBitField.Flags.ManageMessages
    )
  ) return;

  const text = args.join(" ");

  if (!text) {
    return message.reply(
      error(
        "Missing Message",
        `Usage: \`${PREFIX}embed <message>\``
      )
    );
  }

  await message.delete().catch(() => {});

  message.channel.send({
    embeds: [
      new EmbedBuilder()
        .setDescription(text)
        .setTimestamp()
        .setFooter({ text: "BestBot" })
    ]
  });
});

/* =========================
   DM
========================= */

add("dm|pm|message", async (message, args) => {
  if (
    !hasPermission(
      message,
      PermissionsBitField.Flags.ManageMessages
    )
  ) return;

  const target = getMember(message, args[0]);
  const text = args.slice(1).join(" ");

  if (!target || !text) {
    return message.reply(
      error(
        "Invalid Usage",
        `Usage: \`${PREFIX}dm @user <message>\``
      )
    );
  }

  try {
    await target.send(text);

    message.reply(
      success(
        "DM Sent",
        `Successfully sent a DM to **${target.user.tag}**.`
      )
    );
  } catch {
    message.reply(
      error(
        "DM Failed",
        "I couldn't send a DM to that user."
      )
    );
  }
});

/* =========================
   ANNOUNCE
========================= */

add("announce|announcement", async (message, args) => {
  if (
    !hasPermission(
      message,
      PermissionsBitField.Flags.ManageGuild
    )
  ) return;

  const text = args.join(" ");

  if (!text) {
    return message.reply(
      error(
        "Missing Announcement",
        `Usage: \`${PREFIX}announce <message>\``
      )
    );
  }

  message.channel.send({
    embeds: [
      new EmbedBuilder()
        .setTitle("📢 Announcement")
        .setDescription(text)
        .setTimestamp()
        .setFooter({
          text: `Announced by ${message.author.tag}`
        })
    ]
  });
});

/* =========================
   POLL
========================= */

add("poll", async (message, args) => {
  const question = args.join(" ");

  if (!question) {
    return message.reply(
      error(
        "Missing Question",
        `Usage: \`${PREFIX}poll <question>\``
      )
    );
  }

  const poll = await message.channel.send({
    embeds: [
      new EmbedBuilder()
        .setTitle("📊 Poll")
        .setDescription(question)
        .setFooter({
          text: `Poll by ${message.author.tag}`
        })
        .setTimestamp()
    ]
  });

  await poll.react("👍").catch(() => {});
  await poll.react("👎").catch(() => {});
});

/* =========================
   CLEAR
========================= */

add("clear|purge|clean|prune", async (message, args) => {
  if (
    !hasPermission(
      message,
      PermissionsBitField.Flags.ManageMessages
    )
  ) return;

  const amount = Number(args[0]);

  if (!amount || amount < 1 || amount > 100) {
    return message.reply(
      error(
        "Invalid Amount",
        `Use a number between **1 and 100**.\n\nExample: \`${PREFIX}clear 25\``
      )
    );
  }

  const deleted = await message.channel.bulkDelete(
    amount,
    true
  );

  message.channel.send(
    success(
      "Messages Cleared",
      `🧹 Successfully deleted **${deleted.size}** messages.`
    )
  );
});

/* =========================
   BAN
========================= */

add("ban|banuser", async (message, args) => {
  if (
    !hasPermission(
      message,
      PermissionsBitField.Flags.BanMembers
    )
  ) return;

  const target = getMember(message, args[0]);

  if (!target) {
    return message.reply(
      error(
        "User Not Found",
        `Usage: \`${PREFIX}ban @user [reason]\``
      )
    );
  }

  if (!target.bannable) {
    return message.reply(
      error(
        "Cannot Ban",
        "I cannot ban that member. Check my role position and permissions."
      )
    );
  }

  const reason =
    args.slice(1).join(" ") ||
    "No reason provided";

  const caseData = createCase(
    message.guild.id,
    "BAN",
    target.id,
    message.author.id,
    reason
  );

  try {
    await target.send({
      embeds: [
        new EmbedBuilder()
          .setTitle("🔨 You were banned")
          .setDescription(
            `You have been banned from **${message.guild.name}**.`
          )
          .addFields({
            name: "Reason",
            value: reason
          })
          .setTimestamp()
      ]
    });
  } catch {}

  await target.ban({ reason });

  message.channel.send(
    success(
      "Member Banned",
      `**User:** ${target.user.tag}\n**Moderator:** ${message.author}\n**Reason:** ${reason}\n**Case:** \`#${caseData.id}\``
    )
  );
});

/* =========================
   KICK
========================= */

add("kick|kickuser", async (message, args) => {
  if (
    !hasPermission(
      message,
      PermissionsBitField.Flags.KickMembers
    )
  ) return;

  const target = getMember(message, args[0]);

  if (!target) {
    return message.reply(
      error(
        "User Not Found",
        `Usage: \`${PREFIX}kick @user [reason]\``
      )
    );
  }

  if (!target.kickable) {
    return message.reply(
      error(
        "Cannot Kick",
        "I cannot kick that member."
      )
    );
  }

  const reason =
    args.slice(1).join(" ") ||
    "No reason provided";

  const caseData = createCase(
    message.guild.id,
    "KICK",
    target.id,
    message.author.id,
    reason
  );

  await target.kick(reason);

  message.channel.send(
    success(
      "Member Kicked",
      `**User:** ${target.user.tag}\n**Moderator:** ${message.author}\n**Reason:** ${reason}\n**Case:** \`#${caseData.id}\``
    )
  );
});

/* =========================
   WARN
========================= */

add("warn|warning", async (message, args) => {
  if (
    !hasPermission(
      message,
      PermissionsBitField.Flags.ModerateMembers
    )
  ) return;

  const target = getMember(message, args[0]);

  if (!target) {
    return message.reply(
      error(
        "User Not Found",
        `Usage: \`${PREFIX}warn @user <reason>\``
      )
    );
  }

  const reason =
    args.slice(1).join(" ") ||
    "No reason provided";

  if (!warnings.has(message.guild.id)) {
    warnings.set(message.guild.id, new Map());
  }

  const guildWarnings = warnings.get(message.guild.id);

  if (!guildWarnings.has(target.id)) {
    guildWarnings.set(target.id, []);
  }

  const caseData = createCase(
    message.guild.id,
    "WARN",
    target.id,
    message.author.id,
    reason
  );

  guildWarnings.get(target.id).push({
    reason,
    moderator: message.author.id,
    case: caseData.id,
    timestamp: Date.now()
  });

  try {
    await target.send({
      embeds: [
        new EmbedBuilder()
          .setTitle("⚠️ You received a warning")
          .setDescription(
            `You were warned in **${message.guild.name}**.`
          )
          .addFields({
            name: "Reason",
            value: reason
          })
          .setTimestamp()
      ]
    });
  } catch {}

  message.channel.send(
    warning(
      "Member Warned",
      `**User:** ${target.user}\n**Moderator:** ${message.author}\n**Reason:** ${reason}\n**Case:** \`#${caseData.id}\``
    )
  );
});

/* =========================
   WARNINGS
========================= */

add("warnings|warns|warninglist", message => {
  const target =
    message.mentions.members.first() ||
    message.member;

  const guildWarnings =
    warnings.get(message.guild.id);

  const list =
    guildWarnings?.get(target.id) || [];

  if (!list.length) {
    return message.reply(
      success(
        "No Warnings",
        `**${target.user.tag}** has no warnings.`
      )
    );
  }

  const description = list
    .map(
      (warning, index) =>
        `**#${index + 1}** • ${warning.reason}\nModerator: <@${warning.moderator}> • Case: \`#${warning.case}\``
    )
    .join("\n\n");

  message.reply({
    embeds: [
      new EmbedBuilder()
        .setTitle(`⚠️ Warnings — ${target.user.tag}`)
        .setDescription(description)
        .setTimestamp()
        .setFooter({ text: "BestBot Moderation" })
    ]
  });
});

/* =========================
   MUTE
========================= */

add("mute|timeout|silence", async (message, args) => {
  if (
    !hasPermission(
      message,
      PermissionsBitField.Flags.ModerateMembers
    )
  ) return;

  const target = getMember(message, args[0]);
  const minutes = Number(args[1]) || 10;

  if (!target) {
    return message.reply(
      error(
        "User Not Found",
        `Usage: \`${PREFIX}mute @user <minutes>\``
      )
    );
  }

  if (!target.moderatable) {
    return message.reply(
      error(
        "Cannot Timeout",
        "I cannot timeout that member."
      )
    );
  }

  const reason =
    args.slice(2).join(" ") ||
    "No reason provided";

  const caseData = createCase(
    message.guild.id,
    "TIMEOUT",
    target.id,
    message.author.id,
    reason
  );

  await target.timeout(
    minutes * 60 * 1000,
    reason
  );

  message.channel.send(
    warning(
      "Member Timed Out",
      `**User:** ${target.user}\n**Duration:** ${minutes} minutes\n**Moderator:** ${message.author}\n**Reason:** ${reason}\n**Case:** \`#${caseData.id}\``
    )
  );
});

/* =========================
   UNMUTE
========================= */

add("unmute|untimeout", async (message, args) => {
  if (
    !hasPermission(
      message,
      PermissionsBitField.Flags.ModerateMembers
    )
  ) return;

  const target = getMember(message, args[0]);

  if (!target) {
    return message.reply(
      error(
        "User Not Found",
        `Usage: \`${PREFIX}unmute @user\``
      )
    );
  }

  await target.timeout(null);

  message.channel.send(
    success(
      "Timeout Removed",
      `Timeout removed from **${target.user.tag}**.\nModerator: ${message.author}`
    )
  );
});

/* =========================
   LOCK
========================= */

add("lock", async message => {
  if (
    !hasPermission(
      message,
      PermissionsBitField.Flags.ManageChannels
    )
  ) return;

  await message.channel.permissionOverwrites.edit(
    message.guild.roles.everyone,
    {
      SendMessages: false
    }
  );

  message.channel.send(
    success(
      "Channel Locked",
      `${message.channel} has been locked by ${message.author}.`
    )
  );
});

add("unlock", async message => {
  if (
    !hasPermission(
      message,
      PermissionsBitField.Flags.ManageChannels
    )
  ) return;

  await message.channel.permissionOverwrites.edit(
    message.guild.roles.everyone,
    {
      SendMessages: null
    }
  );

  message.channel.send(
    success(
      "Channel Unlocked",
      `${message.channel} has been unlocked by ${message.author}.`
    )
  );
});

/* =========================
   SLOWMODE
========================= */

add("slowmode|slow", async (message, args) => {
  if (
    !hasPermission(
      message,
      PermissionsBitField.Flags.ManageChannels
    )
  ) return;

  const seconds = Number(args[0]);

  if (
    isNaN(seconds) ||
    seconds < 0 ||
    seconds > 21600
  ) {
    return message.reply(
      error(
        "Invalid Slowmode",
        `Choose a value from **0 to 21600 seconds**.`
      )
    );
  }

  await message.channel.setRateLimitPerUser(seconds);

  message.channel.send(
    success(
      "Slowmode Updated",
      `Slowmode is now **${seconds} seconds**.`
    )
  );
});

/* =========================
   NICKNAME
========================= */

add("nick|nickname|forcenick", async (message, args) => {
  if (
    !hasPermission(
      message,
      PermissionsBitField.Flags.ManageNicknames
    )
  ) return;

  const target = getMember(message, args[0]);
  const nickname = args.slice(1).join(" ");

  if (!target) {
    return message.reply(
      error(
        "User Not Found",
        `Usage: \`${PREFIX}nick @user <nickname>\``
      )
    );
  }

  await target.setNickname(
    nickname || null
  );

  message.channel.send(
    success(
      "Nickname Updated",
      `Nickname updated for **${target.user.tag}**.`
    )
  );
});

/* =========================
   USER INFO
========================= */

add("userinfo|user|whois", message => {
  const target =
    message.mentions.members.first() ||
    message.member;

  const embedMessage = new EmbedBuilder()
    .setTitle(`👤 ${target.user.tag}`)
    .setThumbnail(target.user.displayAvatarURL())
    .addFields(
      {
        name: "User ID",
        value: `\`${target.id}\``,
        inline: true
      },
      {
        name: "Created",
        value: `<t:${Math.floor(
          target.user.createdTimestamp / 1000
        )}:R>`,
        inline: true
      },
      {
        name: "Joined",
        value: target.joinedTimestamp
          ? `<t:${Math.floor(
              target.joinedTimestamp / 1000
            )}:R>`
          : "Unknown",
        inline: true
      },
      {
        name: "Bot",
        value: target.user.bot ? "Yes" : "No",
        inline: true
      }
    )
    .setTimestamp()
    .setFooter({ text: "BestBot User Information" });

  message.reply({
    embeds: [embedMessage]
  });
});

add("avatar|pfp|profilepic", message => {
  const user = getUser(message);

  message.reply({
    embeds: [
      new EmbedBuilder()
        .setTitle(`🖼️ ${user.tag}'s Avatar`)
        .setImage(
          user.displayAvatarURL({
            size: 1024
          })
        )
        .setTimestamp()
    ]
  });
});

add("userid|uid", message => {
  const user = getUser(message);

  message.reply(
    info(
      "User ID",
      `**${user.tag}**\n\`${user.id}\``
    )
  );
});

/* =========================
   SERVER INFO
========================= */

add("serverinfo|guildinfo|server", message => {
  const guild = message.guild;

  message.reply({
    embeds: [
      new EmbedBuilder()
        .setTitle(`🏠 ${guild.name}`)
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
          },
          {
            name: "Owner",
            value: `<@${guild.ownerId}>`,
            inline: true
          },
          {
            name: "Server ID",
            value: `\`${guild.id}\``,
            inline: true
          }
        )
        .setTimestamp()
        .setFooter({ text: "BestBot Server Information" })
    ]
  });
});

add("membercount|members", message => {
  message.reply(
    info(
      "Member Count",
      `This server has **${message.guild.memberCount} members**.`
    )
  );
});

add("serverid|guildid", message => {
  message.reply(
    info(
      "Server ID",
      `\`${message.guild.id}\``
    )
  );
});

add("owner|serverowner", async message => {
  const owner = await message.guild.fetchOwner();

  message.reply(
    info(
      "Server Owner",
      `👑 ${owner.user.tag}`
    )
  );
});

/* =========================
   AFK
========================= */

add("afk", (message, args) => {
  const reason =
    args.join(" ") || "AFK";

  afkUsers.set(
    message.author.id,
    reason
  );

  message.reply(
    success(
      "AFK Enabled",
      `${message.author} is now AFK.\n**Reason:** ${reason}`
    )
  );
});

add("unafk|removeafk", message => {
  afkUsers.delete(message.author.id);

  message.reply(
    success(
      "AFK Removed",
      "Your AFK status has been removed."
    )
  );
});

/* =========================
   FUN
========================= */

add("coinflip|coin|flip", message => {
  const result =
    Math.random() < 0.5
      ? "Heads"
      : "Tails";

  message.reply(
    info(
      "Coin Flip",
      `🪙 **${result}**`
    )
  );
});

add("dice|roll", message => {
  const result =
    Math.floor(Math.random() * 6) + 1;

  message.reply(
    info(
      "Dice Roll",
      `🎲 You rolled **${result}**.`
    )
  );
});

add("8ball|eightball", message => {
  const answers = [
    "Yes.",
    "No.",
    "Definitely.",
    "Probably.",
    "Maybe.",
    "Absolutely.",
    "Ask again later.",
    "I don't know."
  ];

  const result =
    answers[
      Math.floor(
        Math.random() * answers.length
      )
    ];

  message.reply(
    info(
      "Magic 8-Ball",
      `🎱 ${result}`
    )
  );
});

add("choose", (message, args) => {
  if (args.length < 2) {
    return message.reply(
      error(
        "Not Enough Options",
        `Usage: \`${PREFIX}choose option1 option2\``
      )
    );
  }

  const choice =
    args[
      Math.floor(
        Math.random() * args.length
      )
    ];

  message.reply(
    info(
      "Choice",
      `🎯 I choose **${choice}**.`
    )
  );
});

add("reverse", (message, args) => {
  const text = args.join(" ");

  if (!text) {
    return message.reply(
      error(
        "Missing Text",
        `Usage: \`${PREFIX}reverse <text>\``
      )
    );
  }

  message.reply(text.split("").reverse().join(""));
});

add("uppercase|upper", (message, args) => {
  const text = args.join(" ");

  if (!text) {
    return message.reply(
      error(
        "Missing Text",
        `Usage: \`${PREFIX}uppercase <text>\``
      )
    );
  }

  message.reply(text.toUpperCase());
});

add("lowercase|lower", (message, args) => {
  const text = args.join(" ");

  if (!text) {
    return message.reply(
      error(
        "Missing Text",
        `Usage: \`${PREFIX}lowercase <text>\``
      )
    );
  }

  message.reply(text.toLowerCase());
});

/* =========================
   ROLE MANAGEMENT
========================= */

add("addrole|giverole", async (message, args) => {
  if (
    !hasPermission(
      message,
      PermissionsBitField.Flags.ManageRoles
    )
  ) return;

  const target =
    getMember(message, args[0]);

  const role =
    message.guild.roles.cache.get(args[1]);

  if (!target || !role) {
    return message.reply(
      error(
        "Invalid Usage",
        `Usage: \`${PREFIX}addrole @user <roleID>\``
      )
    );
  }

  if (
    role.position >=
    message.guild.members.me.roles.highest.position
  ) {
    return message.reply(
      error(
        "Role Too High",
        "That role is higher than my highest role."
      )
    );
  }

  await target.roles.add(role);

  message.channel.send(
    success(
      "Role Added",
      `Added **${role.name}** to ${target}.`
    )
  );
});

add("removerole|takerole", async (message, args) => {
  if (
    !hasPermission(
      message,
      PermissionsBitField.Flags.ManageRoles
    )
  ) return;

  const target =
    getMember(message, args[0]);

  const role =
    message.guild.roles.cache.get(args[1]);

  if (!target || !role) {
    return message.reply(
      error(
        "Invalid Usage",
        `Usage: \`${PREFIX}removerole @user <roleID>\``
      )
    );
  }

  await target.roles.remove(role);

  message.channel.send(
    success(
      "Role Removed",
      `Removed **${role.name}** from ${target}.`
    )
  );
});

/* =========================
   MESSAGE EVENTS
========================= */

client.on("messageCreate", async message => {
  if (message.author.bot) return;

  if (afkUsers.has(message.author.id)) {
    afkUsers.delete(message.author.id);

    message.reply(
      success(
        "Welcome Back",
        "Your AFK status has been removed."
      )
    ).catch(() => {});
  }

  for (const user of message.mentions.users.values()) {
    if (afkUsers.has(user.id)) {
      message.reply(
        info(
          "User is AFK",
          `💤 **${user.tag}** is AFK.\n**Reason:** ${afkUsers.get(user.id)}`
        )
      ).catch(() => {});

      break;
    }
  }

  if (!message.content.startsWith(PREFIX))
    return;

  const args = message.content
    .slice(PREFIX.length)
    .trim()
    .split(/\s+/);

  const commandName =
    args.shift()?.toLowerCase();

  if (!commandName) return;

  const command =
    commands.get(commandName);

  if (!command) {
    return message.reply(
      error(
        "Unknown Command",
        `I don't recognize \`${PREFIX}${commandName}\`.\nUse \`${PREFIX}help\` to view available commands.`
      )
    );
  }

  try {
    await command(message, args);
  } catch (err) {
    console.error(err);

    message.reply(
      error(
        "Command Error",
        "Something went wrong while running that command."
      )
    ).catch(() => {});
  }
});

/* =========================
   READY
========================= */

client.once("ready", () => {
  console.log("=================================");
  console.log(`✅ Logged in as ${client.user.tag}`);
  console.log(`📌 Prefix: ${PREFIX}`);
  console.log(`📦 Commands loaded: ${commands.size}`);
  console.log("=================================");

  client.user.setActivity(
    `${PREFIX}help`,
    { type: 0 }
  );
});

client.login(TOKEN);
