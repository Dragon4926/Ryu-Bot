const { PermissionFlagsBits } = require("discord.js");

function createAuthorization(config) {
  function isAllowed(interaction) {
    if (config.ownerIds.includes(interaction.user.id)) return true;
    if (!interaction.inGuild()) return false;
    if (interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) return true;
    const memberRoles = interaction.member?.roles;
    const hasRole = (id) => memberRoles?.cache?.has(id) || (Array.isArray(memberRoles) && memberRoles.includes(id));
    return config.allowedRoleIds.some(hasRole);
  }

  async function enforce(interaction) {
    if (isAllowed(interaction)) return true;
    await interaction.reply({
      content: "This assistant is limited to authorized members. Ask a server administrator to grant an allowed role.",
      ephemeral: true,
    });
    return false;
  }

  return { enforce, isAllowed };
}

module.exports = { createAuthorization };
