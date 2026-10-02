/* =========================================================
   SIMULADOR DE URNA ELETRÔNICA
   - Cargo: Presidente
   - Candidatos disponíveis: 13 e 22 (fictício)
   ========================================================= */

// ---------- Dados do candidato ----------
const CANDIDATOS = {
  "13": {
    nome: "Luiz Inácio Lula da Silva",
    partido: "PT",
    vice: "Geraldo Alckmin",
    foto: "images/lula.png",
    fotoVice: "images/alckmin.png"
  },
  // Chapa 100% fictícia (nomes, partido e imagens inventados)
  "22": {
    nome: "Bozonaro",
    partido: "PL",
    vice: "Daniel Vorcaro",
    foto: "images/candidato22.png",
    fotoVice: "images/vice22.png"
  }
};

// ---------- Elementos ----------
const $ = (id) => document.getElementById(id);

const telaVotacao = $("telaVotacao");
const telaFim     = $("telaFim");
const seuVoto     = $("seuVoto");
const caixas      = [$("d0"), $("d1")];
const linhaNumero = $("linhaNumero");
const info        = $("info");
const aviso       = $("aviso");
const fotos       = $("fotos");
const rodape      = $("rodape");
const contadorEl  = $("contador");

// ---------- Estado ----------
let digitos = "";
let branco = false;
let bloqueado = false; // trava a urna durante a tela FIM
let totalVotos = 0;

// =========================================================
//                        SONS
// =========================================================
let audioCtx = null;

function getCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

function tom(freq, inicio, duracao, volume = 0.25, tipo = "square") {
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const t0 = ctx.currentTime + inicio;

  osc.type = tipo;
  osc.frequency.setValueAtTime(freq, t0);

  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(volume, t0 + 0.01);
  gain.gain.setValueAtTime(volume, t0 + duracao - 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duracao);

  osc.connect(gain).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + duracao + 0.02);
}

// bip curto ao apertar uma tecla
function somTecla() {
  tom(1200, 0, 0.07, 0.18, "square");
}

// bip grave quando a ação não é permitida
function somErro() {
  tom(260, 0, 0.18, 0.22, "square");
}

// "pi-li-lin" sintetizado (fallback)
function pililinSintetizado() {
  tom(1568, 0.00, 0.10, 0.22);   // pi
  tom(1976, 0.12, 0.10, 0.22);   // li
  tom(2637, 0.24, 0.45, 0.22);   // lin (mais longo)
  tom(2637 * 2, 0.24, 0.45, 0.04, "sine"); // brilho
}

/* Se você colocar um arquivo "sons/pililin.mp3" na pasta,
   ele será usado. Caso contrário, toca o som sintetizado. */
function somPililin() {
  const audio = new Audio("sons/pililin.mp3");
  let caiu = false;
  const fallback = () => {
    if (caiu) return;
    caiu = true;
    pililinSintetizado();
  };
  audio.addEventListener("error", fallback);
  audio.play().catch(fallback);
}

// =========================================================
//                     RENDERIZAÇÃO
// =========================================================
function limparInfo() {
  info.classList.remove("visivel");
  fotos.classList.remove("visivel");
  aviso.className = "aviso";
  aviso.innerHTML = "";
}

function render() {
  // caixas de número
  caixas.forEach((c, i) => {
    c.textContent = digitos[i] || "";
    c.classList.toggle("ativa", !branco && i === digitos.length && digitos.length < 2);
  });

  const temAlgo = digitos.length > 0 || branco;
  seuVoto.classList.toggle("visivel", temAlgo);

  limparInfo();
  rodape.classList.remove("visivel");
  linhaNumero.style.display = branco ? "none" : "flex";

  // VOTO EM BRANCO
  if (branco) {
    aviso.className = "aviso branco";
    aviso.innerHTML = `<span class="pisca">VOTO EM BRANCO</span>`;
    rodape.classList.add("visivel");
    return;
  }

  // número completo
  if (digitos.length === 2) {
    const c = CANDIDATOS[digitos];

    if (c) {
      $("nome").textContent = c.nome;
      $("partido").textContent = c.partido;
      $("viceNome").textContent = c.vice;
      $("fotoCand").src = c.foto;
      $("fotoVice").src = c.fotoVice;
      info.classList.add("visivel");
      fotos.classList.add("visivel");
    } else {
      aviso.innerHTML =
        `<div class="grande">NÚMERO ERRADO</div>` +
        `<div class="grande pisca" style="margin-top:8px">VOTO NULO</div>`;
    }
    rodape.classList.add("visivel");
  }
}

// =========================================================
//                        AÇÕES
// =========================================================
function digitar(n) {
  if (bloqueado || branco || digitos.length >= 2) {
    if (!bloqueado) somErro();
    return;
  }
  digitos += n;
  somTecla();
  render();
}

function votarBranco() {
  if (bloqueado) return;
  if (digitos.length > 0) { somErro(); return; } // só vale com a tela limpa
  branco = true;
  somTecla();
  render();
}

function corrigir() {
  if (bloqueado) return;
  digitos = "";
  branco = false;
  somTecla();
  render();
}

function confirmar() {
  if (bloqueado) return;

  const pronto = branco || digitos.length === 2;
  if (!pronto) { somErro(); return; }

  bloqueado = true;
  totalVotos++;
  contadorEl.textContent = totalVotos;

  telaFim.classList.add("visivel");
  somPililin();

  // volta para o início, pronto para o próximo eleitor
  setTimeout(() => {
    telaFim.classList.remove("visivel");
    digitos = "";
    branco = false;
    bloqueado = false;
    render();
  }, 3500);
}

// =========================================================
//                      EVENTOS
// =========================================================
document.querySelectorAll(".tecla.num").forEach((btn) => {
  btn.addEventListener("click", () => digitar(btn.dataset.n));
});
$("btnBranco").addEventListener("click", votarBranco);
$("btnCorrige").addEventListener("click", corrigir);
$("btnConfirma").addEventListener("click", confirmar);

// efeito visual de tecla pressionada ao usar o teclado do PC
function pressionar(el) {
  if (!el) return;
  el.classList.add("press");
  setTimeout(() => el.classList.remove("press"), 120);
}

document.addEventListener("keydown", (e) => {
  if (e.repeat) return;

  if (/^[0-9]$/.test(e.key)) {
    pressionar(document.querySelector(`.tecla.num[data-n="${e.key}"]`));
    digitar(e.key);
  } else if (e.key === "Enter") {
    e.preventDefault();
    pressionar($("btnConfirma"));
    confirmar();
  } else if (e.key === "Backspace" || e.key === "Delete") {
    pressionar($("btnCorrige"));
    corrigir();
  } else if (e.key.toLowerCase() === "b") {
    pressionar($("btnBranco"));
    votarBranco();
  }
});

// estado inicial
render();
