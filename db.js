// Couche d'accès à la base de données SQLite (better-sqlite3).
// Toutes les requêtes SQL sont centralisées ici pour garder les handlers propres.
const Database = require('better-sqlite3');
const path = require('path');

// Emplacement du fichier de base.
// En local : à côté du code. En production (Railway/Render) : sur un volume
// persistant défini via la variable d'environnement DATABASE_PATH
// (ex: /data/reservations.db) pour ne PAS perdre les réservations à chaque redéploiement.
const cheminDb = process.env.DATABASE_PATH || path.join(__dirname, 'reservations.db');
const db = new Database(cheminDb);

// Améliore la robustesse en cas d'accès concurrents / coupure.
db.pragma('journal_mode = WAL');

// Création de la table si elle n'existe pas encore.
db.exec(`
  CREATE TABLE IF NOT EXISTS reservations (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    date             TEXT NOT NULL,              -- format YYYY-MM-DD
    heure_debut      TEXT NOT NULL,              -- ex: "18:00"
    heure_fin        TEXT NOT NULL,              -- ex: "19:00"
    nom_joueur       TEXT NOT NULL,
    telegram_user_id INTEGER NOT NULL,
    telephone        TEXT NOT NULL,
    statut           TEXT NOT NULL DEFAULT 'pending', -- pending / confirmed / rejected
    created_at       TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

// ---- Requêtes préparées (réutilisées à chaque appel, plus performantes) ----

const stmts = {
  // Réservations actives (pending/confirmed) pour une date + heure de début donnée.
  reservationActive: db.prepare(`
    SELECT * FROM reservations
    WHERE date = ? AND heure_debut = ? AND statut IN ('pending', 'confirmed')
    ORDER BY created_at ASC
    LIMIT 1
  `),

  // Toutes les réservations actives d'une date (pour construire le planning).
  reservationsDuJour: db.prepare(`
    SELECT * FROM reservations
    WHERE date = ? AND statut IN ('pending', 'confirmed')
  `),

  insererReservation: db.prepare(`
    INSERT INTO reservations
      (date, heure_debut, heure_fin, nom_joueur, telegram_user_id, telephone, statut)
    VALUES (@date, @heure_debut, @heure_fin, @nom_joueur, @telegram_user_id, @telephone, 'pending')
  `),

  reservationParId: db.prepare('SELECT * FROM reservations WHERE id = ?'),

  majStatut: db.prepare('UPDATE reservations SET statut = ? WHERE id = ?'),

  // Réservations d'un utilisateur, les plus récentes (par date) en premier.
  reservationsUtilisateur: db.prepare(`
    SELECT * FROM reservations
    WHERE telegram_user_id = ?
    ORDER BY date DESC, heure_debut DESC
  `),

  // Réservations annulables d'un utilisateur (pending ou confirmed, à venir).
  reservationsAnnulables: db.prepare(`
    SELECT * FROM reservations
    WHERE telegram_user_id = ? AND statut IN ('pending', 'confirmed') AND date >= ?
    ORDER BY date ASC, heure_debut ASC
  `),
};

module.exports = {
  db,

  // Retourne la réservation active pour un créneau, ou undefined.
  getReservationActive(date, heureDebut) {
    return stmts.reservationActive.get(date, heureDebut);
  },

  getReservationsDuJour(date) {
    return stmts.reservationsDuJour.all(date);
  },

  // Crée une réservation en statut "pending". Retourne l'id inséré.
  creerReservation(data) {
    const info = stmts.insererReservation.run(data);
    return info.lastInsertRowid;
  },

  getReservationParId(id) {
    return stmts.reservationParId.get(id);
  },

  majStatut(id, statut) {
    return stmts.majStatut.run(statut, id);
  },

  getReservationsUtilisateur(userId) {
    return stmts.reservationsUtilisateur.all(userId);
  },

  getReservationsAnnulables(userId, dateJour) {
    return stmts.reservationsAnnulables.all(userId, dateJour);
  },
};
