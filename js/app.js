"use strict";
/* app.js — tela: desenha o painel, cuida dos filtros, do formulário e do backup. */

const agora = new Date();
let ano = agora.getFullYear(), mes = agora.getMonth();
let filtroCat = null, filtroTipo = null, editando = null;
let mesAtual = { saldo: 0, desp: 0, porCat: {}, vazio: true };   /* números do mês na tela */

function rotuloDia(iso){
  if (iso === hojeISO()) return "Hoje";
  const o = new Date(); o.setDate(o.getDate() - 1);
  if (iso === ISO(o)) return "Ontem";
  const [y,m,d] = iso.split("-").map(Number);
  return new Date(y, m-1, d).toLocaleDateString("pt-BR",{weekday:"long",day:"numeric",month:"long"});
}

/* saldo que conta até o valor novo */
let quadroSaldo, mostrado = 0;
function contar(alvo, animar){
  cancelAnimationFrame(quadroSaldo);
  if (calmo || !animar){ mostrado = alvo; $("cVal").textContent = brl(Math.abs(alvo)); return; }
  const de = mostrado, t0 = performance.now(), dur = 650;
  const passo = t => {
    const k = Math.min((t - t0) / dur, 1), e = 1 - Math.pow(1 - k, 3);
    mostrado = de + (alvo - de) * e;
    $("cVal").textContent = brl(Math.abs(c2(mostrado)));
    if (k < 1) quadroSaldo = requestAnimationFrame(passo); else mostrado = alvo;
  };
  quadroSaldo = requestAnimationFrame(passo);
}

/* centro da rosca: total que saiu, ou a categoria em destaque */
function centro(cat){
  const a = mesAtual;
  if (cat && a.porCat[cat] != null){
    $("rRot").textContent = cat;
    $("rVal").textContent = brl(a.porCat[cat]);
    $("rSub").textContent = `${Math.round(a.porCat[cat] / a.desp * 100)}% do que saiu`;
  } else {
    const n = Object.keys(a.porCat).length;
    $("rRot").textContent = "Saiu no mês";
    $("rVal").textContent = brl(a.desp);
    $("rSub").textContent = n ? `em ${n} ${n === 1 ? "categoria" : "categorias"}` : "";
  }
}
function destacar(cat){
  const alvo = cat || filtroCat;
  $("anel").classList.toggle("tem", !!alvo);
  document.querySelectorAll(".seg,.chip").forEach(el => el.classList.toggle("on", !!alvo && el.dataset.cat === alvo));
  Enxame.destacar(alvo);
  centro(alvo);
}

function pintarMeta(){
  const desp = mesAtual.desp, b = $("barra");
  $("metaVal").textContent = meta > 0 ? brl(meta) : "sem meta";
  b.firstElementChild.style.width = meta > 0 ? Math.min(desp / meta, 1) * 100 + "%" : "0%";
  b.classList.toggle("estourou", meta > 0 && desp > meta);
  $("metaTxt").textContent = meta <= 0 ? "Arraste para definir quanto quer gastar por mês."
    : desp > meta ? `Passou ${brl(c2(desp - meta))} da meta.`
    : `Ainda dá para gastar ${brl(c2(meta - desp))}.`;
}

function ultimosMeses(){
  const out = [];
  for (let k = 5; k >= 0; k--){
    const d = new Date(ano, mes - k, 1), ym = `${d.getFullYear()}-${pad(d.getMonth()+1)}`;
    const doM = dados.filter(l => l.data.startsWith(ym));
    out.push({ ano: d.getFullYear(), mes: d.getMonth(), atual: k === 0,
      rec: soma(doM.filter(l => l.tipo === "receita")), desp: soma(doM.filter(l => l.tipo === "despesa")) });
  }
  return out;
}

function render(animar = true){
  const ym = `${ano}-${pad(mes+1)}`;
  $("mesTxt").textContent = `${nomeMes(ano,mes)} de ${ano}`;
  const h = new Date();
  $("hoje").hidden = (ano === h.getFullYear() && mes === h.getMonth());
  $("aviso").hidden = !exemplo;

  const doMes = dados.filter(l => l.data.startsWith(ym));
  const despesas = doMes.filter(l => l.tipo === "despesa");
  const rec = soma(doMes.filter(l => l.tipo === "receita")), desp = soma(despesas);
  const saldo = c2(rec - desp);
  const porCat = {};
  despesas.forEach(l => porCat[l.categoria] = c2((porCat[l.categoria] || 0) + l.valor));
  const ord = Object.entries(porCat).sort((a,b) => b[1] - a[1]);
  mesAtual = { saldo, desp, porCat, vazio: !doMes.length };
  if (filtroCat && !(filtroCat in porCat)) filtroCat = null;

  /* cartão de saldo: só o número muda de cor, o fundo da página é sempre o mesmo */
  $("kSaldo").dataset.estado = !doMes.length ? "vazio" : saldo < 0 ? "neg" : saldo > 0 ? "pos" : "zero";
  $("cRot").textContent = !doMes.length ? "Nada lançado" : saldo > 0 ? "Sobrou" : saldo < 0 ? "Faltou" : "Fechou em";
  $("cSub").textContent = saldo < 0 ? "Saiu mais do que entrou neste mês" : `em ${nomeMes(ano,mes)}`;
  contar(saldo, animar);

  $("rec").textContent = brl(rec);
  $("desp").textContent = brl(desp);
  document.querySelectorAll(".tile").forEach(t => t.setAttribute("aria-pressed", String(filtroTipo === t.dataset.tipo)));

  /* comparação com o mês anterior */
  const dAnt = new Date(ano, mes - 1, 1);
  const ymAnt = `${dAnt.getFullYear()}-${pad(dAnt.getMonth()+1)}`;
  const despAnt = soma(dados.filter(l => l.tipo === "despesa" && l.data.startsWith(ymAnt)));
  if (desp > 0 && despAnt > 0){
    const dif = c2(desp - despAnt), quando = nomeMes(dAnt.getFullYear(), dAnt.getMonth());
    $("comp").textContent = dif === 0 ? `O mesmo que em ${quando}` : `${brl(Math.abs(dif))} a ${dif > 0 ? "mais" : "menos"} que em ${quando}`;
  } else $("comp").textContent = "Toque para ver só o que saiu";

  /* rosca e categorias */
  Graficos.rosca($("segs"), ord, desp);
  $("chips").innerHTML = ord.length ? ord.map(([cat,v]) =>
    `<button type="button" class="chip" data-cat="${esc(cat)}" aria-pressed="${filtroCat === cat}">
      <i style="background:${cor(cat)}"></i>${esc(cat)} <em>${Math.round(v / desp * 100)}%</em></button>`).join("")
    : '<p class="vazio">Nenhuma despesa neste mês.</p>';

  /* meta */
  const r = $("meta");
  r.max = Math.max(3000, Math.ceil(Math.max(meta, desp) * 1.6 / 500) * 500);
  r.value = meta;
  pintarMeta();

  /* gráficos */
  $("ritmoNota").textContent = !despesas.length ? "" : meta > 0
    ? (desp > meta ? "A linha roxa já passou da meta tracejada." : "Enquanto a linha roxa ficar abaixo da tracejada, você está dentro da meta.")
    : "Defina uma meta para ver até onde a linha pode subir.";
  Graficos.ritmo($("ritmo"), { ano, mes, despesas, meta });
  Graficos.tendencia($("tend"), ultimosMeses());
  Enxame.atualizar(despesas, { ano, mes, filtro: filtroCat });

  /* lista agrupada por dia */
  const f = $("limparFiltro"), rotFiltro = filtroCat || (filtroTipo === "receita" ? "o que entrou" : filtroTipo === "despesa" ? "o que saiu" : "");
  f.hidden = !rotFiltro;
  if (rotFiltro){ f.textContent = `Só ${rotFiltro} ✕`; f.setAttribute("aria-label", "Mostrar todos os lançamentos"); }
  const visiveis = doMes.filter(l => filtroCat ? (l.tipo === "despesa" && l.categoria === filtroCat) : filtroTipo ? l.tipo === filtroTipo : true)
    .sort((a,b) => b.data.localeCompare(a.data));
  const dias = [];
  visiveis.forEach(l => { const u = dias[dias.length-1]; if (u && u.data === l.data) u.itens.push(l); else dias.push({data:l.data, itens:[l]}); });
  $("lista").innerHTML = dias.length ? dias.map(d => {
    const liq = c2(soma(d.itens.filter(l => l.tipo === "receita")) - soma(d.itens.filter(l => l.tipo === "despesa")));
    return `<section class="dia"><h3><span>${esc(rotuloDia(d.data))}</span><span class="sub">${liq < 0 ? "− " : "+ "}${brl(Math.abs(liq))}</span></h3><ul>${
      d.itens.map(l => `<li><button type="button" class="lanc" data-id="${esc(l.id)}" aria-label="Editar ${esc(l.descricao)}">
        <i style="background:${l.tipo === "receita" ? "var(--entra)" : cor(l.categoria)}"></i>
        <span class="d"><b>${esc(l.descricao)}</b><small>${esc(l.categoria)}</small></span>
        <span class="v ${l.tipo === "receita" ? "in" : ""}">${l.tipo === "receita" ? "+ " : ""}${brl(l.valor)}</span></button></li>`).join("")
    }</ul></section>`;
  }).join("") : `<p class="vazio">${doMes.length ? "Nenhum lançamento com esse filtro." : `Nenhum lançamento em ${esc(nomeMes(ano,mes))}. Use “Novo lançamento” para registrar o primeiro.`}</p>`;

  destacar(null);
}

/* trocar de mês: setas, teclado, deslizar e clique no gráfico de 6 meses */
function irPara(a, m){ ano = a; mes = m; filtroCat = filtroTipo = null; render(); }
function mover(d){ const x = new Date(ano, mes + d, 1); irPara(x.getFullYear(), x.getMonth()); }
$("ant").onclick = () => mover(-1);
$("prox").onclick = () => mover(1);
$("hoje").onclick = () => { const h = new Date(); irPara(h.getFullYear(), h.getMonth()); };
document.addEventListener("keydown", e => {
  if (document.querySelector("dialog[open]") || /^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName)) return;
  if (e.key === "ArrowLeft") mover(-1);
  if (e.key === "ArrowRight") mover(1);
});
let toque = null;
$("pagina").addEventListener("touchstart", e => {
  toque = e.target.closest("input,.rosca,.enxame,.grafico") ? null : { x: e.touches[0].clientX, y: e.touches[0].clientY };
}, {passive:true});
$("pagina").addEventListener("touchend", e => {
  if (!toque) return;
  const dx = e.changedTouches[0].clientX - toque.x, dy = e.changedTouches[0].clientY - toque.y;
  if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 2) mover(dx < 0 ? 1 : -1);
  toque = null;
}, {passive:true});
const abrirMesDoGrafico = e => { const g = e.target.closest(".mesg"); if (g) irPara(+g.dataset.ano, +g.dataset.mes); };
$("tend").addEventListener("click", abrirMesDoGrafico);
$("tend").addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " "){ e.preventDefault(); abrirMesDoGrafico(e); } });

/* dica que acompanha o ponteiro em qualquer elemento com data-dica */
const dicaEl = $("dica");
function mostrarDica(e){
  const a = e.target.closest ? e.target.closest("[data-dica]") : null;
  if (!a){ dicaEl.hidden = true; return; }
  dicaEl.textContent = a.dataset.dica; dicaEl.hidden = false;
  const w = dicaEl.offsetWidth, h = dicaEl.offsetHeight;
  let x = e.clientX + 14, y = e.clientY - h - 12;
  if (x + w > innerWidth - 8) x = e.clientX - w - 14;
  if (y < 8) y = e.clientY + 18;
  dicaEl.style.left = Math.max(8, x) + "px"; dicaEl.style.top = y + "px";
}
document.addEventListener("pointermove", mostrarDica, {passive:true});
document.addEventListener("pointerdown", mostrarDica, {passive:true});
addEventListener("scroll", () => dicaEl.hidden = true, {passive:true});

/* rosca e categorias: passar o mouse destaca, clicar filtra */
function alternarCat(cat){ filtroCat = filtroCat === cat ? null : cat; filtroTipo = null; render(false); }
for (const id of ["segs","chips"]){
  const el = $(id);
  el.addEventListener("pointerover", e => { const a = e.target.closest("[data-cat]"); if (a && e.pointerType !== "touch") destacar(a.dataset.cat); });
  el.addEventListener("pointerout", e => { if (e.pointerType !== "touch") destacar(null); });
  el.addEventListener("focusin", e => { const a = e.target.closest("[data-cat]"); if (a) destacar(a.dataset.cat); });
  el.addEventListener("focusout", () => destacar(null));
  el.addEventListener("click", e => { const a = e.target.closest("[data-cat]"); if (a) alternarCat(a.dataset.cat); });
}
$("segs").addEventListener("keydown", e => {
  if ((e.key === "Enter" || e.key === " ") && e.target.dataset.cat){ e.preventDefault(); alternarCat(e.target.dataset.cat); }
});
document.querySelectorAll(".tile").forEach(t => t.onclick = () => {
  filtroTipo = filtroTipo === t.dataset.tipo ? null : t.dataset.tipo; filtroCat = null; render(false);
});
$("limparFiltro").onclick = () => { filtroCat = filtroTipo = null; render(false); };
$("zerar").onclick = () => { sairDoExemplo(); salvar(); render(); avisar("Exemplos apagados. Agora é com você."); };

/* enxame: por dia ou por categoria */
document.querySelectorAll(".seletor button").forEach(b => b.onclick = () => {
  document.querySelectorAll(".seletor button").forEach(x => x.setAttribute("aria-pressed", String(x === b)));
  Enxame.mudarModo(b.dataset.modo);
});

/* meta: atualiza enquanto arrasta, salva ao soltar */
$("meta").addEventListener("input", e => { meta = Number(e.target.value) || 0; pintarMeta(); });
$("meta").addEventListener("change", () => { salvar(); render(false); });

/* avisos com ação de desfazer */
let relogio;
function avisar(txt, acao, fn){
  clearTimeout(relogio);
  $("toastTxt").textContent = txt;
  const b = $("toastBtn");
  b.hidden = !acao;
  if (acao){ b.textContent = acao; b.onclick = () => { $("toast").hidden = true; fn(); }; }
  $("toast").hidden = false;
  relogio = setTimeout(() => $("toast").hidden = true, acao ? 7000 : 4000);
}

/* confirmação feita na própria página */
function confirmar(titulo, texto, rotulo){
  return new Promise(ok => {
    const d = $("conf");
    $("confT").textContent = titulo; $("confTxt").textContent = texto; $("confSim").textContent = rotulo;
    const fim = v => { $("confSim").onclick = $("confNao").onclick = d.onclose = null; if (d.open) d.close(); ok(v); };
    $("confSim").onclick = () => fim(true);
    $("confNao").onclick = () => fim(false);
    d.onclose = () => fim(false);
    d.showModal(); $("confNao").focus();
  });
}

/* formulário de lançamento */
const tipoAtual = () => document.querySelector('input[name="tipo"]:checked').value;
function preencherCats(sel){
  const lista = CATS[tipoAtual()].slice();
  if (sel && !lista.includes(sel)) lista.push(sel);
  $("categoria").innerHTML = lista.map(c => `<option${c === sel ? " selected" : ""}>${esc(c)}</option>`).join("");
}
document.querySelectorAll('input[name="tipo"]').forEach(r => r.addEventListener("change", () => preencherCats()));

function abrir(l){
  editando = l ? l.id : null;
  $("form").reset(); $("erro").hidden = true;
  $("dlgT").textContent = l ? "Editar lançamento" : "Novo lançamento";
  $("excluir").hidden = !l;
  if (l){
    $(l.tipo === "receita" ? "tRec" : "tDesp").checked = true;
    $("valor").value = l.valor.toLocaleString("pt-BR",{minimumFractionDigits:2, useGrouping:false});
    $("descricao").value = l.descricao; $("data").value = l.data;
    preencherCats(l.categoria);
  } else {
    if (filtroTipo === "receita") $("tRec").checked = true;
    const h = new Date();
    $("data").value = (ano === h.getFullYear() && mes === h.getMonth()) ? hojeISO() : `${ano}-${pad(mes+1)}-01`;
    preencherCats(filtroCat || undefined);
  }
  dicaEl.hidden = true;
  $("dlg").showModal();
  if (!l) $("valor").focus();
}
const abrirPorId = id => { const l = dados.find(x => x.id === id); if (l) abrir(l); };
$("novo").onclick = () => abrir(null);
$("cancelar").onclick = () => $("dlg").close();
document.querySelectorAll("dialog").forEach(d => d.addEventListener("click", e => { if (e.target === d) d.close(); }));
$("lista").addEventListener("click", e => { const b = e.target.closest(".lanc"); if (b) abrirPorId(b.dataset.id); });

function falha(txt, campo){ $("erro").textContent = txt; $("erro").hidden = false; $(campo).focus(); }

$("form").addEventListener("submit", e => {
  e.preventDefault();
  const valor = lerValor($("valor").value), descricao = $("descricao").value.trim(), data = $("data").value;
  if (!(valor > 0)) return falha("Digite um valor maior que zero, como 25,90.", "valor");
  if (!descricao) return falha("Escreva uma descrição curta, como “Mercado”.", "descricao");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return falha("Escolha a data do lançamento.", "data");
  const campos = { tipo: tipoAtual(), descricao, valor, categoria: $("categoria").value, data };
  if (editando){
    const l = dados.find(x => x.id === editando);
    if (l) Object.assign(l, campos);
  } else {
    sairDoExemplo();
    dados.push({ id: novoId(), ...campos });
  }
  salvar();
  const [a,m] = data.split("-"); ano = +a; mes = +m - 1;
  filtroCat = filtroTipo = null;
  $("dlg").close(); render(); avisar("Lançamento salvo.");
});

$("excluir").onclick = () => {
  const i = dados.findIndex(x => x.id === editando); if (i < 0) return;
  const [fora] = dados.splice(i, 1);
  salvar(); $("dlg").close(); render();
  avisar("Lançamento excluído.", "Desfazer", () => { dados.push(fora); salvar(); render(); });
};

/* backup */
$("exportar").onclick = () => {
  if (exemplo || !dados.length) return avisar("Ainda não há lançamentos seus para guardar.");
  try {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(dados, null, 2)], {type:"application/json"}));
    a.download = `gastos-backup-${hojeISO()}.json`; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    avisar("Backup baixado.");
  } catch(err){ avisar("Não deu para baixar o backup. Tente de novo em outro navegador."); }
};
$("importar").onclick = () => $("arquivo").click();
$("arquivo").addEventListener("change", e => {
  const arq = e.target.files[0]; if (!arq) return;
  const r = new FileReader();
  r.onload = async () => {
    let novos;
    try { const bruto = JSON.parse(r.result); if (!Array.isArray(bruto)) throw 0; novos = higienizar(bruto); if (!novos.length) throw 0; }
    catch(err){ return avisar("Esse arquivo não é um backup deste app. Escolha um .json baixado aqui."); }
    const meus = exemplo ? 0 : dados.length;
    if (meus && !(await confirmar("Restaurar este backup?", `Os ${meus} lançamentos atuais serão trocados pelos ${novos.length} do arquivo.`, "Restaurar backup"))) return;
    const antes = dados, eraExemplo = exemplo, metaAntes = meta;
    if (exemplo) meta = 0;
    exemplo = false; dados = novos; salvar(); filtroCat = filtroTipo = null; render();
    avisar("Backup restaurado.", meus ? "Desfazer" : null, () => { dados = antes; exemplo = eraExemplo; meta = metaAntes; salvar(); render(); });
  };
  r.readAsText(arq); e.target.value = "";
});
$("limpar").onclick = async () => {
  if (exemplo || !dados.length) return avisar("Não há lançamentos seus para apagar.");
  if (!(await confirmar("Apagar todos os lançamentos?", `Os ${dados.length} lançamentos de todos os meses serão apagados deste navegador.`, "Apagar tudo"))) return;
  const antes = dados;
  dados = []; salvar(); filtroCat = filtroTipo = null; render();
  avisar("Tudo apagado.", "Desfazer", () => { dados = antes; salvar(); render(); });
};

Enxame.iniciar($("enxame"), abrirPorId);
render();
