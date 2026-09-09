/* ====================================================================
   CONFIGURAÇÃO — altere para o número real do pet shop
   Formato: código do país + DDD + número, somente dígitos
   Exemplo: 55 (Brasil) + 41 (DDD) + 999999999
   ==================================================================== */
const WHATSAPP_NUMERO = '5541999999999';

/* ==================== AUTENTICAÇÃO (localStorage) ==================== */
function getUsuarios() { return JSON.parse(localStorage.getItem('petshop_usuarios') || '[]'); }
function saveUsuarios(lista) { localStorage.setItem('petshop_usuarios', JSON.stringify(lista)); }
function getSessao() { return JSON.parse(localStorage.getItem('petshop_sessao') || 'null'); }
function setSessao(s) { localStorage.setItem('petshop_sessao', JSON.stringify(s)); }
function logout() { localStorage.removeItem('petshop_sessao'); atualizarEstadoLogin(); }

const modalLogin = document.getElementById('modalLogin');
const modalCadastro = document.getElementById('modalCadastro');

function openModal(el) { el.classList.add('active'); }
function closeModal(el) { el.classList.remove('active'); }

document.querySelectorAll('.modal-close').forEach(btn => {
  btn.addEventListener('click', () => closeModal(document.getElementById(btn.dataset.close)));
});
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(overlay); });
});

['btnAbrirLogin', 'btnGateLogin'].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.addEventListener('click', () => openModal(modalLogin));
});
['btnAbrirCadastro', 'btnGateCadastro'].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.addEventListener('click', () => openModal(modalCadastro));
});

document.getElementById('linkIrCadastro').addEventListener('click', (e) => {
  e.preventDefault(); closeModal(modalLogin); openModal(modalCadastro);
});
document.getElementById('linkIrLogin').addEventListener('click', (e) => {
  e.preventDefault(); closeModal(modalCadastro); openModal(modalLogin);
});

/* ---------- Cadastro ---------- */
document.getElementById('formCadastro').addEventListener('submit', function (e) {
  e.preventDefault();
  const erroEl = document.getElementById('cadastroErro');
  erroEl.style.display = 'none';

  const nome = document.getElementById('cadNome').value.trim();
  const whats = document.getElementById('cadWhats').value.trim();
  const email = document.getElementById('cadEmail').value.trim().toLowerCase();
  const senha = document.getElementById('cadSenha').value;
  const confirmar = document.getElementById('cadConfirmar').value;

  if (senha !== confirmar) {
    erroEl.textContent = 'As senhas não coincidem.';
    erroEl.style.display = 'block';
    return;
  }

  const usuarios = getUsuarios();
  if (usuarios.some(u => u.email === email)) {
    erroEl.textContent = 'Já existe uma conta com esse e-mail. Tente entrar.';
    erroEl.style.display = 'block';
    return;
  }

  const novoUsuario = { id: Date.now(), nome, whats, email, senha };
  usuarios.push(novoUsuario);
  saveUsuarios(usuarios);
  setSessao({ id: novoUsuario.id, nome, whats, email });

  this.reset();
  closeModal(modalCadastro);
  atualizarEstadoLogin();
  showToast(`Conta criada! Bem-vindo(a), ${nome.split(' ')[0]}.`, 'success');
});

/* ---------- Login ---------- */
document.getElementById('formLogin').addEventListener('submit', function (e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value.trim().toLowerCase();
  const senha = document.getElementById('loginSenha').value;

  const usuario = getUsuarios().find(u => u.email === email && u.senha === senha);
  if (!usuario) {
    showToast('E-mail ou senha incorretos.', 'error');
    return;
  }

  setSessao({ id: usuario.id, nome: usuario.nome, whats: usuario.whats, email: usuario.email });
  this.reset();
  closeModal(modalLogin);
  atualizarEstadoLogin();
  showToast(`Bem-vindo(a) de volta, ${usuario.nome.split(' ')[0]}!`, 'success');
});

/* ---------- Atualiza a interface conforme login ---------- */
function atualizarEstadoLogin() {
  const sessao = getSessao();
  const headerActions = document.getElementById('headerActions');
  const loginGate = document.getElementById('loginGate');
  const bookingLayout = document.getElementById('bookingLayout');
  const loggedChip = document.getElementById('loggedChip');

  if (sessao) {
    headerActions.innerHTML = `
      <div class="user-chip">
        <div class="avatar">${sessao.nome.charAt(0).toUpperCase()}</div>
        <span class="name">${sessao.nome.split(' ')[0]}</span>
      </div>
      <button class="btn btn-outline" id="btnSair">Sair</button>
    `;
    document.getElementById('btnSair').addEventListener('click', logout);

    loginGate.style.display = 'none';
    bookingLayout.style.display = 'grid';

    loggedChip.innerHTML = `<span class="pill">✅ Logado como ${sessao.nome} — os dados abaixo já vêm da sua conta</span>`;
    document.getElementById('tutorNome').value = sessao.nome;
    document.getElementById('tutorWhats').value = sessao.whats;
  } else {
    headerActions.innerHTML = `
      <button class="btn btn-outline" id="btnAbrirLogin">Entrar</button>
      <button class="btn btn-primary" id="btnAbrirCadastro">Criar conta</button>
    `;
    document.getElementById('btnAbrirLogin').addEventListener('click', () => openModal(modalLogin));
    document.getElementById('btnAbrirCadastro').addEventListener('click', () => openModal(modalCadastro));

    loginGate.style.display = 'block';
    bookingLayout.style.display = 'none';
  }
}

atualizarEstadoLogin();

/* ==================== Preenche horários disponíveis ==================== */
const HORARIOS_DISPONIVEIS = ['09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00'];

const selHora = document.getElementById('agendaHora');
selHora.innerHTML = HORARIOS_DISPONIVEIS.map(h => `<option value="${h}">${h}</option>`).join('');

/* Impede selecionar data no passado */
const inputData = document.getElementById('agendaData');
const hoje = new Date().toISOString().split('T')[0];
inputData.setAttribute('min', hoje);

/* ==================== Elementos ==================== */
const form = document.getElementById('formAgendamento');
const resumoConteudo = document.getElementById('resumoConteudo');
const servicoErro = document.getElementById('servicoErro');
const checkboxesServico = document.querySelectorAll('input[name="servico"]');

/* ==================== Atualiza a "plaquinha" de resumo em tempo real ==================== */
function servicosSelecionados() {
  return Array.from(checkboxesServico).filter(c => c.checked).map(c => c.value);
}

function atualizarResumo() {
  const petNome = document.getElementById('petNome').value.trim();
  const petEspecie = document.getElementById('petEspecie').value;
  const petRaca = document.getElementById('petRaca').value.trim();
  const petPorte = document.getElementById('petPorte').value;
  const servicos = servicosSelecionados();
  const data = document.getElementById('agendaData').value;
  const hora = document.getElementById('agendaHora').value;

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

function formatarDataBR(iso) {
  const [ano, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${ano}`;
}

form.addEventListener('input', atualizarResumo);
form.addEventListener('change', atualizarResumo);

/* ==================== Envio do formulário ==================== */
form.addEventListener('submit', function (e) {
  e.preventDefault();

  const sessao = getSessao();
  if (!sessao) {
    showToast('Você precisa entrar ou criar uma conta para agendar.', 'error');
    openModal(modalLogin);
    return;
  }

  const servicos = servicosSelecionados();
  if (servicos.length === 0) {
    servicoErro.classList.add('show');
    document.getElementById('servicosCheckbox').scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }
  servicoErro.classList.remove('show');

  const tutorNome = document.getElementById('tutorNome').value.trim();
  const tutorWhats = document.getElementById('tutorWhats').value.trim();
  const petNome = document.getElementById('petNome').value.trim();
  const petEspecie = document.getElementById('petEspecie').value;
  const petRaca = document.getElementById('petRaca').value.trim();
  const petPorte = document.getElementById('petPorte').value;
  const data = document.getElementById('agendaData').value;
  const hora = document.getElementById('agendaHora').value;
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

  salvarAgendamentoLocal({ usuarioEmail: sessao.email, tutorNome, tutorWhats, petNome, petEspecie, petRaca, petPorte, servicos, data, hora, obs });

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