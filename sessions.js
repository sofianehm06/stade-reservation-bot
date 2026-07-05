// Stockage en mémoire de l'état de conversation des utilisateurs.
// Utilisé pour le flow de réservation : après avoir cliqué sur un créneau,
// l'utilisateur doit envoyer son nom puis son téléphone via messages texte.
//
// Note : cet état est volatile (perdu au redémarrage du bot). C'est acceptable
// ici car il ne concerne qu'une saisie en cours ; les réservations sont en base.

const sessions = new Map(); // clé = telegram_user_id, valeur = objet d'état

function definir(userId, etat) {
  sessions.set(userId, etat);
}

function obtenir(userId) {
  return sessions.get(userId);
}

function effacer(userId) {
  sessions.delete(userId);
}

module.exports = { definir, obtenir, effacer };
