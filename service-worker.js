const CACHE_NAME =
  "racha-dos-amigos-v4";

const FILES = [

  "./",

  "./html/index.html",
  "./html/jogadores.html",
  "./html/jogador.html",
  "./html/rankings.html",
  "./html/partidas.html",
  "./html/partida.html",
  "./html/temporadas.html",
  "./html/temporada2026.html",

  "./css/style.css",
  "./css/responsive.css",

  "./js/app.js",
  "./js/supabase.js",
  "./js/auth.js",
  "./js/jogadores.js",
  "./js/partidas.js",
  "./js/rankings.js",
  "./js/temporadas.js",
  "./js/registrar-partida.js",
  "./js/inicio.js",

  "./assets/icons/logo.jpg",
  "./assets/icons/favicon.png"

];

self.addEventListener(
  "install",
  event => {

    event.waitUntil(

      caches
        .open(CACHE_NAME)
        .then(cache =>
          cache.addAll(FILES)
        )

    );

    self.skipWaiting();

  }
);


self.addEventListener(
  "activate",
  event => {

    event.waitUntil(

      caches.keys()
        .then(keys =>
          Promise.all(
            keys
              .filter(
                key =>
                  key !== CACHE_NAME
              )
              .map(
                key =>
                  caches.delete(key)
              )
          )
        )

    );

    self.clients.claim();

  }
);


self.addEventListener(
  "fetch",
  event => {

    if (
      event.request.method !== "GET"
    ) {
      return;
    }

    event.respondWith(
      fetch(event.request)
        .then(response => {
          const copia = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copia));
          return response;
        })
        .catch(() => caches.match(event.request))
    );

  }
);
