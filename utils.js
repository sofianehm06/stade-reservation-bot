// Fonctions utilitaires partagées : gestion des dates et des créneaux horaires.
const config = require('./config');

// Retourne la date du jour au format YYYY-MM-DD (heure locale du serveur).
function dateAujourdhui() {
  return formaterDate(new Date());
}

// Retourne la date de demain au format YYYY-MM-DD.
function dateDemain() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return formaterDate(d);
}

// Convertit un objet Date en chaîne YYYY-MM-DD.
function formaterDate(d) {
  const annee = d.getFullYear();
  const mois = String(d.getMonth() + 1).padStart(2, '0');
  const jour = String(d.getDate()).padStart(2, '0');
  return `${annee}-${mois}-${jour}`;
}

// Vérifie qu'une chaîne est une date valide au format YYYY-MM-DD.
function estDateValide(str) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) return false;
  const d = new Date(str + 'T00:00:00');
  return !Number.isNaN(d.getTime()) && formaterDate(d) === str;
}

// Génère la liste des créneaux d'1 heure entre l'ouverture et la fermeture.
// Ex: [{ debut: "08:00", fin: "09:00" }, ...]
function genererCreneaux() {
  const creneaux = [];
  for (let h = config.ouverture; h < config.fermeture; h++) {
    creneaux.push({
      debut: `${String(h).padStart(2, '0')}:00`,
      fin: `${String(h + 1).padStart(2, '0')}:00`,
    });
  }
  return creneaux;
}

// Affiche une date YYYY-MM-DD dans un format lisible (ex: "05/07/2026").
function dateLisible(str) {
  const [a, m, j] = str.split('-');
  return `${j}/${m}/${a}`;
}

module.exports = {
  dateAujourdhui,
  dateDemain,
  formaterDate,
  estDateValide,
  genererCreneaux,
  dateLisible,
};
