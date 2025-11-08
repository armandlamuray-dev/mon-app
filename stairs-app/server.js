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
    username: "TON_USERNAME",
    password: "TON_PASSWORD",
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
      const createdAt = new Date();
      await client.execute(
        "INSERT INTO users (username, password, role, email, created_at) VALUES (?, ?, ?, ?, ?)",
        ["admin", hash, "admin", "admin@example.com", createdAt],
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

    // ✅ Insère l'utilisateur avec email et date de création
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

// 🔑 ROUTE DE CONNEXION
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
      created_at: user.created_at
    });
  } catch (err) {
    console.error("Erreur connexion :", err);
    res.status(500).json({ message: "Erreur serveur." });
  }
});

// 🚀 Lancement du serveur
const PORT = 3000;
app.listen(PORT, () => console.log(`🚀 Serveur lancé sur http://localhost:${PORT}`));
