/* Cliente e utilitários de acesso ao Supabase. */
(function () {
  const configured = typeof SUPABASE_URL !== 'undefined'
    && typeof SUPABASE_ANON_KEY !== 'undefined'
    && !SUPABASE_URL.includes('SEU-PROJETO')
    && !SUPABASE_ANON_KEY.includes('sua-chave');

  window.supabaseClient = configured && window.supabase
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

  window.Database = {
    disponivel() { return Boolean(window.supabaseClient); },
    async temporadaAtiva() {
      if (!window.supabaseClient) return null;
      const { data, error } = await window.supabaseClient
        .from('temporadas').select('*').eq('ativa', true).maybeSingle();
      if (error) throw error;
      return data;
    }
  };
})();
