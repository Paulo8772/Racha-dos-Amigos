/* Histórico público e detalhes de uma partida. */
(function () {
  function placar(partida) {
    const vencedorVerde = partida.campeao === 'verde' ? ' placar__gol--vencedor' : '';
    const vencedorPreto = partida.campeao === 'preto' ? ' placar__gol--vencedor' : '';
    return `<div class="placar"><span class="placar__time${partida.campeao === 'verde' ? ' placar__time--vencedor' : ''}">Colete Verde</span><div class="placar__numeros"><span class="placar__gol${vencedorVerde}">${partida.placar_verde}</span><span class="placar__x">×</span><span class="placar__gol${vencedorPreto}">${partida.placar_preto}</span></div><span class="placar__time${partida.campeao === 'preto' ? ' placar__time--vencedor' : ''}">Colete Preto</span></div>`;
  }
  async function carregarLista() {
    const lista = document.querySelector('#lista-partidas');
    if (!lista || !window.supabaseClient) return;
    mostrarSkeleton(lista, 5);
    try {
      const { data, error } = await supabaseClient.from('partidas').select('*, temporadas(nome, ano)').order('data', { ascending: false });
      if (error) throw error;
      lista.innerHTML = data.length ? data.map((partida) => `<a href="partida.html?id=${partida.id}" class="card card-rodada card--link entrada"><div class="card-rodada__meta"><span class="badge badge--verde">RODADA ${partida.rodada}</span><span class="texto-secundario">${formatarData(partida.data)}</span></div>${placar(partida)}</a>`).join('') : '<div class="estado">Nenhuma partida registrada ainda.</div>';
    } catch (error) { App.handleError(error, 'Não foi possível carregar as partidas.'); }
  }
  async function carregarDetalhe() {
    const id = new URLSearchParams(location.search).get('id');
    const titulo = document.querySelector('h1');
    if (!id || !titulo || !window.supabaseClient || !location.pathname.endsWith('partida.html')) return;
    try {
      const { data: partida, error } = await supabaseClient.from('partidas').select('*, partida_jogadores(*, jogadores(nome, apelido, posicao))').eq('id', id).maybeSingle();
      if (error) throw error;
      if (!partida) { titulo.textContent = 'Partida não encontrada'; return; }
      titulo.textContent = `Rodada ${partida.rodada}`;
      const conteudo = document.querySelector('main .container') || document.querySelector('main');
      const jogadores = partida.partida_jogadores || [];
      const grupos = ['verde', 'preto'].map((time) => `<section class="secao"><h2 class="secao__titulo">Colete ${time === 'verde' ? 'Verde' : 'Preto'}</h2><div class="grid-1">${jogadores.filter((item) => item.time === time).map((item) => `<div class="card card-jogador">${App.avatar(item.jogadores)}<div class="card-jogador__info"><strong>${App.escapeHTML(item.jogadores.apelido || item.jogadores.nome)}</strong><div class="card-jogador__meta">${item.gols} gols · ${item.assistencias} assist. · ${item.defesas} defesas</div></div></div>`).join('') || '<p class="texto-secundario">Sem jogadores registrados.</p>'}</div></section>`).join('');
      const placarExistente = document.querySelector('.placar')?.parentElement;
      if (placarExistente) placarExistente.innerHTML = `<div class="card-rodada__meta"><span class="badge badge--verde">RODADA ${partida.rodada}</span><span>${formatarData(partida.data)}</span></div>${placar(partida)}`;
      else conteudo.insertAdjacentHTML('beforeend', `<section class="secao"><div class="card card-rodada">${placar(partida)}</div></section>`);
      conteudo.insertAdjacentHTML('beforeend', grupos);
    } catch (error) { App.handleError(error, 'Não foi possível carregar a partida.'); }
  }
  document.addEventListener('DOMContentLoaded', () => { carregarLista(); carregarDetalhe(); });
})();
