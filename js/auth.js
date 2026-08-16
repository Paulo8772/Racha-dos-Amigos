/* Proteção das telas administrativas e login. */
window.Auth = {
  async requireAdmin() {
    if (!window.supabaseClient) {
      App.handleError(null, 'Configure o arquivo js/config.js para acessar a área administrativa.');
      return false;
    }
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) return true;
    window.location.replace('login.html');
    return false;
  },
  async logout() {
    if (window.supabaseClient) await supabaseClient.auth.signOut();
    window.location.replace('login.html');
  }
};

document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('#login-form');
  if (!form) return;
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!window.supabaseClient) return App.handleError(null, 'Configure o arquivo js/config.js antes de fazer login.');
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    try {
      const { error } = await supabaseClient.auth.signInWithPassword({
        email: form.querySelector('#email').value.trim(),
        password: form.querySelector('#password').value
      });
      if (error) throw error;
      window.location.replace('dashboard.html');
    } catch (error) {
      App.handleError(error, 'E-mail ou senha inválidos.');
    } finally {
      button.disabled = false;
    }
  });
});
