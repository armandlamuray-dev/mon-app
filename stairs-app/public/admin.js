// 🔹 Voir une page
async function viewPage() {
  const id = document.getElementById("slug").value.trim();
  const container = document.getElementById("page-details");
  if (!id) return alert("Saisissez un ID de page.");
  try {
    const res = await fetch(`/admin/page/${encodeURIComponent(id)}`);
    if (!res.ok) return alert("Page introuvable.");
    const p = await res.json();
    container.innerHTML = `
      <h3>${escapeHtml(p.title)}</h3>
      <p><b>ID:</b> ${escapeHtml(p.id)}</p>
      <p><b>Auteur:</b> ${escapeHtml(p.username)}</p>
      <p><b>Public:</b> ${p.public ? "Oui" : "Non"}</p>
    `;
  } catch (err) {
    alert("Erreur réseau.");
  }
}

// 🔹 Supprimer une page
async function deletePage() {
  const id = document.getElementById("slug").value.trim();
  if (!id) return alert("Entrez un ID de page.");
  try {
    const res = await fetch(`/admin/delete-page/${encodeURIComponent(id)}`, { method: "DELETE" });
    alert(await res.text());
  } catch (err) {
    alert("Erreur suppression page.");
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

    const resPages = await fetch(`/pages/public?username=${encodeURIComponent(username)}`);
    const pages = resPages.ok ? await resPages.json() : [];

    container.innerHTML = `
      <p><b>Nom :</b> ${escapeHtml(user.username)}</p>
      <p><b>Rôle :</b> ${escapeHtml(user.role)}</p>
      <h4>Pages publiques :</h4>
      ${pages.length ? pages.map(p => `<li>${escapeHtml(p.title)} (${escapeHtml(p.id)})</li>`).join("") : "<p>Aucune.</p>"}
    `;
  } catch (err) {
    alert("Erreur réseau utilisateur.");
  }
}

// 🔹 Supprimer un utilisateur
async function deleteUser() {
  const username = document.getElementById("userToDelete").value.trim();
  if (!username) return alert("Entrez un nom d'utilisateur.");
  try {
    const res = await fetch(`/admin/delete-user/${encodeURIComponent(username)}`, { method: "DELETE" });
    alert(await res.text());
  } catch (err) {
    alert("Erreur suppression utilisateur.");
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
