const {
  Client,
  GatewayIntentBits,
  Partials,
  PermissionsBitField,
  EmbedBuilder,
  ChannelType
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

const commands = new Map();
const warnings = new Map();
const afkUsers = new Map();

function add(names, fn) {
  for (const name of names.split("|")) {
    commands.set(name.toLowerCase(), fn);
  }
}

function hasPerm(message, permission) {
  if (!message.member?.permissions.has(permission)) {
    message.reply("❌ You don't have permission to use this command.");
    return false;
  }
  return true;
}

function getMember(message, input) {
  return (
    message.mentions.members.first() ||
    message.guild?.members.cache.get(input)
  );
}

function getUser(message) {
  return message.mentions.users.first() || message.author;
}

/* =========================
   BASIC
========================= */

add("help|commands|cmds", async message => {
  const names = [...commands.keys()].sort();
  const pages = [];

  for (let i = 0; i < names.length; i += 40) {
    pages.push(
      names
        .slice(i, i + 40)
        .map(x => `\`${PREFIX}${x}\``)
        .join(" • ")
    );
  }

  const embed = new EmbedBuilder()
    .setTitle("📚 Commands")
    .setDescription(pages.join("\n\n"))
    .setFooter({
      text: `${commands.size} command names • Prefix ${PREFIX}`
    });

  message.reply({ embeds: [embed] });
});

add("ping|latency", message =>
  message.reply(`🏓 Pong! **${client.ws.ping}ms**`)
);

add("uptime|runtime", message =>
  message.reply(
    `⏱️ Uptime: **${Math.floor(client.uptime / 1000)} seconds**`
  )
);

add("prefix", message =>
  message.reply(`My prefix is \`${PREFIX}\``)
);

add("botinfo|about", message => {
  const embed = new EmbedBuilder()
    .setTitle("🤖 Bot Information")
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
    );

  message.reply({ embeds: [embed] });
});

/* =========================
   MESSAGE
========================= */

add("say|echo|repeat", async (message, args) => {
  if (!hasPerm(message, PermissionsBitField.Flags.ManageMessages)) return;

  const text = args.join(" ");

  if (!text)
    return message.reply(`Usage: ${PREFIX}say <message>`);

  await message.delete().catch(() => {});
  await message.channel.send(text);
});

add("dm|pm|message", async (message, args) => {
  if (!hasPerm(message, PermissionsBitField.Flags.ManageMessages)) return;

  const target = getMember(message, args[0]);
  const text = args.slice(1).join(" ");

  if (!target || !text)
    return message.reply(`Usage: ${PREFIX}dm @user <message>`);

  try {
    await target.send(text);
    message.reply(`✅ DM sent to **${target.user.tag}**`);
  } catch {
    message.reply("❌ I couldn't DM that user.");
  }
});

add("embed|embedmsg", async (message, args) => {
  if (!hasPerm(message, PermissionsBitField.Flags.ManageMessages)) return;

  const text = args.join(" ");

  if (!text)
    return message.reply(`Usage: ${PREFIX}embed <message>`);

  await message.delete().catch(() => {});

  await message.channel.send({
    embeds: [
      new EmbedBuilder()
        .setDescription(text)
        .setTimestamp()
    ]
  });
});

add("announce|announcement", async (message, args) => {
  if (!hasPerm(message, PermissionsBitField.Flags.ManageGuild)) return;

  const text = args.join(" ");

  if (!text)
    return message.reply(`Usage: ${PREFIX}announce <message>`);

  await message.channel.send({
    content: "@everyone",
    embeds: [
      new EmbedBuilder()
        .setTitle("📢 Announcement")
        .setDescription(text)
        .setTimestamp()
    ]
  });
});

add("poll", async (message, args) => {
  const question = args.join(" ");

  if (!question)
    return message.reply(`Usage: ${PREFIX}poll <question>`);

  const poll = await message.channel.send(
    `📊 **Poll**\n\n${question}\n\n👍 Yes\n👎 No`
  );

  await poll.react("👍").catch(() => {});
  await poll.react("👎").catch(() => {});
});

/* =========================
   MODERATION
========================= */

add("clear|purge|clean|prune", async (message, args) => {
  if (!hasPerm(message, PermissionsBitField.Flags.ManageMessages)) return;

  const amount = Number(args[0]);

  if (!amount || amount < 1 || amount > 100) {
    return message.reply(`Usage: ${PREFIX}clear <1-100>`);
  }

  const deleted = await message.channel.bulkDelete(amount, true);

  const msg = await message.channel.send(
    `🧹 Deleted **${deleted.size}** messages.`
  );

  setTimeout(() => msg.delete().catch(() => {}), 3000);
});

add("ban|banuser", async (message, args) => {
  if (!hasPerm(message, PermissionsBitField.Flags.BanMembers)) return;

  const target = getMember(message, args[0]);

  if (!target)
    return message.reply(`Usage: ${PREFIX}ban @user [reason]`);

  if (!target.bannable)
    return message.reply("❌ I can't ban that member.");

  const reason =
    args.slice(1).join(" ") || "No reason provided";

  await target.ban({ reason });

  message.reply(
    `🔨 **${target.user.tag}** has been banned.\nReason: ${reason}`
  );
});

add("kick|kickuser", async (message, args) => {
  if (!hasPerm(message, PermissionsBitField.Flags.KickMembers)) return;

  const target = getMember(message, args[0]);

  if (!target)
    return message.reply(`Usage: ${PREFIX}kick @user [reason]`);

  if (!target.kickable)
    return message.reply("❌ I can't kick that member.");

  const reason =
    args.slice(1).join(" ") || "No reason provided";

  await target.kick(reason);

  message.reply(
    `👢 **${target.user.tag}** has been kicked.\nReason: ${reason}`
  );
});

add("warn|warning", async (message, args) => {
  if (!hasPerm(message, PermissionsBitField.Flags.ModerateMembers)) return;

  const target = getMember(message, args[0]);

  if (!target)
    return message.reply(`Usage: ${PREFIX}warn @user <reason>`);

  const reason =
    args.slice(1).join(" ") || "No reason provided";

  if (!warnings.has(target.id))
    warnings.set(target.id, []);

  warnings.get(target.id).push({
    reason,
    moderator: message.author.id,
    date: Date.now()
  });

  message.reply(
    `⚠️ **${target.user.tag}** has been warned.\nReason: ${reason}`
  );
});

add("warnings|warns|warninglist", message => {
  const target =
    message.mentions.members.first() || message.member;

  const list = warnings.get(target.id) || [];

  if (!list.length)
    return message.reply("✅ This user has no warnings.");

  const text = list
    .map(
      (x, i) =>
        `**${i + 1}.** ${x.reason} — <@${x.moderator}>`
    )
    .join("\n");

  message.reply({
    embeds: [
      new EmbedBuilder()
        .setTitle(`⚠️ Warnings — ${target.user.tag}`)
        .setDescription(text)
    ]
  });
});

add("mute|timeout|silence", async (message, args) => {
  if (!hasPerm(message, PermissionsBitField.Flags.ModerateMembers)) return;

  const target = getMember(message, args[0]);
  const minutes = Number(args[1]) || 10;

  if (!target)
    return message.reply(`Usage: ${PREFIX}mute @user <minutes>`);

  if (!target.moderatable)
    return message.reply("❌ I can't timeout that member.");

  await target.timeout(
    minutes * 60 * 1000,
    "Moderator timeout"
  );

  message.reply(
    `🔇 **${target.user.tag}** timed out for **${minutes} minutes**.`
  );
});

add("unmute|untimeout|unsilence", async (message, args) => {
  if (!hasPerm(message, PermissionsBitField.Flags.ModerateMembers)) return;

  const target = getMember(message, args[0]);

  if (!target)
    return message.reply(`Usage: ${PREFIX}unmute @user`);

  await target.timeout(null);

  message.reply(`🔊 Timeout removed from **${target.user.tag}**.`);
});

add("lock", async message => {
  if (!hasPerm(message, PermissionsBitField.Flags.ManageChannels)) return;

  await message.channel.permissionOverwrites.edit(
    message.guild.roles.everyone,
    { SendMessages: false }
  );

  message.reply("🔒 Channel locked.");
});

add("unlock", async message => {
  if (!hasPerm(message, PermissionsBitField.Flags.ManageChannels)) return;

  await message.channel.permissionOverwrites.edit(
    message.guild.roles.everyone,
    { SendMessages: null }
  );

  message.reply("🔓 Channel unlocked.");
});

add("slowmode|slow", async (message, args) => {
  if (!hasPerm(message, PermissionsBitField.Flags.ManageChannels)) return;

  const seconds = Number(args[0]);

  if (isNaN(seconds) || seconds < 0 || seconds > 21600)
    return message.reply(`Usage: ${PREFIX}slowmode <0-21600>`);

  await message.channel.setRateLimitPerUser(seconds);

  message.reply(`🐌 Slowmode set to **${seconds} seconds**.`);
});

add("nick|nickname|forcenick", async (message, args) => {
  if (!hasPerm(message, PermissionsBitField.Flags.ManageNicknames)) return;

  const target = getMember(message, args[0]);
  const nickname = args.slice(1).join(" ");

  if (!target)
    return message.reply(`Usage: ${PREFIX}nick @user <nickname>`);

  await target.setNickname(nickname || null);

  message.reply(`✅ Nickname updated for **${target.user.tag}**.`);
});

add("unban", async (message, args) => {
  if (!hasPerm(message, PermissionsBitField.Flags.BanMembers)) return;

  const id = args[0];

  if (!id)
    return message.reply(`Usage: ${PREFIX}unban <userID>`);

  try {
    await message.guild.members.unban(id);
    message.reply(`✅ Unbanned \`${id}\`.`);
  } catch {
    message.reply("❌ User could not be unbanned.");
  }
});

/* =========================
   SERVER
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
            value: guild.id,
            inline: true
          }
        )
    ]
  });
});

add("membercount|members|users", message =>
  message.reply(`👥 Members: **${message.guild.memberCount}**`)
);

add("rolecount|rolescount", message =>
  message.reply(
    `🎭 Roles: **${message.guild.roles.cache.size}**`
  )
);

add("channelcount|channelscount", message =>
  message.reply(
    `📁 Channels: **${message.guild.channels.cache.size}**`
  )
);

add("serverid|guildid|sid", message =>
  message.reply(`🆔 Server ID: \`${message.guild.id}\``)
);

add("owner|serverowner", async message => {
  const owner = await message.guild.fetchOwner();

  message.reply(`👑 Server owner: **${owner.user.tag}**`);
});

add("roles|rolelist", message => {
  const roles = message.guild.roles.cache
    .filter(role => role.id !== message.guild.id)
    .map(role => `• ${role.name}`)
    .slice(0, 100);

  message.reply(roles.join("\n") || "No roles.");
});

add("channels|channellist", message => {
  const channels = message.guild.channels.cache
    .map(channel => `• ${channel.name}`)
    .slice(0, 100);

  message.reply(channels.join("\n") || "No channels.");
});

add("emojis|emojilist", message => {
  const emojis = message.guild.emojis.cache
    .map(emoji => emoji.toString())
    .slice(0, 100);

  message.reply(emojis.join(" ") || "No custom emojis.");
});

/* =========================
   USER
========================= */

add("userinfo|user|whois", message => {
  const target =
    message.mentions.members.first() ||
    message.member;

  const embed = new EmbedBuilder()
    .setTitle(`👤 ${target.user.tag}`)
    .setThumbnail(target.user.displayAvatarURL())
    .addFields(
      {
        name: "ID",
        value: target.id,
        inline: true
      },
      {
        name: "Account Created",
        value: `<t:${Math.floor(
          target.user.createdTimestamp / 1000
        )}:R>`,
        inline: true
      },
      {
        name: "Joined Server",
        value: target.joinedTimestamp
          ? `<t:${Math.floor(
              target.joinedTimestamp / 1000
            )}:R>`
          : "Unknown",
        inline: true
      }
    );

  message.reply({ embeds: [embed] });
});

add("avatar|pfp|profilepic", message => {
  const user = getUser(message);

  message.reply(
    user.displayAvatarURL({
      size: 1024,
      extension: "png"
    })
  );
});

add("userid|uid", message => {
  const user = getUser(message);

  message.reply(`🆔 ID: \`${user.id}\``);
});

add("username|name", message => {
  const user = getUser(message);

  message.reply(`👤 Username: **${user.username}**`);
});

/* =========================
   ROLES
========================= */

add("addrole|giverole|roleadd", async (message, args) => {
  if (!hasPerm(message, PermissionsBitField.Flags.ManageRoles)) return;

  const target = getMember(message, args[0]);
  const role =
    message.guild.roles.cache.get(args[1]) ||
    message.guild.roles.cache.find(
      r => r.name.toLowerCase() === args.slice(1).join(" ").toLowerCase()
    );

  if (!target || !role)
    return message.reply(
      `Usage: ${PREFIX}addrole @user <role>`
    );

  if (
    role.position >=
    message.guild.members.me.roles.highest.position
  ) {
    return message.reply(
      "❌ That role is higher than my highest role."
    );
  }

  await target.roles.add(role);

  message.reply(
    `✅ Added **${role.name}** to **${target.user.tag}**.`
  );
});

add("removerole|takerole|roleRemove", async (message, args) => {
  if (!hasPerm(message, PermissionsBitField.Flags.ManageRoles)) return;

  const target = getMember(message, args[0]);
  const role =
    message.guild.roles.cache.get(args[1]) ||
    message.guild.roles.cache.find(
      r => r.name.toLowerCase() === args.slice(1).join(" ").toLowerCase()
    );

  if (!target || !role)
    return message.reply(
      `Usage: ${PREFIX}removerole @user <role>`
    );

  await target.roles.remove(role);

  message.reply(
    `✅ Removed **${role.name}** from **${target.user.tag}**.`
  );
});

add("roleinfo", (message, args) => {
  const role =
    message.guild.roles.cache.get(args[0]) ||
    message.guild.roles.cache.find(
      r => r.name.toLowerCase() === args.join(" ").toLowerCase()
    );

  if (!role)
    return message.reply(
      `Usage: ${PREFIX}roleinfo <role>`
    );

  message.reply(
    `🎭 **${role.name}**\n🆔 ${role.id}\n👥 Members: ${role.members.size}`
  );
});

/* =========================
   AFK
========================= */

add("afk", (message, args) => {
  const reason = args.join(" ") || "AFK";

  afkUsers.set(message.author.id, reason);

  message.reply(
    `💤 ${message.author} is now AFK: **${reason}**`
  );
});

add("removeafk|unafk", message => {
  afkUsers.delete(message.author.id);

  message.reply("✅ Your AFK has been removed.");
});

/* =========================
   FUN
========================= */

add("coinflip|coin|flip", message =>
  message.reply(
    Math.random() < 0.5
      ? "🪙 Heads!"
      : "🪙 Tails!"
  )
);

add("dice|roll", message => {
  const number =
    Math.floor(Math.random() * 6) + 1;

  message.reply(`🎲 You rolled **${number}**.`);
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

  const answer =
    answers[Math.floor(Math.random() * answers.length)];

  message.reply(`🎱 ${answer}`);
});

add("choose", (message, args) => {
  if (!args.length)
    return message.reply(
      `Usage: ${PREFIX}choose option1 option2`
    );

  const choice =
    args[Math.floor(Math.random() * args.length)];

  message.reply(`🎯 **${choice}**`);
});

add("reverse", (message, args) =>
  message.reply(
    args.join(" ").split("").reverse().join("")
  )
);

add("uppercase|upper", (message, args) =>
  message.reply(args.join(" ").toUpperCase() || "Nothing.")
);

add("lowercase|lower", (message, args) =>
  message.reply(args.join(" ").toLowerCase() || "Nothing.")
);

add("length", (message, args) =>
  message.reply(
    `📏 **${args.join(" ").length}** characters`
  )
);

/* =========================
   MANY UTILITY ALIASES
========================= */

const replies = {
  hello: "Hello! 👋",
  hi: "Hi! 👋",
  hey: "Hey! 👋",
  welcome: "Welcome! 🎉",
  thanks: "You're welcome! ❤️",
  thankyou: "You're welcome! ❤️",
  gg: "GG! 🎉",
  glhf: "Good luck and have fun! 🎮",
  goodmorning: "Good morning! ☀️",
  goodnight: "Good night! 🌙",
  rules: "Please read the server rules.",
  staff: "Please contact a staff member.",
  support: "Please contact support.",
  report: "Please use the server report system.",
  appeal: "Please contact server management.",
  applications: "Check the application channel.",
  application: "Check the application channel.",
  events: "Check the events channel.",
  event: "Check the events channel.",
  updates: "Check the announcements channel.",
  update: "Check the announcements channel.",
  news: "Check the announcements channel.",
  links: "Check the links channel.",
  socials: "Check the social channels.",
  website: "Check the server website.",
  verify: "Check the verification channel.",
  ticket: "Please open a ticket.",
  tickets: "Please open a ticket.",
  moderator: "Please contact a moderator.",
  admin: "Please contact an administrator.",
  ownerhelp: "Please contact the server owner.",
  online: "🟢 The bot is online.",
  status: "🟢 The bot is online.",
  botstatus: "🟢 The bot is online.",
  faq: "Check the server FAQ.",
  privacy: "Please don't share private information.",
  safety: "Please follow Discord and server rules.",
  prefixhelp: "The prefix is `,`.",
  commandhelp: "Use `,help` to see the commands.",
  modhelp: "Use `,help` to see moderation commands.",
  serverhelp: "Use `,serverinfo` for server information.",
  userhelp: "Use `,userinfo @user` for user information.",
  rolehelp: "Use `,roleinfo <role>` for role information.",
  channelhelp: "Use `,channels` for channels.",
  emojihelp: "Use `,emojis` for emojis.",
  pinghelp: "Use `,ping` for bot latency.",
  sayhelp: "Use `,say <message>`.",
  dmhelp: "Use `,dm @user <message>`.",
  embedhelp: "Use `,embed <message>`.",
  pollhelp: "Use `,poll <question>`.",
  clearhelp: "Use `,clear <amount>`.",
  purgehelp: "Use `,purge <amount>`.",
  banhelp: "Use `,ban @user [reason]`.",
  kickhelp: "Use `,kick @user [reason]`.",
  warnhelp: "Use `,warn @user <reason>`.",
  mutehelp: "Use `,mute @user <minutes>`.",
  unmutehelp: "Use `,unmute @user`.",
  lockhelp: "Use `,lock`.",
  unlockhelp: "Use `,unlock`.",
  slowmodehelp: "Use `,slowmode <seconds>`.",
  nickhelp: "Use `,nick @user <nickname>`.",
  afkhelp: "Use `,afk <reason>`.",
  coinhelp: "Use `,coinflip`.",
  dicehelp: "Use `,dice`.",
  eightballhelp: "Use `,8ball`."
};

for (const [name, response] of Object.entries(replies)) {
  add(name, message => message.reply(response));
}

/* =========================
   MESSAGE HANDLER
========================= */

client.on("messageCreate", async message => {
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

  const args = message.content
    .slice(PREFIX.length)
    .trim()
    .split(/\s+/);

  const name = args.shift()?.toLowerCase();

  if (!name) return;

  const command = commands.get(name);

  if (!command) return;

  try {
    await command(message, args);
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
