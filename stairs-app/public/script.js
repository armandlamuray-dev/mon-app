// 🔹 Gestion login / register
document.addEventListener('DOMContentLoaded', () => {

  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');

  // 🔹 Formulaire login
  if (loginForm) {
    loginForm.addEventListener('submit', async e => {
      e.preventDefault();
      const username = document.getElementById('username').value.trim();
      const password = document.getElementById('password').value.trim();

      if (!username || !password) {
        alert("Veuillez remplir tous les champs !");
        return;
      }

      try {
        const res = await fetch('http://localhost:3000/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });

        const data = await res.json().catch(() => null);

        if (!res.ok || !data || !data.success) {
          alert((data && data.message) || "Erreur de connexion");
          return;
        }

        localStorage.setItem('user', JSON.stringify(data.user));
        window.location.href = 'dashboard.html';
      } catch (err) {
        console.error("Erreur réseau :", err);
        alert("Impossible de contacter le serveur.");
      }
    });
  }

  // 🔹 Formulaire register
  if (registerForm) {
    registerForm.addEventListener('submit', async e => {
      e.preventDefault();
      const username = document.getElementById('new-username').value.trim();
      const password = document.getElementById('new-password').value.trim();

      if (!username || !password) {
        alert("Veuillez remplir tous les champs !");
        return;
      }

      try {
        const res = await fetch('http://localhost:3000/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });

        const data = await res.json().catch(() => null);
        if (!res.ok || !data) {
          alert("Erreur serveur lors de l'inscription");
          return;
        }

        alert(data.message || "Inscription réussie !");
        if (data.success) window.location.href = 'login.html';
      } catch (err) {
        console.error("Erreur réseau :", err);
        alert("Impossible de contacter le serveur.");
      }
    });
  }

});

// 🔹 Route serveur pour ajouter une page
app.post('/pages/add', async (req, res) => {
  const { title, content, image, id_user, public, related_slugs } = req.body;
  const slug = title.toLowerCase().replace(/\s+/g, '-');
  const query = 'INSERT INTO pages (slug, title, content, image, public, id_user, related_slugs) VALUES (?, ?, ?, ?, ?, ?, ?)';

  try {
    await client.execute(query, [slug, title, content, image, public, id_user, related_slugs || []]);
    res.json({ success: true, message: 'Page ajoutée avec relations !' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// 🔹 Route serveur pour récupérer une page
app.get('/page/:slug', async (req, res) => {
  const { slug } = req.params;
  const query = 'SELECT * FROM pages WHERE slug = ?';

  try {
    const result = await client.execute(query, [slug]);
    if (result.rowLength === 0) return res.status(404).json({ message: 'Page non trouvée' });

    const page = result.rows[0];
    const related = [];

    if (page.related_slugs && page.related_slugs.length > 0) {
      for (const rslug of page.related_slugs) {
        const rpage = await client.execute('SELECT slug, title FROM pages WHERE slug = ?', [rslug]);
        if (rpage.rowLength > 0) related.push(rpage.rows[0]);
      }
    }

    res.json({ ...page, related });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});
