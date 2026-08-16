/* Indicadores da temporada ativa na página inicial. */
(function () {
  async function iniciar() {
    if (!document.querySelector('#stat-partidas') || !window.supabaseClient) return;
    try {
      const temporada = await Database.temporadaAtiva();
      if (!temporada) return;
      const { data: resumo, error: erroResumo } = await supabaseClient.from('vw_resumo_temporada').select('*').eq('temporada_id', temporada.id).single();
      if (erroResumo) throw erroResumo;
      document.querySelectorAll('.eyebrow').forEach((elemento) => { if (elemento.textContent.includes('Temporada')) elemento.textContent = temporada.nome; });
      [['#stat-partidas', resumo.total_partidas], ['#stat-gols', resumo.total_gols], ['#stat-assistencias', resumo.total_assistencias], ['#stat-defesas', resumo.total_defesas]].forEach(([seletor, valor]) => {
        const elemento = document.querySelector(seletor); if (elemento) elemento.textContent = valor || 0;
      });
      const { data: partida, error: erroPartida } = await supabaseClient.from('partidas').select('*, partida_jogadores(*, jogadores(nome, apelido))').eq('temporada_id', temporada.id).order('data', { ascending: false }).limit(1).maybeSingle();
      if (erroPartida || !partida) return;
      const rodada = document.querySelector('.card-rodada');
      if (rodada) rodada.innerHTML = `<div class="card-rodada__meta"><span class="badge badge--verde">RODADA ${partida.rodada}</span><span class="texto-secundario">${formatarData(partida.data)}</span></div><div class="placar"><span class="placar__time${partida.campeao === 'verde' ? ' placar__time--vencedor' : ''}">Colete Verde</span><div class="placar__numeros"><span class="placar__gol">${partida.placar_verde}</span><span class="placar__x">×</span><span class="placar__gol">${partida.placar_preto}</span></div><span class="placar__time${partida.campeao === 'preto' ? ' placar__time--vencedor' : ''}">Colete Preto</span></div>`;
      const selecao = document.querySelector('#selecao-rodada');
      if (selecao) selecao.innerHTML = partida.partida_jogadores.filter((item) => item.selecao_rodada).map((item) => `<a href="jogador.html?id=${item.jogador_id}" class="jogador-mini entrada"><div class="avatar avatar--destaque">${App.initials(item.jogadores.apelido || item.jogadores.nome)}</div><span class="jogador-mini__nome">${App.escapeHTML(item.jogadores.apelido || item.jogadores.nome)}</span></a>`).join('') || '<span class="texto-secundario">Seleção ainda não definida.</span>';
    } catch (error) { App.handleError(error, 'Não foi possível carregar o resumo da temporada.'); }
  }
  document.addEventListener('DOMContentLoaded', iniciar);
})();
