/* Lista pública de temporadas. */
(function () {
  async function carregarTemporadas() {
    const cards = document.querySelectorAll('.card-temporada');
    if (!cards.length || !window.supabaseClient) return;
    try {
      const { data, error } = await supabaseClient.from('vw_resumo_temporada').select('*').order('ano', { ascending: false });
      if (error) throw error;
      const container = cards[0].parentElement;
      container.innerHTML = data.length ? data.map((temporada) => `<a href="temporada2026.html?id=${temporada.temporada_id}" class="card card--link card-temporada entrada"><div class="card-temporada__top"><span class="badge ${temporada.ativa ? 'badge--verde' : 'badge--neutro'}">${temporada.ativa ? 'ATIVA' : 'ENCERRADA'}</span><span class="card-temporada__ano">${temporada.ano}</span></div><h2>${App.escapeHTML(temporada.nome)}</h2><div class="card-temporada__stats"><span><strong>${temporada.total_partidas}</strong> partidas</span><span><strong>${temporada.total_gols}</strong> gols</span><span><strong>${temporada.total_assistencias}</strong> assistências</span></div></a>`).join('') : '<div class="estado">Nenhuma temporada cadastrada.</div>';
    } catch (error) { App.handleError(error, 'Não foi possível carregar as temporadas.'); }
  }
  document.addEventListener('DOMContentLoaded', carregarTemporadas);
})();
