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
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ===============================
// 🗂️ Sélection du bundle (LOCAL vs RENDER)
// ===============================
const localBundlePath = path.join(__dirname, "astra_bundle"); // LOCAL
const renderBundlePath = "/etc/secrets/astra_bundle"; // RENDER

// auto-detection : Render > Local
const bundlePath = fs.existsSync(renderBundlePath)
  ? renderBundlePath
  : localBundlePath;

// ===============================
// 🔍 Vérification du bundle
// ===============================
if (!fs.existsSync(bundlePath)) {
  console.error(" Secure Connect Bundle introuvable :", bundlePath);
} else {
  console.log(" Secure Connect Bundle trouvé :", bundlePath);
}

// ===============================
// 🔗 Vérification des variables d'environnement
// ===============================
if (!process.env.ASTRA_CLIENT_ID || !process.env.ASTRA_CLIENT_SECRET || !process.env.ASTRA_KEYSPACE) {
  console.warn(
    " Variables d'environnement Astra manquantes (OK en local, obligatoire sur Render)."
  );
} else {
  console.log(" Variables d'environnement OK.");
}

// ===============================
// 🔗 Connexion à Astra DB
// ===============================
const client = new cassandra.Client({
  cloud: { secureConnectBundle: bundlePath },
  credentials: {
    username: process.env.ASTRA_CLIENT_ID || "local_id",
    password: process.env.ASTRA_CLIENT_SECRET || "local_secret",
  },
  keyspace: process.env.ASTRA_KEYSPACE || "local_keyspace",
});

client
  .connect()
  .then(async () => {
    console.log(" Connecté à Astra DB (ou tentative locale)");
    await ensureAdminExists();
  })
  .catch((err) => console.error(" Erreur de connexion :", err));

// ===============================
// 👑 Vérifie ou crée un compte admin
// ===============================
async function ensureAdminExists() {
  try {
    const query = "SELECT * FROM users WHERE username = 'admin'";
    const result = await client.execute(query);
    if (result.rowLength === 0) {
      const hash = await bcrypt.hash("admin123", 10);
      await client.execute(
        "INSERT INTO users (username, password, role) VALUES (?, ?, ?)",
        ["admin", hash, "admin"],
        { prepare: true }
      );
      console.log(" Compte admin créé (admin / admin123)");
    } else {
      console.log(" Compte admin déjà existant");
    }
  } catch (err) {
    console.error("Erreur lors de la vérification de l’admin :", err);
  }
}

// ===============================
// 🧍 ROUTE D'INSCRIPTION
// ===============================
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
    res.status(201).json({ message: " Page utilisateur créée avec succès." });
  } catch (err) {
    console.error("Erreur inscription :", err);
    res.status(500).json({ message: "Erreur serveur." });
  }
});

// ===============================
// 🔑 ROUTE DE CONNEXION
// ===============================
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
    if (!match) return res.status(401).json({ message: "Mot de passe incorrect." });

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

// ===============================
// 📝 ROUTE : Création de page
// ===============================
app.post("/user/add-page", async (req, res) => {
  const { id, title, username, public: isPublic, subpages } = req.body;
  if (!id || !title || !username)
    return res.status(400).json({ message: "Champs manquants." });

  try {
    const check = await client.execute("SELECT id FROM pages WHERE id = ?", [id], {
      prepare: true,
    });
    if (check.rowLength > 0)
      return res.status(400).json({ message: "Cet ID existe déjà." });

    const nb_subpages = subpages?.length || 0;

    await client.execute(
      "INSERT INTO pages (id, title, created_at, username, nb_subpages, public, subpages) VALUES (?, ?, toTimestamp(now()), ?, ?, ?, ?)",
      [id, title, username, nb_subpages, isPublic, JSON.stringify(subpages)],
      { prepare: true }
    );

    res.status(201).json({ message: " Page enregistrée avec succès." });
  } catch (err) {
    console.error("Erreur lors de la création de la page :", err);
    res.status(500).json({ message: "Erreur serveur." });
  }
});

// ===============================
// ⚙️ Récupération des pages utilisateur
// ===============================
app.get("/user/pages/:username", async (req, res) => {
  const { username } = req.params;
  try {
    const result = await client.execute(
      "SELECT * FROM pages WHERE username = ? ALLOW FILTERING",
      [username]
    );
    const pages = result.rows.map((p) => ({
      ...p,
      subpages: p.subpages ? JSON.parse(p.subpages) : [],
    }));
    res.json(pages);
  } catch (err) {
    console.error("Erreur récupération pages utilisateur :", err);
    res.status(500).json({ message: "Erreur serveur." });
  }
});

// ===============================
// 📢 ROUTE : Récupération d'une page publique par id
// ===============================
app.get("/pages/public/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await client.execute(
      "SELECT * FROM pages WHERE id = ? AND public = true",
      [id],
      { prepare: true }
    );

    if (result.rowLength === 0)
      return res.status(404).json({ message: "Page non trouvée ou non publique." });

    const page = result.rows[0];
    page.subpages = page.subpages ? JSON.parse(page.subpages) : [];
    res.json(page);
  } catch (err) {
    console.error("Erreur récupération page publique :", err);
    res.status(500).json({ message: "Erreur serveur." });
  }
});

// ===============================
// 📢 NOUVELLE ROUTE : Récupération de toutes les pages publiques
// ===============================
app.get("/pages/public", async (req, res) => {
  try {
    const result = await client.execute(
      "SELECT * FROM pages WHERE public = true ALLOW FILTERING"
    );

    const pages = result.rows.map(p => ({
      ...p,
      subpages: p.subpages ? JSON.parse(p.subpages) : [],
    }));

    res.json(pages);
  } catch (err) {
    console.error("Erreur récupération pages publiques :", err);
    res.status(500).json({ message: "Erreur serveur." });
  }
});

// ===============================
// 🚀 Lancement du serveur
// ===============================
const PORT = 3000;
app.listen(PORT, () =>
  console.log(` Serveur lancé sur http://localhost:${PORT}`)
);
