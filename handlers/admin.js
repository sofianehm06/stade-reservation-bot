// Fonctions réservées à l'admin (gérant du stade) :
// décision sur les demandes + commande /planning.
const db = require('../db');
const config = require('../config');
const {
  genererCreneaux,
  dateAujourdhui,
  estDateValide,
  dateLisible,
} = require('../utils');

// Vérifie si un ID Telegram est celui de l'admin.
function estAdmin(userId) {
  return userId === config.adminId;
}

// --- Décision de l'admin : confirmer ou refuser une demande ---
function traiterDecision(bot, chatId, messageId, id, decision) {
  const r = db.getReservationParId(id);
  if (!r) {
    bot.editMessageText('Réservation introuvable.', { chat_id: chatId, message_id: messageId });
    return;
  }

  // Si déjà traitée, on informe et on ne fait rien.
  if (r.statut !== 'pending') {
    bot.editMessageText(
      `ℹ️ Cette demande a déjà été traitée (statut : ${r.statut}).`,
      { chat_id: chatId, message_id: messageId }
    );
    return;
  }

  if (decision === 'confirm') {
    // Anti-conflit : refuser si un autre créneau a déjà été confirmé entre-temps.
    const active = db.getReservationActive(r.date, r.heure_debut);
    if (active && active.id !== r.id && active.statut === 'confirmed') {
      db.majStatut(id, 'rejected');
      bot.editMessageText(
        '⚠️ Ce créneau est déjà confirmé pour une autre demande. Celle-ci a été refusée.',
        { chat_id: chatId, message_id: messageId }
      );
      notifierJoueur(bot, r, 'rejected');
      return;
    }

    db.majStatut(id, 'confirmed');
    bot.editMessageText(
      `✅ Réservation #${id} confirmée (${dateLisible(r.date)} ${r.heure_debut}-${r.heure_fin}).`,
      { chat_id: chatId, message_id: messageId }
    );
    notifierJoueur(bot, r, 'confirmed');
  } else {
    db.majStatut(id, 'rejected');
    bot.editMessageText(
      `❌ Réservation #${id} refusée (${dateLisible(r.date)} ${r.heure_debut}-${r.heure_fin}).`,
      { chat_id: chatId, message_id: messageId }
    );
    notifierJoueur(bot, r, 'rejected');
  }
}

// Notifie le joueur de la décision.
function notifierJoueur(bot, r, statut) {
  const base = `📅 ${dateLisible(r.date)} · ${r.heure_debut}-${r.heure_fin}`;
  const texte =
    statut === 'confirmed'
      ? `✅ *Réservation confirmée !*\n\n${base}\n\nÀ bientôt sur le terrain ! ⚽`
      : `❌ *Réservation refusée.*\n\n${base}\n\nN'hésitez pas à choisir un autre créneau via /reserver.`;

  bot.sendMessage(r.telegram_user_id, texte, { parse_mode: 'Markdown' }).catch(() => {
    // Le joueur a peut-être bloqué le bot : on ignore silencieusement.
  });
}

// --- Commande /planning [date] réservée à l'admin ---
function handlePlanning(bot, msg, args) {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  if (!estAdmin(userId)) {
    bot.sendMessage(chatId, '⛔ Commande réservée au gérant.');
    return;
  }

  // Date optionnelle en argument, sinon aujourd'hui.
  let date = dateAujourdhui();
  if (args && args.trim()) {
    if (!estDateValide(args.trim())) {
      bot.sendMessage(chatId, 'Format de date invalide. Utilisez : /planning AAAA-MM-JJ');
      return;
    }
    date = args.trim();
  }

  const reservations = db.getReservationsDuJour(date);
  const parHeure = {};
  for (const r of reservations) parHeure[r.heure_debut] = r;

  const lignes = genererCreneaux().map((c) => {
    const r = parHeure[c.debut];
    if (!r) return `✅ ${c.debut}-${c.fin} : libre`;
    const icone = r.statut === 'confirmed' ? '❌' : '⏳';
    const mention = r.statut === 'confirmed' ? 'réservé' : 'en attente';
    return `${icone} ${c.debut}-${c.fin} : ${mention} — ${r.nom_joueur} (${r.telephone})`;
  });

  bot.sendMessage(
    chatId,
    `🗓️ *Planning du ${dateLisible(date)}*\n\n${lignes.join('\n')}`,
    { parse_mode: 'Markdown' }
  );
}

module.exports = { estAdmin, traiterDecision, handlePlanning };
