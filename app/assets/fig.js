/* Motor de animação do bonequinho (SVG, cinemática direta/inversa).
   Ângulos em graus: 0 = direita, 90 = baixo, -90 = cima, 180 = esquerda. */
(function (G) {
  "use strict";
  var L = { torso: 44, sh: 40, uarm: 24, farm: 22, thigh: 32, shin: 32, head: 9, neck: 3, shw: 11, hipw: 6, foot: 8 };
  var NS = "http://www.w3.org/2000/svg";

  function rad(d) { return d * Math.PI / 180; }
  function deg(r) { return r * 180 / Math.PI; }
  function pt(p, a, len) { return [p[0] + Math.cos(rad(a)) * len, p[1] + Math.sin(rad(a)) * len]; }
  function ang(a, b) { return deg(Math.atan2(b[1] - a[1], b[0] - a[0])); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function rot(v, a) { var c = Math.cos(rad(a)), s = Math.sin(rad(a)); return [v[0] * c - v[1] * s, v[0] * s + v[1] * c]; }

  function ik(s, t, l1, l2, b) {
    var dx = t[0] - s[0], dy = t[1] - s[1];
    var d = Math.hypot(dx, dy);
    var max = l1 + l2 - 0.05, min = Math.abs(l1 - l2) + 0.05;
    if (d > max) d = max; if (d < min) d = min;
    var base = deg(Math.atan2(dy, dx));
    var c = (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d);
    c = Math.max(-1, Math.min(1, c));
    var a = deg(Math.acos(c));
    var j = pt(s, base + (b || 1) * a, l1);
    var e = pt(s, base, d);
    return [j, e];
  }

  // Resolve um membro (braço ou perna) a partir da raiz
  function limb(root, spec, l1, l2, torsoAng) {
    if (Array.isArray(spec)) {
      var j = pt(root, spec[0], l1 * (spec[2] == null ? 1 : spec[2]));
      var e = pt(j, spec[1], l2 * (spec[3] == null ? 1 : spec[3]));
      return [j, e];
    }
    if (spec.j) return [spec.j, spec.p];
    var target = spec.p;
    if (spec.rt) { var r = rot(spec.rt, torsoAng + 90); target = [root[0] + r[0], root[1] + r[1]]; }
    return ik(root, target, l1, l2, spec.b);
  }

  function lerpSpec(a, b, t) {
    if (Array.isArray(a)) {
      var out = [];
      for (var i = 0; i < Math.max(a.length, b.length); i++) {
        var av = a[i] == null ? 1 : a[i], bv = b[i] == null ? 1 : b[i];
        out.push(lerp(av, bv, t));
      }
      return out;
    }
    var o = { b: a.b };
    if (a.j) { o.j = [lerp(a.j[0], b.j[0], t), lerp(a.j[1], b.j[1], t)]; }
    if (a.p) o.p = [lerp(a.p[0], b.p[0], t), lerp(a.p[1], b.p[1], t)];
    if (a.rt) o.rt = [lerp(a.rt[0], b.rt[0], t), lerp(a.rt[1], b.rt[1], t)];
    return o;
  }

  function lerpPose(a, b, t) {
    var o = {};
    ["x", "y", "t", "hd", "fa1", "fa2", "ty"].forEach(function (k) {
      if (a[k] != null || b[k] != null) {
        var av = a[k] != null ? a[k] : b[k], bv = b[k] != null ? b[k] : a[k];
        o[k] = lerp(av, bv, t);
      }
    });
    ["a1", "a2", "l1", "l2"].forEach(function (k) { if (a[k]) o[k] = lerpSpec(a[k], b[k] || a[k], t); });
    return o;
  }

  function mirrorSpec(s) {
    if (Array.isArray(s)) {
      var m = [180 - s[0], 180 - s[1]];
      if (s.length > 2) m.push(s[2], s[3] == null ? 1 : s[3]);
      return m;
    }
    var o = { b: -(s.b || 1) };
    if (s.j) o.j = [200 - s.j[0], s.j[1]];
    if (s.p) o.p = [200 - s.p[0], s.p[1]];
    if (s.rt) o.rt = [-s.rt[0], s.rt[1]];
    return o;
  }

  function completePose(p, anim) {
    var o = {};
    for (var k in p) o[k] = p[k];
    if (anim.sym) {
      if (!o.a2 && o.a1) o.a2 = mirrorSpec(o.a1);
      if (!o.l2 && o.l1) o.l2 = mirrorSpec(o.l1);
    }
    if (!o.a2) o.a2 = o.a1;
    if (!o.l2) o.l2 = o.l1;
    return o;
  }

  // Calcula as posições das juntas
  function solve(p, view) {
    var H = [p.x, p.y], t = p.t;
    var N = pt(H, t, L.torso);
    var C = pt(N, t + (p.hd || 0), L.neck + L.head);
    var S = pt(H, t, L.sh);
    var s1 = S, s2 = S, h1 = H, h2 = H;
    if (view === "front") {
      s1 = pt(S, t - 90, L.shw); s2 = pt(S, t + 90, L.shw);
      h1 = pt(H, t - 90, L.hipw); h2 = pt(H, t + 90, L.hipw);
    }
    var A1 = limb(s1, p.a1, L.uarm, L.farm, t), A2 = limb(s2, p.a2, L.uarm, L.farm, t);
    var L1 = limb(h1, p.l1, L.thigh, L.shin, t), L2 = limb(h2, p.l2, L.thigh, L.shin, t);
    return { H: H, N: N, C: C, S: S, s1: s1, s2: s2, h1: h1, h2: h2, A1: A1, A2: A2, L1: L1, L2: L2, t: t };
  }

  function ease(t) { return 0.5 - 0.5 * Math.cos(Math.PI * t); }

  // Pose em um instante (ms)
  function poseAt(anim, ms) {
    if (anim.fn) {
      var per = anim.period || 1200;
      return completePose(anim.fn((ms % per) / per), anim);
    }
    var fr = anim.frames;
    if (fr.length === 1) return completePose(fr[0], anim);
    var dur = anim.dur || 1100, hold = anim.hold == null ? 280 : anim.hold;
    var seq = [];
    if (anim.cycle) { for (var i = 0; i < fr.length; i++) seq.push([i, (i + 1) % fr.length]); }
    else {
      for (var i2 = 0; i2 < fr.length - 1; i2++) seq.push([i2, i2 + 1]);
      for (var i3 = fr.length - 1; i3 > 0; i3--) seq.push([i3, i3 - 1]);
    }
    var step = dur + hold, total = step * seq.length;
    var tt = ms % total;
    var idx = Math.floor(tt / step), rem = tt - idx * step;
    var k = rem < hold ? 0 : (rem - hold) / dur;
    if (!anim.linear) k = ease(k);
    var pr = seq[idx];
    return completePose(lerpPose(fr[pr[0]], fr[pr[1]], k), anim);
  }

  /* ---------- Desenho ---------- */
  function line(a, b, cls, w) {
    return '<line x1="' + a[0].toFixed(1) + '" y1="' + a[1].toFixed(1) + '" x2="' + b[0].toFixed(1) + '" y2="' + b[1].toFixed(1) + '" class="' + cls + '"' + (w ? ' stroke-width="' + w + '"' : "") + "/>";
  }
  function circ(c, r, cls) { return '<circle cx="' + c[0].toFixed(1) + '" cy="' + c[1].toFixed(1) + '" r="' + r + '" class="' + cls + '"/>'; }
  function along(a, b, f0, f1) { return [[lerp(a[0], b[0], f0), lerp(a[1], b[1], f0)], [lerp(a[0], b[0], f1), lerp(a[1], b[1], f1)]]; }

  function drawTool(tool, j, side) {
    if (!tool) return "";
    var out = "", hands = [j.A1[1], j.A2[1]];
    var type = tool.type || tool;
    if (type === "db") {
      var o = tool.o || "c";
      var list = tool.one ? [hands[0]] : hands;
      list.forEach(function (h, i) {
        if (o === "c") { out += circ(h, 4.6, "eq"); out += circ(h, 1.6, "eqh"); }
        else {
          var a = o === "h" ? 0 : o === "v" ? 90 : (o + (i ? 0 : 0));
          var p1 = pt(h, a, 7), p2 = pt(h, a + 180, 7);
          out += line(p1, p2, "eqbar", 2.4);
          out += line(pt(h, a, 5), pt(h, a, 9), "eqplate", 6);
          out += line(pt(h, a + 180, 5), pt(h, a + 180, 9), "eqplate", 6);
        }
      });
    } else if (type === "bb") {
      if (side) { out += circ(hands[0], 11, "plate"); out += circ(hands[0], 2.2, "eqh"); }
      else {
        var hl = hands[0], hr = hands[1];
        var a2 = ang(hl, hr);
        var e1 = pt(hl, a2 + 180, 24), e2 = pt(hr, a2, 24);
        out += line(e1, e2, "eqbar", 2.4);
        out += line(pt(hl, a2 + 180, 14), pt(hl, a2 + 180, 20), "eqplate", 14);
        out += line(pt(hr, a2, 14), pt(hr, a2, 20), "eqplate", 14);
      }
    } else if (type === "bar") { // barra de puxada (frente) + cabo
      var b1 = hands[0], b2 = hands[1], aa = ang(b1, b2);
      out += line(pt(b1, aa + 180, 12), pt(b2, aa, 12), "eqbar", 2.6);
      if (tool.anchor) out += line([(b1[0] + b2[0]) / 2, (b1[1] + b2[1]) / 2], tool.anchor, "cable");
    } else if (type === "cable") {
      (tool.one ? [0] : [0, 1]).forEach(function (i) {
        var an = tool.anchors ? tool.anchors[i] : tool.anchor;
        out += line(hands[i], an, "cable");
        out += circ(hands[i], 2.4, "eq");
      });
    } else if (type === "grip") {
      hands.forEach(function (h) { out += line([h[0], h[1] - 4], [h[0], h[1] + 4], "eqbar", 3); });
    }
    if (tool.pad) { // rolo de apoio no tornozelo
      out += circ(j.L1[1], 5, "eq");
    }
    if (tool.plate) {
      var f = j.L1[1], d = tool.plate;
      var nn = d + 90;
      var c0 = pt(f, d, 5);
      out += line(pt(c0, nn, 16), pt(c0, nn + 180, 16), "eqplate", 4);
    }
    return out;
  }

  function figureSVG(anim, ms) {
    var p = poseAt(anim, ms);
    var view = anim.view || "side";
    var j = solve(p, view);
    var hl = anim.hl || [];
    var f = anim.f || 1;
    var out = "";
    var tool = anim.tool;

    function isHL(name) { return hl.indexOf(name) >= 0; }
    function foot(Lg, fa) {
      var sh = ang(Lg[0], Lg[1]);
      var a = fa != null ? fa : (view === "front" ? null : sh - 90 * f);
      if (a == null) return "";
      return line(Lg[1], pt(Lg[1], a, L.foot), "lim", 4.2);
    }
    function legSVG(hip, Lg, far, fa) {
      var c = far ? "lim far" : "lim";
      var s = line(hip, Lg[0], c) + line(Lg[0], Lg[1], c) + (foot(Lg, fa) ? foot(Lg, fa).replace('class="lim"', 'class="' + c + '"') : "");
      if (isHL("thigh")) s += line(hip, Lg[0], far ? "hl far" : "hl");
      if (isHL("shin")) { var sg = along(Lg[0], Lg[1], 0.1, 0.6); s += line(sg[0], sg[1], far ? "hl far" : "hl"); }
      if (isHL("glute") && !far) { var gg = along(hip, Lg[0], 0, 0.35); s += line(gg[0], gg[1], "hl", 9); }
      return s;
    }
    function armSVG(sh, A, far) {
      var c = far ? "lim far" : "lim";
      var s = line(sh, A[0], c) + line(A[0], A[1], c);
      if (isHL("uarm")) s += line(sh, A[0], far ? "hl far" : "hl");
      if (isHL("delt")) { var dd = along(sh, A[0], 0, 0.42); s += line(dd[0], dd[1], far ? "hl far" : "hl", 8); }
      if (isHL("farm")) s += line(A[0], A[1], far ? "hl far" : "hl");
      if (isHL("tri")) { var tt = along(sh, A[0], 0.15, 0.95); s += line(tt[0], tt[1], far ? "hl far" : "hl"); }
      return s;
    }
    var side = view !== "front";
    // membros do fundo
    if (side) {
      out += legSVG(j.H, j.L2, true, p.fa2 != null ? p.fa2 : p.fa1);
      out += armSVG(j.S, j.A2, true);
    }
    // tronco
    var torsoStart = side ? j.H : j.H;
    out += line(torsoStart, j.N, "body");
    if (!side) {
      out += line(j.s1, j.s2, "body", 6);
      out += line(j.h1, j.h2, "body", 6);
    }
    if (isHL("chest") && side) { var c1 = along(j.H, j.N, 0.58, 0.92); out += line(c1[0], c1[1], "hl", 10); } 
    if (isHL("back")) { var b1 = along(j.H, j.N, 0.4, 0.9); out += line(b1[0], b1[1], "hl", 10); if (!side) { out += line(pt(b1[0], j.t - 90, 7), pt(b1[1], j.t - 90, 10), "hl", 6); out += line(pt(b1[0], j.t + 90, 7), pt(b1[1], j.t + 90, 10), "hl", 6); } }
    if (isHL("chest") && !side) { var pc = pt(j.H, j.t, L.torso * 0.74); out += line(pt(pc, j.t - 90, 8), pt(pc, j.t + 90, 8), "hl", 11); }
    if (isHL("abs")) { var a1 = along(j.H, j.N, 0.08, 0.55); out += line(a1[0], a1[1], "hl", 9); }
    if (isHL("full")) out += line(j.H, j.N, "hl", 9);
    // cabeça
    out += circ(j.C, L.head, "head");
    if (side) {
      out += legSVG(j.H, j.L1, false, p.fa1);
    } else {
      out += legSVG(j.h1, j.L1, false, p.fa1);
      out += legSVG(j.h2, j.L2, false, p.fa2);
    }
    // ferramenta atrás da mão
    var toolSVG = drawTool(tool, j, side);
    if (side) {
      out += armSVG(j.S, j.A1, false);
    } else {
      out += armSVG(j.s1, j.A1, false);
      out += armSVG(j.s2, j.A2, false);
    }
    out += toolSVG;
    return out;
  }

  /* ---------- Cenário (aparelhos) ---------- */
  var P = {
    floor: function () { return '<line x1="-40" y1="135" x2="240" y2="135" class="floor"/>'; },
    bench: function (x1, x2, y) {
      return '<rect x="' + x1 + '" y="' + y + '" width="' + (x2 - x1) + '" height="6" rx="2" class="prop"/>' +
        '<line x1="' + (x1 + 10) + '" y1="' + (y + 6) + '" x2="' + (x1 + 10) + '" y2="135" class="propl"/>' +
        '<line x1="' + (x2 - 10) + '" y1="' + (y + 6) + '" x2="' + (x2 - 10) + '" y2="135" class="propl"/>';
    },
    seg: function (a, b, w) { return '<line x1="' + a[0] + '" y1="' + a[1] + '" x2="' + b[0] + '" y2="' + b[1] + '" class="propl" stroke-width="' + (w || 4) + '"/>'; },
    rect: function (x, y, w, h, rx) { return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="' + (rx || 2) + '" class="prop"/>'; },
    tower: function (x, y1) { return '<line x1="' + x + '" y1="' + (y1 || 4) + '" x2="' + x + '" y2="135" class="propl" stroke-width="5"/>'; },
    pulley: function (x, y) { return '<circle cx="' + x + '" cy="' + y + '" r="3.5" class="prop"/>'; }
  };

  /* ---------- Animações de cada exercício ---------- */
  var ST = { x: 100, y: 71, t: -90 }; // em pé
  function S(o) { var r = {}; for (var k in ST) r[k] = ST[k]; for (var k2 in o) r[k2] = o[k2]; return r; }

  // supino deitado (comum)
  var lieLegs = { p: [140, 135], b: -1 };
  var A = {};

  A.supino_halter = {
    vb: [22, 25, 150, 112.5],
    f: 1, hl: ["chest"], tool: { type: "db", o: "c" },
    props: P.bench(40, 128, 100),
    frames: [
      { x: 112, y: 96, t: 180, a1: [20, -90, 0.6, 1], l1: lieLegs },
      { x: 112, y: 96, t: 180, a1: [-80, -90, 1, 1], l1: lieLegs }
    ]
  };
  A.supino_barra = {
    vb: [22, 25, 150, 112.5],
    f: 1, hl: ["chest"], tool: { type: "bb" },
    props: P.bench(40, 128, 100) + P.seg([50, 100], [50, 40], 3),
    frames: A.supino_halter.frames
  };
  var incLegs = { p: [140, 135], b: -1 };
  A.supino_inclinado_halter = {
    f: 1, hl: ["chest"], tool: { type: "db", o: "c" },
    props: P.seg([116, 106], [70, 67], 6) + P.rect(98, 104, 34, 6) + P.seg([112, 110], [112, 135], 3),
    frames: [
      { x: 112, y: 100, t: -140, a1: [60, -95, 0.55, 1], l1: incLegs },
      { x: 112, y: 100, t: -140, a1: [-95, -92, 1, 1], l1: incLegs }
    ]
  };
  A.supino_inclinado_barra = {
    f: 1, hl: ["chest"], tool: { type: "bb" },
    props: A.supino_inclinado_halter.props,
    frames: A.supino_inclinado_halter.frames
  };
  A.supino_maquina = {
    f: 1, hl: ["chest"], tool: { type: "grip" },
    props: P.rect(62, 104, 40, 6) + P.seg([66, 104], [62, 52], 6) + P.seg([82, 110], [82, 135], 3) + P.seg([150, 30], [150, 135], 5) + P.seg([150, 64], [128, 64], 2),
    frames: [
      { x: 88, y: 100, t: -95, a1: { p: [100, 64], b: 1 }, l1: [0, 90] },
      { x: 88, y: 100, t: -95, a1: { p: [130, 64], b: 1 }, l1: [0, 90] }
    ]
  };
  A.crucifixo_halter = { // vista de cima
    view: "front", sym: true, hl: ["chest"], tool: { type: "db", o: "v" }, label: "vista de cima",
    props: P.rect(88, 18, 24, 84, 4),
    frames: [
      { x: 100, y: 85, t: -90, a1: { j: [66, 60], p: [44, 58] }, l1: [92, 90, 0.75, 0.6] },
      { x: 100, y: 85, t: -90, a1: { j: [92, 52], p: [97, 60] }, l1: [92, 90, 0.75, 0.6] }
    ]
  };
  A.crossover = {
    view: "front", sym: true, hl: ["chest"], tool: { type: "cable", anchors: [[14, 8], [186, 8]] },
    props: P.tower(12) + P.tower(188) + P.pulley(14, 8) + P.pulley(186, 8),
    frames: [
      { x: 100, y: 71, t: -90, a1: { j: [68, 30], p: [50, 18] }, l1: [96, 90] },
      { x: 100, y: 71, t: -90, a1: { j: [80, 64], p: [97, 80] }, l1: [96, 90] }
    ]
  };
  A.crossover_baixo = {
    view: "front", sym: true, hl: ["chest"], tool: { type: "cable", anchors: [[14, 128], [186, 128]] },
    props: P.tower(12) + P.tower(188) + P.pulley(14, 128) + P.pulley(186, 128),
    frames: [
      { x: 100, y: 71, t: -90, a1: { j: [75, 45], p: [58, 98] }, l1: [96, 90] },
      { x: 100, y: 71, t: -90, a1: { j: [80, 40], p: [97, 26] }, l1: [96, 90] }
    ]
  };
  var seatFront = P.rect(76, 102, 48, 7) + P.seg([100, 109], [100, 135], 4) + P.rect(84, 50, 32, 52, 4);
  A.peck_deck = {
    view: "front", sym: true, hl: ["chest"],
    props: seatFront,
    frames: [
      { x: 100, y: 100, t: -90, a1: { j: [66, 60], p: [64, 37] }, l1: [100, 92, 0.3, 1] },
      { x: 100, y: 100, t: -90, a1: { j: [94, 64], p: [97, 41] }, l1: [100, 92, 0.3, 1] }
    ]
  };
  A.flexao = {
    vb: [30, 33, 140, 105],
    f: -1, hl: ["chest", "tri"],
    frames: [
      { x: 96.5, y: 105.3, t: 204, a1: { p: [60, 135], b: -1 }, l1: [24, 24] },
      { x: 91.5, y: 123, t: 187.2, a1: { p: [60, 135], b: -1 }, l1: [7.2, 7.2] }
    ]
  };
  A.flexao_inclinada = {
    vb: [30, 28, 146, 109.5],
    f: -1, hl: ["chest"],
    props: P.rect(52, 110, 30, 25),
    frames: [
      { x: 100.9, y: 89.9, t: 220, a1: { p: [68, 109], b: -1 }, l1: [40, 40] },
      { x: 93.5, y: 101, t: 208, a1: { p: [68, 109], b: -1 }, l1: [28, 28] }
    ]
  };
  A.paralelas = {
    f: 1, hl: ["chest", "tri"], vb: [0, -6, 200, 150],
    props: P.rect(90, 72, 22, 5) + P.seg([108, 77], [108, 135], 3),
    frames: [
      { x: 84.3, y: 63.6, t: -70, a1: { p: [100, 73], b: 1 }, l1: [110, 160] },
      { x: 82, y: 82, t: -60, a1: { p: [100, 73], b: 1 }, l1: [110, 160] }
    ]
  };
  A.pullover = {
    vb: [18, 25, 150, 112.5],
    f: 1, hl: ["chest", "back"], tool: { type: "db", o: "c", one: true },
    props: P.bench(40, 128, 100),
    frames: [
      { x: 112, y: 96, t: 180, a1: [190, 195], l1: lieLegs },
      { x: 112, y: 96, t: 180, a1: [280, 272], l1: lieLegs }
    ]
  };
  A.desenvolvimento_halter = {
    view: "front", sym: true, hl: ["delt"], tool: { type: "db", o: "h" },
    props: P.rect(76, 102, 48, 7) + P.seg([100, 109], [100, 135], 4),
    frames: [
      { x: 100, y: 100, t: -90, a1: [160, 270], l1: [100, 92, 0.3, 1] },
      { x: 100, y: 100, t: -90, a1: [255, 280], l1: [100, 92, 0.3, 1] }
    ]
  };
  A.elevacao_lateral = {
    view: "front", sym: true, hl: ["delt"], tool: { type: "db", o: "c" },
    frames: [
      { x: 100, y: 71, t: -90, a1: [97, 92], l1: [94, 90] },
      { x: 100, y: 71, t: -90, a1: [178, 186], l1: [94, 90] }
    ]
  };
  A.elevacao_frontal = {
    f: 1, hl: ["delt"], tool: { type: "db", o: "c" },
    frames: [
      S({ a1: [88, 88], l1: [90, 90] }),
      S({ a1: [-2, -6], l1: [90, 90] })
    ]
  };
  A.face_pull = {
    f: 1, hl: ["delt", "back"], tool: { type: "cable", anchor: [178, 30], one: false },
    props: P.tower(182) + P.pulley(178, 30),
    frames: [
      S({ t: -92, a1: { j: [122, 35], p: [143, 38] }, l1: { p: [104, 135], b: -1 }, l2: { p: [88, 135], b: -1 } }),
      S({ t: -96, a1: { j: [80, 26], p: [100, 16] }, l1: { p: [104, 135], b: -1 }, l2: { p: [88, 135], b: -1 } })
    ]
  };
  A.puxada_frente = {
    view: "front", sym: true, hl: ["back"], tool: { type: "bar", anchor: [100, -6] },
    props: seatFront.replace(P.rect(84, 50, 32, 52, 4), "") + P.rect(78, 86, 44, 6) + P.seg([60, -8], [140, -8], 4),
    vb: [0, -12, 200, 150],
    frames: [
      { x: 100, y: 100, t: -90, a1: [245, 260], l1: [100, 92, 0.3, 1] },
      { x: 100, y: 100, t: -90, a1: [140, 280], l1: [100, 92, 0.3, 1] }
    ]
  };
  A.barra_fixa = {
    view: "front", sym: true, hl: ["back"], vb: [0, -4, 200, 150],
    props: P.seg([40, 12], [160, 12], 4) + P.seg([40, 12], [40, 135], 4) + P.seg([160, 12], [160, 135], 4),
    frames: [
      { x: 100, y: 96, t: -90, a1: { p: [72, 13], b: -1 }, l1: [96, 120, 0.9, 0.5] },
      { x: 100, y: 66, t: -90, a1: { p: [72, 13], b: -1 }, l1: [96, 120, 0.9, 0.5] }
    ]
  };
  var hingeLegs = { p: [100, 135], b: -1 };
  A.remada_curvada = {
    f: 1, hl: ["back"], tool: { type: "bb" },
    frames: [
      { x: 85, y: 74, t: -25, a1: { p: [121, 103], b: 1 }, l1: hingeLegs },
      { x: 85, y: 74, t: -25, a1: { p: [104, 76], b: 1 }, l1: hingeLegs }
    ]
  };
  A.remada_baixa = {
    f: 1, hl: ["back"], tool: { type: "cable", anchor: [176, 108] },
    props: P.rect(40, 113, 52, 6) + P.seg([66, 119], [66, 135], 3) + P.seg([138, 98], [138, 135], 5) + P.seg([180, 20], [180, 135], 5) + P.pulley(176, 108),
    frames: [
      { x: 70, y: 110, t: -78, a1: { p: [116, 84], b: 1 }, l1: { p: [134, 112], b: -1 } },
      { x: 70, y: 110, t: -92, a1: { p: [82, 92], b: 1 }, l1: { p: [134, 112], b: -1 } }
    ]
  };
  A.remada_unilateral = {
    vb: [28, 25, 150, 112.5],
    f: 1, hl: ["back"], tool: { type: "db", o: "c", one: true },
    props: P.bench(40, 140, 102),
    frames: [
      { x: 85, y: 70, t: -3, a1: { p: [126, 111], b: 1 }, a2: { p: [124, 102], b: 1 }, l1: { p: [72, 135], b: -1 }, l2: [90, 180] },
      { x: 85, y: 70, t: -3, a1: { p: [104, 80], b: 1 }, a2: { p: [124, 102], b: 1 }, l1: { p: [72, 135], b: -1 }, l2: [90, 180] }
    ]
  };
  A.rosca_direta = {
    f: 1, hl: ["uarm"], tool: { type: "bb" },
    frames: [S({ a1: [92, 88], l1: [90, 90] }), S({ a1: [92, -70], l1: [90, 90] })]
  };
  A.rosca_martelo = {
    f: 1, hl: ["uarm"], tool: { type: "db", o: "v" },
    frames: [S({ a1: [92, 88], l1: [90, 90] }), S({ a1: [92, -70], l1: [90, 90] })]
  };
  A.triceps_corda = {
    f: 1, hl: ["tri"], tool: { type: "cable", anchor: [132, 8] },
    props: P.tower(138) + P.pulley(132, 8),
    frames: [
      S({ t: -84, a1: [94, -28], l1: { p: [104, 135], b: -1 }, l2: { p: [92, 135], b: -1 } }),
      S({ t: -84, a1: [94, 92], l1: { p: [104, 135], b: -1 }, l2: { p: [92, 135], b: -1 } })
    ]
  };
  A.triceps_frances = {
    f: 1, hl: ["tri"], tool: { type: "db", o: "c", one: true },
    props: P.rect(70, 102, 40, 6) + P.seg([90, 108], [90, 135], 4),
    frames: [
      { x: 90, y: 100, t: -90, a1: [-95, 115], l1: [0, 90] },
      { x: 90, y: 100, t: -90, a1: [-95, 268], l1: [0, 90] }
    ]
  };
  A.triceps_banco = {
    f: 1, hl: ["tri"],
    props: P.bench(30, 76, 100),
    frames: [
      { x: 74, y: 96, t: -90, a1: { p: [66, 101], b: -1 }, l1: { p: [124, 135], b: -1 } },
      { x: 76, y: 116, t: -90, a1: { p: [66, 101], b: -1 }, l1: { p: [124, 135], b: -1 } }
    ]
  };
  var sqLegs = { p: [100, 135], b: -1 };
  A.agachamento = {
    f: 1, hl: ["thigh", "glute"], tool: { type: "bb" },
    frames: [
      { x: 97, y: 72, t: -86, a1: { rt: [-4, -2], b: -1 }, l1: sqLegs },
      { x: 80, y: 106, t: -52, a1: { rt: [-4, -2], b: -1 }, l1: sqLegs }
    ]
  };
  A.agachamento_goblet = {
    f: 1, hl: ["thigh", "glute"], tool: { type: "db", o: "v", one: true },
    frames: [
      { x: 97, y: 72, t: -88, a1: { rt: [12, 10], b: 1 }, l1: sqLegs },
      { x: 82, y: 108, t: -62, a1: { rt: [12, 10], b: 1 }, l1: sqLegs }
    ]
  };
  A.leg_press = {
    f: 1, hl: ["thigh", "glute"], tool: { plate: -45 },
    props: P.seg([76, 114], [36, 80], 7) + P.rect(56, 112, 30, 6) + P.seg([70, 118], [70, 135], 4) + P.seg([118, 40], [182, 104], 3),
    frames: [
      { x: 72, y: 108, t: -150, a1: [70, 0], l1: { p: [95, 86], b: -1 }, fa1: -45 },
      { x: 72, y: 108, t: -150, a1: [70, 0], l1: { p: [116, 64], b: -1 }, fa1: -45 }
    ]
  };
  A.terra_romeno = {
    f: 1, hl: ["thigh", "glute"], tool: { type: "bb" },
    frames: [
      { x: 98, y: 72, t: -88, a1: [90, 90], l1: hingeLegs },
      { x: 80, y: 77, t: -14, a1: [90, 90], l1: hingeLegs }
    ]
  };
  A.afundo = {
    f: 1, hl: ["thigh", "glute"], tool: { type: "db", o: "c" },
    frames: [
      { x: 100, y: 80, t: -90, a1: [90, 90], l1: { p: [130, 135], b: -1 }, l2: { p: [68, 133], b: -1 }, fa2: 30 },
      { x: 98, y: 102, t: -90, a1: [90, 90], l1: { p: [130, 135], b: -1 }, l2: { p: [68, 133], b: -1 }, fa2: 30 }
    ]
  };
  A.cadeira_extensora = {
    f: 1, hl: ["thigh"], tool: { pad: true },
    props: P.rect(60, 99, 52, 7) + P.seg([66, 99], [60, 50], 6) + P.seg([84, 106], [84, 135], 4),
    frames: [
      { x: 80, y: 95, t: -95, a1: [80, 20], l1: [0, 88] },
      { x: 80, y: 95, t: -95, a1: [80, 20], l1: [0, 2] }
    ]
  };
  A.mesa_flexora = {
    vb: [28, 25, 150, 112.5],
    f: -1, hl: ["thigh"], tool: { pad: true },
    props: P.bench(40, 140, 101),
    frames: [
      { x: 110, y: 95, t: 180, a1: [100, 160], l1: [0, 0], fa1: 90 },
      { x: 110, y: 95, t: 180, a1: [100, 160], l1: [0, -105], fa1: -20 }
    ]
  };
  A.panturrilha = {
    f: 1, hl: ["shin"],
    props: P.rect(102, 131, 40, 4, 1),
    frames: [
      { x: 99.5, y: 70.1, t: -90, a1: [92, 88], l1: [90, 90], fa1: -20 },
      { x: 103.5, y: 59.2, t: -90, a1: [92, 88], l1: [90, 90], fa1: 60 }
    ]
  };
  A.elevacao_pelvica = {
    vb: [20, 32, 140, 105],
    f: 1, hl: ["glute"],
    frames: [
      { x: 95, y: 126, t: 180, hd: 0, a1: [5, 0], l1: { p: [130, 135], b: -1 } },
      { x: 95, y: 105, t: 149.5, hd: 30, a1: [5, 0], l1: { p: [130, 135], b: -1 } }
    ]
  };
  A.prancha = {
    vb: [38, 35, 136, 102],
    f: -1, hl: ["abs"], hold: 600, dur: 1400,
    frames: [
      { x: 98.9, y: 117.1, t: 193.2, a1: [90, 0], l1: [13.2, 13.2] },
      { x: 98.9, y: 115.6, t: 191, a1: [92, 0], l1: [14.5, 14.5] }
    ]
  };
  A.abdominal = {
    vb: [25, 32, 140, 105],
    f: 1, hl: ["abs"],
    frames: [
      { x: 100, y: 127, t: 180, a1: { rt: [10, 8], b: 1 }, l1: { p: [136, 135], b: -1 } },
      { x: 100, y: 127, t: 212, a1: { rt: [10, 8], b: 1 }, l1: { p: [136, 135], b: -1 } }
    ]
  };
  A.elevacao_pernas = {
    vb: [25, 32, 140, 105],
    f: 1, hl: ["abs"],
    frames: [
      { x: 100, y: 127, t: 180, a1: [3, 0], l1: [-2, -2] },
      { x: 100, y: 127, t: 180, a1: [3, 0], l1: [-85, -85] }
    ]
  };
  var mcBase = { x: 96.5, y: 105.3, t: 204, a1: { p: [60, 135], b: -1 } };
  function mc(o) { var r = {}; for (var k in mcBase) r[k] = mcBase[k]; for (var k2 in o) r[k2] = o[k2]; return r; }
  A.mountain_climber = {
    vb: [30, 33, 140, 105],
    f: -1, hl: ["abs"], dur: 380, hold: 60,
    frames: [
      mc({ l1: [150, 22], l2: [24, 24] }),
      mc({ l1: [24, 24], l2: [150, 22] })
    ]
  };
  A.polichinelo = {
    view: "front", sym: true, hl: ["full"], dur: 330, hold: 60, vb: [0, -14, 200, 150],
    frames: [
      { x: 100, y: 71, t: -90, a1: [96, 92], l1: [92, 90] },
      { x: 100, y: 66, t: -90, a1: [210, 242], l1: [112, 106] }
    ]
  };
  A.burpee = {
    f: -1, hl: ["full"], cycle: true, dur: 420, hold: 90, vb: [0, -16, 200, 150],
    frames: [
      { x: 110, y: 71, t: -90, a1: { p: [111, 77], b: 1 }, l1: { p: [110, 135], b: 1 } },
      { x: 112, y: 108, t: -155, a1: { p: [62, 135], b: -1 }, l1: { p: [110, 135], b: 1 } },
      { x: 96.5, y: 105.3, t: -156, a1: { p: [60, 135], b: -1 }, l1: { p: [155, 131], b: 1 } },
      { x: 112, y: 108, t: -155, a1: { p: [62, 135], b: -1 }, l1: { p: [110, 135], b: 1 } },
      { x: 110, y: 60, t: -90, a1: { p: [104, -12], b: 1 }, l1: { p: [110, 124], b: 1 } }
    ]
  };
  A.bike = {
    f: 1, hl: ["thigh"], period: 1100,
    props: P.seg([88, 84], [100, 118], 4) + P.seg([100, 118], [128, 70], 4) + P.seg([128, 70], [136, 66], 4) + P.seg([80, 84], [96, 84], 5) + '<circle cx="100" cy="118" r="11" class="propc"/>' + P.seg([70, 135], [140, 135], 6),
    fn: function (ph) {
      var a = ph * 360;
      var f1 = pt([100, 118], a, 11), f2 = pt([100, 118], a + 180, 11);
      return { x: 88, y: 80, t: -62, a1: { p: [134, 66], b: 1 }, l1: { p: f1, b: -1 }, l2: { p: f2, b: -1 }, fa1: 10, fa2: 10 };
    }
  };
  A.caminhada_inclinada = {
    f: 1, hl: ["thigh", "glute"], period: 1300,
    props: '<g transform="rotate(-8 100 135)">' + P.rect(30, 135, 150, 6, 3) + "</g>" + P.seg([160, 128], [168, 40], 4) + P.seg([168, 40], [140, 46], 4),
    fn: function (ph) {
      var s = Math.sin(ph * 2 * Math.PI), c = Math.cos(ph * 2 * Math.PI);
      var base = 131 - 0.14 * 0;
      function footAt(sv, cv) { var x = 100 + sv * 16; return [x, 135 - (100 - x) * Math.tan(rad(-8)) * -1 - Math.max(0, cv) * 6]; }
      var p1 = footAt(s, c), p2 = footAt(-s, -c);
      return { x: 100, y: 72 + Math.abs(c) * 1.5, t: -86, a1: [90 - s * 25, 60 - s * 20], a2: [90 + s * 25, 60 + s * 20], l1: { p: p1, b: -1 }, l2: { p: p2, b: -1 } };
    }
  };

  /* ---------- Componente ---------- */
  var live = [];
  var io = null;
  if ("IntersectionObserver" in G) {
    io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { e.target.__vis = e.isIntersecting; });
    }, { rootMargin: "60px" });
  }

  function mount(el, id) {
    var anim = A[id];
    if (!anim) { el.innerHTML = ""; return; }
    var vb = anim.vb || [0, -4, 200, 150];
    el.innerHTML = '<svg viewBox="' + vb.join(" ") + '" class="fig" preserveAspectRatio="xMidYMid meet" aria-hidden="true">' +
      P.floor() + '<g class="props">' + (anim.props || "") + '</g><g class="actor"></g></svg>' +
      (anim.label ? '<span class="fig-label">' + anim.label + "</span>" : "");
    var g = el.querySelector(".actor");
    var item = { el: el, g: g, anim: anim, off: Math.random() * 400 };
    el.__vis = !io;
    if (io) io.observe(el);
    live.push(item);
    g.innerHTML = figureSVG(anim, item.off);
  }

  var t0 = performance.now();
  function tick(now) {
    var ms = now - t0;
    for (var i = live.length - 1; i >= 0; i--) {
      var it = live[i];
      if (!it.el.isConnected) { if (io) io.unobserve(it.el); live.splice(i, 1); continue; }
      if (!it.el.__vis || it.el.offsetParent === null) continue;
      it.g.innerHTML = figureSVG(it.anim, ms + it.off);
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  G.Fig = { mount: mount, anims: A, svgAt: function (id, ms) { var a = A[id]; return a ? figureSVG(a, ms) : ""; } };
})(window);
