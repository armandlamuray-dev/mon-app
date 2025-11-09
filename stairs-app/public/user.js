// utilitaires
function generateId(len = 16) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let s = "";
  for (let i = 0; i < len; i++) s += chars.charAt(Math.floor(Math.random() * chars.length));
  return s;
}

function escapeHtml(str) {
  if (!str && str !== 0) return "";
  return String(str).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

// Créer une page (groupe) + première sous-page
async function addPage() {
  const user = JSON.parse(localStorage.getItem("user"));
  if (!user || !user.username) { alert("Vous devez être connecté."); window.location.href = "/login.html"; return; }

  const title = document.getElementById("title").value.trim();
  const nbSub = parseInt(document.getElementById("nbSubpages").value) || 1;
  const isPublic = document.getElementById("publicPage").value === "true";
  const firstContent = document.getElementById("firstContent").value.trim();
  const firstImage = document.getElementById("firstImage").value.trim();

  if (!title) return alert("Veuillez saisir un titre.");
  if (!firstContent) return alert("Veuillez saisir le contenu de la première sous-page.");

  // génère id et payload conforme au server.js
  const id = generateId(16);
  const payload = {
    id,
    title,
    username: user.username,
    nb_subpages: nbSub,
    public: isPublic,
    firstSubpage: { sub_id: 1, content: firstContent, image: firstImage || null }
  };

  try {
    const res = await fetch("/user/add-page", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json().catch(()=>null);
    if (!res.ok) {
      console.error("Erreur add-page:", data || await res.text());
      return alert((data && data.message) || "Erreur création page");
    }
    alert(data.message || "Page créée");
    // reset form
    document.getElementById("title").value = "";
    document.getElementById("nbSubpages").value = "1";
    document.getElementById("firstContent").value = "";
    document.getElementById("firstImage").value = "";
    await loadMyPages();
  } catch (err) {
    console.error(err);
    alert("Impossible de contacter le serveur.");
  }
}

// Charger pages user
async function loadMyPages() {
  const user = JSON.parse(localStorage.getItem("user"));
  if (!user || !user.username) { window.location.href = "/login.html"; return; }
  const container = document.getElementById("pages-list");
  container.innerHTML = "Chargement...";
  try {
    const res = await fetch(`/user/pages/${encodeURIComponent(user.username)}`);
    if (!res.ok) { const txt = await res.text().catch(()=>null); console.error("Erreur", txt); container.innerText = "Erreur chargement"; return; }
    const pages = await res.json();
    container.innerHTML = "";
    if (!pages || pages.length===0) { container.innerHTML = "<p>Aucune page.</p>"; return; }
    pages.forEach(p=>{
      const div = document.createElement("div");
      div.className = "page-card";
      div.innerHTML = `
        <h3>${escapeHtml(p.title||"(sans titre)")}</h3>
        <p><strong>ID:</strong> ${escapeHtml(p.id)}</p>
        <p><strong>Sous-pages:</strong> ${p.nb_subpages ?? 0}</p>
        <p><strong>Public:</strong> ${p.public ? "Oui" : "Non"}</p>
        <small>Créée: ${p.created_at ? new Date(p.created_at).toLocaleString() : "—"}</small>
      `;
      container.appendChild(div);
    });
  } catch (err) {
    console.error(err);
    container.innerText = "Erreur réseau";
  }
}

// Supprimer page admin
async function deletePage() {
  const id = document.getElementById("slug").value.trim();
  if (!id) return alert("Entrez l'ID de la page");
  try {
    const res = await fetch(`/admin/delete-page/${encodeURIComponent(id)}`, { method: "DELETE" });
    alert(await res.text());
    loadMyPages();
  } catch (err) { console.error(err); alert("Erreur suppression"); }
}

// Supprimer user admin
async function deleteUser() {
  const username = document.getElementById("userToDelete").value.trim();
  if (!username) return alert("Entrez le nom utilisateur");
  try {
    const res = await fetch(`/admin/delete-user/${encodeURIComponent(username)}`, { method: "DELETE" });
    alert(await res.text());
  } catch (err) { console.error(err); alert("Erreur suppression utilisateur"); }
}
