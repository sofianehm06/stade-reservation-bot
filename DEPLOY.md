# 🚀 Héberger le bot gratuitement à vie — Oracle Cloud (Always Free)

Guide pas à pas pour faire tourner le bot 24/7 sur un serveur **gratuit à vie**,
même quand ton PC est éteint.

> ⏱️ Compte ~30 min la première fois. Une fois installé, tu n'as plus rien à faire.

---

## Étape 1 — Créer un compte Oracle Cloud

1. Va sur **https://www.oracle.com/cloud/free/**
2. Clique **Start for free** et crée ton compte.
3. Une **carte bancaire** est demandée **uniquement pour vérifier ton identité**.
   👉 Les ressources "Always Free" ne sont **jamais débitées**. Choisis bien un type
   de compte qui reste sur "Always Free" (n'upgrade pas vers "Pay As You Go").
4. Choisis une **région** proche de toi (ex : Paris, Marseille, Frankfurt).

---

## Étape 2 — Créer le serveur (VM Always Free)

1. Dans le menu → **Compute** → **Instances** → **Create Instance**.
2. **Name** : `stade-bot`
3. **Image and shape** :
   - Image : **Canonical Ubuntu 22.04**
   - Shape : clique **Change shape** → **Ampere (ARM)** → `VM.Standard.A1.Flex`
     (1 OCPU / 6 Go RAM suffisent largement et restent gratuits).
     *Si l'ARM n'est pas dispo dans ta région, prends `VM.Standard.E2.1.Micro` (AMD, aussi gratuit).*
4. **Add SSH keys** : choisis **Generate a key pair for me** et
   **télécharge la clé privée** (fichier `.key`). Garde-la précieusement.
5. Clique **Create**. Attends que l'état passe à **Running**.
6. Note l'**adresse IP publique** affichée (ex : `140.238.xx.xx`).

### Ouvrir l'accès réseau
Le bot utilise le *polling* (sortant) : **aucun port entrant à ouvrir**.
Rien à configurer côté réseau. 👍

---

## Étape 3 — Se connecter au serveur (SSH)

Sur **ton PC Windows**, ouvre **PowerShell** dans le dossier où tu as téléchargé la clé, puis :

```powershell
# Remplace le nom de la clé et l'IP par les tiens
ssh -i .\ta-cle-privee.key ubuntu@140.238.xx.xx
```

> Si Windows refuse la clé pour "permissions trop ouvertes", exécute d'abord :
> `icacls .\ta-cle-privee.key /inheritance:r /grant:r "$($env:USERNAME):(R)"`

Tape `yes` à la première connexion. Tu es maintenant **sur le serveur**.

---

## Étape 4 — Installer et lancer le bot (copier-coller)

Une fois connecté au serveur, colle ce bloc **en entier** (installe Node 20, PM2, le code) :

```bash
# Node.js 20 + git
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs git

# PM2 (gestionnaire de process qui garde le bot en vie)
sudo npm install -g pm2

# Récupérer le code
git clone https://github.com/sofianehm06/stade-reservation-bot.git
cd stade-reservation-bot
npm install
```

> 🔒 Le dépôt est **privé** : git va demander ton identifiant GitHub et un
> **mot de passe = token**. Crée un token ici → https://github.com/settings/tokens
> (Generate new token → coche `repo` → copie-le et colle-le comme mot de passe).
> *Alternative plus simple : rendre le dépôt public (il ne contient aucun secret) —
> voir la note en bas.*

Puis crée le fichier de configuration `.env` sur le serveur :

```bash
nano .env
```

Colle ceci (avec **ton vrai token**), puis `Ctrl+O`, `Entrée`, `Ctrl+X` :

```
TELEGRAM_BOT_TOKEN=ton_token_ici
ADMIN_TELEGRAM_ID=1605644266
```

> Pas besoin de `DATABASE_PATH` ici : la base `reservations.db` est créée
> directement sur le serveur et **conservée** (le disque est persistant).

---

## Étape 5 — Démarrer en 24/7 avec PM2

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

La commande `pm2 startup` affiche une ligne commençant par `sudo env ...` :
**copie-la et exécute-la** pour que le bot redémarre tout seul si le serveur reboote.

### Vérifier que ça marche
```bash
pm2 logs stade-bot
```
Tu dois voir `🤖 Bot de réservation du stade démarré.` **sans** erreur 409.
Envoie `/start` à **@Stadiuum_bot** → il répond. 🎉 Et il répondra **à vie**.

---

## Commandes utiles (sur le serveur)

| Commande | Effet |
|---|---|
| `pm2 status` | Voir si le bot tourne |
| `pm2 logs stade-bot` | Voir les logs en direct |
| `pm2 restart stade-bot` | Redémarrer le bot |
| `pm2 stop stade-bot` | Arrêter le bot |

### Mettre à jour le bot après une modif du code
```bash
cd stade-reservation-bot
git pull
npm install
pm2 restart stade-bot
```

---

## ⚠️ Rappels importants

- **Une seule instance à la fois !** Quand le bot tourne sur Oracle, ne le lance
  **pas** en même temps sur ton PC (sinon erreur *409 Conflict*).
- **Régénère ton token** s'il a déjà été exposé : @BotFather → `/revoke`.
- **Sauvegarde** (optionnel) : copie de temps en temps le fichier
  `reservations.db` du serveur vers ton PC avec `scp` si tu veux une sécurité.

### Note : rendre le dépôt public (pour éviter le token GitHub)
Le code ne contient **aucun secret** (le `.env` est exclu). Si tu veux cloner sans
token, tu peux rendre le dépôt public :
`gh repo edit sofianehm06/stade-reservation-bot --visibility public`
