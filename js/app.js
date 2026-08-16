/* Funções de interface compartilhadas. */
const NAV_ITEMS = [
  { href: 'index.html', label: 'Início', tema: 'verde' },
  { href: 'jogadores.html', label: 'Jogadores', tema: 'lime' },
  { href: 'partidas.html', label: 'Partidas', tema: 'dourado' },
  { href: 'rankings.html', label: 'Rankings', tema: 'violeta' },
  { href: 'temporadas.html', label: 'Temporadas', tema: 'azul' },
  { href: '../admin/registrar-partida.html', label: 'Registrar', tema: 'verde', fab: true, adminOnly: true }
];

function paginaAtual() {
  return window.location.pathname.split('/').filter(Boolean).pop() || 'index.html';
}

function formatarData(dataIso) {
  if (!dataIso) return '';
  const [ano, mes, dia] = dataIso.split('-');
  return ano && mes && dia ? `${dia}/${mes}/${ano}` : dataIso;
}

const App = window.App = {
  escapeHTML(value = '') {
    const element = document.createElement('div');
    element.textContent = String(value);
    return element.innerHTML;
  },
  formatDate: formatarData,
  initials(nome = '') {
    return nome.trim().split(/\s+/).slice(0, 2).map((parte) => parte[0] || '').join('').toUpperCase();
  },
  avatar(jogador) {
    return `<div class="avatar">${this.escapeHTML(this.initials(jogador.apelido || jogador.nome))}</div>`;
  },
  toast(message, type = 'sucesso') {
    let toast = document.querySelector('#app-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'app-toast';
      toast.setAttribute('role', 'status');
      document.body.appendChild(toast);
    }
    toast.className = `toast toast--${type}`;
    toast.textContent = message;
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => toast.remove(), 3500);
  },
  handleError(error, fallback = 'Não foi possível concluir a operação.') {
    console.error(error);
    this.toast(error?.message || fallback, 'erro');
  }
};

function renderNav() {
  const container = document.querySelector('#app-nav');
  if (!container) return;
  const atual = paginaAtual();
  const links = NAV_ITEMS.map((item) => {
    const classes = ['nav-item'];
    if (item.fab) classes.push('nav-item--fab');
    if (item.href.endsWith(atual)) classes.push('nav-item--ativo');
    const restrito = item.adminOnly ? ' data-admin-only hidden' : '';
    return `<a href="${item.href}" class="${classes.join(' ')}"${restrito}><span class="nav-item__icon nav-item__icon--${item.tema}" aria-hidden="true"></span><span class="nav-item__label">${item.label}</span></a>`;
  }).join('');
  container.innerHTML = `<a href="index.html" class="nav-logo" aria-label="Racha dos Amigos — Início"><img class="nav-logo__img" src="../assets/icons/logo.jpg" alt=""><span>Racha dos Amigos</span></a><div class="nav-links">${links}</div><a href="../admin/login.html" class="nav-admin" aria-label="Área administrativa"></a>`;
  container.classList.add('nav');
  container.removeAttribute('id');
}

function mostrarSkeleton(elemento, linhas = 1) {
  if (elemento) elemento.innerHTML = Array.from({ length: linhas }, () => '<div class="skeleton" style="height: 1em; margin-bottom: 6px;"></div>').join('');
}

async function atualizarNavegacaoRestrita() {
  const itensRestritos = document.querySelectorAll('[data-admin-only]');
  if (!itensRestritos.length || !window.supabaseClient) return;
  try {
    const { data: { session } } = await window.supabaseClient.auth.getSession();
    itensRestritos.forEach((item) => { item.hidden = !session; });
  } catch (error) {
    console.warn('Não foi possível verificar a sessão administrativa.', error);
  }
}

function removerEmojisDecorativos() {
  const seletores = '.page-heading h1, .secao__titulo, .card-rodada__campeao, .card-rodada__empate';
  document.querySelectorAll(seletores).forEach((elemento) => {
    elemento.childNodes.forEach((no) => {
      if (no.nodeType === Node.TEXT_NODE) {
        no.textContent = no.textContent.replace(/\p{Extended_Pictographic}\uFE0F?/gu, '');
      }
    });
  });
}

window.formatarData = formatarData;
window.mostrarSkeleton = mostrarSkeleton;
document.addEventListener('DOMContentLoaded', () => {
  renderNav();
  atualizarNavegacaoRestrita();
  removerEmojisDecorativos();
});

if ('serviceWorker' in navigator && window.location.protocol !== 'file:') {
  window.addEventListener('load', () => navigator.serviceWorker.register('../service-worker.js').catch((error) => console.warn('Service Worker:', error)));
}
