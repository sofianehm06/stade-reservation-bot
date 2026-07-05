# ⚽ Bot Telegram — Réservation du stade communal

Bot Telegram simple pour gérer les réservations de créneaux d'un stade communal.
Les joueurs réservent un créneau d'1 heure ; le gérant confirme ou refuse depuis Telegram.

- **Node.js** + [`node-telegram-bot-api`](https://github.com/yagop/node-telegram-bot-api)
- Base de données **SQLite** ([`better-sqlite3`](https://github.com/WiseLibs/better-sqlite3)) — un simple fichier, aucune installation de serveur
- Léger : déployable sur un petit VPS ou un Raspberry Pi

---

## Fonctionnalités

### Côté joueur
- `/start` — Message de bienvenue et aide
- `/reserver` — Flow interactif : choix de la date (aujourd'hui / demain / date manuelle), puis des créneaux avec leur statut (✅ libre · ⏳ en attente · ❌ réservé), puis saisie du nom et du téléphone
- `/mesreservations` — Liste de ses réservations (passées et à venir) avec leur statut
- `/annuler` — Annuler une réservation en attente ou confirmée (avec confirmation)

### Côté gérant (admin)
- Notification automatique à chaque nouvelle demande, avec boutons **✅ Confirmer** / **❌ Refuser**
- Le joueur est notifié automatiquement de la décision
- `/planning [AAAA-MM-JJ]` — Planning du jour (ou d'une date donnée) avec tous les créneaux et coordonnées des joueurs

### Anti-conflit
Un créneau déjà confirmé ou en attente ne peut pas être réservé une seconde fois.
Une vérification est faite à chaque étape (affichage, clic, insertion, confirmation admin).

---

## Installation

### 1. Créer un bot avec BotFather et récupérer le token
1. Sur Telegram, ouvrez une conversation avec [@BotFather](https://t.me/BotFather)
2. Envoyez `/newbot` et suivez les instructions (nom + identifiant du bot)
3. BotFather vous renvoie un **token** de la forme `123456789:ABCdef...` — copiez-le

### 2. Trouver votre ID Telegram (pour l'admin)
1. Sur Telegram, ouvrez [@userinfobot](https://t.me/userinfobot)
2. Envoyez n'importe quel message : il vous renvoie votre **ID numérique** (ex : `123456789`)
3. C'est cet ID que le gérant doit utiliser comme `ADMIN_TELEGRAM_ID`

### 3. Installer et configurer
```bash
# Cloner / copier le projet, puis :
npm install

# Créer le fichier de configuration à partir de l'exemple
cp .env.example .env
```

Éditez `.env` et renseignez vos valeurs :
```
TELEGRAM_BOT_TOKEN=123456789:ABCdef...
ADMIN_TELEGRAM_ID=123456789
```

### 4. Lancer le bot
```bash
npm start
```

Le fichier de base de données `reservations.db` est créé automatiquement au premier lancement.

---

## Déploiement sur un serveur (VPS / Raspberry Pi)

Pour garder le bot en fonctionnement en continu, vous pouvez utiliser [PM2](https://pm2.keymetrics.io/) :

```bash
npm install -g pm2
pm2 start bot.js --name stade-bot
pm2 save
pm2 startup   # pour relancer au démarrage de la machine
```

Le bot fonctionne en **polling** : aucune ouverture de port ni nom de domaine nécessaire.

---

## Structure du projet

```
.
├── bot.js                    # Point d'entrée : configuration + routage
├── config.js                 # Chargement/validation des variables d'environnement
├── db.js                     # Accès SQLite (table reservations + requêtes)
├── sessions.js               # État en mémoire du flow de saisie (nom/téléphone/date)
├── utils.js                  # Dates et génération des créneaux
├── handlers/
│   ├── start.js              # /start
│   ├── reserver.js           # /reserver + flow interactif
│   ├── mesreservations.js    # /mesreservations
│   ├── annuler.js            # /annuler
│   └── admin.js              # décisions admin + /planning
├── .env.example
└── package.json
```

---

## Notes techniques
- Les créneaux sont fixes : 1 heure, de 8h à 22h (modifiable dans `config.js` via `ouverture` / `fermeture`).
- L'état de saisie (nom/téléphone) est en mémoire : une réservation en cours de saisie est perdue si le bot redémarre, mais aucune réservation enregistrée n'est perdue.
- Une annulation passe le statut de la réservation à `rejected`, ce qui libère le créneau.
