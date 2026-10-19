// Cole aqui a URL do app da web (Apps Script > Implanta > App da web)
const API_URL = "https://script.google.com/macros/s/AKfycbx7cVXK37glaOigpGgO-NqiH-ZsWFxHtDR7B015zDDbYsGbO5U2iaow4tSQyalhPlJw1g/exec";

// Cores do tema (fundo e cor do texto com bom contraste)
const CORES = [
  { fundo: "#d3061d", texto: "#ffffff" }, // vermelho
  { fundo: "#0e8935", texto: "#ffffff" }, // verde
  { fundo: "#92b228", texto: "#1f2328" }, // lima
  { fundo: "#f48a1d", texto: "#1f2328" }, // laranja
  { fundo: "#fee200", texto: "#1f2328" }  // amarelo
];

const grade = document.getElementById("grade");
const aviso = document.getElementById("aviso");
const chips = document.getElementById("chips");
const campoBusca = document.getElementById("busca");
const contagem = document.getElementById("contagem");

let apresentacoes = [];
let temas = [];
let temaAtivo = null;
let termoBusca = "";

/* ---------- utilidades ---------- */

function normalizar(texto) {
  return String(texto)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function corDoTema(tema) {
  const indice = temas.indexOf(tema);
  return CORES[(indice < 0 ? 0 : indice) % CORES.length];
}

function aplicarCor(elemento, tema) {
  const cor = corDoTema(tema);
  elemento.style.setProperty("--cor", cor.fundo);
  elemento.style.setProperty("--cor-texto", cor.texto);
}

function criar(tag, classe, texto) {
  const el = document.createElement(tag);
  if (classe) el.className = classe;
  if (texto !== undefined) el.textContent = texto;
  return el;
}

/* ---------- estados da tela ---------- */

function mostrarCarregando() {
  grade.setAttribute("aria-busy", "true");
  grade.replaceChildren();
  for (let i = 0; i < 6; i++) grade.appendChild(criar("div", "skeleton"));
  aviso.hidden = true;
  contagem.textContent = "Carregando apresentações...";
}

function mostrarAviso(titulo, mensagem, ehErro, textoBotao, acao) {
  grade.setAttribute("aria-busy", "false");
  grade.replaceChildren();
  aviso.replaceChildren();
  aviso.className = ehErro ? "aviso erro" : "aviso";
  aviso.appendChild(criar("strong", "", titulo));
  aviso.appendChild(criar("p", "", mensagem));
  if (textoBotao) {
    const botao = criar("button", "", textoBotao);
    botao.type = "button";
    botao.addEventListener("click", acao);
    aviso.appendChild(botao);
  }
  aviso.hidden = false;
}

/* ---------- filtros ---------- */

function montarChips() {
  chips.replaceChildren();

  const todos = criar("button", "chip", "Todos");
  todos.type = "button";
  todos.dataset.tema = "";
  chips.appendChild(todos);

  temas.forEach((tema) => {
    const chip = criar("button", "chip", tema);
    chip.type = "button";
    chip.dataset.tema = tema;
    aplicarCor(chip, tema);
    chips.appendChild(chip);
  });

  atualizarChips();
}

function atualizarChips() {
  chips.querySelectorAll(".chip").forEach((chip) => {
    const ativo = (chip.dataset.tema || null) === temaAtivo;
    chip.setAttribute("aria-pressed", String(ativo));
  });
}

chips.addEventListener("click", (evento) => {
  const chip = evento.target.closest(".chip");
  if (!chip) return;
  temaAtivo = chip.dataset.tema || null;
  atualizarChips();
  desenharCards();
});

campoBusca.addEventListener("input", () => {
  termoBusca = normalizar(campoBusca.value);
  desenharCards();
});

/* ---------- cards ---------- */

function criarCard(item) {
  const card = criar("article", "card");
  aplicarCor(card, item.tema);

  const topo = criar("div", "card-topo");
  topo.appendChild(criar("span", "tag", item.tema));
  topo.appendChild(criar("span", "card-id", "Id. " + item.id));

  const nome = criar("h2", "card-nome", item.nome);

  const botao = criar("a", "botao");
  if (item.link) {
    botao.textContent = "Abrir apresentação";
    botao.href = item.link;
    botao.target = "_blank";
    botao.rel = "noopener noreferrer";
  } else {
    botao.textContent = "Em breve";
    botao.setAttribute("aria-disabled", "true");
    botao.setAttribute("role", "link");
  }

  card.append(topo, nome, botao);
  return card;
}

function desenharCards() {
  const filtradas = apresentacoes.filter((item) => {
    const bateTema = !temaAtivo || item.tema === temaAtivo;
    const bateBusca = !termoBusca || normalizar(item.nome).includes(termoBusca);
    return bateTema && bateBusca;
  });

  grade.setAttribute("aria-busy", "false");
  grade.replaceChildren(...filtradas.map(criarCard));

  contagem.textContent =
    filtradas.length === apresentacoes.length
      ? apresentacoes.length + " apresentações em " + temas.length + " temas"
      : "Mostrando " + filtradas.length + " de " + apresentacoes.length + " apresentações";

  if (filtradas.length === 0) {
    mostrarAviso(
      "Nenhuma apresentação encontrada",
      "Tente outro nome ou escolha outro tema.",
      false,
      "Limpar filtros",
      limparFiltros
    );
  } else {
    aviso.hidden = true;
  }
}

function limparFiltros() {
  temaAtivo = null;
  termoBusca = "";
  campoBusca.value = "";
  atualizarChips();
  desenharCards();
}

/* ---------- API ---------- */

async function carregar() {
  mostrarCarregando();

  if (API_URL.startsWith("COLE_AQUI")) {
    mostrarAviso(
      "API não configurada",
      "Abra o arquivo script.js e cole a URL do app da web do Apps Script na constante API_URL.",
      true
    );
    contagem.textContent = "";
    return;
  }

  try {
    const resposta = await fetch(API_URL);
    if (!resposta.ok) throw new Error("Resposta " + resposta.status);

    const json = await resposta.json();
    if (!json.ok) throw new Error(json.erro || "A API retornou erro");

    apresentacoes = json.apresentacoes;
    temas = [...new Set(apresentacoes.map((item) => item.tema))];

    montarChips();
    desenharCards();
  } catch (erro) {
    console.error(erro);
    contagem.textContent = "";
    mostrarAviso(
      "Não foi possível carregar as apresentações",
      "Confira se o app da web está publicado com acesso para qualquer pessoa e tente de novo.",
      true,
      "Tentar de novo",
      carregar
    );
  }
}

carregar();