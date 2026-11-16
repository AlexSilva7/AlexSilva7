# Meu Treino (Android)

App de treino com bonequinhos animados mostrando a execução de cada exercício,
registro de cargas por série, sugestão automática de carga e acompanhamento de medidas.

- **Instalar:** baixe `release/MeuTreino.apk` no celular e abra (permita "instalar apps desconhecidos").
- **Programa:** rotação A → B → C → D, com peito em 3 de cada 4 treinos.
- **Objetivos:** perder gordura, hipertrofia, força ou condicionamento (muda séries, reps e descanso).

## Estrutura
- `assets/` — o app em si (HTML/CSS/JS): `fig.js` (motor de animação), `data.js` (exercícios e programa), `app.js` (telas e lógica)
- `src/` — Activity Android (WebView, vibração, backup em arquivo, botão voltar)
- `build.sh` — gera o APK sem Gradle (aapt + javac + dx + apksigner)

Para testar no navegador, abra `assets/index.html`.
