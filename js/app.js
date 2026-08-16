/* ============================================================
   RACHA DOS AMIGOS
   Funções de interface compartilhadas
   ============================================================ */


/* ============================================================
   ROTAS PRINCIPAIS
   ============================================================ */

const NAV_ITEMS = [
  {
    href: '/html/index.html',
    label: 'Início',
    tema: 'verde'
  },
  {
    href: '/html/jogadores.html',
    label: 'Jogadores',
    tema: 'lime'
  },
  {
    href: '/html/partidas.html',
    label: 'Partidas',
    tema: 'dourado'
  },
  {
    href: '/html/rankings.html',
    label: 'Rankings',
    tema: 'violeta'
  },
  {
    href: '/html/temporadas.html',
    label: 'Temporadas',
    tema: 'azul'
  },
  {
    href: '/admin/registrar-partida.html',
    label: 'Registrar',
    tema: 'verde',
    fab: true,
    adminOnly: true
  }
];


/* ============================================================
   IDENTIFICAÇÃO DA PÁGINA ATUAL
   ============================================================ */

function paginaAtual() {
  const partes = window.location.pathname
    .split('/')
    .filter(Boolean);

  return partes[partes.length - 1] || 'index.html';
}


/* ============================================================
   FORMATAÇÃO DE DATA
   ============================================================ */

function formatarData(dataIso) {
  if (!dataIso) return '';

  const partes = String(dataIso).split('-');

  if (partes.length !== 3) {
    return dataIso;
  }

  const [ano, mes, dia] = partes;

  if (!ano || !mes || !dia) {
    return dataIso;
  }

  return `${dia}/${mes}/${ano}`;
}


/* ============================================================
   OBJETO GLOBAL APP
   ============================================================ */

const App = window.App = {

  /* ----------------------------------------------------------
     Proteção básica contra HTML inserido pelo usuário
     ---------------------------------------------------------- */

  escapeHTML(value = '') {
    const element = document.createElement('div');

    element.textContent = String(value);

    return element.innerHTML;
  },


  /* ----------------------------------------------------------
     Formatação de data
     ---------------------------------------------------------- */

  formatDate: formatarData,


  /* ----------------------------------------------------------
     Iniciais do jogador
     ---------------------------------------------------------- */

  initials(nome = '') {
    return String(nome)
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((parte) => parte[0] || '')
      .join('')
      .toUpperCase();
  },


  /* ----------------------------------------------------------
     Avatar padrão
     ---------------------------------------------------------- */

  avatar(jogador = {}) {

    const nome =
      jogador.apelido ||
      jogador.nome ||
      '';

    return `
      <div class="avatar">
        ${this.escapeHTML(this.initials(nome))}
      </div>
    `;
  },


  /* ----------------------------------------------------------
     Toast / mensagens
     ---------------------------------------------------------- */

  toast(message, type = 'sucesso') {

    let toast = document.querySelector('#app-toast');

    if (!toast) {

      toast = document.createElement('div');

      toast.id = 'app-toast';

      toast.setAttribute(
        'role',
        'status'
      );

      document.body.appendChild(toast);
    }

    toast.className = `toast toast--${type}`;

    toast.textContent =
      message || 'Operação concluída.';

    clearTimeout(this.toastTimer);

    this.toastTimer = setTimeout(() => {

      if (toast && toast.parentNode) {
        toast.remove();
      }

    }, 3500);
  },


  /* ----------------------------------------------------------
     Tratamento de erros
     ---------------------------------------------------------- */

  handleError(
    error,
    fallback = 'Não foi possível concluir a operação.'
  ) {

    console.error(
      '[Racha dos Amigos]',
      error
    );

    const mensagem =
      error?.message ||
      fallback;

    this.toast(
      mensagem,
      'erro'
    );
  }
};


/* ============================================================
   RENDERIZAÇÃO DA NAVEGAÇÃO
   ============================================================ */

function renderNav() {

  const container =
    document.querySelector('#app-nav');

  if (!container) {
    return;
  }

  const atual =
    paginaAtual();


  /* ----------------------------------------------------------
     Links da navegação
     ---------------------------------------------------------- */

  const links = NAV_ITEMS
    .map((item) => {

      const classes = [
        'nav-item'
      ];


      if (item.fab) {
        classes.push(
          'nav-item--fab'
        );
      }


      /*
       * Descobre se o link corresponde
       * à página atualmente aberta.
       */

      const arquivoAtual =
        item.href
          .split('/')
          .pop();


      if (
        arquivoAtual === atual
      ) {

        classes.push(
          'nav-item--ativo'
        );
      }


      /*
       * Itens administrativos começam
       * escondidos até verificarmos a sessão.
       */

      const restrito =
        item.adminOnly
          ? ' data-admin-only hidden'
          : '';


      return `
        <a
          href="${item.href}"
          class="${classes.join(' ')}"
          ${restrito}
        >

          <span
            class="nav-item__icon nav-item__icon--${item.tema}"
            aria-hidden="true"
          ></span>

          <span class="nav-item__label">
            ${item.label}
          </span>

        </a>
      `;
    })
    .join('');


  /* ----------------------------------------------------------
     Monta a navegação completa
     ---------------------------------------------------------- */

  container.innerHTML = `

    <a
      href="/html/index.html"
      class="nav-logo"
      aria-label="Racha dos Amigos — Início"
    >

      <img
        class="nav-logo__img"
        src="/assets/icons/logo.jpg"
        alt=""
      >

      <span>
        Racha dos Amigos
      </span>

    </a>


    <div class="nav-links">

      ${links}

    </div>


    <a
      href="/admin/login.html"
      class="nav-admin"
      aria-label="Área administrativa"
    ></a>

  `;


  container.classList.add(
    'nav'
  );

  container.removeAttribute(
    'id'
  );
}


/* ============================================================
   SKELETON
   ============================================================ */

function mostrarSkeleton(
  elemento,
  linhas = 1
) {

  if (!elemento) {
    return;
  }

  elemento.innerHTML =
    Array.from(
      { length: linhas },
      () => `
        <div
          class="skeleton"
          style="
            height: 1em;
            margin-bottom: 6px;
          "
        ></div>
      `
    ).join('');
}


/* ============================================================
   VERIFICAÇÃO DA SESSÃO ADMINISTRATIVA
   ============================================================ */

async function atualizarNavegacaoRestrita() {

  const itensRestritos =
    document.querySelectorAll(
      '[data-admin-only]'
    );


  if (
    !itensRestritos.length ||
    !window.supabaseClient
  ) {

    return;
  }


  try {

    const {
      data: { session }
    } = await window.supabaseClient.auth.getSession();


    itensRestritos.forEach((item) => {

      item.hidden = !session;

    });

  } catch (error) {

    console.warn(
      'Não foi possível verificar a sessão administrativa.',
      error
    );

  }
}


/* ============================================================
   REMOVER EMOJIS DECORATIVOS
   ============================================================ */

function removerEmojisDecorativos() {

  const seletores = [
    '.page-heading h1',
    '.secao__titulo',
    '.card-rodada__campeao',
    '.card-rodada__empate'
  ];


  document
    .querySelectorAll(
      seletores.join(',')
    )
    .forEach((elemento) => {

      elemento.childNodes.forEach((no) => {

        if (
          no.nodeType === Node.TEXT_NODE
        ) {

          no.textContent =
            no.textContent.replace(
              /\p{Extended_Pictographic}\uFE0F?/gu,
              ''
            );
        }

      });

    });
}


/* ============================================================
   FUNÇÕES GLOBAIS
   ============================================================ */

window.formatarData =
  formatarData;

window.mostrarSkeleton =
  mostrarSkeleton;


/* ============================================================
   INICIALIZAÇÃO
   ============================================================ */

document.addEventListener(
  'DOMContentLoaded',
  () => {

    renderNav();

    atualizarNavegacaoRestrita();

    removerEmojisDecorativos();

  }
);


/* ============================================================
   SERVICE WORKER
   ============================================================

   O site está publicado na raiz do domínio.
   Portanto, o Service Worker deve ser registrado
   a partir da raiz.

   ============================================================ */

if (
  'serviceWorker' in navigator &&
  window.location.protocol !== 'file:'
) {

  window.addEventListener(
    'load',
    () => {

      navigator.serviceWorker
        .register('/service-worker.js')
        .then(() => {

          console.log(
            '[Racha dos Amigos] Service Worker ativo.'
          );

        })
        .catch((error) => {

          console.warn(
            '[Racha dos Amigos] Service Worker:',
            error
          );

        });

    }
  );
}