// Point d'entrée du bot Telegram de réservation du stade communal.
// Configure le bot, enregistre les commandes et route les clics sur boutons.
const TelegramBot = require('node-telegram-bot-api');
const config = require('./config');

// Handlers
const handleStart = require('./handlers/start');
const reserver = require('./handlers/reserver');
const handleMesReservations = require('./handlers/mesreservations');
const annuler = require('./handlers/annuler');
const admin = require('./handlers/admin');
const { dateAujourdhui, dateDemain } = require('./utils');

// Démarrage du bot en mode "polling" (aucune configuration serveur requise).
const bot = new TelegramBot(config.token, { polling: true });

console.log('🤖 Bot de réservation du stade démarré.');

// ---------------------------------------------------------------------------
// Commandes texte
// ---------------------------------------------------------------------------
bot.onText(/^\/start\b/, (msg) => handleStart(bot, msg));
bot.onText(/^\/reserver\b/, (msg) => reserver.handleReserver(bot, msg));
bot.onText(/^\/mesreservations\b/, (msg) => handleMesReservations(bot, msg));
bot.onText(/^\/annuler\b/, (msg) => annuler.handleAnnuler(bot, msg));
// /planning avec un argument optionnel (la date).
bot.onText(/^\/planning\b\s*(.*)/, (msg, match) => admin.handlePlanning(bot, msg, match[1]));

// ---------------------------------------------------------------------------
// Messages texte libres (saisie nom / téléphone / date manuelle)
// ---------------------------------------------------------------------------
bot.on('message', (msg) => {
  // On ignore les commandes (déjà gérées par onText) et les messages non texte.
  if (!msg.text || msg.text.startsWith('/')) return;
  reserver.traiterMessageTexte(bot, msg);
});

// ---------------------------------------------------------------------------
// Clics sur boutons inline (callback queries)
// ---------------------------------------------------------------------------
bot.on('callback_query', (query) => {
  const data = query.data || '';
  const chatId = query.message.chat.id;
  const messageId = query.message.message_id;
  const userId = query.from.id;

  // On accuse toujours réception pour retirer le "chargement" du bouton.
  bot.answerCallbackQuery(query.id).catch(() => {});

  // --- Choix de la date ---
  if (data === 'date:aujourdhui') {
    reserver.afficherCreneaux(bot, chatId, dateAujourdhui(), messageId);
    return;
  }
  if (data === 'date:demain') {
    reserver.afficherCreneaux(bot, chatId, dateDemain(), messageId);
    return;
  }
  if (data === 'date:manuel') {
    reserver.demarrerDateManuelle(bot, chatId, userId);
    return;
  }

  // --- Créneau occupé (bouton non réservable) ---
  if (data === 'occupe') {
    bot.answerCallbackQuery(query.id, {
      text: 'Ce créneau n\'est pas disponible.',
      show_alert: false,
    }).catch(() => {});
    return;
  }

  // --- Clic sur un créneau libre : slot:<date>:<heure> ---
  if (data.startsWith('slot:')) {
    // Format : slot:<date>:<HH>:<MM>. L'heure contient un ":" -> on reconstruit.
    const parts = data.split(':');
    const dateVal = parts[1];
    const heureVal = `${parts[2]}:${parts[3]}`;
    reserver.demarrerSaisie(bot, chatId, userId, dateVal, heureVal);
    return;
  }

  // --- Décision de l'admin : admin:confirm:<id> / admin:reject:<id> ---
  if (data.startsWith('admin:')) {
    if (!admin.estAdmin(userId)) {
      bot.answerCallbackQuery(query.id, { text: 'Action réservée au gérant.', show_alert: true });
      return;
    }
    const [, decision, id] = data.split(':');
    admin.traiterDecision(bot, chatId, messageId, Number(id), decision);
    return;
  }

  // --- Annulation : annuler:<id> / annuler_ok:<id> / annuler_non ---
  if (data.startsWith('annuler_ok:')) {
    const id = Number(data.split(':')[1]);
    annuler.confirmerAnnulation(bot, chatId, messageId, id, userId);
    return;
  }
  if (data === 'annuler_non') {
    bot.editMessageText('Annulation abandonnée. Votre réservation est conservée.', {
      chat_id: chatId,
      message_id: messageId,
    });
    return;
  }
  if (data.startsWith('annuler:')) {
    const id = Number(data.split(':')[1]);
    annuler.demanderConfirmation(bot, chatId, messageId, id, userId);
    return;
  }
});

// ---------------------------------------------------------------------------
// Gestion des erreurs de polling (évite les crashs sur coupure réseau).
// ---------------------------------------------------------------------------
bot.on('polling_error', (err) => {
  console.error('Erreur de polling :', err.message);
});
