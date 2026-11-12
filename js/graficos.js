"use strict";
/* graficos.js — rosca por categoria, gasto acumulado e últimos 6 meses (SVG puro, sem bibliotecas). */

const Graficos = (() => {
  const CIRC = 2 * Math.PI * 80;

  /* passo "redondo" para as linhas de grade */
  function passoBonito(max, n){
    const bruto = max / n, p = Math.pow(10, Math.floor(Math.log10(bruto))), f = bruto / p;
    return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p;
  }
  function escalaY(max, n = 4){
    const passo = passoBonito(max || 1, n), topo = Math.ceil((max || 1) / passo) * passo, ticks = [];
    for (let v = 0; v <= topo + passo / 2; v += passo) ticks.push(v);
    return { topo, ticks };
  }

  /* rosca: ord = [[categoria, valor], ...] já ordenado */
  function rosca(g, ord, desp){
    let ini = 0;
    g.innerHTML = `<circle class="trilha" cx="100" cy="100" r="80" fill="none" stroke-width="16"/>` +
      ord.map(([cat, v]) => {
        const len = v / desp * CIRC, vis = Math.max(len - (ord.length > 1 ? 3 : 0), 1.5);
        const s = `<circle class="seg" cx="100" cy="100" r="80" fill="none" stroke="${cor(cat)}" stroke-width="16"
          stroke-dasharray="${vis.toFixed(2)} ${(CIRC - vis).toFixed(2)}" stroke-dashoffset="${(-ini).toFixed(2)}"
          data-cat="${esc(cat)}" tabindex="0" role="button"
          aria-label="${esc(cat)}: ${brl(v)}, ${Math.round(v / desp * 100)}% do que saiu. Filtrar lançamentos."/>`;
        ini += len; return s;
      }).join("");
  }

  /* gasto acumulado, dia a dia, com a linha da meta */
  function ritmo(el, { ano, mes, despesas, meta }){
    if (!despesas.length){ el.innerHTML = '<p class="vazio">Nenhuma despesa neste mês.</p>'; return; }
    const W = 680, H = 250, m = { t: 14, r: 14, b: 26, l: 58 };
    const nd = diasNoMes(ano, mes), porDia = Array(nd).fill(0);
    despesas.forEach(l => { const d = +l.data.slice(8); if (d >= 1 && d <= nd) porDia[d - 1] = c2(porDia[d - 1] + l.valor); });
    const h = new Date(), ehAtual = ano === h.getFullYear() && mes === h.getMonth();
    let ult = nd;
    if (ehAtual){ ult = h.getDate(); for (let d = nd; d > ult; d--) if (porDia[d - 1] > 0){ ult = d; break; } }
    const acum = []; let s = 0;
    for (let d = 1; d <= ult; d++){ s = c2(s + porDia[d - 1]); acum.push(s); }
    const { topo, ticks } = escalaY(Math.max(s, meta) * 1.05);
    const x = d => m.l + (d - 1) / (nd - 1) * (W - m.l - m.r);
    const y = v => H - m.b - v / topo * (H - m.t - m.b);

    let linha = `M${x(1).toFixed(1)} ${y(acum[0]).toFixed(1)}`;
    for (let d = 2; d <= ult; d++) linha += ` H${x(d).toFixed(1)} V${y(acum[d - 1]).toFixed(1)}`;
    const area = `${linha} V${y(0)} H${x(1).toFixed(1)} Z`;
    const passo = (W - m.l - m.r) / (nd - 1);
    const mm = mesCurto(ano, mes);

    el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Gasto acumulado: ${brl(s)} até o dia ${ult}${meta > 0 ? `, meta de ${brl(meta)}` : ""}">
      <defs><linearGradient id="gRitmo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9085e9" stop-opacity=".38"/><stop offset="1" stop-color="#9085e9" stop-opacity="0"/></linearGradient></defs>
      ${ticks.map(v => `<line class="lg" x1="${m.l}" x2="${W - m.r}" y1="${y(v)}" y2="${y(v)}"/><text x="${m.l - 8}" y="${y(v) + 4}" text-anchor="end">${v ? brlCurto(v) : "0"}</text>`).join("")}
      ${[1,5,10,15,20,25,nd].map(d => `<text x="${x(d)}" y="${H - 6}" text-anchor="middle">${d}</text>`).join("")}
      <path d="${area}" fill="url(#gRitmo)"/>
      <path d="${linha}" fill="none" stroke="#9085e9" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
      <circle cx="${x(ult)}" cy="${y(s)}" r="4.5" fill="#9085e9" stroke="var(--card)" stroke-width="2"/>
      ${meta > 0 ? `<line x1="${m.l}" x2="${W - m.r}" y1="${y(meta)}" y2="${y(meta)}" stroke="var(--acento)" stroke-width="1.5" stroke-dasharray="5 5"/>
        <text x="${W - m.r}" y="${y(meta) - 6}" text-anchor="end" style="fill:var(--suave);font-weight:600">Meta ${brlCurto(meta)}</text>` : ""}
      ${acum.map((a, i) => { const d = i + 1;
        return `<g class="alvo" data-dica="${d} de ${mm}\nNo dia: ${brl(porDia[i])}\nAcumulado: ${brl(a)}">
          <line class="mira" x1="${x(d)}" x2="${x(d)}" y1="${m.t}" y2="${H - m.b}" stroke="var(--fraco)" stroke-width="1"/>
          <circle class="mira" cx="${x(d)}" cy="${y(a)}" r="4.5" fill="#fff"/>
          <rect x="${x(d) - passo / 2}" y="${m.t}" width="${passo}" height="${H - m.t - m.b}" fill="transparent"/></g>`; }).join("")}
    </svg>`;
  }

  /* últimos 6 meses: meses = [{ano, mes, rec, desp, atual}] */
  function tendencia(el, meses){
    const W = 440, H = 230, m = { t: 12, r: 8, b: 28, l: 58 };
    const { topo, ticks } = escalaY(Math.max(...meses.map(k => Math.max(k.rec, k.desp)), 1));
    const faixa = (W - m.l - m.r) / meses.length, lb = Math.min(20, faixa * .3);
    const y = v => H - m.b - v / topo * (H - m.t - m.b), base = y(0);
    const barra = (bx, v, c) => { if (!(v > 0)) return "";
      const alt = Math.max(base - y(v), 2), r = Math.min(4, alt);
      return `<path d="M${bx} ${base} V${base - alt + r} q0 ${-r} ${r} ${-r} H${bx + lb - r} q${r} 0 ${r} ${r} V${base} Z" fill="${c}"/>`; };
    el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="group" aria-label="Entradas e saídas dos últimos 6 meses">
      ${ticks.map(v => `<line class="lg" x1="${m.l}" x2="${W - m.r}" y1="${y(v)}" y2="${y(v)}"/><text x="${m.l - 8}" y="${y(v) + 4}" text-anchor="end">${v ? brlCurto(v) : "0"}</text>`).join("")}
      ${meses.map((k, i) => { const cx = m.l + faixa * (i + .5), nome = `${nomeMes(k.ano, k.mes)} de ${k.ano}`;
        return `<g class="alvo mesg${k.atual ? " atual" : ""}" data-ano="${k.ano}" data-mes="${k.mes}" tabindex="0" role="button"
            aria-label="${nome}: entrou ${brl(k.rec)}, saiu ${brl(k.desp)}. Abrir este mês."
            data-dica="${nome}\nEntrou: ${brl(k.rec)}\nSaiu: ${brl(k.desp)}">
          <rect class="fundo" x="${cx - faixa / 2 + 2}" y="${m.t - 4}" width="${faixa - 4}" height="${H - m.t + 2}" rx="8"/>
          ${barra(cx - lb - 1, k.rec, "var(--entra)")}${barra(cx + 1, k.desp, "var(--sai)")}
          <text x="${cx}" y="${H - 8}" text-anchor="middle">${mesCurto(k.ano, k.mes)}</text></g>`; }).join("")}
    </svg>`;
  }

  return { rosca, ritmo, tendencia };
})();
