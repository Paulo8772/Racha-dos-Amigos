/* Lista pública e perfil de jogadores. */
(function () {
  function nome(jogador) { return jogador.apelido || jogador.nome; }
  function card(jogador) {
    const inativo = jogador.ativo ? '' : ' card-jogador--inativo';
    const posicao = jogador.posicao === 'goleiro' ? 'Goleiro' : 'Jogador de linha';
    return `<a href="jogador.html?id=${jogador.jogador_id}" class="card card-jogador card--link${inativo} entrada">
      ${App.avatar(jogador)}<div class="card-jogador__info"><strong class="card-jogador__nome">${App.escapeHTML(nome(jogador))}</strong>
      <div class="card-jogador__meta">${posicao} · ${jogador.jogos || 0} jogos</div></div>
      <div class="card-jogador__stats"><span><strong>${jogador.gols || 0}</strong> gols</span><span><strong>${jogador.assistencias || 0}</strong> ass.</span></div></a>`;
  }

  async function carregarLista() {
    const lista = document.querySelector('#lista-jogadores');
    if (!lista || !window.supabaseClient) return;
    mostrarSkeleton(lista, 6);
    try {
      const { data, error } = await supabaseClient.from('vw_estatisticas_jogador').select('*').order('nome');
      if (error) throw error;
      const busca = document.querySelector('#busca-jogador');
      const total = document.querySelector('#jogadores-total');
      const vazio = document.querySelector('#estado-vazio');
      let filtro = 'todos';
      function renderizar() {
        const termo = (busca?.value || '').trim().toLocaleLowerCase('pt-BR');
        const filtrados = data.filter((jogador) => {
          const texto = `${jogador.nome} ${jogador.apelido || ''}`.toLocaleLowerCase('pt-BR');
          return (!termo || texto.includes(termo)) && (filtro === 'todos' || filtro === jogador.posicao || (filtro === 'ativo' && jogador.ativo) || (filtro === 'inativo' && !jogador.ativo));
        });
        lista.innerHTML = filtrados.map(card).join('');
        if (total) total.textContent = `${filtrados.length} jogador${filtrados.length === 1 ? '' : 'es'}`;
        if (vazio) vazio.style.display = filtrados.length ? 'none' : 'block';
      }
      busca?.addEventListener('input', renderizar);
      document.querySelectorAll('[data-filtro]').forEach((botao) => botao.addEventListener('click', () => {
        filtro = botao.dataset.filtro;
        document.querySelectorAll('[data-filtro]').forEach((item) => item.classList.toggle('chip--ativo', item === botao));
        renderizar();
      }));
      renderizar();
    } catch (error) { App.handleError(error, 'Não foi possível carregar os jogadores.'); }
  }

  async function carregarPerfil() {
    const alvo = document.querySelector('#perfil-nome');
    const id = new URLSearchParams(location.search).get('id');
    if (!alvo || !id || !window.supabaseClient) return;
    try {
      const { data: jogador, error } = await supabaseClient.from('vw_estatisticas_jogador').select('*').eq('jogador_id', id).maybeSingle();
      if (error) throw error;
      if (!jogador) { alvo.textContent = 'Jogador não encontrado'; return; }
      document.querySelector('#perfil-avatar').textContent = App.initials(nome(jogador));
      alvo.textContent = nome(jogador);
      document.querySelector('#perfil-apelido').textContent = jogador.apelido ? `"${jogador.apelido}"` : '';
      document.querySelector('#perfil-posicao').textContent = jogador.posicao === 'goleiro' ? 'Goleiro' : 'Jogador de Linha';
      const stats = document.querySelector('#perfil-stats');
      if (stats) stats.innerHTML = [[jogador.jogos, 'Jogos'], [jogador.gols, 'Gols'], [jogador.assistencias, 'Assistências'], [jogador.titulos, 'Títulos'], [jogador.selecoes, 'Seleções'], [jogador.defesas, 'Defesas']].map(([valor, rotulo]) => `<div class="card card-indicador"><strong class="stat-numero">${valor || 0}</strong><span>${rotulo}</span></div>`).join('');
    } catch (error) { App.handleError(error, 'Não foi possível carregar o perfil.'); }
  }
  document.addEventListener('DOMContentLoaded', () => { carregarLista(); carregarPerfil(); });
})();
