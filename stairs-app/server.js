// ===============================
// 🌱 Chargement des variables d'environnement
// ===============================
require("dotenv").config();

// ===============================
// 📦 Import des dépendances
// ===============================
const express = require("express");
const cors = require("cors");
const cassandra = require("cassandra-driver");
const bcrypt = require("bcrypt");
const path = require("path");
const fs = require("fs");

const app = express();
app.use(cors());
app.use(express.json()); // important pour JSON
app.use(express.urlencoded({ extended: true })); // pour form-urlencoded au cas où
app.use(express.static(path.join(__dirname, "public")));

// ===============================
// 🔗 Connexion à Cassandra (Render)
// ===============================
const client = new cassandra.Client({
  cloud: { secureConnectBundle: path.join(__dirname, "secure-connect-base-de-donnee-app.zip") },
  credentials: {
    username: process.env.ASTRA_CLIENT_ID,
    password: process.env.ASTRA_CLIENT_SECRET,
  },
  keyspace: process.env.ASTRA_KEYSPACE,
});

console.log("Utilisation du bundle Render Astra.");

client.connect()
  .then(async () => {
    console.log("Connecté à Cassandra");
    await ensureAdminExists();
  })
  .catch(err => console.error("Erreur de connexion :", err));

// ===============================
// 👑 Vérifie ou crée un compte admin
// ===============================
async function ensureAdminExists() {
  try {
    const result = await client.execute(
      "SELECT * FROM users WHERE username = 'admin'"
    );

    if (result.rowLength === 0) {
      const hash = await bcrypt.hash("admin123", 10);
      await client.execute(
        "INSERT INTO users (username, password, role) VALUES (?, ?, ?)",
        ["admin", hash, "admin"],
        { prepare: true }
      );
      console.log("Compte admin créé (admin / admin123)");
    } else {
      console.log("Compte admin déjà existant");
    }
  } catch (err) {
    console.error("Erreur lors de la vérification de l’admin :", err);
  }
}

// ===============================
// 🔑 ROUTES
// ===============================

// Inscription
app.post("/register", async (req, res) => {
  const { username, password, email } = req.body;
  if (!username || !password || !email)
    return res.status(400).json({ message: "Champs manquants." });

  try {
    const check = await client.execute(
      "SELECT username FROM users WHERE username = ?",
      [username],
      { prepare: true }
    );

    if (check.rowLength > 0)
      return res.status(400).json({ message: "Nom d'utilisateur déjà pris." });

    const hash = await bcrypt.hash(password, 10);
    await client.execute(
      "INSERT INTO users (username, password, role, email, created_at) VALUES (?, ?, ?, ?, toTimestamp(now()))",
      [username, hash, "user", email],
      { prepare: true }
    );

    res.status(201).json({ message: "Page utilisateur créée avec succès." });
  } catch (err) {
    console.error("Erreur inscription :", err);
    res.status(500).json({ message: "Erreur serveur." });
  }
});

// Connexion
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const result = await client.execute(
      "SELECT * FROM users WHERE username = ?",
      [username],
      { prepare: true }
    );

    if (result.rowLength === 0)
      return res.status(400).json({ message: "Utilisateur inconnu." });

    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password);

    if (!match)
      return res.status(401).json({ message: "Mot de passe incorrect." });

    res.json({
      message: "Connexion réussie.",
      username: user.username,
      role: user.role,
      email: user.email,
      created_at: user.created_at,
    });

  } catch (err) {
    console.error("Erreur connexion :", err);
    res.status(500).json({ message: "Erreur serveur." });
  }
});

// Création page
app.post("/user/add-page", async (req, res) => {
  if (!req.body || Object.keys(req.body).length === 0) {
    console.error("Route /user/add-page appelé avec body vide. Headers:", req.headers);
    return res.status(400).json({
      message:
        "Requête sans corps reçu. Vérifiez que vous envoyez un JSON et que l'en-tête 'Content-Type: application/json' est présent.",
    });
  }

  const payload = req.body || {};
  const { id, title, username, public: isPublic = false, subpages, theme } = payload;

  if (!id || !title || !username) {
    return res.status(400).json({ message: "Champs obligatoires manquants (id, title, username)." });
  }

  try {
    const check = await client.execute("SELECT id FROM pages WHERE id = ?", [id], { prepare: true });
    if (check.rowLength > 0) return res.status(400).json({ message: "Cet ID existe déjà." });

    const nb_subpages = Array.isArray(subpages) ? subpages.length : 0;

    await client.execute(
      "INSERT INTO pages (id, title, created_at, username, nb_subpages, public, theme) VALUES (?, ?, toTimestamp(now()), ?, ?, ?, ?)",
      [id, title, username, nb_subpages, !!isPublic, theme ? JSON.stringify(theme) : null],
      { prepare: true }
    );

    if (Array.isArray(subpages) && subpages.length > 0) {
      for (const sp of subpages) {
        const subId = sp.sub_id ?? null;
        const content = sp.content ?? "";
        const image = sp.image ?? null;
        if (subId === null) continue;
        await client.execute(
          "INSERT INTO subpages (id, sub_id, content, image) VALUES (?, ?, ?, ?)",
          [id, subId, content, image],
          { prepare: true }
        );
      }
    }

    res.status(201).json({ message: "Page enregistrée avec succès." });

  } catch (err) {
    console.error("Erreur lors de la création de la page :", err);
    res.status(500).json({ message: "Erreur serveur." });
  }
});

// Récupération pages utilisateur
app.get("/user/pages/:username", async (req, res) => {
  const { username } = req.params;

  try {
    const result = await client.execute(
      "SELECT id, title, created_at, username, nb_subpages, public, theme FROM pages WHERE username = ? ALLOW FILTERING",
      [username]
    );

    const pages = [];

    for (const p of result.rows) {
      const subs = await client.execute(
        "SELECT sub_id, content, image FROM subpages WHERE id = ?",
        [p.id],
        { prepare: true }
      );

      const page = { ...p, subpages: subs.rows };
      page.theme = page.theme ? JSON.parse(page.theme) : null;
      pages.push(page);
    }

    res.json(pages);

  } catch (err) {
    console.error("Erreur récupération pages utilisateur :", err);
    res.status(500).json({ message: "Erreur serveur." });
  }
});

// Page publique par ID
app.get("/pages/public/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const result = await client.execute(
      "SELECT id, title, created_at, username, nb_subpages, public, theme FROM pages WHERE id = ? AND public = true",
      [id],
      { prepare: true }
    );

    if (result.rowLength === 0)
      return res.status(404).json({ message: "Page non trouvée ou non publique." });

    const page = result.rows[0];

    const subs = await client.execute(
      "SELECT sub_id, content, image FROM subpages WHERE id = ?",
      [id],
      { prepare: true }
    );

    page.subpages = subs.rows;
    page.theme = page.theme ? JSON.parse(page.theme) : null;

    res.json(page);

  } catch (err) {
    console.error("Erreur récupération page publique :", err);
    res.status(500).json({ message: "Erreur serveur." });
  }
});

// Toutes les pages publiques
app.get("/pages/public", async (req, res) => {
  try {
    const result = await client.execute(
      "SELECT id, title, username, public, created_at, nb_subpages, theme FROM pages WHERE public = true ALLOW FILTERING"
    );

    const pages = [];

    for (const p of result.rows) {
      const subs = await client.execute(
        "SELECT sub_id, content, image FROM subpages WHERE id = ?",
        [p.id],
        { prepare: true }
      );

      const page = { ...p, subpages: subs.rows };
      page.theme = page.theme ? JSON.parse(page.theme) : null;
      pages.push(page);
    }

    res.json(pages);

  } catch (err) {
    console.error("Erreur récupération pages publiques :", err);
    res.status(500).json({ message: "Erreur serveur." });
  }
});

// 🔹 Route admin delete page publique
app.delete("/admin/delete-page/:id", async (req, res) => {
  const { id } = req.params;
  if (!id) return res.status(400).json({ message: "ID requis." });

  try {
    // vérifie que la page est publique
    const check = await client.execute(
      "SELECT id FROM pages WHERE id = ? AND public = true",
      [id],
      { prepare: true }
    );

    if (check.rowLength === 0) return res.status(404).json({ message: "Page non trouvée ou non publique." });

    await client.execute(
      "DELETE FROM pages WHERE id = ?",
      [id],
      { prepare: true }
    );

    await client.execute(
      "DELETE FROM subpages WHERE id = ?",
      [id],
      { prepare: true }
    );

    res.json({ message: "Page publique supprimée." });

  } catch (err) {
    console.error("Erreur suppression page publique :", err);
    res.status(500).json({ message: "Erreur serveur." });
  }
});


// 🔹 Route admin : supprimer un utilisateur
app.delete("/admin/delete-user/:username", async (req, res) => {
  const { username } = req.params;

  if (!username) return res.status(400).json({ message: "Username requis." });

  try {
    // Vérifie que l'utilisateur existe
    const check = await client.execute(
      "SELECT username FROM users WHERE username = ?",
      [username],
      { prepare: true }
    );

    if (check.rowLength === 0)
      return res.status(404).json({ message: "Utilisateur introuvable." });

    // Supprime ses sous-pages
    await client.execute(
      "DELETE FROMpages WHERE id IN (SELECT id FROM pages WHERE username = ?)",
      [username],
      { prepare: true }
    );

    // Supprime ses pages
    await client.execute(
      "DELETE FROM pages WHERE username = ?",
      [username],
      { prepare: true }
    );

    // Supprime l'utilisateur
    await client.execute(
      "DELETE FROM users WHERE username = ?",
      [username],
      { prepare: true }
    );

    res.json({ message: `Utilisateur '${username}' supprimé avec succès.` });

  } catch (err) {
    console.error("Erreur suppression utilisateur :", err);
    res.status(500).json({ message: "Erreur serveur." });
  }
});
// Route theme utilisateur
app.post('/user/theme', async (req, res) => {
  const { id_user, theme } = req.body || {};
  if (!id_user) return res.status(400).json({ message: "id_user manquant." });
  try {
    await client.execute(
      'UPDATE users SET theme=? WHERE username=?',
      [JSON.stringify(theme || {}), id_user],
      { prepare: true }
    );
    res.json({ success: true });
  } catch (e) {
    console.error("Erreur sauvegarde theme:", e);
    res.status(500).json({ error: e.toString() });
  }
});

app.get('/user/theme/:id', async (req, res) => {
  try {
    const result = await client.execute(
      'SELECT theme FROM users WHERE username=?',
      [req.params.id],
      { prepare: true }
    );

    if (result.rowLength === 0) return res.json({});
    res.json(JSON.parse(result.rows[0].theme || "{}"));

  } catch (e) {
    console.error("Erreur lecture theme:", e);
    res.status(500).json({ error: e.toString() });
  }
});

// ===============================
// 🚀 Lancement du serveur
// ===============================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`Serveur lancé sur http://localhost:${PORT}`)
);
