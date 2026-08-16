/* Dados dinâmicos da página inicial vindos do Supabase. */
(function () {
  function texto(valor) {
    return App.escapeHTML(valor ?? '');
  }

  function nomeJogador(jogador) {
    return jogador?.apelido || jogador?.nome || '—';
  }

  function renderizarDestaques(estatisticas) {
    const container = document.querySelector('.seasonal-highlights .grid-1');
    if (!container) return;

    const jogadores = estatisticas || [];

    const artilheiro = [...jogadores]
      .sort((a, b) => Number(b.gols || 0) - Number(a.gols || 0))[0];

    const assistente = [...jogadores]
      .sort((a, b) => Number(b.assistencias || 0) - Number(a.assistencias || 0))[0];

    const campeao = [...jogadores]
      .sort((a, b) => Number(b.titulos || 0) - Number(a.titulos || 0))[0];

    const selecao = [...jogadores]
      .sort((a, b) => Number(b.selecoes || 0) - Number(a.selecoes || 0))[0];

    const goleiro = jogadores
      .filter((jogador) => jogador.posicao === 'goleiro')
      .sort((a, b) => Number(b.melhor_goleiro_qtd || 0) - Number(a.melhor_goleiro_qtd || 0))[0];

    const destaques = [
      {
        icone: '⚽',
        rotulo: 'Artilheiro',
        jogador: artilheiro,
        valor: `${Number(artilheiro?.gols || 0)} gols`
      },
      {
        icone: '🎯',
        rotulo: 'Líder de Assistências',
        jogador: assistente,
        valor: `${Number(assistente?.assistencias || 0)} assist.`
      },
      {
        icone: '🏆',
        rotulo: 'Mais Títulos',
        jogador: campeao,
        valor: `${Number(campeao?.titulos || 0)} títulos`
      },
      {
        icone: '⭐',
        rotulo: 'Mais Seleções',
        jogador: selecao,
        valor: `${Number(selecao?.selecoes || 0)} seleções`
      },
      {
        icone: '🧤',
        rotulo: 'Melhor Goleiro',
        jogador: goleiro,
        valor: `${Number(goleiro?.melhor_goleiro_qtd || 0)} prêmios`
      }
    ];

    container.innerHTML = destaques.map((item) => `
      <div class="card card-destaque entrada">
        <div class="card-destaque__icone">${item.icone}</div>
        <div style="flex: 1;">
          <div class="card-destaque__rotulo">${texto(item.rotulo)}</div>
          <div class="card-destaque__nome">${texto(nomeJogador(item.jogador))}</div>
        </div>
        <div class="card-destaque__valor">${texto(item.valor)}</div>
      </div>
    `).join('');
  }

  function renderizarMelhorGoleiroDaRodada(partida) {
    const card = document.querySelector('.goalkeeper-feature .card-goleiro');
    if (!card) return;

    const goleiro = partida?.partida_jogadores?.find(
      (item) => item.melhor_goleiro
    );

    if (!goleiro) {
      card.innerHTML = `
        <div class="avatar avatar--destaque">—</div>
        <div class="card-goleiro__info">
          <div class="card-goleiro__nome">Ainda não definido</div>
          <div class="card-goleiro__stat">Nenhum melhor goleiro registrado nesta rodada.</div>
        </div>
      `;
      return;
    }

    const nome = nomeJogador(goleiro.jogadores);

    card.innerHTML = `
      <div class="avatar avatar--destaque" style="width: 64px; height: 64px; font-size: 1.125rem;">
        ${texto(App.initials(nome))}
      </div>
      <div class="card-goleiro__info">
        <div class="card-goleiro__nome">${texto(nome)}</div>
        <div class="card-goleiro__stat">
          ${Number(goleiro.defesas || 0)} defesas na Rodada ${Number(partida.rodada)}
        </div>
      </div>
    `;
  }

  async function iniciar() {
    if (!document.querySelector('#stat-partidas') || !window.supabaseClient) return;

    try {
      const temporada = await Database.temporadaAtiva();

      if (!temporada) {
        console.warn('Nenhuma temporada ativa encontrada.');
        return;
      }

      /*
       * RESUMO DA TEMPORADA
       */
      const { data: resumo, error: erroResumo } =
        await supabaseClient
          .from('vw_resumo_temporada')
          .select('*')
          .eq('temporada_id', temporada.id)
          .single();

      if (erroResumo) throw erroResumo;

      document.querySelectorAll('.eyebrow').forEach((elemento) => {
        if (elemento.textContent.includes('Temporada')) {
          elemento.textContent = temporada.nome;
        }
      });

      const indicadores = [
        ['#stat-partidas', resumo.total_partidas],
        ['#stat-gols', resumo.total_gols],
        ['#stat-assistencias', resumo.total_assistencias],
        ['#stat-defesas', resumo.total_defesas]
      ];

      indicadores.forEach(([seletor, valor]) => {
        const elemento = document.querySelector(seletor);
        if (elemento) elemento.textContent = Number(valor || 0);
      });

      /*
       * ESTATÍSTICAS DOS JOGADORES
       */
      const {
        data: estatisticas,
        error: erroEstatisticas
      } = await supabaseClient
        .from('vw_estatisticas_jogador')
        .select('*')
        .eq('temporada_id', temporada.id);

      if (erroEstatisticas) throw erroEstatisticas;

      renderizarDestaques(estatisticas);

      /*
       * ÚLTIMA PARTIDA
       */
      const {
        data: partida,
        error: erroPartida
      } = await supabaseClient
        .from('partidas')
        .select(`
          *,
          partida_jogadores(
            *,
            jogadores(nome, apelido)
          )
        `)
        .eq('temporada_id', temporada.id)
        .order('data', { ascending: false })
        .order('rodada', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (erroPartida) throw erroPartida;

      const rodada = document.querySelector('.card-rodada');

      if (!partida) {
        if (rodada) {
          rodada.innerHTML = `
            <div class="card-rodada__meta">
              <span class="badge badge--verde">SEM PARTIDAS</span>
            </div>
            <div class="placar">
              <span class="texto-secundario">Nenhuma partida registrada ainda.</span>
            </div>
          `;
        }

        renderizarMelhorGoleiroDaRodada(null);
        return;
      }

      if (rodada) {
        rodada.innerHTML = `
          <div class="card-rodada__meta">
            <span class="badge badge--verde">
              RODADA ${Number(partida.rodada)}
            </span>
            <span class="texto-secundario" style="font-size: 0.8125rem;">
              ${texto(formatarData(partida.data))}
            </span>
          </div>

          <div class="placar">
            <span class="placar__time${partida.campeao === 'verde' ? ' placar__time--vencedor' : ''}">
              Colete Verde
            </span>

            <div class="placar__numeros">
              <span class="placar__gol${partida.campeao === 'verde' ? ' placar__gol--vencedor' : ''}">
                ${Number(partida.placar_verde)}
              </span>

              <span class="placar__x">×</span>

              <span class="placar__gol${partida.campeao === 'preto' ? ' placar__gol--vencedor' : ''}">
                ${Number(partida.placar_preto)}
              </span>
            </div>

            <span class="placar__time${partida.campeao === 'preto' ? ' placar__time--vencedor' : ''}">
              Colete Preto
            </span>
          </div>

          <div class="card-rodada__campeao">
            ${partida.campeao === 'empate'
              ? 'Empate'
              : `🏆 <span>${partida.campeao === 'verde' ? 'Colete Verde' : 'Colete Preto'}</span>`
            }
          </div>
        `;
      }

      /*
       * SELEÇÃO DA RODADA
       */
      const selecao = document.querySelector('#selecao-rodada');

      if (selecao) {
        const selecionados = partida.partida_jogadores
          .filter((item) => item.selecao_rodada);

        selecao.innerHTML = selecionados.length
          ? selecionados.map((item) => {
              const nome = nomeJogador(item.jogadores);

              return `
                <a
                  href="jogador.html?id=${Number(item.jogador_id)}"
                  class="jogador-mini entrada"
                >
                  <div class="avatar avatar--destaque">
                    ${texto(App.initials(nome))}
                  </div>
                  <span class="jogador-mini__nome">
                    ${texto(nome)}
                  </span>
                </a>
              `;
            }).join('')
          : '<span class="texto-secundario">Seleção ainda não definida.</span>';
      }

      /*
       * MELHOR GOLEIRO DA ÚLTIMA RODADA
       */
      renderizarMelhorGoleiroDaRodada(partida);

    } catch (error) {
      App.handleError(
        error,
        'Não foi possível carregar os dados reais da temporada.'
      );
    }
  }

  document.addEventListener('DOMContentLoaded', iniciar);
})();