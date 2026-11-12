"use strict";
/* enxame.js — gráfico de enxame (beeswarm) com física simples.
   Cada despesa é uma bolha: a área mostra o valor e a cor mostra a categoria.
   As bolhas são puxadas para o seu lugar (dia do mês ou grupo da categoria)
   e se empurram para não se sobrepor. Dá para arrastar; um clique abre a edição. */

const Enxame = (() => {
  const NS = "http://www.w3.org/2000/svg", EIXO = 30;
  let caixa, svg, gEixo, gNos, vazio;
  let nos = [], modo = "dia", W = 600, H = 280, ctx = { ano: 0, mes: 0 };
  let quadro = 0, quietos = 0, arrasto = null, sobre = null, aoAbrir = () => {};

  const novo = (tag, attrs = {}) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };
  const noDe = alvo => alvo && alvo.dataset && alvo.dataset.id ? nos.find(n => n.id === alvo.dataset.id) : null;

  function iniciar(el, abrir){
    caixa = el; aoAbrir = abrir;
    svg = novo("svg", { role: "img" });
    gEixo = novo("g"); gNos = novo("g");
    svg.append(gEixo, gNos);
    vazio = document.createElement("p"); vazio.className = "vazio"; vazio.textContent = "Nenhuma despesa neste mês."; vazio.hidden = true;
    caixa.append(svg, vazio);

    svg.addEventListener("pointerover", e => { const n = noDe(e.target); if (n && !arrasto){ sobre = n; acordar(); } });
    svg.addEventListener("pointerout", e => { if (noDe(e.target) === sobre){ sobre = null; acordar(); } });
    svg.addEventListener("pointerdown", e => {
      const n = noDe(e.target); if (!n) return;
      arrasto = { n, x0: e.clientX, y0: e.clientY, moveu: false };
      try { svg.setPointerCapture(e.pointerId); } catch(err) {}
    });
    svg.addEventListener("pointermove", e => {
      if (!arrasto) return;
      if (Math.hypot(e.clientX - arrasto.x0, e.clientY - arrasto.y0) > 6) arrasto.moveu = true;
      if (!arrasto.moveu) return;
      const r = svg.getBoundingClientRect();
      arrasto.n.x = e.clientX - r.left; arrasto.n.y = e.clientY - r.top; arrasto.n.vx = arrasto.n.vy = 0;
      caixa.classList.add("arrastando"); acordar();
    });
    const soltar = e => {
      if (!arrasto) return;
      const a = arrasto; arrasto = null; sobre = null; caixa.classList.remove("arrastando");
      if (!a.moveu && e.type === "pointerup") aoAbrir(a.n.id);
      acordar();
    };
    svg.addEventListener("pointerup", soltar);
    svg.addEventListener("pointercancel", soltar);

    new ResizeObserver(() => {
      if (Math.abs(caixa.clientWidth - W) > 4 && nos.length){ raios(); alvos(); eixo(); acordar(); }
    }).observe(caixa);
  }

  /* raio proporcional à raiz do valor (a ÁREA representa o dinheiro) */
  function raios(){
    W = Math.max(260, caixa.clientWidth);
    const max = Math.max(...nos.map(n => n.l.valor), 1), rmax = W < 520 ? 26 : 44;
    nos.forEach(n => n.r = Math.max(5, rmax * Math.sqrt(n.l.valor / max)));
    const area = nos.reduce((s, n) => s + Math.PI * n.r * n.r, 0), limite = W * 220 * .3;
    if (area > limite){ const k = Math.sqrt(limite / area); nos.forEach(n => n.r = Math.max(4, n.r * k)); }
  }

  /* para onde cada bolha quer ir */
  function grupos(){
    const tot = {};
    nos.forEach(n => tot[n.l.categoria] = (tot[n.l.categoria] || 0) + n.l.valor);
    return Object.entries(tot).sort((a, b) => b[1] - a[1]);
  }
  function alvos(){
    if (modo === "dia"){
      H = 240;
      const nd = diasNoMes(ctx.ano, ctx.mes), mx = W < 520 ? 22 : 40;
      nos.forEach(n => { n.tx = mx + (+n.l.data.slice(8) - 1) / (nd - 1) * (W - 2 * mx); n.ty = (H - EIXO) / 2; });
    } else {
      const g = grupos(), cols = Math.min(g.length, W < 520 ? 2 : W < 860 ? 4 : 8), lin = Math.ceil(g.length / cols), cel = 170;
      H = lin * cel;
      const pos = {};
      g.forEach(([cat], i) => pos[cat] = { x: (i % cols + .5) * W / cols, y: Math.floor(i / cols) * cel + (cel - 40) / 2 });
      nos.forEach(n => { n.tx = pos[n.l.categoria].x; n.ty = pos[n.l.categoria].y; });
    }
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.setAttribute("height", H);
  }

  function eixo(){
    let s = "";
    if (modo === "dia"){
      const nd = diasNoMes(ctx.ano, ctx.mes), mx = W < 520 ? 22 : 40, by = H - EIXO + 6;
      s += `<line class="lg" x1="${mx}" x2="${W - mx}" y1="${by}" y2="${by}"/>`;
      [1,5,10,15,20,25,nd].forEach(d => { const x = mx + (d - 1) / (nd - 1) * (W - 2 * mx);
        s += `<line class="lg" x1="${x}" x2="${x}" y1="${by}" y2="${by + 5}"/><text x="${x}" y="${H - 4}" text-anchor="middle">${d}</text>`; });
    } else {
      const g = grupos(), cols = Math.min(g.length, W < 520 ? 2 : W < 860 ? 4 : 8), cel = 170;
      g.forEach(([cat, v], i) => { const x = (i % cols + .5) * W / cols, y = Math.floor(i / cols) * cel + cel - 26;
        s += `<text class="forte" x="${x}" y="${y}" text-anchor="middle">${esc(cat)}</text><text x="${x}" y="${y + 16}" text-anchor="middle">${esc(brlCurto(v))}</text>`; });
    }
    gEixo.innerHTML = s;
  }

  /* um passo da simulação; devolve o quanto as bolhas se mexeram */
  function passo(){
    const dia = modo === "dia", teto = dia ? H - EIXO : H;
    const antes = nos.map(n => [n.x, n.y]);
    for (const n of nos){
      const alvoR = n === sobre || (arrasto && arrasto.n === n) ? n.r * 1.25 + 2 : n.r;
      n.rv += (alvoR - n.rv) * .25;
      if (arrasto && arrasto.n === n && arrasto.moveu) continue;
      n.vx = (n.vx + (n.tx - n.x) * (dia ? .12 : .045)) * .78;
      n.vy = (n.vy + (n.ty - n.y) * (dia ? .02 : .045)) * .78;
      n.x += n.vx; n.y += n.vy;
    }
    for (let k = 0; k < 3; k++)
      for (let i = 0; i < nos.length; i++) for (let j = i + 1; j < nos.length; j++){
        const a = nos[i], b = nos[j];
        let dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
        const min = a.rv + b.rv + 2;
        if (d >= min) continue;
        if (d < .01){ dx = (i % 2 ? 1 : -1) * .5; dy = .5 + (j % 3) * .3; d = Math.hypot(dx, dy); }
        const o = (min - d) / d, fa = arrasto && arrasto.n === a, fb = arrasto && arrasto.n === b;
        const pa = fa ? 0 : fb ? 1 : .5, pb = fb ? 0 : fa ? 1 : .5;
        a.x -= dx * o * pa; a.y -= dy * o * pa; b.x += dx * o * pb; b.y += dy * o * pb;
      }
    let mov = 0;
    nos.forEach((n, i) => {
      n.x = Math.min(W - n.rv, Math.max(n.rv, n.x)); n.y = Math.min(teto - n.rv, Math.max(n.rv, n.y));
      mov += Math.abs(n.x - antes[i][0]) + Math.abs(n.y - antes[i][1]) + Math.abs(n.rv - (n === sobre ? n.r * 1.25 + 2 : n.r)) * .2;
    });
    return mov;
  }
  function desenhar(){
    for (const n of nos){ n.el.setAttribute("cx", n.x.toFixed(1)); n.el.setAttribute("cy", n.y.toFixed(1)); n.el.setAttribute("r", n.rv.toFixed(1)); }
  }
  function laco(){
    const mov = passo(); desenhar();
    quietos = mov < nos.length * .04 ? quietos + 1 : 0;
    quadro = (quietos < 20 || (arrasto && arrasto.moveu)) ? requestAnimationFrame(laco) : 0;   /* para sozinho quando assenta */
  }
  function acordar(){
    quietos = 0;
    if (calmo){ for (let i = 0; i < 240; i++) passo(); desenhar(); return; }
    if (!quadro) quadro = requestAnimationFrame(laco);
  }

  /* recebe as despesas do mês; bolhas que já existiam continuam de onde estavam */
  function atualizar(lista, c){
    const mudouMes = c.ano !== ctx.ano || c.mes !== ctx.mes;
    ctx = c;
    vazio.hidden = !!lista.length; svg.style.display = lista.length ? "" : "none";
    const antigos = new Map(mudouMes ? [] : nos.map(n => [n.id, n]));
    nos.forEach(n => { if (mudouMes || !lista.some(l => l.id === n.id)) n.el.remove(); });
    W = Math.max(260, caixa.clientWidth);
    nos = lista.map(l => {
      const a = antigos.get(l.id);
      const n = a || { id: l.id, x: W / 2 + (Math.random() - .5) * W * .5, y: 60 + Math.random() * 120, vx: 0, vy: 0, rv: 0, el: novo("circle", { class: "bolha" }) };
      n.l = l;
      if (!a) gNos.appendChild(n.el);
      n.el.dataset.id = l.id;
      n.el.dataset.dica = `${l.descricao}\n${l.categoria}, dia ${+l.data.slice(8)}\n${brl(l.valor)}`;
      n.el.setAttribute("fill", cor(l.categoria));
      n.el.classList.toggle("apagada", !!c.filtro && l.categoria !== c.filtro);
      return n;
    });
    const total = soma(lista);
    svg.setAttribute("aria-label", lista.length
      ? `Enxame com ${lista.length} gastos do mês, somando ${brl(total)}. A lista de lançamentos traz os mesmos dados.` : "Sem gastos no mês");
    if (!nos.length) return;
    raios(); alvos(); eixo(); acordar();
  }

  function mudarModo(m){ if (m === modo) return; modo = m; if (nos.length){ alvos(); eixo(); acordar(); } }
  function destacar(cat){ nos.forEach(n => n.el.classList.toggle("apagada", !!cat && n.l.categoria !== cat)); }

  return { iniciar, atualizar, mudarModo, destacar };
})();
