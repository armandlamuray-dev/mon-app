// ===============================
// 📦 Import des dépendances
// ===============================
const express = require("express");
const cors = require("cors");
const cassandra = require("cassandra-driver");
const bcrypt = require("bcrypt");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ===============================
// 🔗 Connexion à Astra DB
// ===============================
const client = new cassandra.Client({
  cloud: { secureConnectBundle: "./secure-connect-base-de-donnee-app.zip" },
  credentials: {
    username: "RDyqPHaRPAIgkkXxQZrvMBpD",
    password:
      "BIyqJ,,7.Hb44pc-sJFDU1E,mstvcB5P,vzmv6jkAm0SKyPjoeRpnEzTv8ToI+Ato,nPz7CK9hbJ6l6RJBK.pkJGdWu,cmtPZ9I,fvOMBcdcB4mls_mWWQAW+ELnMmHv",
  },
  keyspace: "appdata",
});

client
  .connect()
  .then(async () => {
    console.log("✅ Connecté à Astra DB");
    await ensureAdminExists();
  })
  .catch((err) => console.error("❌ Erreur de connexion :", err));

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
      console.log("👑 Compte admin créé (admin / admin123)");
    } else {
      console.log("👑 Compte admin déjà existant");
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
    return res.status(400).json({ message: "Nom d'utilisateur, mot de passe ou email manquant." });

  try {
    // Vérifie si l'utilisateur existe déjà
    const check = await client.execute(
      "SELECT username FROM users WHERE username = ?",
      [username],
      { prepare: true }
    );
    if (check.rowLength > 0)
      return res.status(400).json({ message: "Ce nom d'utilisateur existe déjà." });

    const hash = await bcrypt.hash(password, 10);
    const createdAt = new Date();

    await client.execute(
      "INSERT INTO users (username, password, role, email, created_at) VALUES (?, ?, ?, ?, ?)",
      [username, hash, "user", email, createdAt],
      { prepare: true }
    );

    res.status(201).json({ message: "Utilisateur créé avec succès." });
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

    if (!match)
      return res.status(401).json({ message: "Mot de passe incorrect." });

    res.json({ message: "Connexion réussie.", username: user.username, role: user.role,email: user.email, created_at: user.created_at  });
  } catch (err) {
    console.error("Erreur connexion :", err);
    res.status(500).json({ message: "Erreur serveur." });
  }
});

// ===============================
// 📝 ROUTE : Création de page
// ===============================
app.post("/user/add-page", async (req, res) => {
  console.log("POST /user/add-page body:", req.body);
  const { slug, title, content, image, public: isPublic, username } = req.body;

  if (!slug || !title || !content || !username)
    return res.status(400).json({ message: "Champs manquants." });

  try {
    const check = await client.execute(
      "SELECT slug FROM pages WHERE slug = ?",
      [slug],
      { prepare: true }
    );
    if (check.rowLength > 0)
      return res.status(400).json({ message: "Ce slug existe déjà." });

    await client.execute(
      "INSERT INTO pages (slug, title, content, image, id_user, public) VALUES (?, ?, ?, ?, ?, ?)",
      [slug, title, content, image, username, isPublic],
      { prepare: true }
    );

    res.status(201).json({ message: "✅ Page enregistrée avec succès." });
  } catch (err) {
    console.error("Erreur lors de la création de la page :", err);
    res.status(500).json({ message: "Erreur serveur." });
  }
});

// 🔹 Récupérer toutes les pages d’un utilisateur
app.get("/user/pages/:username", async (req, res) => {
  const { username } = req.params;
  try {
    const result = await client.execute(
      "SELECT * FROM pages WHERE id_user = ? ALLOW FILTERING",
      [username]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Erreur récupération pages utilisateur :", err);
    res.status(500).json({ message: "Erreur serveur." });
  }
});

// 🔹 Récupérer toutes les pages (admin)
app.get("/admin/pages", async (req, res) => {
  try {
    const result = await client.execute("SELECT * FROM pages");
    res.json(result.rows);
  } catch (err) {
    console.error("Erreur récupération pages admin :", err);
    res.status(500).json({ message: "Erreur serveur." });
  }
});

// 🔹 Supprimer une page (admin)
app.delete("/admin/delete-page/:slug", async (req, res) => {
  try {
    await client.execute("DELETE FROM pages WHERE slug = ?", [req.params.slug], { prepare: true });
    res.send("Page supprimée avec succès.");
  } catch (err) {
    console.error("Erreur suppression page :", err);
    res.status(500).send("Erreur serveur.");
  }
});

// ===============================
// ⚙️ ROUTES PAGES PUBLIQUES
// ===============================
app.get("/pages/public", async (req, res) => {
  const username = req.query.username;
  try {
    let query = "SELECT * FROM pages WHERE public = true";
    let params = [];
    if (username) {
      query += " AND id_user = ?";
      params.push(username);
    }
    query += " ALLOW FILTERING";

    const result = await client.execute(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur." });
  }
});


app.get("/pages/public/:slug", async (req, res) => {
  try {
    const result = await client.execute(
      "SELECT * FROM pages WHERE slug = ? AND public = true",
      [req.params.slug],
      { prepare: true }
    );

    if (result.rowLength === 0)
      return res.status(404).json({ message: "Page publique introuvable." });

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur." });
  }
});

// 🔹 Récupérer les détails d'une page pour l'admin
app.get("/admin/page/:slug", async (req, res) => {
  try {
    const result = await client.execute(
      "SELECT * FROM pages WHERE slug = ?",
      [req.params.slug],
      { prepare: true }
    );
    if (result.rowLength === 0) return res.status(404).json({ message: "Page introuvable." });
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Erreur récupération page admin :", err);
    res.status(500).json({ message: "Erreur serveur." });
  }
});

// 🔹 Récupérer les détails d'un utilisateur pour l'admin
app.get("/admin/user/:username", async (req, res) => {
  try {
    const result = await client.execute(
      "SELECT username, role FROM users WHERE username = ?",
      [req.params.username],
      { prepare: true }
    );
    if (result.rowLength === 0) return res.status(404).json({ message: "Utilisateur introuvable." });
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Erreur récupération utilisateur admin :", err);
    res.status(500).json({ message: "Erreur serveur." });
  }
});


// ===============================
// 🚀 Lancement du serveur
// ===============================
const PORT = 3000;
app.listen(PORT, () => console.log(`🚀 Serveur lancé sur http://localhost:${PORT}`));
