// database.js — Connexion Astra DB (version simple + compatible en local)

import { createClient } from "@astradb/astra-db-ts";
import path from "path";
import fs from "fs";

// Chemin du Secure Connect Bundle
const bundlePath = path.join(process.cwd(), "astra_bundle");

// Vérifie si le dossier existe
console.log("------------------------------------------------");
if (fs.existsSync(bundlePath)) {
  console.log("✅ Secure Connect Bundle trouvé :", bundlePath);
} else {
  console.log("❌ Secure Connect Bundle introuvable !");
  console.log("   Place ton dossier 'astra_bundle' dans le même répertoire que server.js");
}
console.log("------------------------------------------------");

// Lecture des variables d'environnement (pas obligatoires en local)
const applicationToken = process.env.ASTRA_DB_APPLICATION_TOKEN || "";
const apiEndpoint = process.env.ASTRA_DB_API_ENDPOINT || "";

if (!applicationToken || !apiEndpoint) {
  console.log("⚠️ Pas de variables Astra → OK en local");
  console.log("   Elles seront obligatoires pour Render.");
}

// Création du client Astra
export const astraClient = createClient({
  applicationToken,
  baseUrl: apiEndpoint,
});

// Fonction utilitaire pour récupérer une collection Astra DB
export async function getCollection(name) {
  try {
    const collection = astraClient.collection(name);
    return collection;
  } catch (err) {
    console.error("❌ Erreur de connexion :", err);
    throw err;
  }
}
