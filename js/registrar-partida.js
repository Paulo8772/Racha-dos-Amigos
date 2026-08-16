/* Cadastro de partida e estatísticas de cada participante. */
(function () {
  let jogadores = [];
  const porId = (id) => jogadores.find((jogador) => String(jogador.id) === String(id));

  function renderizarJogadores() {
    const container = document.querySelector('#players-stats');
    if (!container) return;
    container.innerHTML = jogadores.length ? jogadores.map((jogador) => `<article class="player-stat-row" data-jogador="${jogador.id}"><div class="form-group"><label>${App.escapeHTML(jogador.apelido || jogador.nome)}</label><select class="input" name="time"><option value="verde">Colete Verde</option><option value="preto">Colete Preto</option></select></div><div class="form-group"><label>Gols</label><input class="input" name="gols" type="number" min="0" value="0"></div><div class="form-group"><label>Assistências</label><input class="input" name="assistencias" type="number" min="0" value="0"></div>${jogador.posicao === 'goleiro' ? `<div class="form-group"><label>Defesas</label><input class="input" name="defesas" type="number" min="0" value="0"></div><div class="form-group"><label><input type="checkbox" name="melhor_goleiro"> Melhor goleiro</label></div>` : ''}<div class="form-group"><label><input type="checkbox" name="selecao_rodada"> Seleção da rodada</label></div></article>`).join('') : '<p class="texto-secundario">Cadastre jogadores antes de registrar uma partida.</p>';
  }

  async function iniciar() {
    const form = document.querySelector('#partida-form');
    if (!form) return;
    if (!await Auth.requireAdmin()) return;
    const seasonSelect = form.querySelector('#season_id');
    try {
      const [{ data: temporadas, error: erroTemporadas }, { data: lista, error: erroJogadores }] = await Promise.all([
        supabaseClient.from('temporadas').select('*').order('ano', { ascending: false }),
        supabaseClient.from('jogadores').select('*').eq('ativo', true).order('nome')
      ]);
      if (erroTemporadas || erroJogadores) throw erroTemporadas || erroJogadores;
      jogadores = lista;
      seasonSelect.innerHTML = temporadas.map((temporada) => `<option value="${temporada.id}" ${temporada.ativa ? 'selected' : ''}>${App.escapeHTML(temporada.nome)} (${temporada.ano})</option>`).join('');
      renderizarJogadores();
    } catch (error) { App.handleError(error, 'Não foi possível preparar o formulário.'); return; }

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const dados = Object.fromEntries(new FormData(form));
      const verde = Number(dados.team_a_score);
      const preto = Number(dados.team_b_score);
      const campeao = verde === preto ? 'empate' : verde > preto ? 'verde' : 'preto';
      const melhoresGoleiros = [...document.querySelectorAll('input[name="melhor_goleiro"]:checked')];
      if (melhoresGoleiros.length > 1) return App.handleError(null, 'Selecione apenas um melhor goleiro.');
      const button = form.querySelector('button[type="submit"]');
      button.disabled = true;
      try {
        const { data: partida, error } = await supabaseClient.from('partidas').insert({ temporada_id: Number(dados.season_id), rodada: Number(dados.round_number), data: dados.match_date, placar_verde: verde, placar_preto: preto, campeao }).select().single();
        if (error) throw error;
        const participantes = [...document.querySelectorAll('[data-jogador]')].map((linha) => ({
          partida_id: partida.id, jogador_id: Number(linha.dataset.jogador), time: linha.querySelector('[name="time"]').value,
          gols: Number(linha.querySelector('[name="gols"]').value || 0), assistencias: Number(linha.querySelector('[name="assistencias"]').value || 0),
          defesas: Number(linha.querySelector('[name="defesas"]')?.value || 0), selecao_rodada: linha.querySelector('[name="selecao_rodada"]').checked,
          melhor_goleiro: linha.querySelector('[name="melhor_goleiro"]')?.checked || false
        }));
        const { error: erroParticipantes } = await supabaseClient.from('partida_jogadores').insert(participantes);
        if (erroParticipantes) { await supabaseClient.from('partidas').delete().eq('id', partida.id); throw erroParticipantes; }
        App.toast('Partida registrada com sucesso.');
        window.location.assign('partidas.html');
      } catch (error) { App.handleError(error, 'Não foi possível registrar a partida.'); }
      finally { button.disabled = false; }
    });
  }
  document.addEventListener('DOMContentLoaded', iniciar);
})();
