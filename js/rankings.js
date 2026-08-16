/* Rankings calculados a partir da view de estatísticas. */
(function () {
  const configuracoes = [
    ['artilharia', 'gols', 'Gols'], ['assistencias', 'assistencias', 'Assistências'], ['media', 'media_gols', 'Média'],
    ['selecoes', 'selecoes', 'Seleções'], ['titulos', 'titulos', 'Títulos'], ['defesas', 'defesas', 'Defesas'], ['melhor-goleiro', 'melhor_goleiro_qtd', 'Prêmios']
  ];
  function rankingItem(jogador, posicao, campo, titulo) {
    const valor = campo === 'media_gols' ? Number(jogador[campo] || 0).toFixed(2) : jogador[campo] || 0;
    const meta = campo === 'media_gols' ? `${jogador.gols || 0} gols em ${jogador.jogos || 0} jogos` : `${jogador.jogos || 0} jogos`;
    return `<a href="jogador.html?id=${jogador.jogador_id}" class="ranking-item"><span class="ranking-item__pos${posicao === 1 ? ' ranking-item__pos--ouro' : ''}">${posicao}</span>${App.avatar(jogador)}<div class="ranking-item__info"><div class="ranking-item__nome">${App.escapeHTML(jogador.apelido || jogador.nome)}</div><div class="ranking-item__meta">${meta}</div></div><div class="ranking-item__valor" aria-label="${titulo}">${valor}</div></a>`;
  }
  async function iniciar() {
    if (!document.querySelector('#artilharia') || !window.supabaseClient) return;
    try {
      const { data, error } = await supabaseClient.from('vw_estatisticas_jogador').select('*').eq('ativo', true);
      if (error) throw error;
      configuracoes.forEach(([id, campo, titulo]) => {
        const destino = document.querySelector(`#${id} .card`);
        if (!destino) return;
        let lista = data.filter((jogador) => campo !== 'defesas' && campo !== 'melhor_goleiro_qtd' || jogador.posicao === 'goleiro');
        if (campo === 'media_gols') lista = lista.filter((jogador) => jogador.jogos >= 5);
        lista.sort((a, b) => Number(b[campo] || 0) - Number(a[campo] || 0) || a.nome.localeCompare(b.nome, 'pt-BR'));
        destino.innerHTML = lista.slice(0, 5).map((jogador, indice) => rankingItem(jogador, indice + 1, campo, titulo)).join('') || '<p class="texto-secundario">Sem dados suficientes.</p>';
      });
    } catch (error) { App.handleError(error, 'Não foi possível carregar os rankings.'); }
  }
  document.addEventListener('DOMContentLoaded', iniciar);
})();
