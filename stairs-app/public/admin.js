// 🔹 Voir une page publique
async function viewPage() {
  const id = document.getElementById("id").value.trim();
  const container = document.getElementById("page-details");
  if (!id) return alert("Saisissez un ID de page.");

  try {
    const res = await fetch(`/pages/public/${encodeURIComponent(id)}`);
    if (!res.ok) return alert("Page introuvable ou non publique.");

    const p = await res.json();
    container.innerHTML = `
      <h3>${escapeHtml(p.title)}</h3>
      <p><b>ID:</b> ${escapeHtml(p.id)}</p>
      <p><b>Auteur:</b> ${escapeHtml(p.username)}</p>
      <p><b>Public:</b> ${p.public ? "Oui" : "Non"}</p>
      <p><b>Nb sous-pages:</b> ${p.subpages?.length || 0}</p>
    `;
  } catch (err) {
    alert("Erreur réseau.");
    console.error(err);
  }
}

// 🔹 Supprimer une page publique (admin)
async function deletePage() {
  const id = document.getElementById("id").value.trim();
  if (!id) return alert("Entrez un ID de page.");
  if (!confirm("Voulez-vous vraiment supprimer cette page publique ?")) return;

  try {
    const res = await fetch("/admin/delete-public-page", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id_page: id })
    });

    const data = await res.json();
    alert(data.message || data.error);
    document.getElementById("page-details").innerHTML = "";
  } catch (err) {
    alert("Erreur suppression page.");
    console.error(err);
  }
}

// 🔹 Voir un utilisateur
async function viewUser() {
  const username = document.getElementById("userToDelete").value.trim();
  const container = document.getElementById("user-details");
  if (!username) return alert("Entrez un nom d'utilisateur.");

  try {
    const resUser = await fetch(`/admin/user/${encodeURIComponent(username)}`);
    if (!resUser.ok) return alert("Utilisateur introuvable.");
    const user = await resUser.json();

    const resPages = await fetch(`/user/pages/${encodeURIComponent(username)}`);
    const pages = resPages.ok ? await resPages.json() : [];

    container.innerHTML = `
      <p><b>Nom :</b> ${escapeHtml(user.username)}</p>
      <p><b>Rôle :</b> ${escapeHtml(user.role)}</p>
      <p><b>Email :</b> ${escapeHtml(user.email)}</p>
      <p><b>Créé le :</b> ${new Date(user.created_at).toLocaleString()}</p>
      <h4>Pages publiques :</h4>
      ${pages.filter(p => p.public).length
        ? `<ul>${pages.filter(p => p.public).map(p => `<li>${escapeHtml(p.title)} (${escapeHtml(p.id)})</li>`).join("")}</ul>`
        : "<p>Aucune.</p>"}
    `;
  } catch (err) {
    alert("Erreur réseau utilisateur.");
    console.error(err);
  }
}

// 🔹 Supprimer un utilisateur
async function deleteUser() {
  const username = document.getElementById("userToDelete").value.trim();
  if (!username) return alert("Entrez un nom d'utilisateur.");
  if (!confirm("Voulez-vous vraiment supprimer cet utilisateur ?")) return;

  try {
    const res = await fetch(`/admin/delete-user/${encodeURIComponent(username)}`, { method: "DELETE" });
    const text = await res.text();
    alert(text);
    document.getElementById("user-details").innerHTML = "";
  } catch (err) {
    alert("Erreur suppression utilisateur.");
    console.error(err);
  }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

window.addEventListener("DOMContentLoaded", () => {
  document.getElementById("view-page-btn")?.addEventListener("click", viewPage);
  document.getElementById("delete-page-btn")?.addEventListener("click", deletePage);
  document.getElementById("view-user-btn")?.addEventListener("click", viewUser);
  document.getElementById("delete-user-btn")?.addEventListener("click", deleteUser);
});
