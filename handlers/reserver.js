// Flow de réservation interactif : choix de la date, choix du créneau,
// puis saisie du nom et du téléphone.
const db = require('../db');
const sessions = require('../sessions');
const config = require('../config');
const {
  dateAujourdhui,
  dateDemain,
  estDateValide,
  genererCreneaux,
  dateLisible,
} = require('../utils');

// --- Étape 1 : la commande /reserver affiche le choix de la date ---
// Demande la saisie d'une date manuelle (déclenché par le bouton "Autre date…").
function demarrerDateManuelle(bot, chatId, userId) {
  sessions.definir(userId, { etape: 'date_manuelle' });
  bot.sendMessage(chatId, '✍️ Entrez la date souhaitée au format *AAAA-MM-JJ* (ex : 2026-07-10).', {
    parse_mode: 'Markdown',
  });
}

function handleReserver(bot, msg) {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, '📅 Pour quelle date souhaitez-vous réserver ?', {
    reply_markup: {
      inline_keyboard: [
        [{ text: "Aujourd'hui", callback_data: 'date:aujourdhui' }],
        [{ text: 'Demain', callback_data: 'date:demain' }],
        [{ text: 'Autre date…', callback_data: 'date:manuel' }],
      ],
    },
  });
}

// --- Étape 2 : afficher les créneaux d'une date avec leur statut ---
function afficherCreneaux(bot, chatId, date, messageId) {
  const creneaux = genererCreneaux();
  const reservations = db.getReservationsDuJour(date);

  // Index rapide : heure_debut -> statut
  const statutParHeure = {};
  for (const r of reservations) {
    statutParHeure[r.heure_debut] = r.statut;
  }

  const boutons = creneaux.map((c) => {
    const statut = statutParHeure[c.debut];
    let icone = '✅'; // libre par défaut
    let cliquable = true;
    if (statut === 'confirmed') {
      icone = '❌'; // réservé
      cliquable = false;
    } else if (statut === 'pending') {
      icone = '⏳'; // en attente
      cliquable = false;
    }

    const label = `${icone} ${c.debut} - ${c.fin}`;
    // Un créneau non cliquable renvoie vers une callback "occupé".
    const callback_data = cliquable
      ? `slot:${date}:${c.debut}`
      : `occupe`;
    return [{ text: label, callback_data }];
  });

  const texte =
    `🗓️ Créneaux du *${dateLisible(date)}* :\n\n` +
    '✅ libre · ⏳ en attente · ❌ réservé\n' +
    'Cliquez sur un créneau libre pour réserver.';

  const options = {
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: boutons },
  };

  // Si on vient d'un clic sur bouton date, on édite le message ; sinon on envoie.
  if (messageId) {
    bot.editMessageText(texte, { chat_id: chatId, message_id: messageId, ...options });
  } else {
    bot.sendMessage(chatId, texte, options);
  }
}

// --- Étape 3 : l'utilisateur a cliqué sur un créneau libre ---
function demarrerSaisie(bot, chatId, userId, date, heureDebut) {
  const creneaux = genererCreneaux();
  const creneau = creneaux.find((c) => c.debut === heureDebut);
  if (!creneau) return;

  // Vérification anti-conflit AVANT de lancer la saisie.
  const existante = db.getReservationActive(date, heureDebut);
  if (existante) {
    const msg =
      existante.statut === 'confirmed'
        ? '❌ Désolé, ce créneau vient d\'être confirmé pour un autre joueur.'
        : '⏳ Ce créneau a déjà une demande en attente. Choisissez-en un autre.';
    bot.sendMessage(chatId, msg);
    return;
  }

  // On mémorise le créneau choisi et on demande le nom.
  sessions.definir(userId, {
    etape: 'nom',
    date,
    heure_debut: creneau.debut,
    heure_fin: creneau.fin,
  });

  bot.sendMessage(
    chatId,
    `Vous réservez le *${dateLisible(date)}* de *${creneau.debut}* à *${creneau.fin}*.\n\n` +
      '👤 Quel est votre *nom* (et prénom) ?',
    { parse_mode: 'Markdown' }
  );
}

// --- Étape 4 : traitement des messages texte pour nom puis téléphone ---
// Retourne true si le message a été consommé par le flow de réservation.
function traiterMessageTexte(bot, msg) {
  const userId = msg.from.id;
  const chatId = msg.chat.id;
  const session = sessions.obtenir(userId);
  if (!session) return false;

  const texte = (msg.text || '').trim();

  if (session.etape === 'date_manuelle') {
    if (!estDateValide(texte)) {
      bot.sendMessage(chatId, 'Format invalide. Entrez la date au format AAAA-MM-JJ (ex : 2026-07-10).');
      return true;
    }
    if (texte < dateAujourdhui()) {
      bot.sendMessage(chatId, 'Cette date est déjà passée. Choisissez une date future.');
      return true;
    }
    sessions.effacer(userId);
    afficherCreneaux(bot, chatId, texte);
    return true;
  }

  if (session.etape === 'nom') {
    if (texte.length < 2) {
      bot.sendMessage(chatId, 'Merci d\'indiquer un nom valide.');
      return true;
    }
    session.nom_joueur = texte;
    session.etape = 'telephone';
    sessions.definir(userId, session);
    bot.sendMessage(chatId, '📞 Merci ! Quel est votre *numéro de téléphone* ?', {
      parse_mode: 'Markdown',
    });
    return true;
  }

  if (session.etape === 'telephone') {
    // Validation simple : au moins 6 chiffres.
    const chiffres = texte.replace(/\D/g, '');
    if (chiffres.length < 6) {
      bot.sendMessage(chatId, 'Numéro invalide. Merci d\'indiquer un numéro correct.');
      return true;
    }
    session.telephone = texte;

    // Dernière vérification anti-conflit avant insertion (course possible).
    const existante = db.getReservationActive(session.date, session.heure_debut);
    if (existante) {
      sessions.effacer(userId);
      bot.sendMessage(
        chatId,
        '❌ Désolé, ce créneau a été pris entre-temps. Relancez /reserver pour en choisir un autre.'
      );
      return true;
    }

    // Création de la réservation en base (statut pending).
    const id = db.creerReservation({
      date: session.date,
      heure_debut: session.heure_debut,
      heure_fin: session.heure_fin,
      nom_joueur: session.nom_joueur,
      telegram_user_id: userId,
      telephone: session.telephone,
    });

    sessions.effacer(userId);

    bot.sendMessage(
      chatId,
      '✅ *Demande envoyée !*\n\n' +
        `📅 ${dateLisible(session.date)}\n` +
        `🕐 ${session.heure_debut} - ${session.heure_fin}\n` +
        `👤 ${session.nom_joueur}\n\n` +
        'Le gérant va confirmer ou refuser. Vous recevrez une notification. 🔔',
      { parse_mode: 'Markdown' }
    );

    // Notification à l'admin avec boutons de décision.
    notifierAdmin(bot, id, session, userId);
    return true;
  }

  return false;
}

// Envoie la demande à l'admin avec boutons Confirmer / Refuser.
function notifierAdmin(bot, id, session, userId) {
  const texte =
    '🔔 *Nouvelle demande de réservation*\n\n' +
    `👤 Nom : ${session.nom_joueur}\n` +
    `📞 Téléphone : ${session.telephone}\n` +
    `📅 Date : ${dateLisible(session.date)}\n` +
    `🕐 Créneau : ${session.heure_debut} - ${session.heure_fin}\n` +
    `🆔 Réservation #${id}`;

  bot.sendMessage(config.adminId, texte, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [
          { text: '✅ Confirmer', callback_data: `admin:confirm:${id}` },
          { text: '❌ Refuser', callback_data: `admin:reject:${id}` },
        ],
      ],
    },
  });
}

module.exports = {
  handleReserver,
  demarrerDateManuelle,
  afficherCreneaux,
  demarrerSaisie,
  traiterMessageTexte,
};
