"use strict";
/* base.js — constantes, utilitários e armazenamento (localStorage). */

const CATS = {
  despesa: ["Moradia","Alimentação","Transporte","Saúde","Lazer","Educação","Contas fixas","Outros"],
  receita: ["Renda mensal","Extra","Investimentos","Outros"]
};
/* Cada categoria tem sempre a mesma cor, em todos os gráficos. */
const CORES = { "Moradia":"#3987e5","Alimentação":"#d95926","Transporte":"#199e70","Saúde":"#c98500",
  "Lazer":"#d55181","Educação":"#008300","Contas fixas":"#9085e9","Outros":"#7f7a94" };
const cor = c => CORES[c] || CORES["Outros"];

const CHAVE = "gastos-v1", CHAVE_USO = "gastos-v1-iniciado", CHAVE_META = "gastos-v1-meta";
const $ = id => document.getElementById(id);
const brl = n => n.toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const brlCurto = n => n >= 1000
  ? "R$ " + (n / 1000).toLocaleString("pt-BR",{maximumFractionDigits:1}) + " mil"
  : "R$ " + Math.round(n).toLocaleString("pt-BR");
const pad = n => String(n).padStart(2,"0");
const esc = s => String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const ISO = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const hojeISO = () => ISO(new Date());
const novoId = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
const c2 = n => Math.round(n * 100) / 100;
const soma = arr => c2(arr.reduce((s,l) => s + l.valor, 0));
const nomeMes = (a,m) => new Date(a,m,1).toLocaleDateString("pt-BR",{month:"long"});
const mesCurto = (a,m) => new Date(a,m,1).toLocaleDateString("pt-BR",{month:"short"}).replace(".","");
const diasNoMes = (a,m) => new Date(a, m + 1, 0).getDate();
const calmo = matchMedia("(prefers-reduced-motion: reduce)").matches;

/* Aceita 25,90 · 25.90 · 1.234,56 · 1234 */
function lerValor(txt){
  let s = String(txt).replace(/[R$\s]/g,"");
  if (s.includes(",")) s = s.replace(/\./g,"").replace(",",".");
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g,"");
  if (!/^\d*\.?\d+$/.test(s)) return NaN;
  return c2(parseFloat(s));
}

/* Só deixa passar lançamentos bem formados (protege contra backup estragado) */
function higienizar(lista){
  return lista.filter(l => l && (l.tipo === "despesa" || l.tipo === "receita")
      && typeof l.valor === "number" && isFinite(l.valor) && l.valor > 0
      && typeof l.data === "string" && /^\d{4}-\d{2}-\d{2}$/.test(l.data))
    .map(l => ({ id: String(l.id ?? novoId()), tipo: l.tipo,
      descricao: String(l.descricao ?? "").slice(0,60) || "Sem descrição",
      valor: c2(l.valor),
      categoria: String(l.categoria ?? "Outros").slice(0,40) || "Outros", data: l.data }));
}

function exemplos(){
  const h = new Date(), y = h.getFullYear(), m = h.getMonth(), max = h.getDate();
  const cur = d => ISO(new Date(y, m, Math.min(d, max)));
  const ant = (d, k = 1) => ISO(new Date(y, m - k, d));
  const base = [
    ["receita","Salário",4200,"Renda mensal",cur(5)],
    ["despesa","Aluguel",1450,"Moradia",cur(5)],
    ["despesa","Curso de inglês",280,"Educação",cur(2)],
    ["despesa","Recarga do bilhete",96,"Transporte",cur(3)],
    ["despesa","Conta de luz",148.9,"Contas fixas",cur(7)],
    ["despesa","Mercado da semana",312.4,"Alimentação",cur(8)],
    ["despesa","Farmácia",54.7,"Saúde",cur(9)],
    ["despesa","Cinema",62,"Lazer",cur(9)],
    ["receita","Freela de design",650,"Extra",cur(10)],
    ["despesa","Padaria",23.5,"Alimentação",cur(10)],
    ["despesa","Internet",119.9,"Contas fixas",cur(10)],
    ["despesa","Almoço fora",48,"Alimentação",cur(11)],
    ["receita","Salário",4200,"Renda mensal",ant(5)],
    ["despesa","Aluguel",1450,"Moradia",ant(5)],
    ["despesa","Mercado",780,"Alimentação",ant(12)],
    ["despesa","Conta de luz",162.3,"Contas fixas",ant(8)],
    ["despesa","Transporte",190,"Transporte",ant(15)],
    ["despesa","Show",240,"Lazer",ant(20)],
    ["despesa","Curso de inglês",280,"Educação",ant(2)],
    ["despesa","Conserto do carro",2350,"Transporte",ant(24)]
  ];
  /* meses mais antigos, para o gráfico dos últimos 6 meses ter história */
  [[2,3120],[3,3480],[4,2890],[5,3310]].forEach(([k, gasto]) => {
    base.push(["receita","Salário",4200,"Renda mensal",ant(5,k)]);
    base.push(["despesa","Aluguel",1450,"Moradia",ant(5,k)]);
    base.push(["despesa","Mercado",c2((gasto - 1450) * .45),"Alimentação",ant(12,k)]);
    base.push(["despesa","Contas do mês",c2((gasto - 1450) * .25),"Contas fixas",ant(9,k)]);
    base.push(["despesa","Lazer do mês",c2((gasto - 1450) * .30),"Lazer",ant(21,k)]);
  });
  return base.map(([tipo,descricao,valor,categoria,data]) => ({ id: novoId(), tipo, descricao, valor, categoria, data }));
}

/* estado guardado */
let dados = [], exemplo = false, meta = 0;
try {
  const salvo = JSON.parse(localStorage.getItem(CHAVE));
  if (Array.isArray(salvo)) dados = higienizar(salvo);
  meta = Math.max(0, Number(localStorage.getItem(CHAVE_META)) || 0);
} catch(e) {}
let jaUsou = false;
try { jaUsou = !!localStorage.getItem(CHAVE_USO); } catch(e) {}
if (!dados.length && !jaUsou) { dados = exemplos(); exemplo = true; meta = 3000; }

function salvar(){
  if (exemplo) return;
  try {
    localStorage.setItem(CHAVE, JSON.stringify(dados));
    localStorage.setItem(CHAVE_USO, "1");
    localStorage.setItem(CHAVE_META, String(meta));
  } catch(e) {}
}
function sairDoExemplo(){ if (exemplo) { exemplo = false; dados = []; meta = 0; } }
