/* ====================================================================
   CONFIGURAÇÃO — altere para o número real do pet shop
   Formato: código do país + DDD + número, somente dígitos
   Exemplo: 55 (Brasil) + 41 (DDD) + 999999999
   ==================================================================== */
const WHATSAPP_NUMERO = '5541999999999';

const DOG_API = 'https://dog.ceo/api';                          // raças e fotos de cães
const FERIADOS_API = 'https://brasilapi.com.br/api/feriados/v1'; // feriados nacionais

const HORARIOS_DISPONIVEIS = ['09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00'];

/* ==================== Elementos ==================== */
const form = document.getElementById('formAgendamento');
const resumoConteudo = document.getElementById('resumoConteudo');
const resumoFoto = document.getElementById('resumoFoto');
const servicoErro = document.getElementById('servicoErro');
const dataErro = document.getElementById('dataErro');
const inputData = document.getElementById('agendaData');
const selHora = document.getElementById('agendaHora');
const selEspecie = document.getElementById('petEspecie');
const inputRaca = document.getElementById('petRaca');
const listaRacas = document.getElementById('listaRacas');
const checkboxesServico = document.querySelectorAll('input[name="servico"]');

/* ==================== Horários e data mínima ==================== */
selHora.innerHTML = HORARIOS_DISPONIVEIS.map(h => `<option value="${h}">${h}</option>`).join('');

/* Impede selecionar data no passado (data local, não UTC) */
inputData.min = new Date().toLocaleDateString('sv-SE');

/* ==================== API 1: Dog CEO — raças e foto ==================== */
let racasCaes = [];   // [{ nome: 'Golden Retriever', caminho: 'retriever/golden' }]
let fotoAtual = '';   // caminho da raça que está com foto no resumo

const capitalizar = (t) => t.charAt(0).toUpperCase() + t.slice(1);

async function carregarRacas() {
  try {
    const res = await fetch(`${DOG_API}/breeds/list/all`);
    const { message } = await res.json();

    racasCaes = Object.entries(message).flatMap(([raca, subs]) =>
      subs.length
        ? subs.map(sub => ({ nome: `${capitalizar(sub)} ${capitalizar(raca)}`, caminho: `${raca}/${sub}` }))
        : [{ nome: capitalizar(raca), caminho: raca }]
    );
  } catch {
    racasCaes = []; // sem internet: o campo continua livre para digitar
  }
  atualizarListaRacas();
}

function atualizarListaRacas() {
  const nomes = ['SRD (sem raça definida)'];
  if (selEspecie.value === 'Cão') nomes.push(...racasCaes.map(r => r.nome));
  listaRacas.innerHTML = nomes.map(n => `<option value="${n}">`).join('');
}

async function atualizarFoto() {
  const digitado = inputRaca.value.trim().toLowerCase();
  const raca = selEspecie.value === 'Cão' ? racasCaes.find(r => r.nome.toLowerCase() === digitado) : null;

  if (!raca) {
    resumoFoto.hidden = true;
    fotoAtual = '';
    return;
  }
  if (raca.caminho === fotoAtual) return;

  fotoAtual = raca.caminho;
  try {
    const res = await fetch(`${DOG_API}/breed/${raca.caminho}/images/random`);
    const { message } = await res.json();
    if (fotoAtual !== raca.caminho) return; // a pessoa já trocou de raça
    resumoFoto.src = message;
    resumoFoto.alt = `Foto de um cão da raça ${raca.nome}`;
    resumoFoto.hidden = false;
  } catch {
    resumoFoto.hidden = true;
  }
}

/* ==================== API 2: BrasilAPI — feriados ==================== */
const feriadosPorAno = {};
let dataBloqueada = false;

async function buscarFeriados(ano) {
  if (!feriadosPorAno[ano]) {
    const res = await fetch(`${FERIADOS_API}/${ano}`);
    if (!res.ok) throw new Error('Falha ao buscar feriados');
    feriadosPorAno[ano] = await res.json(); // [{ date: '2026-09-07', name: '...' }]
  }
  return feriadosPorAno[ano];
}

function mostrarErroData(texto) {
  dataBloqueada = true;
  dataErro.textContent = texto;
  dataErro.classList.add('show');
}

async function validarData() {
  const data = inputData.value;
  dataBloqueada = false;
  dataErro.classList.remove('show');
  if (!data) return;

  const [ano, mes, dia] = data.split('-').map(Number);
  if (new Date(ano, mes - 1, dia).getDay() === 0) {
    mostrarErroData('Não abrimos aos domingos. Escolha outro dia.');
    return;
  }

  try {
    const feriado = (await buscarFeriados(ano)).find(f => f.date === data);
    if (feriado && inputData.value === data) {
      mostrarErroData(`${formatarDataBR(data)} é feriado (${feriado.name}) e estaremos fechados. Escolha outro dia.`);
    }
  } catch {
    // API fora do ar: não bloqueia o agendamento
  }
}

/* ==================== Resumo em tempo real ==================== */
function servicosSelecionados() {
  return Array.from(checkboxesServico).filter(c => c.checked).map(c => c.value);
}

function formatarDataBR(iso) {
  const [ano, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${ano}`;
}

function atualizarResumo() {
  const petNome = document.getElementById('petNome').value.trim();
  const petEspecie = selEspecie.value;
  const petRaca = inputRaca.value.trim();
  const petPorte = document.getElementById('petPorte').value;
  const servicos = servicosSelecionados();
  const data = inputData.value;
  const hora = selHora.value;

  if (!petNome && servicos.length === 0 && !data) {
    resumoConteudo.innerHTML = '<p class="tag-placeholder">Preencha o formulário para ver o resumo aqui.</p>';
    return;
  }

  resumoConteudo.innerHTML = `
    <h3 class="tag-pet">${petNome || 'Nome do pet'}</h3>
    <p class="tag-line">🐾 ${petEspecie}${petRaca ? ' · ' + petRaca : ''}${petPorte ? ' · Porte ' + petPorte.toLowerCase() : ''}</p>
    <p class="tag-line">🧼 ${servicos.length ? servicos.join(', ') : 'Selecione o serviço'}</p>
    <p class="tag-line">📅 ${data ? formatarDataBR(data) : 'Escolha a data'}${hora ? ' às ' + hora : ''}</p>
  `;
}

function aoMudarFormulario() {
  atualizarResumo();
  atualizarFoto();
}

form.addEventListener('input', aoMudarFormulario);
form.addEventListener('change', aoMudarFormulario);
selEspecie.addEventListener('change', atualizarListaRacas);
inputData.addEventListener('change', validarData);

/* ==================== Envio do formulário ==================== */
form.addEventListener('submit', function (e) {
  e.preventDefault();

  const servicos = servicosSelecionados();
  if (servicos.length === 0) {
    servicoErro.classList.add('show');
    document.getElementById('servicosCheckbox').scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }
  servicoErro.classList.remove('show');

  if (dataBloqueada) {
    dataErro.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  const tutorNome = document.getElementById('tutorNome').value.trim();
  const tutorWhats = document.getElementById('tutorWhats').value.trim();
  const petNome = document.getElementById('petNome').value.trim();
  const petEspecie = selEspecie.value;
  const petRaca = inputRaca.value.trim();
  const petPorte = document.getElementById('petPorte').value;
  const data = inputData.value;
  const hora = selHora.value;
  const obs = document.getElementById('petObs').value.trim();

  const mensagem =
`Olá! Gostaria de agendar um horário para o Focinho Feliz 🐾

*Tutor:* ${tutorNome}
*WhatsApp do tutor:* ${tutorWhats}

*Pet:* ${petNome}
*Espécie:* ${petEspecie}
*Raça:* ${petRaca}
*Porte:* ${petPorte}

*Serviço(s):* ${servicos.join(', ')}
*Data:* ${formatarDataBR(data)}
*Horário:* ${hora}
${obs ? '*Observações:* ' + obs : ''}

Aguardo a confirmação, obrigado(a)!`;

  const link = `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(mensagem)}`;

  salvarAgendamentoLocal({ tutorNome, tutorWhats, petNome, petEspecie, petRaca, petPorte, servicos, data, hora, obs });

  window.open(link, '_blank');
  showToast('Agendamento pronto! Abrindo o WhatsApp para você confirmar o envio.', 'success');
});

/* ==================== Guarda histórico local (opcional, para demonstração) ==================== */
function salvarAgendamentoLocal(agendamento) {
  const lista = JSON.parse(localStorage.getItem('petshop_agendamentos') || '[]');
  agendamento.criadoEm = new Date().toISOString();
  lista.push(agendamento);
  localStorage.setItem('petshop_agendamentos', JSON.stringify(lista));
}

/* ==================== Botões de WhatsApp fixos (rodapé e flutuante) ==================== */
const linkGenerico = `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent('Olá! Gostaria de tirar uma dúvida sobre o banho e tosa.')}`;
document.getElementById('btnWhatsFooter').setAttribute('href', linkGenerico);
document.getElementById('btnFabWhats').addEventListener('click', () => window.open(linkGenerico, '_blank'));

/* ==================== Toast simples ==================== */
function showToast(message, type = 'info') {
  const el = document.createElement('div');
  el.className = `toast ${type === 'error' ? 'toast-error' : ''}`;
  el.textContent = message;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('toast-show'));
  setTimeout(() => {
    el.classList.remove('toast-show');
    setTimeout(() => el.remove(), 250);
  }, 3500);
}

/* ==================== Início ==================== */
atualizarListaRacas();
carregarRacas();
