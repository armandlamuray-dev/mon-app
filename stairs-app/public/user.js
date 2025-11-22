// Générer un ID aléatoire
function generateId(len = 16) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

// Échapper le HTML
function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Ajouter un bloc de sous-page
function addSubpageBlock(subId) {
  const container = document.getElementById("subpages-container");
  const div = document.createElement("div");
  div.className = "subpage";
  div.innerHTML = `
    <h4>Sous-page ${subId}</h4>
    <label class="small">Contenu</label>
    <textarea id="subContent_${subId}" rows="3" placeholder="Contenu de la sous-page ${subId}"></textarea>
  `;
  container.appendChild(div);
}

// Création d'une page principale
async function addPage() {
  const user = JSON.parse(localStorage.getItem("user"));
  if (!user?.username) { alert("Connectez-vous."); return; }

  const title = document.getElementById("title")?.value.trim();
  const isPublic = document.getElementById("publicPage")?.value === "true";

  if (!title) { 
    alert("Entrez un titre de page.");
    return;
  }

  // Sous-pages
  const subpages = [];
  document.querySelectorAll(".subpage").forEach((sub, index) => {
    const id = index + 1;
    const text = document.getElementById(`subContent_${id}`).value.trim();
    subpages.push({ sub_id: id, content: text, image: null }); // image pour l'instant = null
  });

  const payload = {
    id: generateId(),
    title,
    username: user.username,
    public: isPublic,
    subpages
  };

  try {
    const res = await fetch("/user/add-page", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok) return alert(data?.message || "Erreur serveur");

    alert(data.message || "Page créée !");
    document.getElementById("title").value = "";
    document.getElementById("subpages-container").innerHTML = "";
    addSubpageBlock(1);

    loadMyPages();

  } catch (err) {
    console.error("Erreur réseau addPage:", err);
    alert("Impossible de contacter le serveur.");
  }
}

// Afficher les pages
async function loadMyPages() {
  const user = JSON.parse(localStorage.getItem("user"));
  const container = document.getElementById("pages-list");
  if (!user || !user.username) { window.location.href = "/login.html"; return; }

  container.textContent = "Chargement...";
  try {
    const res = await fetch(`/user/pages/${encodeURIComponent(user.username)}`);
    if (!res.ok) return container.textContent = "Erreur chargement.";
    const pages = await res.json();
    if (!pages.length) { container.innerHTML = "<p>Aucune page.</p>"; return; }

    container.innerHTML = "";
    pages.forEach(p => {
      const card = document.createElement("div");
      card.className = "page-card";
      card.innerHTML = `
        <h3>${escapeHtml(p.title)}</h3>
        <p><strong>ID:</strong> ${escapeHtml(p.id)}</p>
        <p><strong>Sous-pages:</strong> ${p.nb_subpages ?? p.subpages?.length ?? "?"}</p>
        <p><strong>Public:</strong> ${p.public ? "Oui" : "Non"}</p>
      `;
      container.appendChild(card);
    });
  } catch (err) {
    console.error(err);
    container.textContent = "Erreur réseau.";
  }
}

// Initialisation
window.addEventListener("DOMContentLoaded", () => {
  const user = JSON.parse(localStorage.getItem("user"));
  if (!user || !user.username) { window.location.href = "/login.html"; return; }

  document.getElementById("welcome").textContent = `Bienvenue, ${user.username} 👋`;
  document.getElementById("createPageBtn").addEventListener("click", addPage);
  document.getElementById("addSubpageBtn").addEventListener("click", () => {
    const count = document.querySelectorAll(".subpage").length;
    addSubpageBlock(count + 1);
  });

  addSubpageBlock(1);
  loadMyPages();
});
