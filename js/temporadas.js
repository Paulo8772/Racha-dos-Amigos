/* ============================================================
   RACHA DOS AMIGOS
   Temporadas + Histórico Geral
   Dados reais do Supabase
   ============================================================ */

(function () {

  /* ==========================================================
     UTILITÁRIOS
     ========================================================== */

  function escape(value) {
    return App.escapeHTML(value ?? '');
  }

  function nomeJogador(jogador) {
    return jogador?.apelido || jogador?.nome || 'Sem nome';
  }

  function formatarPeriodo(temporada) {

    const inicio = temporada.data_inicio
      ? formatarData(temporada.data_inicio)
      : null;

    const fim = temporada.data_fim
      ? formatarData(temporada.data_fim)
      : null;

    if (inicio && fim) {
      return `${inicio} até ${fim}`;
    }

    if (inicio) {
      return `Início em ${inicio}`;
    }

    if (fim) {
      return `Encerrada em ${fim}`;
    }

    return 'Período não informado';
  }


  /* ==========================================================
     CARREGAR TEMPORADAS
     ========================================================== */

  async function carregarTemporadas() {

    if (!window.supabaseClient) {
      console.warn(
        '[Temporadas] Supabase não está disponível.'
      );
      return;
    }

    try {

      const {
        data: temporadas,
        error
      } = await supabaseClient
        .from('temporadas')
        .select('*')
        .order('ano', {
          ascending: false
        });


      if (error) {
        throw error;
      }


      const atualContainer =
        document.querySelector(
          '#temporada-atual'
        );

      const anterioresContainer =
        document.querySelector(
          '#temporadas-anteriores'
        );


      if (
        !atualContainer ||
        !anterioresContainer
      ) {
        return;
      }


      /* --------------------------------------------------------
         Nenhuma temporada
         -------------------------------------------------------- */

      if (!temporadas?.length) {

        atualContainer.innerHTML = `
          <div class="card">

            <span class="texto-secundario">
              Nenhuma temporada cadastrada.
            </span>

          </div>
        `;

        anterioresContainer.innerHTML = '';

        return;
      }


      /* --------------------------------------------------------
         Temporada ativa
         -------------------------------------------------------- */

      const temporadaAtual =
        temporadas.find(
          (temporada) =>
            temporada.ativa === true
        );


      if (temporadaAtual) {

        atualContainer.innerHTML = `

          <a
            href="/html/temporada2026.html?id=${Number(temporadaAtual.id)}"
            class="card card--link card-temporada entrada"
          >

            <div class="card-temporada__selo">
              🟢
            </div>


            <div class="card-temporada__info">

              <div class="card-temporada__nome">
                ${escape(temporadaAtual.nome)}
              </div>

              <div class="card-temporada__periodo">
                ${escape(formatarPeriodo(temporadaAtual))}
              </div>

            </div>


            <span class="badge badge--verde">
              ATIVA
            </span>

          </a>

        `;

      } else {

        atualContainer.innerHTML = `
          <div class="card">

            <span class="texto-secundario">
              Nenhuma temporada está ativa no momento.
            </span>

          </div>
        `;

      }


      /* --------------------------------------------------------
         Temporadas anteriores
         -------------------------------------------------------- */

      const anteriores =
        temporadas.filter(
          (temporada) =>
            !temporada.ativa
        );


      if (!anteriores.length) {

        anterioresContainer.innerHTML = `
          <div class="card">

            <span class="texto-secundario">
              Nenhuma temporada anterior cadastrada.
            </span>

          </div>
        `;

      } else {

        anterioresContainer.innerHTML =
          anteriores
            .map((temporada) => {

              return `

                <a
                  href="/html/temporada2026.html?id=${Number(temporada.id)}"
                  class="card card--link card-temporada entrada"
                >

                  <div class="card-temporada__selo">
                    ⚫
                  </div>


                  <div class="card-temporada__info">

                    <div class="card-temporada__nome">
                      ${escape(temporada.nome)}
                    </div>

                    <div class="card-temporada__periodo">
                      ${escape(formatarPeriodo(temporada))}
                    </div>

                  </div>


                  <span class="badge badge--neutro">
                    ENCERRADA
                  </span>

                </a>

              `;

            })
            .join('');
      }

    } catch (error) {

      App.handleError(
        error,
        'Não foi possível carregar as temporadas.'
      );

    }
  }


  /* ==========================================================
     CARREGAR HISTÓRICO GERAL
     ========================================================== */

  async function carregarHistoricoGeral() {

    if (!window.supabaseClient) {
      return;
    }

    try {

      /*
       * Jogadores
       */

      const {
        data: jogadores,
        error: erroJogadores
      } = await supabaseClient
        .from('jogadores')
        .select('*');


      if (erroJogadores) {
        throw erroJogadores;
      }


      /*
       * Partidas
       */

      const {
        data: partidas,
        error: erroPartidas
      } = await supabaseClient
        .from('partidas')
        .select('*');


      if (erroPartidas) {
        throw erroPartidas;
      }


      /*
       * Estatísticas de cada jogador em cada partida
       */

      const {
        data: participacoes,
        error: erroParticipacoes
      } = await supabaseClient
        .from('partida_jogadores')
        .select('*');


      if (erroParticipacoes) {
        throw erroParticipacoes;
      }


      /* --------------------------------------------------------
         Mapa dos jogadores
         -------------------------------------------------------- */

      const jogadoresMap =
        new Map(
          jogadores.map(
            (jogador) => [
              Number(jogador.id),
              jogador
            ]
          )
        );


      /* --------------------------------------------------------
         Mapa das partidas
         -------------------------------------------------------- */

      const partidasMap =
        new Map(
          partidas.map(
            (partida) => [
              Number(partida.id),
              partida
            ]
          )
        );


      /* --------------------------------------------------------
         Acumuladores
         -------------------------------------------------------- */

      const estatisticas =
        new Map();


      participacoes.forEach((registro) => {

        const jogadorId =
          Number(registro.jogador_id);

        const jogador =
          jogadoresMap.get(jogadorId);

        const partida =
          partidasMap.get(
            Number(registro.partida_id)
          );


        if (!jogador || !partida) {
          return;
        }


        if (!estatisticas.has(jogadorId)) {

          estatisticas.set(
            jogadorId,
            {
              jogador,
              gols: 0,
              assistencias: 0,
              defesas: 0,
              titulos: 0,
              selecoes: 0,
              melhorGoleiro: 0
            }
          );

        }


        const estatistica =
          estatisticas.get(jogadorId);


        estatistica.gols +=
          Number(registro.gols || 0);


        estatistica.assistencias +=
          Number(registro.assistencias || 0);


        estatistica.defesas +=
          Number(registro.defesas || 0);


        if (registro.selecao_rodada) {
          estatistica.selecoes += 1;
        }


        if (registro.melhor_goleiro) {
          estatistica.melhorGoleiro += 1;
        }


        /*
         * Título = jogador estava no time
         * que venceu aquela partida.
         */

        const venceu =
          (
            registro.time === 'verde' &&
            partida.campeao === 'verde'
          ) ||
          (
            registro.time === 'preto' &&
            partida.campeao === 'preto'
          );


        if (venceu) {
          estatistica.titulos += 1;
        }

      });


      const lista =
        Array.from(
          estatisticas.values()
        );


      /* --------------------------------------------------------
         Encontrar recordistas
         -------------------------------------------------------- */

      const maiorArtilheiro =
        [...lista]
          .sort(
            (a, b) =>
              b.gols - a.gols
          )[0];


      const maiorAssistente =
        [...lista]
          .sort(
            (a, b) =>
              b.assistencias -
              a.assistencias
          )[0];


      const maiorCampeao =
        [...lista]
          .sort(
            (a, b) =>
              b.titulos -
              a.titulos
          )[0];


      const maiorSelecao =
        [...lista]
          .sort(
            (a, b) =>
              b.selecoes -
              a.selecoes
          )[0];


      const maiorDefesas =
        [...lista]
          .sort(
            (a, b) =>
              b.defesas -
              a.defesas
          )[0];


      const maiorMelhorGoleiro =
        [...lista]
          .filter(
            (item) =>
              item.jogador.posicao === 'goleiro'
          )
          .sort(
            (a, b) =>
              b.melhorGoleiro -
              a.melhorGoleiro
          )[0];


      /* --------------------------------------------------------
         Atualizar interface
         -------------------------------------------------------- */

      atualizarHistorico(
        'artilheiro',
        maiorArtilheiro,
        'gols',
        'gols'
      );


      atualizarHistorico(
        'assistente',
        maiorAssistente,
        'assistencias',
        'assist.'
      );


      atualizarHistorico(
        'titulos',
        maiorCampeao,
        'titulos',
        'títulos'
      );


      atualizarHistorico(
        'selecao',
        maiorSelecao,
        'selecoes',
        'seleções'
      );


      atualizarHistorico(
        'defesas',
        maiorDefesas,
        'defesas',
        'defesas'
      );


      atualizarHistorico(
        'goleiro',
        maiorMelhorGoleiro,
        'melhorGoleiro',
        'prêmios'
      );

    } catch (error) {

      App.handleError(
        error,
        'Não foi possível carregar o histórico geral.'
      );

    }
  }


  /* ==========================================================
     ATUALIZAR CARD DO HISTÓRICO
     ========================================================== */

  function atualizarHistorico(
    prefixo,
    registro,
    propriedade,
    unidade
  ) {

    const nome =
      document.querySelector(
        `[data-historico="${prefixo}-nome"]`
      );

    const valor =
      document.querySelector(
        `[data-historico="${prefixo}-valor"]`
      );


    if (!registro) {

      if (nome) {
        nome.textContent =
          'Nenhum dado';
      }

      if (valor) {
        valor.textContent =
          '—';
      }

      return;
    }


    const jogador =
      registro.jogador;


    const quantidade =
      Number(
        registro[propriedade] || 0
      );


    if (nome) {

      nome.textContent =
        nomeJogador(jogador);

    }


    if (valor) {

      valor.textContent =
        `${quantidade} ${unidade}`;

    }

  }


  /* ==========================================================
     INICIALIZAÇÃO
     ========================================================== */

  async function iniciar() {

    if (!window.supabaseClient) {

      console.warn(
        '[Temporadas] Supabase não disponível.'
      );

      return;
    }


    await Promise.all([
      carregarTemporadas(),
      carregarHistoricoGeral()
    ]);

  }


  document.addEventListener(
    'DOMContentLoaded',
    iniciar
  );

})();