(function () {
  "use strict";
  var DB = window.DB, BY = DB.BY;
  var KEY = "meutreino_v1";
  var AND = window.Android || null;

  /* ---------------- Estado ---------------- */
  function defaults() {
    return { goal: "queima", level: "ini", cardioGoal: 3, theme: "auto", history: [], logs: {}, meas: [], swaps: {}, cardio: [], draft: null, sel: null, soloDay: null, custom: {} };
  }
  var S = (function () {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) { var o = JSON.parse(raw), d = defaults(); for (var k in d) if (o[k] === undefined) o[k] = d[k]; return o; }
    } catch (e) {}
    return defaults();
  })();
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }

  /* ---------------- Utilidades ---------------- */
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function num(v) { if (v == null || v === "") return null; var n = parseFloat(String(v).replace(",", ".")); return isNaN(n) ? null : n; }
  function fmtN(n) { if (n == null) return "—"; return (Math.round(n * 10) / 10).toString().replace(".", ","); }
  function fmtD(d) { return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }); }
  function fmtDW(d) { return new Date(d).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" }); }
  function fmtT(s) { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ":" + ("0" + (s % 60)).slice(-2); }
  function weekStart() { var d = new Date(); d.setHours(0, 0, 0, 0); var wd = (d.getDay() + 6) % 7; d.setDate(d.getDate() - wd); return d.getTime(); }
  var toastT;
  function toast(msg) { var t = $("#toast"); t.textContent = msg; t.classList.add("on"); clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove("on"); }, 2200); }
  function vibrate(ms) { try { if (AND && AND.vibrate) AND.vibrate(ms); else if (navigator.vibrate) navigator.vibrate(ms); } catch (e) {} }
  function beep() {
    try {
      var C = window.AudioContext || window.webkitAudioContext; if (!C) return;
      var ctx = beep.ctx || (beep.ctx = new C());
      [0, 0.22].forEach(function (off) {
        var o = ctx.createOscillator(), g = ctx.createGain();
        o.frequency.value = 880; o.connect(g); g.connect(ctx.destination);
        g.gain.setValueAtTime(0.0001, ctx.currentTime + off);
        g.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + off + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + off + 0.18);
        o.start(ctx.currentTime + off); o.stop(ctx.currentTime + off + 0.2);
      });
    } catch (e) {}
  }

  /* ---------------- Programa ---------------- */
  function goal() { return DB.GOALS[S.goal] || DB.GOALS.queima; }
  function slots(l) { return (S.custom && S.custom[l]) || DB.PROGRAM[l].slots; }
  function isCustom(l) { return !!(S.custom && S.custom[l]); }
  function ensureCustom(l) {
    if (!isCustom(l)) {
      S.custom[l] = DB.PROGRAM[l].slots.map(function (sl, i) { return { ex: slotEx(l, i), r: sl.r, ss: sl.ss || null, hiit: !!sl.hiit }; });
      Object.keys(S.swaps).forEach(function (k) { if (k.charAt(0) === l) delete S.swaps[k]; });
    }
    return S.custom[l];
  }
  function normalize(l) {
    var a = S.custom[l];
    a.forEach(function (sl, i) {
      if (!sl.ss) return;
      var prev = a[i - 1], next = a[i + 1];
      if (!(prev && prev.ss === sl.ss) && !(next && next.ss === sl.ss)) sl.ss = null;
    });
  }
  function slotEx(letter, i) {
    if (isCustom(letter)) return S.custom[letter][i].ex;
    var sl = DB.PROGRAM[letter].slots[i];
    var sw = S.swaps[letter + i];
    if (sw && BY[sw]) return sw;
    if (sl.alt && sl.alt[S.goal]) return sl.alt[S.goal];
    if (S.level === "ini" && sl.alt && sl.alt.ini) return sl.alt.ini;
    return sl.ex;
  }
  function presc(letter, i) {
    var sl = slots(letter)[i];
    var ex = BY[slotEx(letter, i)];
    var p = goal()[sl.r];
    var o = { s: p.s, lo: p.lo, hi: p.hi, rest: p.rest, time: !!ex.time };
    if (ex.time) { o.lo = p.tlo || 30; o.hi = p.thi || 45; }
    if (sl.hiit) { o.s = S.goal === "forca" ? 6 : 8; o.lo = 20; o.hi = 30; o.rest = 40; o.hiit = true; }
    if (S.level === "ini" && sl.r === "main" && o.s > 3) o.s = o.s - 1;
    if (sl.s) o.s = sl.s;
    // superset: só descansa depois do último exercício do bloco
    var all = slots(letter);
    if (soloToday()) { if (sl.ss) o.rest += 15; }
    else if (sl.ss && all[i + 1] && all[i + 1].ss === sl.ss) o.chain = true;
    return o;
  }
  function blocks(letter) {
    var out = [], cur = null;
    slots(letter).forEach(function (sl, i) {
      var ss = soloToday() ? null : (sl.ss || null);
      if (ss && cur && cur.ss === ss) { cur.items.push(i); return; }
      cur = { ss: ss, items: [i], r: sl.r };
      out.push(cur);
    });
    return out;
  }
  function todayKey() { var d = new Date(); return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate(); }
  function soloToday() { return S.soloDay === todayKey(); }
  function nextLetter() {
    var h = S.history.filter(function (x) { return x.w; });
    if (!h.length) return "A";
    var last = h[h.length - 1].w;
    return DB.SEQ[(DB.SEQ.indexOf(last) + 1) % DB.SEQ.length];
  }
  function estMinutes(letter) {
    var t = 0;
    slots(letter).forEach(function (sl, i) {
      var p = presc(letter, i);
      t += p.s * ((p.time ? p.hi : 40) + (p.chain ? 10 : p.rest));
    });
    return Math.round(t / 60 / 5) * 5 + 5;
  }

  /* ---------------- Sugestão de carga ---------------- */
  function lastLogs(id) { return (S.logs[id] || []); }
  function workW(sets) {
    var ws = sets.map(function (s) { return s.w; }).filter(function (w) { return w != null; });
    if (!ws.length) return null;
    return Math.max.apply(null, ws);
  }
  function roundInc(w, inc) { return Math.round(w / inc) * inc; }
  function suggest(id, p) {
    var ex = BY[id], logs = lastLogs(id);
    var unit = p.time ? "s" : "reps";
    if (p.hiit) return { txt: "Aqueça 3 min. Depois <b>" + p.s + " tiros de 20-30 s forte</b> com 40 s leve entre eles.", w: null };
    if (!logs.length) {
      if (ex.bw && !ex.inc) return { txt: "Primeira vez: faça o máximo com boa técnica, até <b>" + p.hi + " " + unit + "</b>. Anote o que conseguiu.", w: null };
      return { txt: "Primeira vez: escolha uma carga em que você faria <b>" + p.hi + " reps</b> sobrando 2 no tanque.", w: null };
    }
    var last = logs[logs.length - 1];
    var sets = last.sets.filter(function (s) { return s.r != null; });
    if (!sets.length) return { txt: "Registre carga e repetições para receber sugestões.", w: null };
    var W = workW(last.sets);
    var allTop = sets.length >= Math.min(p.s, last.sets.length) && sets.every(function (s) { return s.r >= p.hi; });
    var anyLow = sets.some(function (s) { return s.r < p.lo; });
    var inc = ex.inc || 2;
    if (W == null || ex.bw && !W) {
      if (allTop) return { txt: "Você bateu " + p.hi + " " + unit + " em todas! " + (ex.inc ? "Adicione carga (colete/anilha) ou " : "") + "tente <b>" + (p.hi + (p.time ? 10 : 2)) + " " + unit + "</b>.", up: true, w: null };
      var best = Math.max.apply(null, sets.map(function (s) { return s.r; }));
      return { txt: "Última: melhor série " + best + " " + unit + ". Tente <b>+1 " + (p.time ? "a 5 s" : "rep") + "</b> por série hoje.", w: null };
    }
    if (allTop) return { txt: "Bateu o topo (" + p.hi + ") em todas as séries! Suba para <b>" + fmtN(W + inc) + " kg</b> e volte para " + p.lo + " reps.", up: true, w: W + inc };
    if (anyLow) {
      var prev = logs[logs.length - 2];
      var prevLow = prev && workW(prev.sets) === W && prev.sets.some(function (s) { return s.r != null && s.r < p.lo; });
      if (prevLow) { var nw = Math.max(inc, roundInc(W * 0.9, inc)); return { txt: "Duas sessões abaixo de " + p.lo + " reps. Reduza para <b>" + fmtN(nw) + " kg</b> e reconstrua.", w: nw }; }
      return { txt: "Ficou abaixo de " + p.lo + " reps. Mantenha <b>" + fmtN(W) + " kg</b> e busque " + p.lo + "+ em todas.", w: W };
    }
    return { txt: "Mantenha <b>" + fmtN(W) + " kg</b> e tente +1 rep por série (meta: " + p.hi + ").", w: W };
  }

  /* ---------------- Rascunho do treino em andamento ---------------- */
  function draft(letter) {
    if (!S.draft || S.draft.letter !== letter) return null;
    return S.draft;
  }
  function ensureDraft(letter) {
    if (S.draft && S.draft.letter !== letter) {
      if (!confirm("Existe um treino " + S.draft.letter + " em andamento. Descartar e começar o " + letter + "?")) return null;
      S.draft = null;
    }
    if (!S.draft) S.draft = { letter: letter, start: Date.now(), ex: {} };
    return S.draft;
  }

  /* ---------------- Navegação ---------------- */
  var TITLES = { hoje: "Hoje", treino: "Treino", prog: "Progresso", lib: "Exercícios", perfil: "Perfil" };
  var cur = "hoje";
  var viewLetter = null;
  function go(v, opts) {
    cur = v;
    $$(".view").forEach(function (s) { s.classList.remove("active"); });
    $("#v-" + v).classList.add("active");
    $$("nav.tabs button").forEach(function (b) { b.classList.toggle("active", b.getAttribute("data-view") === v); });
    $("#pageTitle").textContent = TITLES[v];
    if (v === "treino" && opts && opts.letter) viewLetter = opts.letter;
    render(v);
    $("#main").scrollTop = 0;
  }
  function render(v) {
    ({ hoje: renderHoje, treino: renderTreino, prog: renderProg, lib: renderLib, perfil: renderPerfil })[v]();
    $("#goalChip").textContent = goal().short;
  }

  /* ---------------- HOJE ---------------- */
  function renderHoje() {
    var nx = nextLetter(), W = DB.PROGRAM[nx];
    var ws = weekStart();
    var wk = S.history.filter(function (h) { return h.d >= ws; }).length;
    var ck = S.cardio.filter(function (c) { return c.d >= ws; }).length;
    var total = S.history.length;
    var sub = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
    $("#pageSub").textContent = sub.charAt(0).toUpperCase() + sub.slice(1);
    var h = "";
    if (S.draft) {
      var dn = 0; for (var k in S.draft.ex) dn += S.draft.ex[k].filter(function (s) { return s.done; }).length;
      h += '<div class="banner"><div class="grow"><b>Treino ' + S.draft.letter + ' em andamento</b><div class="muted">' + dn + " séries feitas · começou " + fmtT((Date.now() - S.draft.start) / 1000).replace(/:\d+$/, "") + ' min atrás</div></div><button class="pill on" data-act="resume">Continuar</button></div>';
    }
    h += '<div class="next-card"><div class="letter">' + nx + '</div><div class="grow"><div class="lbl">Próximo treino</div><div class="nm">' + W.n + '</div><div class="meta">' + slots(nx).length + " exercícios · ~" + estMinutes(nx) + " min</div></div></div>";
    h += '<button class="btn primary" data-act="start" data-l="' + nx + '">Começar treino ' + nx + "</button>";
    h += '<div class="stats" style="margin-top:14px">' +
      '<div class="stat"><b>' + wk + '</b><span>treinos na semana</span></div>' +
      '<div class="stat"><b>' + ck + "/" + S.cardioGoal + '</b><span>cardio na semana</span></div>' +
      '<div class="stat"><b>' + total + '</b><span>treinos no total</span></div></div>';
    h += '<button class="btn ghost small" data-act="cardio">+ Registrar cardio</button>';
    h += '<p class="sec-title">Dica do professor</p><div class="card tip"><div class="muted">' + goal().tip + '</div><div class="muted" style="margin-top:8px"><b style="color:var(--ink)">Cardio:</b> ' + goal().cardio + "</div></div>";
    h += '<p class="sec-title">Histórico</p><div class="card">';
    var items = S.history.map(function (x) { return { d: x.d, w: x.w, min: x.min, n: x.n }; })
      .concat(S.cardio.map(function (c) { return { d: c.d, c: c }; }))
      .sort(function (a, b) { return b.d - a.d; }).slice(0, 12);
    if (!items.length) h += '<p class="empty">Nenhum treino registrado ainda. Bora começar! 💪</p>';
    items.forEach(function (it) {
      if (it.c) h += '<div class="hist-row"><span class="badge cardio">♥</span><span class="grow">' + esc(it.c.t) + " · " + it.c.min + ' min</span><span class="muted">' + fmtDW(it.d) + "</span></div>";
      else h += '<div class="hist-row"><span class="badge">' + it.w + '</span><span class="grow">' + (DB.PROGRAM[it.w] ? DB.PROGRAM[it.w].n : "") + (it.min ? " · " + it.min + " min" : "") + (it.n ? " · " + it.n + " séries" : "") + '</span><span class="muted">' + fmtDW(it.d) + "</span></div>";
    });
    h += "</div>";
    if (S.history.length || S.cardio.length) h += '<button class="btn ghost small" data-act="undo">Desfazer último registro</button>';
    $("#v-hoje").innerHTML = h;
  }

  /* ---------------- TREINO ---------------- */
  function renderTreino() {
    var nx = nextLetter();
    var L = viewLetter || (S.draft ? S.draft.letter : nx);
    viewLetter = L;
    var W = DB.PROGRAM[L];
    $("#pageSub").textContent = "Rotação A → B → C → D · " + goal().short;
    var h = '<div class="seg">' + DB.SEQ.map(function (l) {
      return '<button data-act="letter" data-l="' + l + '" class="' + (l === L ? "on" : "") + '"><b>' + l + (l === nx ? '<i class="nx"></i>' : "") + "</b><span>" + DB.PROGRAM[l].n.split(" ")[0].replace(",", "") + "</span></button>";
    }).join("") + "</div>";
    h += '<div class="w-head row"><div class="grow"><h2>Treino ' + L + " — " + W.n + '</h2><div class="muted">' + (isCustom(L) ? "Personalizado" : W.sub) + " · ~" + estMinutes(L) + " min" + (L === nx ? " · <b style='color:var(--accent)'>é o de hoje</b>" : "") + "</div></div>" +
      (editMode ? "" : '<button class="pill" data-act="edit">✎ Editar</button>') + "</div>";
    if (editMode) { $("#v-treino").innerHTML = h + editorHTML(L); $$("#v-treino .fig-box[data-fig]").forEach(function (el) { Fig.mount(el, el.getAttribute("data-fig")); }); return; }
    var solo = soloToday();
    h += '<div class="card solo-card"><div class="row"><div class="grow"><b style="font-size:14px">Academia cheia? Fazer tudo separado hoje</b><div class="muted" style="font-size:12px;margin-top:2px">' +
      (solo ? "Ligado só para hoje: cada exercício tem seu próprio descanso (~10 min a mais). Amanhã volta ao normal." : "Recomendado para você: pesados sozinhos + acessórios em superset (mais calorias em menos tempo).") +
      '</div></div><button class="switch' + (solo ? " on" : "") + '" data-act="solo" aria-label="Fazer tudo separado hoje"><i></i></button></div></div>';
    var d = draft(L);
    blocks(L).forEach(function (b) {
      var cls = b.ss ? "super" : (b.r === "fin" ? "fin" : "solo");
      var lab = b.ss ? (b.items.length > 1 ? "Superset — faça um seguido do outro" : "Superset") : (b.r === "fin" ? "Finalizador" : b.r === "core" ? "Abdômen" : DB.ROLE_NAMES[b.r]);
      if (b.ss && b.items.every(function (i) { return slots(L)[i].r === "fin"; })) { cls = "fin"; lab = "Finalizador em circuito"; }
      h += '<div class="block ' + cls + '"><span class="block-tag">' + lab + "</span>";
      b.items.forEach(function (i) { h += exCard(L, i, d); });
      h += "</div>";
    });
    h += '<button class="btn accent" data-act="finish" data-l="' + L + '">Concluir treino ' + L + "</button>";
    if (d) h += '<button class="btn ghost small" data-act="discard">Descartar treino em andamento</button>';
    $("#v-treino").innerHTML = h;
    $$("#v-treino .fig-box[data-fig]").forEach(function (el) { Fig.mount(el, el.getAttribute("data-fig")); });
  }

  var editMode = false, addGroup = "biceps";
  var ROLE_LBL = { main: "Principal", acc: "Complementar", iso: "Isolado", core: "Abdômen", fin: "Finalizador" };
  function editorHTML(L) {
    var a = slots(L);
    var h = '<div class="card tip"><div class="muted">Monte o treino do seu jeito: <b style="color:var(--ink)">↑ ↓</b> muda a ordem, <b style="color:var(--ink)">− +</b> muda o número de séries, <b style="color:var(--ink)">🔗</b> junta dois exercícios em superset. Repetições e descanso seguem o seu objetivo.</div></div>';
    a.forEach(function (sl, i) {
      var ex = BY[slotEx(L, i)], p = presc(L, i);
      h += '<div class="ed-item"><div class="fig-box" data-fig="' + ex.id + '"></div><div class="grow"><b>' + ex.n + '</b><span>' + ROLE_LBL[sl.r] + " · " + DB.GROUPS[ex.g] + '</span>' +
        '<div class="ed-ctrl"><button data-act="edsets" data-i="' + i + '" data-d="-1">−</button><span>' + p.s + ' séries</span><button data-act="edsets" data-i="' + i + '" data-d="1">+</button></div></div>' +
        '<div class="ed-btns"><button data-act="edmove" data-i="' + i + '" data-d="-1"' + (i ? "" : " disabled") + '>↑</button><button data-act="edmove" data-i="' + i + '" data-d="1"' + (i < a.length - 1 ? "" : " disabled") + '>↓</button>' +
        '<button data-act="swap" data-slot="' + L + i + '">⇄</button><button data-act="edrm" data-i="' + i + '" class="rm">✕</button></div></div>';
      if (i < a.length - 1) {
        var on = sl.ss && a[i + 1].ss === sl.ss;
        h += '<button class="ed-link' + (on ? " on" : "") + '" data-act="edlink" data-i="' + i + '">' + (on ? "🔗 Superset com o de baixo (toque para separar)" : "＋ juntar em superset com o de baixo") + "</button>";
      }
    });
    h += '<button class="btn primary" data-act="edadd">+ Adicionar exercício</button>';
    h += '<button class="btn accent" data-act="eddone">Pronto</button>';
    if (isCustom(L)) h += '<button class="btn ghost small" data-act="edreset">Restaurar treino ' + L + " original</button>";
    return h;
  }
  function addSheet(L) {
    var h = "<h2>Adicionar ao treino " + L + '</h2><div class="chips" style="margin-top:10px">' + Object.keys(DB.GROUPS).map(function (g) {
      return '<button class="pill' + (g === addGroup ? " on" : "") + '" data-act="addgrp" data-g="' + g + '">' + DB.GROUPS[g] + "</button>";
    }).join("") + '</div><div style="margin-top:12px">';
    var used = slots(L).map(function (sl, i) { return slotEx(L, i); });
    DB.EX.filter(function (e) { return e.g === addGroup; }).forEach(function (e) {
      h += '<div class="alt-item" data-act="doadd" data-id="' + e.id + '"><div class="fig-box" data-fig="' + e.id + '"></div><div class="grow">' + (used.indexOf(e.id) >= 0 ? '<span class="tag">JÁ ESTÁ NO TREINO</span>' : "") + "<b>" + e.n + "</b><span>" + e.eq + "</span></div></div>";
    });
    h += '</div><button class="btn ghost" data-act="close">Fechar</button>';
    openSheet(h);
  }
  function startEdit(L) {
    if (S.draft && S.draft.letter === L) {
      if (!confirm("Editar o treino descarta as séries já marcadas hoje no treino " + L + ". Continuar?")) return;
      S.draft = null; stopTimer();
    }
    editMode = true; save(); renderTreino();
  }

  function exCard(L, i, d) {
    var id = slotEx(L, i), ex = BY[id], p = presc(L, i);
    var sg = suggest(id, p);
    var logs = lastLogs(id), last = logs[logs.length - 1];
    var ds = d && d.ex[L + i] ? d.ex[L + i] : [];
    var unitR = p.time ? "seg" : "reps";
    var h = '<div class="ex-card" data-slot="' + L + i + '">';
    h += '<div class="ex-top"><div class="fig-box" data-fig="' + id + '" data-act="detail" data-id="' + id + '"></div><div class="ex-info">' +
      '<div class="ex-name">' + ex.n + '</div><div class="ex-mus">' + ex.m + "</div>" +
      '<div class="presc"><span>' + p.s + " × " + p.lo + "-" + p.hi + (p.time ? " s" : "") + '</span><span class="r">' + (p.chain ? "sem descanso →" : "descanso " + p.rest + "s") + "</span></div></div></div>";
    h += '<div class="sug' + (sg.up ? " up" : "") + '">💡 ' + sg.txt + "</div>";
    var showW = !(ex.bw && !ex.inc) && !p.hiit;
    h += '<div class="sets"><div class="set-head"><span>#</span><span>' + (showW ? "kg" : (ex.bw ? "extra kg" : "")) + "</span><span>" + unitR + "</span><span>ok</span></div>";
    for (var s = 0; s < p.s; s++) {
      var ls = last && last.sets[s] ? last.sets[s] : (last && last.sets[last.sets.length - 1]) || null;
      var phW = sg.w != null ? fmtN(sg.w) : (ls && ls.w != null ? fmtN(ls.w) : (showW ? "kg" : "—"));
      var phR = ls && ls.r != null ? ls.r : (p.lo + "-" + p.hi);
      var cs = ds[s] || {};
      h += '<div class="set-row' + (cs.done ? " done" : "") + '" data-s="' + s + '"><span class="n">' + (s + 1) + "</span>" +
        '<input inputmode="decimal" data-f="w" placeholder="' + phW + '" value="' + (cs.w != null ? fmtN(cs.w) : "") + '"' + (showW || ex.bw ? "" : " disabled") + ">" +
        '<input inputmode="numeric" data-f="r" placeholder="' + phR + '" value="' + (cs.r != null ? cs.r : "") + '">' +
        '<button class="ck" data-act="set">✓</button></div>';
    }
    h += "</div>";
    if (last) h += '<div class="last-line">Última vez (' + fmtD(last.d) + "): " + last.sets.map(function (x) { return (x.w != null ? fmtN(x.w) + "×" : "") + (x.r != null ? x.r : "?"); }).join(" · ") + "</div>";
    h += '<div class="ex-actions"><button data-act="detail" data-id="' + id + '">Como fazer</button><button data-act="swap" data-slot="' + L + i + '">Trocar exercício</button></div>';
    h += "</div>";
    return h;
  }

  function readSet(row) {
    var w = num($('input[data-f="w"]', row).value), r = num($('input[data-f="r"]', row).value);
    var phW = num($('input[data-f="w"]', row).getAttribute("placeholder"));
    var phR = $('input[data-f="r"]', row).getAttribute("placeholder");
    if (w == null && phW != null && !$('input[data-f="w"]', row).disabled) w = phW;
    if (r == null && /^\d+$/.test(phR)) r = parseInt(phR, 10);
    return { w: w, r: r };
  }

  function onSet(btn) {
    var row = btn.closest(".set-row"), card = btn.closest(".ex-card");
    var slot = card.getAttribute("data-slot"), L = slot.charAt(0), i = parseInt(slot.slice(1), 10);
    var d = ensureDraft(L); if (!d) return;
    var s = parseInt(row.getAttribute("data-s"), 10);
    var arr = d.ex[slot] || (d.ex[slot] = []);
    var was = arr[s] && arr[s].done;
    if (was) { arr[s].done = false; row.classList.remove("done"); save(); return; }
    var v = readSet(row);
    if (v.r == null) { toast("Digite as repetições (ou segundos)"); $('input[data-f="r"]', row).focus(); return; }
    arr[s] = { w: v.w, r: v.r, done: true };
    $('input[data-f="w"]', row).value = v.w != null ? fmtN(v.w) : "";
    $('input[data-f="r"]', row).value = v.r;
    row.classList.add("done");
    // propaga a carga para as próximas séries vazias
    var rows = $$(".set-row", card);
    rows.forEach(function (rw, k) {
      if (k > s && !rw.classList.contains("done") && v.w != null) { var wi = $('input[data-f="w"]', rw); if (!wi.value) wi.setAttribute("placeholder", fmtN(v.w)); }
    });
    save();
    var p = presc(L, i);
    if (p.chain) { toast("Agora vá direto para o próximo exercício do superset ↓"); stopTimer(); }
    else startTimer(p.rest, BY[slotEx(L, i)].n);
  }

  function finish(L) {
    var d = draft(L);
    var n = 0;
    if (!d) { if (!confirm("Nenhuma série marcada. Registrar o treino " + L + " como feito mesmo assim?")) return; }
    else {
      for (var slot in d.ex) {
        var sets = d.ex[slot].filter(function (s) { return s && s.done; }).map(function (s) { return { w: s.w, r: s.r }; });
        if (!sets.length) continue;
        n += sets.length;
        var id = slotEx(slot.charAt(0), parseInt(slot.slice(1), 10));
        (S.logs[id] || (S.logs[id] = [])).push({ d: Date.now(), sets: sets });
      }
    }
    var min = d ? Math.max(1, Math.round((Date.now() - d.start) / 60000)) : null;
    S.history.push({ d: Date.now(), w: L, min: min, n: n || null });
    S.draft = null; viewLetter = null;
    save(); stopTimer();
    toast("Treino " + L + " concluído! Próximo: " + nextLetter() + " 🔥");
    go("hoje");
  }

  /* ---------------- Timer de descanso ---------------- */
  var tEnd = 0, tTotal = 0, tInt = null;
  function startTimer(sec, name) {
    tTotal = sec; tEnd = Date.now() + sec * 1000;
    $("#timerLbl").textContent = "Descanso · " + name;
    $("#timer").classList.add("on");
    if (AND && AND.keepOn) try { AND.keepOn(true); } catch (e) {}
    clearInterval(tInt); tInt = setInterval(tickTimer, 250); tickTimer();
  }
  function tickTimer() {
    var left = (tEnd - Date.now()) / 1000;
    $("#timerVal").textContent = fmtT(Math.ceil(left));
    $("#timerBar").style.width = Math.max(0, Math.min(100, (1 - left / tTotal) * 100)) + "%";
    if (left <= 0) { stopTimer(); vibrate(700); beep(); toast("Descanso acabou — próxima série! 💪"); }
  }
  function stopTimer() { clearInterval(tInt); tInt = null; $("#timer").classList.remove("on"); }

  /* ---------------- Gráfico ---------------- */
  function chart(pts, opt) {
    opt = opt || {};
    var W = 320, H = 150, pl = 34, pr = 10, pt = 12, pb = 22;
    if (!pts.length) return '<p class="empty">Sem dados ainda.</p>';
    var ys = pts.map(function (p) { return p.y; }).concat(pts.map(function (p) { return p.y2; }).filter(function (v) { return v != null; }));
    var mn = Math.min.apply(null, ys), mx = Math.max.apply(null, ys);
    if (mx - mn < 1) { mx += 1; mn -= 1; }
    var pad = (mx - mn) * 0.12; mn -= pad; mx += pad;
    var n = pts.length;
    function X(i) { return n === 1 ? (pl + W - pr) / 2 : pl + (W - pl - pr) * i / (n - 1); }
    function Y(v) { return pt + (H - pt - pb) * (1 - (v - mn) / (mx - mn)); }
    var s = '<svg class="chart" viewBox="0 0 ' + W + " " + H + '">';
    [0, 0.5, 1].forEach(function (f) { var v = mn + (mx - mn) * f, y = Y(v); s += '<line class="gr" x1="' + pl + '" x2="' + (W - pr) + '" y1="' + y + '" y2="' + y + '"/><text x="' + (pl - 5) + '" y="' + (y + 3) + '" text-anchor="end">' + fmtN(v) + "</text>"; });
    if (pts.some(function (p) { return p.y2 != null; })) s += '<path class="ln2" d="' + pts.map(function (p, i) { return (i ? "L" : "M") + X(i).toFixed(1) + " " + Y(p.y2).toFixed(1); }).join("") + '"/>';
    s += '<path class="ln" d="' + pts.map(function (p, i) { return (i ? "L" : "M") + X(i).toFixed(1) + " " + Y(p.y).toFixed(1); }).join("") + '"/>';
    pts.forEach(function (p, i) { s += '<circle class="dt" cx="' + X(i) + '" cy="' + Y(p.y) + '" r="' + (i === n - 1 ? 4 : 2.5) + '"/>'; });
    s += '<text x="' + pl + '" y="' + (H - 6) + '">' + fmtD(pts[0].d) + '</text><text x="' + (W - pr) + '" y="' + (H - 6) + '" text-anchor="end">' + fmtD(pts[n - 1].d) + "</text>";
    return s + "</svg>";
  }

  /* ---------------- PROGRESSO ---------------- */
  var measKey = "peso";
  var MEAS = { peso: ["Peso", "kg"], cintura: ["Cintura", "cm"], peito: ["Peito", "cm"] };
  function renderProg() {
    $("#pageSub").textContent = "Medidas e evolução de cargas";
    var h = '<div class="card"><div class="row"><h3 class="grow" style="margin:0">Medidas corporais</h3><button class="pill on" data-act="meas">+ Nova medição</button></div>';
    h += '<div class="meas-grid" style="margin-top:12px">';
    Object.keys(MEAS).forEach(function (k) {
      var arr = S.meas.filter(function (m) { return m[k] != null; });
      var lastV = arr.length ? arr[arr.length - 1][k] : null, first = arr.length ? arr[0][k] : null;
      var dl = lastV != null && arr.length > 1 ? lastV - first : null;
      h += '<button class="stat" style="border:1.5px solid ' + (measKey === k ? "var(--accent)" : "transparent") + ';text-align:left;cursor:pointer" data-act="mk" data-k="' + k + '"><span>' + MEAS[k][0] + "</span><b>" + fmtN(lastV) + '<small style="font-size:12px;font-weight:600"> ' + MEAS[k][1] + "</small></b>" +
        (dl != null ? '<span class="delta ' + (dl <= 0 ? "good" : "bad") + '">' + (dl > 0 ? "+" : "") + fmtN(dl) + " desde o início</span>" : "<span>&nbsp;</span>") + "</button>";
    });
    h += "</div>";
    var mp = S.meas.filter(function (m) { return m[measKey] != null; }).map(function (m) { return { d: m.d, y: m[measKey] }; });
    h += '<div style="margin-top:12px">' + chart(mp) + "</div>";
    h += '<p class="muted" style="margin:6px 0 0">Meça cintura (na altura do umbigo) e peito (na linha do mamilo) sempre no mesmo horário, de manhã em jejum. Cintura e peito caindo = gordura saindo.</p></div>';

    // cargas
    var ids = Object.keys(S.logs).filter(function (k) { return BY[k] && S.logs[k].length; });
    h += '<p class="sec-title">Evolução por exercício</p><div class="card">';
    if (!ids.length) h += '<p class="empty">Registre séries nos treinos para ver sua evolução aqui.</p>';
    else {
      if (!S.sel || ids.indexOf(S.sel) < 0) S.sel = ids.sort(function (a, b) { return S.logs[b].length - S.logs[a].length; })[0];
      h += '<select class="sel" id="exSel">' + ids.map(function (k) { return '<option value="' + k + '"' + (k === S.sel ? " selected" : "") + ">" + BY[k].n + " (" + S.logs[k].length + ")</option>"; }).join("") + "</select>";
      var ex = BY[S.sel], lg = S.logs[S.sel];
      var hasW = lg.some(function (l) { return workW(l.sets); });
      var pts = lg.map(function (l) {
        var W = workW(l.sets);
        if (hasW) {
          var e1 = Math.max.apply(null, l.sets.filter(function (s) { return s.w != null && s.r != null; }).map(function (s) { return s.w * (1 + s.r / 30); }).concat([0]));
          return { d: l.d, y: W || 0, y2: e1 || null };
        }
        return { d: l.d, y: l.sets.reduce(function (a, s) { return a + (s.r || 0); }, 0) };
      });
      h += '<div class="muted" style="margin:10px 0 4px">' + (hasW ? "— carga máxima (kg) · - - força estimada (1RM)" : "Total de " + (ex.time ? "segundos" : "repetições") + " por sessão") + "</div>";
      h += chart(pts);
      if (hasW && lg.length > 1) {
        var d0 = workW(lg[0].sets), d1 = workW(lg[lg.length - 1].sets);
        if (d0 && d1) h += '<p class="muted" style="margin:6px 0 0">Desde ' + fmtD(lg[0].d) + ": <b style='color:" + (d1 >= d0 ? "var(--ok)" : "var(--warn)") + "'>" + (d1 >= d0 ? "+" : "") + fmtN(d1 - d0) + " kg</b> (" + (d0 ? (d1 >= d0 ? "+" : "") + Math.round((d1 / d0 - 1) * 100) + "%" : "") + ")</p>";
      }
      h += '<div style="margin-top:8px">' + lg.slice().reverse().slice(0, 8).map(function (l, idx) {
        return '<div class="log-row"><span>' + fmtDW(l.d) + '</span><span class="sets-txt">' + l.sets.map(function (x) { return (x.w != null ? fmtN(x.w) + "×" : "") + (x.r != null ? x.r : "?"); }).join(" · ") + "</span></div>";
      }).join("") + "</div>";
      h += '<button class="btn ghost small" data-act="dellog">Apagar último registro deste exercício</button>';
    }
    h += "</div>";

    // frequência
    var weeks = [];
    var ws = weekStart();
    for (var w = 7; w >= 0; w--) {
      var a = ws - w * 7 * 864e5, b = a + 7 * 864e5;
      weeks.push({ d: a, y: S.history.filter(function (x) { return x.d >= a && x.d < b; }).length, c: S.cardio.filter(function (x) { return x.d >= a && x.d < b; }).length });
    }
    h += '<p class="sec-title">Frequência (8 semanas)</p><div class="card"><div style="display:flex;align-items:flex-end;gap:6px;height:90px">';
    weeks.forEach(function (wk) {
      h += '<div style="flex:1;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;gap:2px;height:100%">' +
        '<div style="width:100%;border-radius:4px;background:var(--accent-soft);height:' + (wk.c * 10) + 'px"></div>' +
        '<div style="width:100%;border-radius:4px;background:var(--accent);height:' + (wk.y * 14) + 'px"></div>' +
        '<span style="font-size:9.5px;color:var(--ink-faint)">' + fmtD(wk.d) + "</span></div>";
    });
    h += '</div><p class="muted" style="margin:8px 0 0">Barra cheia = musculação · clara = cardio</p></div>';
    $("#v-prog").innerHTML = h;
  }

  /* ---------------- EXERCÍCIOS ---------------- */
  var libGroup = "peito";
  function renderLib() {
    $("#pageSub").textContent = DB.EX.length + " exercícios · toque para ver como fazer";
    var h = '<div class="chips">' + ["todos"].concat(Object.keys(DB.GROUPS)).map(function (g) {
      return '<button class="pill' + (g === libGroup ? " on" : "") + '" data-act="grp" data-g="' + g + '">' + (g === "todos" ? "Todos" : DB.GROUPS[g]) + "</button>";
    }).join("") + "</div>";
    var list = DB.EX.filter(function (e) { return libGroup === "todos" || e.g === libGroup; });
    h += '<div class="lib-grid">' + list.map(function (e) {
      return '<div class="lib-item" data-act="detail" data-id="' + e.id + '"><div class="fig-box" data-fig="' + e.id + '"></div><b>' + e.n + "</b><span>" + e.eq + "</span></div>";
    }).join("") + "</div>";
    $("#v-lib").innerHTML = h;
    $$("#v-lib .fig-box[data-fig]").forEach(function (el) { Fig.mount(el, el.getAttribute("data-fig")); });
  }

  /* ---------------- PERFIL ---------------- */
  function renderPerfil() {
    $("#pageSub").textContent = "Objetivo, nível e backup";
    var h = '<p class="sec-title" style="margin-top:4px">Objetivo</p>';
    Object.keys(DB.GOALS).forEach(function (k) {
      var g = DB.GOALS[k];
      h += '<button class="opt' + (S.goal === k ? " on" : "") + '" data-act="goal" data-k="' + k + '"><b>' + g.n + "</b><span>" + g.desc + "</span></button>";
    });
    h += '<p class="sec-title">Nível</p><div class="row">' +
      '<button class="opt' + (S.level === "ini" ? " on" : "") + '" style="margin:0" data-act="lvl" data-k="ini"><b>Iniciante</b><span>Variações mais fáceis (máquina, flexão inclinada)</span></button>' +
      '<button class="opt' + (S.level === "int" ? " on" : "") + '" style="margin:0" data-act="lvl" data-k="int"><b>Intermediário</b><span>Pesos livres e mais volume</span></button></div>';
    h += '<div class="card" style="margin-top:12px"><label class="field"><span>Meta de cardio por semana</span><select id="cGoal">' + [1, 2, 3, 4, 5, 6].map(function (n) { return "<option" + (S.cardioGoal === n ? " selected" : "") + ">" + n + "</option>"; }).join("") + "</select></label>" +
      '<label class="field"><span>Tema</span><select id="thSel"><option value="auto"' + (S.theme === "auto" ? " selected" : "") + '>Automático (do celular)</option><option value="light"' + (S.theme === "light" ? " selected" : "") + '>Claro</option><option value="dark"' + (S.theme === "dark" ? " selected" : "") + ">Escuro</option></select></label></div>";
    var ncu = Object.keys(S.swaps).length + Object.keys(S.custom || {}).length;
    if (ncu) h += '<button class="btn ghost small" data-act="resetswaps">Restaurar todos os treinos originais</button>';
    h += '<p class="sec-title">Sobre o peito (ginecomastia)</p><div class="card"><div class="muted">' +
      "Este programa treina peito em 3 de cada 4 treinos e combina musculação + cardio para reduzir gordura. Importante: <b style='color:var(--ink)'>não existe perda de gordura localizada</b> — o peito diminui quando o percentual de gordura do corpo todo cai, e o músculo peitoral forte melhora o contorno." +
      "<br><br>Se houver um caroço firme/emborrachado atrás do mamilo, dor ou crescimento recente, procure um <b style='color:var(--ink)'>endocrinologista</b>: ginecomastia verdadeira (glandular) não sai só com treino e tem tratamento.</div></div>";
    h += '<p class="sec-title">Backup dos dados</p><div class="card"><div class="muted">Seus registros ficam salvos só neste celular. Exporte de vez em quando para não perder nada se desinstalar o app.</div>' +
      '<button class="btn primary small" data-act="export">Exportar backup</button>' +
      '<button class="btn ghost small" data-act="import">Importar backup</button></div>';
    h += '<button class="btn danger small" data-act="wipe">Apagar todos os dados</button>';
    h += '<p class="muted" style="text-align:center;margin-top:18px">Meu Treino v1.2 · feito sob medida</p>';
    $("#v-perfil").innerHTML = h;
    $("#cGoal").onchange = function () { S.cardioGoal = parseInt(this.value, 10); save(); };
    $("#thSel").onchange = function () { S.theme = this.value; save(); applyTheme(); };
  }

  /* ---------------- Sheet (detalhe, troca, formulários) ---------------- */
  function openSheet(html, after) {
    $("#sheetBody").innerHTML = html;
    $("#scrim").classList.add("on"); $("#sheet").classList.add("on");
    $("#sheet").scrollTop = 0;
    $$("#sheet .fig-box[data-fig]").forEach(function (el) { Fig.mount(el, el.getAttribute("data-fig")); });
    if (after) after();
  }
  function closeSheet() { $("#scrim").classList.remove("on"); $("#sheet").classList.remove("on"); setTimeout(function () { if (!$("#sheet").classList.contains("on")) $("#sheetBody").innerHTML = ""; }, 300); }
  function sheetOpen() { return $("#sheet").classList.contains("on"); }

  function whereUsed(id) {
    var out = [];
    DB.SEQ.forEach(function (l) { slots(l).forEach(function (s, i) { if (slotEx(l, i) === id) out.push(l); }); });
    return out;
  }
  function detail(id) {
    var e = BY[id], logs = lastLogs(id);
    var used = whereUsed(id);
    var h = '<div class="fig-box big" data-fig="' + id + '"></div>';
    h += "<h2>" + e.n + '</h2><div class="muted">' + e.m + " · " + e.eq + "</div>";
    h += '<div class="presc" style="margin-top:8px"><span>' + DB.GROUPS[e.g] + "</span><span>" + ({ comp: "Multiarticular", iso: "Isolado", core: "Core", cardio: "Cardio / metabólico" })[e.k] + "</span><span>Gasto calórico: " + ["", "baixo", "médio", "alto"][e.met] + "</span>" + (used.length ? "<span>No treino " + used.join(", ") + "</span>" : "") + "</div>";
    h += '<ol class="cues">' + e.cues.map(function (c) { return "<li>" + c + "</li>"; }).join("") + "</ol>";
    if (logs.length) {
      h += '<p class="sec-title">Seu histórico</p>';
      var hasW = logs.some(function (l) { return workW(l.sets); });
      if (logs.length > 1) h += chart(logs.map(function (l) { return { d: l.d, y: hasW ? (workW(l.sets) || 0) : l.sets.reduce(function (a, s) { return a + (s.r || 0); }, 0) }; }));
      h += logs.slice().reverse().slice(0, 5).map(function (l) { return '<div class="log-row"><span>' + fmtDW(l.d) + '</span><span class="sets-txt">' + l.sets.map(function (x) { return (x.w != null ? fmtN(x.w) + "×" : "") + (x.r != null ? x.r : "?"); }).join(" · ") + "</span></div>"; }).join("");
    }
    h += '<button class="btn ghost" data-act="close">Fechar</button>';
    openSheet(h);
  }

  function rankAlts(id) {
    var e = BY[id];
    var g = S.goal;
    return DB.EX.filter(function (x) { return x.id !== id && (x.g === e.g || (e.g === "cardio" && x.k === "cardio") || (e.k === "core" && x.k === "core")); })
      .map(function (x) {
        var sc = 0;
        if (x.k === e.k) sc += 3;
        if (g === "queima" || g === "resistencia") sc += x.met * 2;
        if (g === "forca" && x.k === "comp") sc += 4;
        if (g === "hipertrofia" && x.k === "comp") sc += 2;
        if (S.level === "ini" && (x.eq.indexOf("Máquina") >= 0 || x.id === "flexao_inclinada")) sc += 1;
        return { x: x, sc: sc };
      }).sort(function (a, b) { return b.sc - a.sc; });
  }
  function swapSheet(slot) {
    var L = slot.charAt(0), i = parseInt(slot.slice(1), 10), id = slotEx(L, i);
    var alts = rankAlts(id);
    var h = "<h2>Trocar exercício</h2><div class='muted'>Atual: <b style='color:var(--ink)'>" + BY[id].n + "</b>. Sugestões ordenadas para o objetivo <b style='color:var(--accent)'>" + goal().short + "</b>:</div><div style='margin-top:12px'>";
    alts.forEach(function (a, k) {
      h += '<div class="alt-item" data-act="doswap" data-slot="' + slot + '" data-id="' + a.x.id + '"><div class="fig-box" data-fig="' + a.x.id + '"></div><div class="grow">' + (k < 2 ? '<span class="tag">★ RECOMENDADO</span>' : "") + "<b>" + a.x.n + "</b><span>" + a.x.eq + "</span></div></div>";
    });
    h += "</div>";
    h += '<button class="btn ghost" data-act="close">Cancelar</button>';
    openSheet(h);
  }

  function measSheet() {
    var last = S.meas[S.meas.length - 1] || {};
    var h = '<h2>Nova medição</h2><div class="muted">Preencha o que tiver medido hoje.</div>' +
      '<label class="field"><span>Peso (kg)</span><input id="mPeso" inputmode="decimal" placeholder="' + (last.peso != null ? fmtN(last.peso) : "ex: 92,5") + '"></label>' +
      '<label class="field"><span>Cintura (cm) — na linha do umbigo</span><input id="mCint" inputmode="decimal" placeholder="' + (last.cintura != null ? fmtN(last.cintura) : "ex: 98") + '"></label>' +
      '<label class="field"><span>Peito (cm) — na linha do mamilo</span><input id="mPeito" inputmode="decimal" placeholder="' + (last.peito != null ? fmtN(last.peito) : "ex: 108") + '"></label>' +
      '<button class="btn primary" data-act="savemeas">Salvar</button>' +
      (S.meas.length ? '<button class="btn ghost small" data-act="delmeas">Apagar última medição (' + fmtD(last.d) + ")</button>" : "") +
      '<button class="btn ghost" data-act="close">Cancelar</button>';
    openSheet(h);
  }
  function cardioSheet() {
    var types = ["Caminhada inclinada", "Bike", "Corrida", "Elíptico", "HIIT", "Esporte", "Outro"];
    var h = '<h2>Registrar cardio</h2><label class="field"><span>Tipo</span><select id="cType">' + types.map(function (t) { return "<option>" + t + "</option>"; }).join("") + "</select></label>" +
      '<label class="field"><span>Minutos</span><input id="cMin" inputmode="numeric" placeholder="30"></label>' +
      '<button class="btn primary" data-act="savecardio">Salvar</button><button class="btn ghost" data-act="close">Cancelar</button>';
    openSheet(h);
  }

  /* ---------------- Backup ---------------- */
  function doExport() {
    var data = JSON.stringify({ app: "meutreino", v: 1, at: new Date().toISOString(), state: S });
    if (AND && AND.share) { try { AND.share(data, "backup-meu-treino-" + new Date().toISOString().slice(0, 10) + ".json"); return; } catch (e) {} }
    try {
      var a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([data], { type: "application/json" }));
      a.download = "backup-meu-treino.json"; a.click();
    } catch (e) { openSheet('<h2>Backup</h2><textarea style="width:100%;height:200px">' + esc(data) + "</textarea>"); }
  }
  function importSheet() {
    var h = '<h2>Importar backup</h2><div class="muted">Escolha o arquivo .json exportado (ou cole o conteúdo abaixo). Isso substitui os dados atuais.</div>' +
      '<label class="field"><span>Arquivo</span><input type="file" id="impFile" accept=".json,application/json,text/plain"></label>' +
      '<label class="field"><span>Ou cole o texto</span><textarea id="impTxt"></textarea></label>' +
      '<button class="btn primary" data-act="doimport">Importar</button><button class="btn ghost" data-act="close">Cancelar</button>';
    openSheet(h, function () {
      $("#impFile").onchange = function () {
        var f = this.files && this.files[0]; if (!f) return;
        var rd = new FileReader(); rd.onload = function () { $("#impTxt").value = rd.result; }; rd.readAsText(f);
      };
    });
  }
  function doImport() {
    try {
      var o = JSON.parse($("#impTxt").value);
      var st = o.state || o;
      if (!st.history || !st.logs) throw new Error("x");
      var d = defaults(); for (var k in d) if (st[k] === undefined) st[k] = d[k];
      S = st; save(); closeSheet(); applyTheme(); toast("Backup importado ✔"); go("hoje");
    } catch (e) { toast("Arquivo inválido"); }
  }

  /* ---------------- Tema ---------------- */
  function applyTheme() {
    var t = S.theme;
    if (t === "auto") {
      var night = null;
      try { if (AND && AND.isNight) night = AND.isNight(); } catch (e) {}
      if (night === null || night === undefined) document.documentElement.removeAttribute("data-theme");
      else document.documentElement.setAttribute("data-theme", night ? "dark" : "light");
    } else document.documentElement.setAttribute("data-theme", t);
    try { if (AND && AND.setBars) AND.setBars(getComputedStyle(document.body).backgroundColor); } catch (e) {}
  }
  window.__themeChanged = function () { applyTheme(); };

  /* ---------------- Eventos ---------------- */
  document.addEventListener("click", function (ev) {
    var el = ev.target.closest("[data-act]"); if (!el) return;
    var a = el.getAttribute("data-act");
    switch (a) {
      case "start": viewLetter = el.getAttribute("data-l"); go("treino"); break;
      case "resume": viewLetter = S.draft.letter; go("treino"); break;
      case "solo": S.soloDay = soloToday() ? null : todayKey(); save(); renderTreino(); toast(soloToday() ? "Hoje: tudo separado" : "Supersets de volta"); break;
      case "letter": editMode = false; viewLetter = el.getAttribute("data-l"); renderTreino(); break;
      case "set": onSet(el); break;
      case "finish": finish(el.getAttribute("data-l")); break;
      case "discard": if (confirm("Descartar as séries marcadas deste treino?")) { S.draft = null; save(); stopTimer(); renderTreino(); } break;
      case "detail": detail(el.getAttribute("data-id")); break;
      case "swap": swapSheet(el.getAttribute("data-slot")); break;
      case "doswap": {
        var sk = el.getAttribute("data-slot"), sL = sk.charAt(0), si = parseInt(sk.slice(1), 10);
        ensureCustom(sL)[si].ex = el.getAttribute("data-id");
        if (S.draft && S.draft.letter === sL) delete S.draft.ex[sk];
        save(); closeSheet(); renderTreino(); toast("Exercício trocado"); break;
      }
      case "resetswaps": S.swaps = {}; S.custom = {}; save(); renderPerfil(); toast("Treinos originais restaurados"); break;
      case "edit": startEdit(viewLetter); break;
      case "eddone": editMode = false; renderTreino(); $("#main").scrollTop = 0; toast("Treino " + viewLetter + " salvo"); break;
      case "edsets": {
        var ei = +el.getAttribute("data-i"), ea = ensureCustom(viewLetter);
        ea[ei].s = Math.max(1, Math.min(8, presc(viewLetter, ei).s + (+el.getAttribute("data-d")))); save(); renderTreino(); break;
      }
      case "edmove": {
        var mi = +el.getAttribute("data-i"), md = +el.getAttribute("data-d"), ma = ensureCustom(viewLetter);
        var tmp = ma[mi]; ma[mi] = ma[mi + md]; ma[mi + md] = tmp; normalize(viewLetter); save(); renderTreino(); break;
      }
      case "edrm": {
        var ri = +el.getAttribute("data-i"), ra = ensureCustom(viewLetter);
        if (ra.length <= 1) { toast("O treino precisa de pelo menos 1 exercício"); break; }
        if (!confirm("Remover " + BY[ra[ri].ex].n + " do treino " + viewLetter + "?")) break;
        ra.splice(ri, 1); normalize(viewLetter); save(); renderTreino(); break;
      }
      case "edlink": {
        var li = +el.getAttribute("data-i"), la = ensureCustom(viewLetter);
        if (la[li].ss && la[li + 1].ss === la[li].ss) la[li + 1].ss = "s" + Date.now();
        else { var id2 = la[li].ss || la[li + 1].ss || "s" + Date.now(); la[li].ss = id2; la[li + 1].ss = id2; }
        normalize(viewLetter); save(); renderTreino(); break;
      }
      case "edadd": addSheet(viewLetter); break;
      case "addgrp": addGroup = el.getAttribute("data-g"); addSheet(viewLetter); break;
      case "doadd": {
        var ne = BY[el.getAttribute("data-id")];
        ensureCustom(viewLetter).push({ ex: ne.id, r: { comp: "acc", iso: "iso", core: "core", cardio: "fin" }[ne.k], ss: null });
        save(); closeSheet(); renderTreino(); toast(ne.n + " adicionado"); setTimeout(function () { $("#main").scrollTop = 1e6; }, 50); break;
      }
      case "edreset": if (confirm("Voltar o treino " + viewLetter + " para o original?")) { delete S.custom[viewLetter]; save(); renderTreino(); } break;
      case "close": closeSheet(); break;
      case "cardio": cardioSheet(); break;
      case "savecardio": {
        var m = num($("#cMin").value) || 30;
        S.cardio.push({ d: Date.now(), t: $("#cType").value, min: Math.round(m) }); save(); closeSheet(); renderHoje(); toast("Cardio registrado ♥"); break;
      }
      case "undo": {
        var lh = S.history[S.history.length - 1], lc = S.cardio[S.cardio.length - 1];
        if (lc && (!lh || lc.d > lh.d)) { if (confirm("Desfazer o último cardio?")) S.cardio.pop(); }
        else if (lh && confirm("Desfazer o treino " + lh.w + " de " + fmtD(lh.d) + "? (as cargas registradas ficam salvas)")) S.history.pop();
        save(); renderHoje(); break;
      }
      case "meas": measSheet(); break;
      case "mk": measKey = el.getAttribute("data-k"); renderProg(); break;
      case "savemeas": {
        var o = { d: Date.now(), peso: num($("#mPeso").value), cintura: num($("#mCint").value), peito: num($("#mPeito").value) };
        if (o.peso == null && o.cintura == null && o.peito == null) { toast("Preencha pelo menos uma medida"); return; }
        S.meas.push(o); save(); closeSheet(); renderProg(); toast("Medição salva"); break;
      }
      case "delmeas": if (confirm("Apagar a última medição?")) { S.meas.pop(); save(); closeSheet(); renderProg(); } break;
      case "dellog": if (S.sel && confirm("Apagar o último registro de " + BY[S.sel].n + "?")) { S.logs[S.sel].pop(); if (!S.logs[S.sel].length) delete S.logs[S.sel]; save(); renderProg(); } break;
      case "grp": libGroup = el.getAttribute("data-g"); renderLib(); break;
      case "goal": S.goal = el.getAttribute("data-k"); save(); renderPerfil(); $("#goalChip").textContent = goal().short; toast("Objetivo: " + goal().short + " — treinos ajustados"); break;
      case "lvl": S.level = el.getAttribute("data-k"); save(); renderPerfil(); break;
      case "export": doExport(); break;
      case "import": importSheet(); break;
      case "doimport": doImport(); break;
      case "wipe": if (confirm("Apagar TODOS os dados (treinos, cargas, medidas)? Não dá para desfazer.")) { var th = S.theme; S = defaults(); S.theme = th; save(); go("hoje"); } break;
    }
  });
  document.addEventListener("change", function (ev) {
    if (ev.target.id === "exSel") { S.sel = ev.target.value; save(); renderProg(); }
  });
  // salva digitação parcial no rascunho
  document.addEventListener("input", function (ev) {
    var inp = ev.target; if (!inp.matches || !inp.matches(".set-row input")) return;
    var card = inp.closest(".ex-card"), row = inp.closest(".set-row");
    var slot = card.getAttribute("data-slot"), L = slot.charAt(0);
    if (!S.draft || S.draft.letter !== L) return;
    var s = parseInt(row.getAttribute("data-s"), 10);
    var arr = S.draft.ex[slot] || (S.draft.ex[slot] = []);
    var c = arr[s] || (arr[s] = {});
    c[inp.getAttribute("data-f")] = num(inp.value);
    save();
  });
  $$("nav.tabs button").forEach(function (b) { b.addEventListener("click", function () { if (b.getAttribute("data-view") === "treino" && cur !== "treino") viewLetter = null; editMode = false; go(b.getAttribute("data-view")); }); });
  $("#goalChip").addEventListener("click", function () { go("perfil"); });
  $("#scrim").addEventListener("click", closeSheet);
  $("#tPlus").addEventListener("click", function () { tEnd += 15000; tTotal += 15; tickTimer(); });
  $("#tMinus").addEventListener("click", function () { tEnd -= 15000; tickTimer(); });
  $("#tSkip").addEventListener("click", stopTimer);

  // botão voltar do Android
  window.__onBack = function () {
    if (sheetOpen()) { closeSheet(); return true; }
    if (cur !== "hoje") { go("hoje"); return true; }
    return false;
  };

  applyTheme();
  go("hoje");
})();
