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

/*
  ROUTE MODIFIÉE : /user/add-page
  - attend un JSON identique au payload envoyé par add-page.html :
    {
      id, title, username, public (boolean),
      subpages: [
         { sub_id: 1, title: "...", content: "...", elements: [ { element_id, type, x, y, width, height, content, fontsize, color, fontfamily, zindex }, ... ] },
         ...
      ]
    }
  - insère dans pages, subpages, et elements (table Cassandra) si fournis.
*/
app.post("/user/add-page", async (req, res) => {
  // défense : vérifie body
  if (!req.body || Object.keys(req.body).length === 0) {
    console.error("Route /user/add-page appelé avec body vide. Headers:", req.headers);
    return res.status(400).json({
      message:
        "Requête sans corps reçu. Vérifiez que vous envoyez un JSON et que l'en-tête 'Content-Type: application/json' est présent.",
    });
  }

  const payload = req.body || {};
  const { id, title, username, public: isPublic = false, subpages } = payload;

  if (!id || !title || !username) {
    return res.status(400).json({ message: "Champs obligatoires manquants (id, title, username)." });
  }

  try {
    const check = await client.execute("SELECT id FROM pages WHERE id = ?", [id], { prepare: true });
    if (check.rowLength > 0) return res.status(400).json({ message: "Cet ID existe déjà." });

    const nb_subpages = Array.isArray(subpages) ? subpages.length : 0;

    // insert page (store theme may be null; unchanged)
    await client.execute(
      "INSERT INTO pages (id, title, created_at, username, nb_subpages, public, theme) VALUES (?, ?, toTimestamp(now()), ?, ?, ?, ?)",
      [id, title, username, nb_subpages, !!isPublic, null],
      { prepare: true }
    );

    // insert subpages and elements if fournis
    if (Array.isArray(subpages) && subpages.length > 0) {
      for (const sp of subpages) {
        const subId = sp.sub_id ?? null;
        const content = sp.content ?? "";
        // Insert into subpages table (same schema que précédemment).
        if (subId !== null) {
          await client.execute(
            "INSERT INTO subpages (id, sub_id, content, image) VALUES (?, ?, ?, ?)",
            [id, subId, content, null],
            { prepare: true }
          );
        }

        // si éléments fournis, on les insère dans la table elements
        if (Array.isArray(sp.elements) && sp.elements.length > 0) {
          for (const el of sp.elements) {
            // sanitize minimal fields and provide defaults
            const element_id = el.element_id ?? 0;
            const type = el.type ?? 'text';
            const x = Number(el.x) || 0;
            const y = Number(el.y) || 0;
            const width = el.width == null ? null : Number(el.width);
            const height = el.height == null ? null : Number(el.height);
            const contentEl = el.content ?? '';
            const fontsize = el.fontsize == null ? null : Number(el.fontsize);
            const color = el.color ?? null;
            const fontfamily = el.fontfamily ?? null;
            const zindex = el.zindex == null ? 0 : Number(el.zindex);

            // INSERT INTO elements (page_id text PRIMARY KEY PARTITION, sub_id, element_id, ...)
            // Primary key for table elements expected: ((page_id), sub_id, element_id)
            await client.execute(
              "INSERT INTO elements (page_id, sub_id, element_id, type, x, y, width, height, content, fontsize, color, fontfamily, zindex) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
              [id, subId, element_id, type, x, y, width, height, contentEl, fontsize, color, fontfamily, zindex],
              { prepare: true }
            );
          }
        }
      }
    }

    res.status(201).json({ message: "Page et éléments enregistrés avec succès." });

  } catch (err) {
    console.error("Erreur lors de la création de la page :", err);
    res.status(500).json({ message: "Erreur serveur." });
  }
});

// ---- le reste du serveur resté inchangé ----

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

    // récupère aussi elements pour chaque subpage (optionnel)
    // on va faire un SELECT simple sur elements WHERE page_id = ? (ALLOW FILTERING si nécessaire)
    let elementsBySub = {};
    try {
      const elRes = await client.execute(
        "SELECT page_id, sub_id, element_id, type, x, y, width, height, content, fontsize, color, fontfamily, zindex FROM elements WHERE page_id = ?",
        [id],
        { prepare: true }
      );
      for(const e of elRes.rows){
        const sid = e.sub_id || 0;
        elementsBySub[sid] = elementsBySub[sid] || [];
        elementsBySub[sid].push(e);
      }
    } catch(e){
      // si table elements absente ou requete non adaptée, on ignore proprement
      console.warn("Impossible de récupérer elements (table peut être absente) :", e.message || e);
    }

    page.subpages = subs.rows.map(s=>{
      return { ...s, elements: elementsBySub[s.sub_id] || [] };
    });

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

// ... (les autres routes admin/delete-page, delete-user, theme, etc. restent inchangées)
// Pour conserver ta base existante, je n'ai pas remplacé les autres routes — si tu veux je peux réinsérer celles que tu avais précédemment.

// ===============================
// 🚀 Lancement du serveur
// ===============================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`Serveur lancé sur http://localhost:${PORT}`)
);
