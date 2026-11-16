/* Biblioteca de exercícios, objetivos e programa de treino */
(function (G) {
  "use strict";

  var GROUPS = {
    peito: "Peito", ombro: "Ombro", costas: "Costas", biceps: "Bíceps", triceps: "Tríceps",
    pernas: "Pernas", core: "Abdômen", cardio: "Cardio"
  };

  // k: comp = composto, iso = isolado, core, cardio | met: gasto calórico relativo (1-3)
  // bw: peso corporal | time: medido em segundos | inc: incremento sugerido (kg)
  var EX = [
    { id: "supino_halter", n: "Supino reto com halteres", g: "peito", m: "Peitoral, tríceps, ombro anterior", eq: "Halteres + banco", k: "comp", met: 2, inc: 2,
      cues: ["Escápulas juntas e para baixo, pés firmes no chão", "Cotovelos ~45° do corpo, desça até alongar o peito", "Empurre para cima e levemente para dentro, sem travar"] },
    { id: "supino_barra", n: "Supino reto com barra", g: "peito", m: "Peitoral, tríceps, ombro anterior", eq: "Barra + banco", k: "comp", met: 2, inc: 2.5,
      cues: ["Pegada um pouco mais aberta que os ombros", "Desça a barra até a linha do mamilo, controlado", "Empurre sem tirar o quadril do banco"] },
    { id: "supino_inclinado_halter", n: "Supino inclinado com halteres", g: "peito", m: "Peitoral superior, ombro anterior", eq: "Halteres + banco inclinado", k: "comp", met: 2, inc: 2,
      cues: ["Banco a 30-40° (mais que isso vira ombro)", "Desça até os halteres ficarem ao lado do peito", "Suba juntando os halteres acima do peito"] },
    { id: "supino_inclinado_barra", n: "Supino inclinado com barra", g: "peito", m: "Peitoral superior, ombro anterior", eq: "Barra + banco inclinado", k: "comp", met: 2, inc: 2.5,
      cues: ["Barra desce na parte alta do peito", "Cotovelos levemente para dentro", "Não arqueie demais a lombar"] },
    { id: "supino_maquina", n: "Supino máquina (sentado)", g: "peito", m: "Peitoral, tríceps", eq: "Máquina", k: "comp", met: 2, inc: 5,
      cues: ["Ajuste o banco: pegadores na linha do peito", "Costas coladas no encosto", "Empurre sem travar e volte devagar (2-3 s)"] },
    { id: "crucifixo_halter", n: "Crucifixo com halteres", g: "peito", m: "Peitoral (alongamento)", eq: "Halteres + banco", k: "iso", met: 1, inc: 1,
      cues: ["Cotovelos levemente dobrados e fixos", "Abra até sentir alongar o peito, sem exagerar", "Feche como se abraçasse uma árvore"] },
    { id: "crossover", n: "Crossover polia alta", g: "peito", m: "Peitoral (porção inferior/média)", eq: "Polia dupla", k: "iso", met: 1, inc: 2.5,
      cues: ["Um pé à frente, tronco levemente inclinado", "Traga as mãos para baixo e à frente do quadril", "Aperte o peito 1 s no final"] },
    { id: "crossover_baixo", n: "Crossover de baixo para cima", g: "peito", m: "Peitoral superior", eq: "Polia dupla", k: "iso", met: 1, inc: 2.5,
      cues: ["Polias na posição mais baixa", "Suba as mãos em arco até a altura do queixo", "Cotovelos levemente dobrados o tempo todo"] },
    { id: "peck_deck", n: "Voador (peck deck)", g: "peito", m: "Peitoral", eq: "Máquina", k: "iso", met: 1, inc: 5,
      cues: ["Cotovelos na altura dos ombros", "Feche contraindo o peito, sem bater as alças", "Volte devagar até sentir alongar"] },
    { id: "flexao", n: "Flexão de braço", g: "peito", m: "Peitoral, tríceps, core", eq: "Peso corporal", k: "comp", met: 2, bw: true,
      cues: ["Mãos um pouco mais abertas que os ombros", "Corpo reto como prancha (abdômen firme)", "Peito quase no chão e empurre"] },
    { id: "flexao_inclinada", n: "Flexão inclinada (mãos no banco)", g: "peito", m: "Peitoral, tríceps", eq: "Banco / caixa", k: "comp", met: 2, bw: true,
      cues: ["Versão mais fácil da flexão", "Quanto mais alto o apoio, mais fácil", "Peito encosta na borda do banco"] },
    { id: "paralelas", n: "Paralelas (foco peito)", g: "peito", m: "Peitoral inferior, tríceps", eq: "Paralelas / graviton", k: "comp", met: 2, bw: true, inc: 5,
      cues: ["Incline o tronco à frente para pegar mais peito", "Desça até o ombro ficar na linha do cotovelo", "Use o graviton (assistido) se ainda não conseguir"] },
    { id: "pullover", n: "Pullover com halter", g: "peito", m: "Peitoral, dorsal, serrátil", eq: "Halter + banco", k: "iso", met: 1, inc: 2,
      cues: ["Segure um halter com as duas mãos", "Braços quase retos, leve atrás da cabeça", "Volte até acima do peito contraindo"] },

    { id: "desenvolvimento_halter", n: "Desenvolvimento com halteres", g: "ombro", m: "Deltoide, tríceps", eq: "Halteres + banco", k: "comp", met: 2, inc: 2,
      cues: ["Sentado, costas apoiadas", "Halteres saem da altura das orelhas", "Empurre para cima sem bater um no outro"] },
    { id: "elevacao_lateral", n: "Elevação lateral", g: "ombro", m: "Deltoide lateral", eq: "Halteres", k: "iso", met: 1, inc: 1,
      cues: ["Cotovelos levemente dobrados", "Suba até a linha do ombro, sem embalo", "Desça devagar (3 s)"] },
    { id: "elevacao_frontal", n: "Elevação frontal", g: "ombro", m: "Deltoide anterior", eq: "Halteres", k: "iso", met: 1, inc: 1,
      cues: ["Suba até a altura dos olhos", "Tronco parado, sem balançar", "Pode alternar os braços"] },
    { id: "face_pull", n: "Face pull (corda)", g: "ombro", m: "Deltoide posterior, trapézio, manguito", eq: "Polia + corda", k: "iso", met: 1, inc: 2.5,
      cues: ["Polia na altura do rosto", "Puxe a corda em direção à testa abrindo as mãos", "Cotovelos altos — ótimo para postura"] },

    { id: "puxada_frente", n: "Puxada frente (pulldown)", g: "costas", m: "Dorsal, bíceps", eq: "Polia alta", k: "comp", met: 2, inc: 5,
      cues: ["Pegada aberta, peito estufado", "Puxe a barra até o alto do peito", "Leve os cotovelos para baixo e para trás"] },
    { id: "barra_fixa", n: "Barra fixa", g: "costas", m: "Dorsal, bíceps", eq: "Barra / graviton", k: "comp", met: 2, bw: true, inc: 5,
      cues: ["Comece pendurado, braços estendidos", "Suba até o queixo passar a barra", "Use graviton ou elástico se precisar"] },
    { id: "remada_curvada", n: "Remada curvada com barra", g: "costas", m: "Dorsal, romboides, bíceps", eq: "Barra", k: "comp", met: 2, inc: 2.5,
      cues: ["Tronco inclinado ~45°, coluna neutra", "Puxe a barra até o umbigo", "Joelhos levemente dobrados, sem dar tranco"] },
    { id: "remada_baixa", n: "Remada baixa (triângulo)", g: "costas", m: "Dorsal, romboides", eq: "Polia baixa", k: "comp", met: 2, inc: 5,
      cues: ["Tronco ereto, sem jogar para trás", "Puxe até o abdômen", "Junte as escápulas no final"] },
    { id: "remada_unilateral", n: "Remada unilateral (serrote)", g: "costas", m: "Dorsal, romboides", eq: "Halter + banco", k: "comp", met: 2, inc: 2,
      cues: ["Joelho e mão apoiados no banco", "Puxe o halter em direção ao quadril", "Costas retas, sem girar o tronco"] },

    { id: "rosca_direta", n: "Rosca direta (barra)", g: "biceps", m: "Bíceps", eq: "Barra reta ou W", k: "iso", met: 1, inc: 2,
      cues: ["Cotovelos colados ao corpo", "Suba sem balançar o tronco", "Desça controlado até quase estender"] },
    { id: "rosca_martelo", n: "Rosca martelo", g: "biceps", m: "Bíceps, braquial, antebraço", eq: "Halteres", k: "iso", met: 1, inc: 1,
      cues: ["Palmas viradas uma para a outra", "Cotovelo parado", "Pode alternar os braços"] },

    { id: "triceps_corda", n: "Tríceps na corda", g: "triceps", m: "Tríceps", eq: "Polia alta + corda", k: "iso", met: 1, inc: 2.5,
      cues: ["Cotovelos fixos ao lado do corpo", "Estenda abrindo a corda no final", "Volte até 90° sem levantar o cotovelo"] },
    { id: "triceps_frances", n: "Tríceps francês (halter)", g: "triceps", m: "Tríceps (cabeça longa)", eq: "Halter", k: "iso", met: 1, inc: 2,
      cues: ["Halter acima da cabeça, cotovelos apontando para frente", "Desça atrás da cabeça", "Estenda sem abrir os cotovelos"] },
    { id: "triceps_banco", n: "Tríceps no banco", g: "triceps", m: "Tríceps, peito", eq: "Banco", k: "comp", met: 1, bw: true,
      cues: ["Mãos na borda do banco atrás de você", "Desça até o cotovelo fazer ~90°", "Joelhos dobrados = mais fácil"] },

    { id: "rosca_alternada", n: "Rosca alternada", g: "biceps", m: "Bíceps", eq: "Halteres", k: "iso", met: 1, inc: 1,
      cues: ["Um braço de cada vez", "Gire a palma para cima enquanto sobe", "Cotovelo parado ao lado do corpo"] },
    { id: "rosca_scott", n: "Rosca Scott", g: "biceps", m: "Bíceps (porção curta)", eq: "Banco Scott + barra W", k: "iso", met: 1, inc: 2,
      cues: ["Axilas encaixadas no topo do apoio", "Desça quase estendendo, sem soltar o peso", "Suba sem tirar o braço do apoio"] },
    { id: "rosca_concentrada", n: "Rosca concentrada", g: "biceps", m: "Bíceps (pico)", eq: "Halter + banco", k: "iso", met: 1, inc: 1,
      cues: ["Sentado, cotovelo apoiado na parte interna da coxa", "Suba devagar e aperte 1 s no topo", "Ótima para terminar o treino de bíceps"] },
    { id: "rosca_cabo", n: "Rosca na polia baixa", g: "biceps", m: "Bíceps", eq: "Polia baixa + barra", k: "iso", met: 1, inc: 2.5,
      cues: ["Tensão constante do início ao fim", "Cotovelos fixos ao lado do corpo", "Desça controlado, sem deixar o peso bater"] },
    { id: "triceps_testa", n: "Tríceps testa", g: "triceps", m: "Tríceps (cabeça longa)", eq: "Barra W + banco", k: "iso", met: 1, inc: 2,
      cues: ["Deitado, braços apontando para o teto (levemente para trás)", "Dobre só o cotovelo, levando a barra até a testa", "Cotovelos fechados, não abra para os lados"] },
    { id: "triceps_polia_barra", n: "Tríceps polia (barra reta)", g: "triceps", m: "Tríceps", eq: "Polia alta + barra", k: "iso", met: 1, inc: 2.5,
      cues: ["Pegada pronada (palmas para baixo)", "Cotovelos colados ao corpo", "Estenda tudo e volte até 90°"] },
    { id: "triceps_coice", n: "Tríceps coice (kickback)", g: "triceps", m: "Tríceps", eq: "Halteres", k: "iso", met: 1, inc: 1,
      cues: ["Tronco inclinado, braço colado ao corpo e paralelo ao chão", "Estenda o cotovelo para trás", "Use carga leve e segure 1 s esticado"] },
    { id: "supino_fechado", n: "Supino fechado", g: "triceps", m: "Tríceps, peito", eq: "Barra + banco", k: "comp", met: 2, inc: 2.5,
      cues: ["Pegada na largura dos ombros", "Cotovelos rentes ao corpo na descida", "Exercício pesado de tríceps — também trabalha o peito"] },
    { id: "agachamento_goblet", n: "Agachamento goblet", g: "pernas", m: "Quadríceps, glúteo", eq: "Halter / kettlebell", k: "comp", met: 3, inc: 2,
      cues: ["Halter junto ao peito", "Desça entre as pernas, peito aberto", "Joelhos acompanham a ponta dos pés"] },
    { id: "agachamento", n: "Agachamento livre (barra)", g: "pernas", m: "Quadríceps, glúteo, core", eq: "Barra + rack", k: "comp", met: 3, inc: 5,
      cues: ["Barra no trapézio, pés na largura dos ombros", "Quadril para trás e para baixo até a coxa paralela", "Suba empurrando o chão, coluna neutra"] },
    { id: "leg_press", n: "Leg press 45°", g: "pernas", m: "Quadríceps, glúteo", eq: "Máquina", k: "comp", met: 3, inc: 10,
      cues: ["Pés na largura do quadril no meio da plataforma", "Desça até ~90° sem tirar o quadril do banco", "Não trave os joelhos no topo"] },
    { id: "terra_romeno", n: "Levantamento terra romeno", g: "pernas", m: "Posterior de coxa, glúteo, lombar", eq: "Barra ou halteres", k: "comp", met: 3, inc: 5,
      cues: ["Joelhos levemente dobrados e fixos", "Leve o quadril para trás, barra rente às pernas", "Suba contraindo o glúteo"] },
    { id: "afundo", n: "Afundo (passada)", g: "pernas", m: "Quadríceps, glúteo", eq: "Halteres", k: "comp", met: 3, inc: 2,
      cues: ["Passo largo, tronco ereto", "Desça até o joelho de trás quase tocar o chão", "Empurre com o calcanhar da frente"] },
    { id: "cadeira_extensora", n: "Cadeira extensora", g: "pernas", m: "Quadríceps", eq: "Máquina", k: "iso", met: 1, inc: 5,
      cues: ["Joelho alinhado com o eixo da máquina", "Estenda e segure 1 s no topo", "Desça devagar"] },
    { id: "mesa_flexora", n: "Mesa flexora", g: "pernas", m: "Posterior de coxa", eq: "Máquina", k: "iso", met: 1, inc: 5,
      cues: ["Quadril colado no banco", "Traga o calcanhar em direção ao glúteo", "Desça sem deixar o peso bater"] },
    { id: "panturrilha", n: "Panturrilha em pé", g: "pernas", m: "Panturrilha", eq: "Step / máquina", k: "iso", met: 1, inc: 5,
      cues: ["Ponta dos pés na borda do step", "Suba o máximo e segure 1 s", "Desça alongando bem"] },
    { id: "elevacao_pelvica", n: "Elevação pélvica", g: "pernas", m: "Glúteo, posterior", eq: "Peso corporal / barra", k: "comp", met: 2, inc: 5,
      cues: ["Pés firmes, joelhos a 90° no topo", "Suba o quadril contraindo o glúteo", "Não arqueie a lombar"] },

    { id: "prancha", n: "Prancha", g: "core", m: "Abdômen, core", eq: "Peso corporal", k: "core", met: 1, bw: true, time: true,
      cues: ["Cotovelos abaixo dos ombros", "Corpo reto da cabeça ao calcanhar", "Contraia abdômen e glúteo, respire"] },
    { id: "abdominal", n: "Abdominal (crunch)", g: "core", m: "Reto abdominal", eq: "Peso corporal", k: "core", met: 1, bw: true,
      cues: ["Mãos cruzadas no peito", "Suba só até tirar as escápulas do chão", "Expire subindo, não puxe o pescoço"] },
    { id: "elevacao_pernas", n: "Elevação de pernas", g: "core", m: "Abdômen inferior", eq: "Peso corporal", k: "core", met: 1, bw: true,
      cues: ["Mãos embaixo do quadril", "Suba as pernas até 90°", "Desça devagar sem tirar a lombar do chão"] },
    { id: "mountain_climber", n: "Mountain climber", g: "cardio", m: "Core, ombros, cardio", eq: "Peso corporal", k: "cardio", met: 3, bw: true, time: true,
      cues: ["Posição de flexão, braços estendidos", "Leve os joelhos ao peito alternando, rápido", "Quadril baixo e estável"] },
    { id: "burpee", n: "Burpee", g: "cardio", m: "Corpo inteiro", eq: "Peso corporal", k: "cardio", met: 3, bw: true,
      cues: ["Agache, mãos no chão", "Jogue os pés para trás (prancha)", "Volte e salte com os braços para cima"] },
    { id: "polichinelo", n: "Polichinelo", g: "cardio", m: "Corpo inteiro", eq: "Peso corporal", k: "cardio", met: 2, bw: true, time: true,
      cues: ["Ritmo constante", "Abra pernas e braços ao mesmo tempo", "Aterrisse na ponta dos pés"] },
    { id: "bike", n: "Bike ergométrica (HIIT)", g: "cardio", m: "Cardio, pernas", eq: "Bicicleta", k: "cardio", met: 3, time: true, bw: true,
      cues: ["Banco na altura do quadril", "Tiros: 20-30 s forte / 40-60 s leve", "Ou 30-40 min moderado (consegue falar)"] },
    { id: "caminhada_inclinada", n: "Caminhada inclinada", g: "cardio", m: "Cardio, glúteo, panturrilha", eq: "Esteira", k: "cardio", met: 2, time: true, bw: true,
      cues: ["Inclinação 8-12%, velocidade 5-6 km/h", "Não se segure no painel", "30-40 min — ótimo para queimar gordura"] }
  ];

  var BY = {};
  EX.forEach(function (e) { BY[e.id] = e; });

  /* Objetivos: prescrição por papel do exercício no treino */
  var GOALS = {
    queima: {
      n: "Perder gordura (foco peito)", short: "Queima de gordura",
      desc: "Treino de força com descanso curto, supersets e finalizador metabólico. Mantém a massa muscular enquanto você está em déficit calórico.",
      main: { s: 4, lo: 10, hi: 12, rest: 60 }, acc: { s: 3, lo: 12, hi: 15, rest: 45 }, iso: { s: 3, lo: 12, hi: 15, rest: 45 },
      core: { s: 3, lo: 15, hi: 20, rest: 30, tlo: 30, thi: 45 }, fin: { s: 3, lo: 10, hi: 15, rest: 30, tlo: 30, thi: 40 },
      cardio: "3-4x por semana: 30-40 min de caminhada inclinada ou bike em ritmo moderado + 8-10 mil passos por dia.",
      tip: "Não existe queimar gordura só do peito: a gordura sai do corpo todo. O que funciona é déficit calórico (300-500 kcal/dia), proteína alta (1,6-2 g por kg) e treinar peito pesado para o músculo por baixo dar formato."
    },
    hipertrofia: {
      n: "Ganhar massa muscular", short: "Hipertrofia",
      desc: "Volume moderado-alto, faixa de 8-12 repetições e progressão de carga constante.",
      main: { s: 4, lo: 8, hi: 10, rest: 90 }, acc: { s: 3, lo: 10, hi: 12, rest: 75 }, iso: { s: 3, lo: 12, hi: 15, rest: 60 },
      core: { s: 3, lo: 12, hi: 15, rest: 45, tlo: 30, thi: 45 }, fin: { s: 2, lo: 10, hi: 12, rest: 45, tlo: 30, thi: 30 },
      cardio: "2x por semana: 20-30 min moderado, para saúde do coração sem atrapalhar a recuperação.",
      tip: "Coma em leve superávit (+200-300 kcal), proteína 1,6-2,2 g/kg e durma 7-9 h. Progrida carga ou repetições toda semana."
    },
    forca: {
      n: "Ganhar força", short: "Força",
      desc: "Cargas altas e poucas repetições nos exercícios principais, descanso longo.",
      main: { s: 5, lo: 4, hi: 6, rest: 150 }, acc: { s: 4, lo: 6, hi: 8, rest: 120 }, iso: { s: 3, lo: 8, hi: 10, rest: 75 },
      core: { s: 3, lo: 10, hi: 12, rest: 60, tlo: 30, thi: 45 }, fin: { s: 2, lo: 8, hi: 10, rest: 60, tlo: 20, thi: 30 },
      cardio: "2x por semana: 20 min leve. Evite cardio intenso antes do treino de pernas.",
      tip: "Técnica primeiro. Aqueça com 2-3 séries leves antes do exercício principal. Deixe 1-2 repetições na reserva."
    },
    resistencia: {
      n: "Condicionamento", short: "Condicionamento",
      desc: "Mais repetições, descanso curto e circuitos. Melhora fôlego e gasto calórico.",
      main: { s: 3, lo: 15, hi: 20, rest: 45 }, acc: { s: 3, lo: 15, hi: 20, rest: 30 }, iso: { s: 3, lo: 15, hi: 20, rest: 30 },
      core: { s: 3, lo: 20, hi: 25, rest: 20, tlo: 40, thi: 60 }, fin: { s: 4, lo: 12, hi: 15, rest: 20, tlo: 40, thi: 45 },
      cardio: "3-5x por semana: alterne 1 dia de HIIT (tiros) com dias de cardio moderado de 30-45 min.",
      tip: "Use cargas que permitam todas as repetições com boa técnica. Respire de forma ritmada."
    }
  };

  /* Programa: rotação A → B → C → D (peito em 3 de 4 treinos).
     slot: { ex, r: papel, ss: superset (mesmo número = mesmo bloco), alt: { objetivo|ini: exercício } } */
  var PROGRAM = {
    A: { n: "Peito & Ombros", sub: "Peito pesado + ombro", slots: [
      { ex: "supino_halter", r: "main", alt: { forca: "supino_barra" } },
      { ex: "supino_inclinado_halter", r: "main" },
      { ex: "desenvolvimento_halter", r: "acc" },
      { ex: "crossover", r: "iso", ss: 1, alt: { ini: "peck_deck" } },
      { ex: "elevacao_lateral", r: "iso", ss: 1 },
      { ex: "triceps_corda", r: "iso", ss: 2 },
      { ex: "flexao", r: "fin", ss: 2, alt: { ini: "flexao_inclinada" } },
      { ex: "prancha", r: "core" }
    ]},
    B: { n: "Costas, Bíceps & Peito", sub: "Puxadas + volume de peito", slots: [
      { ex: "puxada_frente", r: "main", alt: { forca: "barra_fixa" } },
      { ex: "remada_curvada", r: "main", alt: { ini: "remada_baixa" } },
      { ex: "remada_unilateral", r: "acc" },
      { ex: "peck_deck", r: "iso", ss: 1 },
      { ex: "face_pull", r: "iso", ss: 1 },
      { ex: "rosca_direta", r: "iso", ss: 2 },
      { ex: "flexao_inclinada", r: "fin", ss: 2, alt: { forca: "flexao", hipertrofia: "flexao" } },
      { ex: "elevacao_pernas", r: "core" }
    ]},
    C: { n: "Pernas & Core", sub: "Grandes músculos = mais calorias", slots: [
      { ex: "agachamento_goblet", r: "main", alt: { forca: "agachamento", hipertrofia: "agachamento" } },
      { ex: "terra_romeno", r: "main" },
      { ex: "leg_press", r: "acc" },
      { ex: "afundo", r: "acc", ss: 1 },
      { ex: "panturrilha", r: "iso", ss: 1 },
      { ex: "elevacao_pelvica", r: "acc", ss: 2 },
      { ex: "abdominal", r: "core", ss: 2 },
      { ex: "bike", r: "fin", hiit: true }
    ]},
    D: { n: "Peito & Braços", sub: "Peito superior + metabólico", slots: [
      { ex: "supino_inclinado_barra", r: "main", alt: { ini: "supino_maquina" } },
      { ex: "paralelas", r: "acc", alt: { ini: "supino_maquina" } },
      { ex: "crossover_baixo", r: "iso", ss: 1 },
      { ex: "pullover", r: "iso", ss: 1 },
      { ex: "triceps_frances", r: "iso", ss: 2 },
      { ex: "rosca_martelo", r: "iso", ss: 2 },
      { ex: "mountain_climber", r: "fin", ss: 3, alt: { forca: "polichinelo" } },
      { ex: "burpee", r: "fin", ss: 3, alt: { ini: "polichinelo" } }
    ]}
  };
  var SEQ = ["A", "B", "C", "D"];

  var ROLE_NAMES = { main: "Principal", acc: "Complementar", iso: "Isolado", core: "Abdômen", fin: "Finalizador" };

  G.DB = { GROUPS: GROUPS, EX: EX, BY: BY, GOALS: GOALS, PROGRAM: PROGRAM, SEQ: SEQ, ROLE_NAMES: ROLE_NAMES };
})(window);
