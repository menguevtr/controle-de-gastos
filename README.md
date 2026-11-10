Meus gastos

App de controle de gastos pessoais que roda inteiro no navegador. É um único arquivo HTML, sem instalação, sem cadastro e sem servidor: os lançamentos ficam guardados no próprio navegador.

Como usar
Baixe o arquivo controle-de-gastos.html.
Abra com dois cliques em qualquer navegador atual (Chrome, Edge, Firefox ou Safari).
Clique em Novo lançamento e registre o que entrou ou saiu.

Na primeira vez, o app mostra lançamentos de exemplo para você ver como fica. Eles somem quando você registra o primeiro lançamento ou clica em Apagar exemplos e começar.

Para usar no celular, hospede o arquivo em qualquer serviço de páginas estáticas (GitHub Pages, Netlify, Vercel) e abra o endereço no navegador do aparelho.

O que o app faz
Lançamentos: registra entradas e saídas com valor, descrição, categoria e data. Tocar num lançamento abre para editar ou excluir.
Resumo do mês: mostra quanto sobrou ou faltou, o total que entrou, o total que saiu e a diferença de gastos em relação ao mês anterior.
Anel de gastos: divide as despesas por categoria. Passar o mouse numa fatia mostra o valor e a porcentagem; clicar filtra a lista por aquela categoria.
Filtros: os blocos "Entrou" e "Saiu" e as etiquetas de categoria filtram os lançamentos.
Meta de gastos: um controle deslizante define quanto você quer gastar por mês, e a barra mostra quanto ainda resta ou quanto passou.
Fundo que reage ao mês: o degradê fica verde-mar quando sobra dinheiro, em tons de brasa quando falta e azul-acinzentado quando o mês está vazio.
Desfazer: excluir um lançamento, apagar tudo e restaurar um backup oferecem a opção de desfazer por alguns segundos.
Backup: baixa todos os lançamentos em um arquivo .json e restaura a partir dele.
Atalhos
Ação	Como fazer
Mês anterior ou próximo	Setas ← e → do teclado, ou deslizar o dedo para os lados
Voltar ao mês atual	Botão "Voltar para este mês", que aparece quando você está em outro mês
Fechar uma janela	Tecla Esc ou clique fora dela

O campo de valor aceita vírgula ou ponto: 25,90, 25.90 e 1.234,56 funcionam.

Categorias
Saídas	Entradas
Moradia, Alimentação, Transporte, Saúde, Lazer, Educação, Contas fixas, Outros	Renda mensal, Extra, Investimentos, Outros

Para mudar as categorias, edite a constante CATS no início do <script>. As cores de cada categoria de saída ficam na constante CORES, logo abaixo.

Onde ficam os dados

Tudo é salvo no localStorage do navegador, em três chaves:

Chave	Conteúdo
gastos-v1	Lista de lançamentos
gastos-v1-meta	Meta de gastos mensal
gastos-v1-iniciado	Marca que o app já foi usado, para não mostrar os exemplos de novo

Isso tem duas consequências:

Os dados não saem do seu aparelho e não são enviados para lugar nenhum.
Os dados não passam de um navegador ou aparelho para outro, e somem se você limpar os dados de navegação. Baixe um backup de vez em quando.

Cada lançamento no backup tem este formato:

json
{
  "id": "b3f1c2e4-...",
  "tipo": "despesa",
  "descricao": "Mercado da semana",
  "valor": 312.4,
  "categoria": "Alimentação",
  "data": "2026-11-08"
}

tipo é despesa ou receita, e data usa o formato AAAA-MM-DD. Ao restaurar um backup, lançamentos fora desse formato são ignorados. A meta de gastos não entra no backup.

Personalizar o visual

As cores ficam em variáveis CSS no bloco :root, no início do <style>:

--g1, --g2 e --g3 são as três cores do degradê, e --brilho é a cor do brilho que segue o cursor.
:root[data-humor="neg"] define o degradê do mês no vermelho.
:root[data-humor="vazio"] define o degradê do mês sem lançamentos.
Tecnologia
HTML, CSS e JavaScript puros, em um único arquivo, sem bibliotecas nem etapa de build.
Gráfico em SVG desenhado pelo próprio código.
Fontes Bricolage Grotesque e Instrument Sans carregadas do Google Fonts. Sem internet, o app usa as fontes do sistema e continua funcionando.
Respeita a preferência de movimento reduzido do sistema e funciona pelo teclado.
Limitações
Não sincroniza entre aparelhos.
A meta de gastos é uma só para todos os meses.
Não tem lançamentos recorrentes nem parcelados.
