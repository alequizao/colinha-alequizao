/*
 * Colinha · Alequizão · Desenvolvido por Alequizao <alequizao.dev@gmail.com>
 * https://github.com/alequizao · © 2026 Alequizao. Todos os direitos reservados.
 */
/* Colinha · Alequizão — alequizao.com/colinha — desenvolvido por Alequizao (alequizao.dev@gmail.com)
 * App de página única: a colinha fica só no aparelho (localStorage); o servidor só entrega a lista pública do TSE. */
(function () {
'use strict';
var VERSAO = '1.0.6';
var BASE = '/colinha';
var API = BASE + '/api.php';
var CHAVE = 'colinha-alequizao:';

/* ---------- dados fixos ---------- */
var UFS = {AC:'Acre',AL:'Alagoas',AP:'Amapá',AM:'Amazonas',BA:'Bahia',CE:'Ceará',DF:'Distrito Federal',ES:'Espírito Santo',GO:'Goiás',
  MA:'Maranhão',MT:'Mato Grosso',MS:'Mato Grosso do Sul',MG:'Minas Gerais',PA:'Pará',PB:'Paraíba',PR:'Paraná',PE:'Pernambuco',PI:'Piauí',
  RJ:'Rio de Janeiro',RN:'Rio Grande do Norte',RS:'Rio Grande do Sul',RO:'Rondônia',RR:'Roraima',SC:'Santa Catarina',SP:'São Paulo',SE:'Sergipe',TO:'Tocantins'};
var CARGO = {1:['Presidente','Presidenta'],2:['Vice-presidente','Vice-presidenta'],3:['Governador','Governadora'],4:['Vice-governador','Vice-governadora'],
  5:['Senador','Senadora'],6:['Deputado Federal','Deputada Federal'],7:['Deputado Estadual','Deputada Estadual'],8:['Deputado Distrital','Deputada Distrital'],
  9:['1º suplente','1ª suplente'],10:['2º suplente','2ª suplente']};
var FORA = {renuncia:'Renunciou',inapto:'Indeferido',  'nao-conhecimento':'Pedido não conhecido',cancelado:'Cancelado',falecido:'Falecido'};

/* Ordem da urna. Deputado estadual vira distrital no DF. */
function slots() {
  var df = S.uf === 'DF';
  return [
    {k:'df', cargo:6, rot:'Deputado Federal', dig:4},
    {k:'de', cargo:df ? 8 : 7, rot:df ? 'Deputado Distrital' : 'Deputado Estadual', dig:5},
    {k:'s1', cargo:5, rot:'Senador (1ª vaga)', dig:3},
    {k:'s2', cargo:5, rot:'Senador (2ª vaga)', dig:3},
    {k:'gov', cargo:3, rot:'Governador', dig:2},
    {k:'pres', cargo:1, rot:'Presidente', dig:2, nac:true}
  ];
}
function slotDe(k) { return slots().filter(function (s) { return s.k === k; })[0]; }

/* ---------- estado ---------- */
function ler(k, d) { try { var v = localStorage.getItem(CHAVE + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
function gravar(k, v) { try { localStorage.setItem(CHAVE + k, JSON.stringify(v)); } catch (e) {} }
var S = { uf: ler('uf', 'AL'), cola: ler('cola', {}), salvas: ler('salvas', []), meta: null };
if (!UFS[S.uf]) S.uf = 'AL';
function cola() { return S.cola[S.uf] || (S.cola[S.uf] = {}); }
function salvaCola() { gravar('cola', S.cola); }
function preenchidos() { var c = cola(); return slots().filter(function (s) { return c[s.k]; }).length; }

/* ---------- utilitários ---------- */
var $ = function (s, r) { return (r || document).querySelector(s); };
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
function norm(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim(); }
function h(html) { var t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstChild; }
function cargoNome(id, fem) { var c = CARGO[id]; return c ? c[fem ? 1 : 0] : ''; }
function foto(sq) { return BASE + '/f/' + sq + '.jpg'; }
function logo(sigla) { return BASE + '/l/' + String(sigla || '').toLowerCase().replace(/[^a-z0-9-]/g, '') + '.jpg'; }
function brl(v) { return (v || 0).toLocaleString('pt-BR', {style:'currency', currency:'BRL', maximumFractionDigits:0}); }
function brlCurto(v) {
  if (v >= 1e6) return 'R$ ' + (v / 1e6).toLocaleString('pt-BR', {maximumFractionDigits:2}) + ' mi';
  if (v >= 1e3) return 'R$ ' + (v / 1e3).toLocaleString('pt-BR', {maximumFractionDigits:0}) + ' mil';
  return brl(v);
}
function quando(iso) {
  if (!iso) return '';
  var d = new Date(iso);
  if (isNaN(d)) return '';
  var p = function (n) { return String(n).padStart(2, '0'); };
  return p(d.getDate()) + '/' + p(d.getMonth() + 1) + ' às ' + d.getHours() + 'h' + p(d.getMinutes());
}
var cacheApi = {};
function api(params) {
  var q = Object.keys(params).map(function (k) { return k + '=' + encodeURIComponent(params[k]); }).join('&');
  if (cacheApi[q]) return cacheApi[q];
  var p = fetch(API + '?' + q).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); });
  cacheApi[q] = p;
  p.catch(function () { delete cacheApi[q]; });
  return p;
}
function toast(msg) {
  var t = $('.toast'); if (t) t.remove();
  t = h('<div class="toast" role="status">' + esc(msg) + '</div>');
  document.body.appendChild(t);
  setTimeout(function () { t.remove(); }, 2400);
}
function vibra(ms) { try { navigator.vibrate && navigator.vibrate(ms || 12); } catch (e) {} }

/* ---------- ícones (traço, 24x24) ---------- */
var IC = {
  busca:'<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  x:'<path d="M18 6 6 18M6 6l12 12"/>',
  volta:'<path d="M19 12H5M12 19l-7-7 7-7"/>',
  baixo:'<path d="m6 9 6 6 6-6"/>',
  lua:'<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
  sol:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  casa:'<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  urna:'<rect x="4" y="3" width="16" height="18" rx="2"/><rect x="7" y="6" width="10" height="5" rx="1"/><path d="M8 14.5h.01M12 14.5h.01M16 14.5h.01M8 17.5h.01M12 17.5h.01M16 17.5h.01"/>',
  marca:'<path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z"/>',
  livro:'<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 21a2 2 0 0 1 2-2h13v2H6"/><path d="M9 7h6"/>',
  envia:'<path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/>',
  impr:'<path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M6 14h12v7H6z"/>',
  link:'<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
  comp:'<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/>',
  borr:'<path d="m7 21-4.3-4.3a1 1 0 0 1 0-1.4L13 5a1 1 0 0 1 1.4 0l5.6 5.6a1 1 0 0 1 0 1.4L11 21z"/><path d="M22 21H7M5 11l9 9"/>',
  troca:'<path d="M16 3l4 4-4 4M20 7H4M8 21l-4-4 4-4M4 17h16"/>',
  ordem:'<path d="M7 4v16M3 8l4-4 4 4M17 20V4M13 16l4 4 4-4"/>',
  doc:'<path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
  fora:'<path d="M14 3h7v7M10 14 21 3M19 14v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h6"/>',
  dir:'<path d="m9 6 6 6-6 6"/>',
  lixo:'<path d="M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15"/>',
  pessoa:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  baixa:'<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>',
  zap:'<path d="M3.5 20.5 5 16a8.5 8.5 0 1 1 3 3z"/><path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1.2-1.4-2-1-1 .8a4 4 0 0 1-2-2l.8-1-1-2z"/>',
  ok:'<path d="M20 6 9 17l-5-5"/>'
};
function I(n, cls) { return '<svg class="i' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" aria-hidden="true">' + (IC[n] || '') + '</svg>'; }
var MARCA_SVG = '<svg viewBox="0 0 48 48" aria-hidden="true"><g transform="rotate(45 24 24)" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round">' +
  '<rect x="9.5" y="9.5" width="29" height="29" rx="2"/><path d="M27.5 9.5v11h11"/><path d="M27.5 9.5l11 11h-11z" fill="currentColor" fill-opacity=".2" stroke="none"/></g></svg>';

/* ---------- células de número ---------- */
function cells(num, dig, cls) {
  num = String(num || '');
  var o = '<span class="cells">';
  for (var i = 0; i < dig; i++) {
    var d = num[i];
    o += '<span class="cell' + (d != null ? ' ok' : '') + (cls ? ' ' + cls : '') + '">' + (d != null ? esc(d) : '') + '</span>';
  }
  return o + '</span>';
}
function imgFoto(sq, nome) {
  return '<img src="' + foto(sq) + '" alt="" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement(\'span\'),{innerHTML:\'' +
    I('pessoa').replace(/"/g, '&quot;') + '\'}))">';
}
function imgLogo(sigla) {
  return '<span class="logo"><img src="' + logo(sigla) + '" alt="' + esc(sigla) + '" loading="lazy" onerror="this.parentNode.textContent=\'' + esc(sigla) + '\'"></span>';
}
function tagSituacao(c) {
  if (c.fora) return '<span class="tag bad">' + esc(FORA[c.fora] || 'Fora da urna') + '</span>';
  var j = c.julg || '';
  if (/RECURSO/.test(j)) return '<span class="tag warn">' + (/^INDEFERIDO/.test(j) ? 'Indeferido, com recurso' : 'Deferido, com recurso') + '</span>';
  if (/PENDENTE/.test(j)) return '<span class="tag warn">Aguardando julgamento</span>';
  return '';
}

/* Cartão de candidato: na lista (tap abre perfil) e no slot da colinha. */
function cartao(c, o) {
  o = o || {};
  var dig = String(c.num).length;
  var cargo = cargoNome(c.cargo, c.fem) + (o.semUf ? '' : ' · ' + (c.cargo === 1 ? 'BR' : c.uf));
  return '<' + (o.tag || 'div') + ' class="cc' + (o.cls ? ' ' + o.cls : '') + (c.fora ? ' fora' : '') + '"' + (o.attr || '') + '>' +
    '<span class="cc__foto">' + imgFoto(c.sq) + '</span>' +
    '<span class="cc__cargo">' + esc(o.rot || cargo) + '</span>' +
    '<span class="cc__num">' + cells(c.num, dig, o.hero ? 'xl' : 'big') + '</span>' +
    '<span class="cc__nome">' + esc(c.nome) + '</span>' + tagSituacao(c) +
    '<span class="cc__part">' + imgLogo(c.sigla) + '<span class="cc__sigla">' + esc(c.sigla) + '</span></span>' +
    (o.extra || '') + '</' + (o.tag || 'div') + '>';
}

/* ---------- raiz / rotas ---------- */
var app = $('#app');
var pilha = []; // camadas abertas (picker, perfil, folhas)

function rota() {
  var p = location.pathname.replace(/\/+$/, '');
  if (p.indexOf(BASE) === 0) p = p.slice(BASE.length);
  return p.replace(/^\//, '') || 'inicio';
}
function ir(r, sub) {
  fechaTudo(true);
  history.pushState({}, '', BASE + '/' + (r === 'inicio' ? '' : r));
  render();
  window.scrollTo(0, 0);
}
var aposPop = null; // ação a rodar depois de um history.go(-n) que fechou várias camadas
window.addEventListener('popstate', function () {
  if (aposPop) { var f = aposPop; aposPop = null; f(); return; }
  if (pilha.length) { fechaTopo(true); return; }
  render();
});
document.addEventListener('click', function (e) {
  var a = e.target.closest('a[data-ir]');
  if (a && !e.metaKey && !e.ctrlKey) { e.preventDefault(); ir(a.dataset.ir); }
});
document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && pilha.length) history.back(); });

function render() {
  var r = rota();
  var partes = r.split('/');
  document.body.classList.toggle('pg-sim', r === 'simulador');
  if (partes[0] === 'candidato' && partes[1]) {
    telaInicio();
    // entrada de volta para a home antes de empilhar o perfil
    history.replaceState({}, '', BASE + '/');
    abrePerfil(partes[1]);
    return;
  }
  if (partes[0] === 'c' && partes[1]) {
    telaInicio();
    history.replaceState({}, '', BASE + '/');
    abreRecebida(partes[1]);
    return;
  }
  var telas = {inicio:telaInicio, busca:telaBusca, simulador:telaSimulador, colinhas:telaColinhas, guia:telaGuia,
    sobre:telaSobre, dados:telaDados, privacidade:telaPrivacidade, termos:telaTermos};
  (telas[partes[0]] || telaInicio)();
  var titulos = {busca:'Buscar candidato', simulador:'Simulador de urna', colinhas:'Minhas colinhas', guia:'Como votar em 2026',
    sobre:'Sobre', dados:'Dados', privacidade:'Privacidade', termos:'Termos de uso'};
  document.title = (titulos[partes[0]] ? titulos[partes[0]] + ' · ' : 'Minha colinha eleitoral · Eleições 2026 · ') + 'Colinha Alequizão';
}

/* ---------- moldura comum ---------- */
function topo(extra) {
  var tema = document.documentElement.dataset.theme;
  return '<header class="topo">' +
    '<a class="marca" href="' + BASE + '/" data-ir="inicio" aria-label="Colinha Alequizão, início">' + MARCA_SVG + '<span>colinha</span><small>alequizão</small></a>' +
    '<nav class="nav-top" aria-label="Seções">' + navLinks('pill') + '</nav>' +
    (extra || '') +
    '<button class="btn-q uf-btn" id="b-uf" aria-label="Estado: ' + esc(UFS[S.uf]) + '. Trocar estado"><span class="uf-chip">' + S.uf + '</span><span class="nm">' + esc(UFS[S.uf]) + '</span>' + I('baixo') + '</button>' +
    '<button class="btn-q" id="b-tema" aria-label="Mudar para o tema ' + (tema === 'dark' ? 'claro' : 'escuro') + '">' + I(tema === 'dark' ? 'sol' : 'lua') + '</button>' +
    '</header>';
}
var NAV = [['inicio','Início','casa'],['busca','Busca','busca'],['simulador','Simulador','urna'],['colinhas','Colinhas','marca'],['guia','Guia','livro']];
function navLinks(cls) {
  var r = rota().split('/')[0];
  return NAV.map(function (n) {
    return '<a class="' + (cls || '') + (r === n[0] ? ' on' : '') + '" href="' + BASE + '/' + (n[0] === 'inicio' ? '' : n[0]) + '" data-ir="' + n[0] + '"' + (r === n[0] ? ' aria-current="page"' : '') + '>' + I(n[2]) + '<span>' + n[1] + '</span></a>';
  }).join('');
}
function rodape() {
  return '<footer class="rodape">' +
    '<div class="rodape__links"><a href="' + BASE + '/sobre" data-ir="sobre">Sobre</a><span>·</span><a href="' + BASE + '/guia" data-ir="guia">Guia</a><span>·</span>' +
    '<a href="' + BASE + '/dados" data-ir="dados">Dados</a><span>·</span><a href="' + BASE + '/privacidade" data-ir="privacidade">Privacidade</a><span>·</span>' +
    '<a href="' + BASE + '/termos" data-ir="termos">Termos</a></div>' +
    '<div class="rodape__base"><span>© 2026 <a href="https://alequizao.com/">Alequizão</a></span>' +
    '<button class="pill" id="b-instalar" hidden>' + MARCA_SVG.replace('<svg', '<svg class="i"') + 'Instalar app</button></div>' +
    '</footer>';
}
function moldura(miolo, cls) {
  app.innerHTML = '<div class="wrap' + (cls ? ' ' + cls : '') + '">' + topo() + miolo + rodape() + '</div>' +
    '<nav class="nav" aria-label="Navegação"><div class="nav__in">' + navLinks() + '</div></nav>';
  ligaTopo();
}
function ligaTopo() {
  var b = $('#b-uf'); if (b) b.onclick = folhaUf;
  var t = $('#b-tema'); if (t) t.onclick = trocaTema;
  var inst = $('#b-instalar');
  if (inst && instalar) { inst.hidden = false; inst.onclick = function () { instalar.prompt(); instalar = null; inst.hidden = true; }; }
}
function trocaTema() {
  var novo = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = novo;
  try { localStorage.setItem(CHAVE + 'tema', novo); } catch (e) {}
  $('meta[name=theme-color]').content = novo === 'dark' ? '#050505' : '#fafafa';
  var t = $('#b-tema'); if (t) { t.innerHTML = I(novo === 'dark' ? 'sol' : 'lua'); t.setAttribute('aria-label', 'Mudar para o tema ' + (novo === 'dark' ? 'claro' : 'escuro')); }
}

/* ---------- INÍCIO ---------- */
function telaInicio() {
  var c = cola(), ss = slots(), n = preenchidos();
  var prog = '<div class="prog" aria-label="' + n + ' de 6 votos escolhidos">' + ss.map(function (s) { return '<i' + (c[s.k] ? ' class="on"' : '') + '></i>'; }).join('') + '</div>';
  var lista = '<div class="sec"><span class="uf-chip">' + S.uf + '</span>' + esc(UFS[S.uf].toUpperCase()) + ' · ' + S.uf + '</div>';
  ss.forEach(function (s) {
    if (s.nac) lista += '<div class="sec"><span class="uf-chip">BR</span>Nacional</div>';
    lista += slotHtml(s, c[s.k]);
  });
  var acoes;
  if (n) {
    acoes = '<div class="acts3"><button class="btn btn--claro quad" id="b-salvar" aria-label="Salvar colinha">' + I('marca') + '</button>' +
      '<button class="btn btn--escuro" id="b-passar">' + I('envia') + 'Passar cola</button>' +
      '<button class="btn btn--claro quad" id="b-limpar" aria-label="Limpar colinha">' + I('borr') + '</button></div>' +
      '<div class="acts2"><button class="btn btn--claro" id="b-copiar">' + I('link') + 'Copiar link</button>' +
      '<button class="btn btn--claro" id="b-comp">' + I('comp') + 'Compartilhar</button></div>' +
      '<a class="btn btn--zap" id="b-zap" target="_blank" rel="noopener">' + I('zap') + 'Enviar no WhatsApp</a>' +
      '<button class="btn btn--escuro" id="b-impr">' + I('impr') + 'Imprimir colinha</button>';
  } else {
    acoes = '<button class="btn btn--claro" id="b-passar">' + I('envia') + 'Passar cola</button>' +
      '<button class="btn btn--escuro" id="b-impr">' + I('impr') + 'Imprimir colinha</button>';
  }
  var hero = '<aside class="hero"><div class="kicker">Eleições 2026</div><h1>Monte sua<br>colinha aí</h1>' +
    '<p>Escolha seus candidatos, confira nome, número e partido e leve a colinha pronta pra urna. Dados do TSE, sem recomendação de ninguém. Sem cadastro: fica só no seu aparelho.</p>' +
    '<div class="stat-row"><div><small>Candidatos no Brasil</small><b id="st-br">—</b></div><div><small>Em ' + esc(UFS[S.uf]) + '</small><b id="st-uf">—</b></div><div><small>1º turno</small><b>4 de outubro</b></div></div></aside>';
  moldura('<div class="home">' + hero + '<main class="col-dir">' + prog +
    '<div class="kicker mob">Eleições 2026</div><h1 class="tit">Monte sua colinha aí</h1>' + lista +
    '<div class="linha-sep"></div>' + acoes +
    '<p class="fonte" id="fonte">Fonte: TSE · 2026</p></main></div>');
  ligaInicio();
  carregaMeta();
}
function slotHtml(s, v) {
  var sub = s.dig + ' dígitos · ' + (s.nac ? 'Brasil' : S.uf);
  if (!v) {
    return '<div class="slot" data-k="' + s.k + '"><button class="slot__txt" data-abre="' + s.k + '" aria-label="Escolher ' + esc(s.rot) + '"><span class="slot__rot">' + esc(s.rot) + '</span><span class="slot__sub">' + sub + '</span></button>' +
      '<button class="slot__cells" data-abre="' + s.k + '" tabindex="-1" aria-hidden="true">' + cells('', s.dig) + '</button>' +
      '<button class="lupa" data-abre="' + s.k + '" aria-label="Buscar candidato · ' + esc(s.rot) + '">' + I('busca') + '</button></div>';
  }
  var trocar = '<button class="cc__trocar" data-abre="' + s.k + '" aria-label="Trocar ' + esc(s.rot) + '">' + I('troca') + '</button>';
  if (v.t === 'c') {
    var rot = cargoNome(v.cargo, v.fem) + (s.k === 's1' ? ' · 1ª vaga' : s.k === 's2' ? ' · 2ª vaga' : '');
    var o = cartao(v, {cls:'cc--slot tap', rot:rot, hero:true, extra:trocar, attr:' data-perfil="' + esc(v.slug) + '" role="button" tabindex="0" aria-label="Ver perfil de ' + esc(v.nome) + '"'});
    if (v.vice) o += cartao(v.vice, {cls:'cc--slot cc--vice', rot:cargoNome(v.vice.cargo, v.vice.fem), hero:false});
    return o;
  }
  var txt = v.t === 'n' ? ['Voto nulo', cells('0'.repeat(s.dig), s.dig, 'big')]
    : v.t === 'b' ? ['Voto em branco', '<span class="branco-tecla">BRANCO</span>']
    : ['Legenda · ' + esc(v.sigla), cells(v.num, 2, 'big')];
  return '<div class="esp"><div class="esp__txt"><b>' + esc(s.rot) + '</b><strong>' + txt[0] + '</strong>' +
    (v.t === 'l' ? '<small style="display:block;color:var(--muted);font-size:12px;margin-top:4px">' + esc(v.nome) + '</small>' : '') + '</div>' + txt[1] +
    trocar.replace('cc__trocar', 'cc__trocar') + '</div>';
}
function ligaInicio() {
  app.querySelectorAll('[data-abre]').forEach(function (b) { b.onclick = function (e) { e.stopPropagation(); abrePicker(b.dataset.abre); }; });
  app.querySelectorAll('[data-perfil]').forEach(function (b) {
    b.onclick = function () { abrePerfil(b.dataset.perfil); };
    b.onkeydown = function (e) { if (e.key === 'Enter') abrePerfil(b.dataset.perfil); };
  });
  var n = preenchidos();
  $('#b-passar').onclick = function () { if (!n) { toast('Escolha pelo menos um candidato primeiro'); abrePicker(slots()[0].k); return; } folhaPassar(); };
  $('#b-impr').onclick = function () { if (!n) { toast('A colinha está vazia: escolha seus candidatos'); return; } imprime(); };
  if (!n) return;
  $('#b-limpar').onclick = function () {
    if (!confirm('Apagar todos os candidatos desta colinha?')) return;
    S.cola[S.uf] = {}; salvaCola(); telaInicio(); toast('Colinha limpa');
  };
  $('#b-salvar').onclick = salvarAtual;
  $('#b-copiar').onclick = function () { copia(linkCola()); };
  $('#b-comp').onclick = compartilha;
  $('#b-zap').href = 'https://wa.me/?text=' + encodeURIComponent(textoCola());
}
function carregaMeta() {
  api({a:'stats', uf:S.uf}).then(function (m) {
    S.meta = m;
    var f = $('#fonte'); if (f && m.atualizado) f.textContent = 'Fonte: TSE · 2026 · Atualizado em ' + quando(m.atualizado);
    var a = $('#st-br'); if (a) a.textContent = m.brasil.toLocaleString('pt-BR');
    var b = $('#st-uf'); if (b) b.textContent = m.estado.toLocaleString('pt-BR');
  }).catch(function () {});
}

/* ---------- camadas ---------- */
function abreCamada(el, url) {
  document.body.appendChild(el);
  pilha.push(el);
  history.pushState({ov:pilha.length}, '', url || location.href);
  document.documentElement.style.overflow = 'hidden';
  var f = el.querySelector('[data-foco]') || el.querySelector('button');
  if (f) setTimeout(function () { try { f.focus({preventScroll:true}); } catch (e) {} }, 60);
  return el;
}
function fechaTopo(jaVoltou) {
  var el = pilha.pop();
  if (!el) return;
  if (!jaVoltou) { history.back(); pilha.push(el); return; }
  var alvo = el.classList.contains('fundo') ? el.querySelector('.folha') : el;
  el.classList.add('sai'); if (alvo !== el) alvo.classList.add('sai');
  setTimeout(function () { el.remove(); }, el.classList.contains('fundo') ? 10 : 200);
  if (!pilha.length) document.documentElement.style.overflow = '';
}
function fechaTudo(semHistorico) {
  while (pilha.length) { var el = pilha.pop(); el.remove(); }
  document.documentElement.style.overflow = '';
}
function fecha() { history.back(); }

function folha(titulo, miolo) {
  var el = h('<div class="fundo"><div class="folha" role="dialog" aria-modal="true" aria-label="' + esc(titulo) + '"><div class="folha__alca"></div>' +
    '<div class="folha__head"><h3>' + esc(titulo) + '</h3><button class="circ" data-fecha aria-label="Fechar">' + I('x') + '</button></div>' +
    '<div class="folha__c">' + miolo + '</div></div></div>');
  el.addEventListener('click', function (e) { if (e.target === el || e.target.closest('[data-fecha]')) fecha(); });
  return abreCamada(el);
}
function folhaUf() {
  var f = folha('Seu estado', '<div class="uf-grid">' + Object.keys(UFS).sort(function (a, b) { return UFS[a].localeCompare(UFS[b]); }).map(function (u) {
    return '<button class="uf-op' + (u === S.uf ? ' on' : '') + '" data-uf="' + u + '"><span class="uf-chip">' + u + '</span>' + esc(UFS[u]) + '</button>';
  }).join('') + '</div>');
  f.querySelectorAll('[data-uf]').forEach(function (b) {
    b.onclick = function () {
      S.uf = b.dataset.uf; gravar('uf', S.uf);
      fechaTudo(); aposPop = render; history.back();
    };
  });
}

/* ---------- PICKER (lista de candidatos de um cargo) ---------- */
function abrePicker(k) {
  var s = slotDe(k);
  var abc = false, q = '', partido = '', ordem = ler('ordem', 'rotativa'), todos = [], letra = '', mostrados = 0;
  var legendas = s.cargo >= 6;
  var el = h('<div class="ov" role="dialog" aria-modal="true" aria-label="' + esc(s.rot) + '"><div class="ov__in">' +
    '<div class="ov__head"><button class="circ" data-fecha aria-label="Fechar">' + I('x') + '</button><h2>' + esc(s.rot) + '</h2><span></span></div>' +
    '<div class="ov__fix"><label class="busca">' + I('busca') + '<input data-foco type="search" inputmode="numeric" enterkeyhint="search" autocomplete="off" placeholder="digite o número" aria-label="Buscar por número ou nome">' +
    '<button class="abc" aria-label="Teclado de letras, para buscar por nome" aria-pressed="false">ABC</button></label>' +
    '<div class="filtros"><span class="sel-wrap"><select class="f-part" aria-label="Filtrar por partido"><option value="">Partido</option></select>' + I('baixo') + '</span>' +
    '<span class="sel-wrap">' + '<select class="f-ord" aria-label="Escolher a ordem da lista"><option value="rotativa">A-Z rotativa</option><option value="az">A-Z</option><option value="za">Z-A</option><option value="numero">Número</option></select>' + I('ordem').replace('class="i"', 'class="i" style="left:12px;right:auto"') + '</span></div>' +
    '<div class="contagem"><span class="ct">Carregando…</span><span class="lt"></span></div></div>' +
    '<div class="ov__scroll"><div class="lista">' + '<div class="esq"></div>'.repeat(4) + '</div><div class="mais"></div>' +
    '<div class="extras">' + (legendas ? '<button class="extra legenda-row" data-x="l"><span class="t">Voto de legenda<small>Só o partido, sem candidato.</small></span>' + cells('', s.dig) + I('dir') + '</button>' : '') +
    '<button class="extra" data-x="n">Votar nulo' + cells('0'.repeat(s.dig), s.dig) + '</button>' +
    '<button class="extra" data-x="b">Votar em branco<span class="branco-tecla">BRANCO</span></button></div>' +
    '<p class="aviso">Lista em ordem alfabética que começa numa letra diferente a cada dia, para ninguém ficar sempre no topo. Nenhum candidato é recomendado.</p>' +
    '</div></div></div>');
  var ord = el.querySelector('.f-ord'); ord.value = ordem;
  el.querySelector('.ov__head .circ').setAttribute('style', 'justify-self:start');
  el.querySelector('.sel-wrap:last-child select').style.paddingLeft = '36px';
  abreCamada(el);
  var inp = el.querySelector('input'), lista = el.querySelector('.lista'), mais = el.querySelector('.mais');
  el.querySelector('[data-fecha]').onclick = fecha;
  el.querySelector('.abc').onclick = function () {
    abc = !abc; this.classList.toggle('on', abc); this.setAttribute('aria-pressed', abc);
    inp.setAttribute('inputmode', abc ? 'text' : 'numeric'); inp.placeholder = abc ? 'digite o nome' : 'digite o número';
    inp.blur(); inp.focus();
  };
  var t;
  inp.oninput = function () { clearTimeout(t); t = setTimeout(function () { q = inp.value.trim(); desenha(); }, 120); };
  el.querySelector('.f-part').onchange = function () { partido = this.value; desenha(); };
  ord.onchange = function () { ordem = this.value; gravar('ordem', ordem); desenha(); };
  el.querySelectorAll('[data-x]').forEach(function (b) {
    b.onclick = function () {
      var x = b.dataset.x;
      if (x === 'l') return folhaLegenda(s);
      escolhe(k, {t:x});
    };
  });

  api({a:'candidatos', uf:S.uf, cargo:s.cargo}).then(function (r) {
    todos = r.candidatos; letra = r.letra;
    var sp = el.querySelector('.f-part');
    r.siglas.forEach(function (x) { sp.appendChild(h('<option value="' + esc(x) + '">' + esc(x) + '</option>')); });
    desenha();
  }).catch(function () { lista.innerHTML = '<div class="vazio">Não foi possível carregar a lista. Confira a internet e tente de novo.</div>'; });

  function filtrados() {
    var l = todos;
    if (partido) l = l.filter(function (c) { return c.sigla === partido; });
    if (q) {
      if (/^\d+$/.test(q)) l = l.filter(function (c) { return c.num.indexOf(q) === 0; });
      else { var ts = norm(q).split(' '); l = l.filter(function (c) { var n = norm(c.nome + ' ' + c.sigla); return ts.every(function (x) { return n.indexOf(x) >= 0; }); }); }
    }
    if (ordem !== 'rotativa') {
      l = l.slice().sort(function (a, b) {
        if (!!a.fora !== !!b.fora) return a.fora ? 1 : -1;
        if (ordem === 'numero') return a.num.localeCompare(b.num);
        var r = norm(a.nome).localeCompare(norm(b.nome));
        return ordem === 'za' ? -r : r;
      });
    }
    if (/^\d+$/.test(q)) l = l.slice().sort(function (a, b) { return (a.num === q ? 0 : 1) - (b.num === q ? 0 : 1); });
    return l;
  }
  function desenha() {
    var l = filtrados();
    el.querySelector('.ct').textContent = l.length.toLocaleString('pt-BR') + (l.length === 1 ? ' candidato' : ' candidatos') + ' · ' + (s.cargo === 1 ? 'BR' : S.uf) + ' · 2026';
    el.querySelector('.lt').textContent = ordem === 'rotativa' ? letra + ' → Z → A' : ordem === 'az' ? 'A → Z' : ordem === 'za' ? 'Z → A' : '0 → 9';
    lista.innerHTML = ''; mostrados = 0;
    if (!l.length) {
      lista.innerHTML = '<div class="vazio">Nenhum candidato encontrado' + (q ? ' para “' + esc(q) + '”' : '') + '.' +
        (/^\d+$/.test(q) && legendas && q.length === 2 ? '<br>Se quiser votar só no partido ' + esc(q) + ', use o <b>voto de legenda</b> abaixo.' : '') + '</div>';
      mais.innerHTML = ''; return;
    }
    lote(l);
  }
  function lote(l) {
    var fatia = l.slice(mostrados, mostrados + 60);
    var frag = document.createDocumentFragment();
    fatia.forEach(function (c) {
      var jaTem = ehEscolhido(k, c);
      var b = h(cartao(c, {tag:'button', cls:'tap' + (jaTem ? ' sel' : ''), attr:' aria-label="Ver perfil de ' + esc(c.nome) + '"'}));
      b.onclick = function () { abrePerfil(c.slug, k); };
      frag.appendChild(b);
    });
    lista.appendChild(frag);
    mostrados += fatia.length;
    mais.innerHTML = '';
    if (mostrados < l.length) {
      var bm = h('<button class="btn btn--claro" style="margin-bottom:16px">Mostrar mais (' + (l.length - mostrados).toLocaleString('pt-BR') + ')</button>');
      bm.onclick = function () { lote(l); };
      mais.appendChild(bm);
      if ('IntersectionObserver' in window) {
        var io = new IntersectionObserver(function (en) { if (en[0].isIntersecting) { io.disconnect(); lote(l); } }, {root:el.querySelector('.ov__scroll'), rootMargin:'600px'});
        io.observe(bm);
      }
    }
  }
}
function ehEscolhido(k, c) { var v = cola()[k]; return v && v.t === 'c' && String(v.sq) === String(c.sq); }

function folhaLegenda(s) {
  var f = folha('Voto de legenda · ' + s.rot, '<div class="carregando"><div class="giro"></div></div>');
  api({a:'legendas', uf:S.uf, cargo:s.cargo}).then(function (r) {
    var c = f.querySelector('.folha__c');
    c.innerHTML = '<p class="aviso" style="margin:0 0 12px">No voto de legenda você digita só os 2 números do partido e o voto vai para a sigla, não para um candidato.</p>' +
      r.legendas.map(function (l) {
        return '<button class="uf-op" style="width:100%;margin-bottom:8px" data-n="' + esc(l.num) + '">' + imgLogo(l.sigla).replace('class="logo"', 'class="logo" style="width:36px;height:36px"') +
          '<span style="flex:1"><b>' + esc(l.sigla) + '</b><br><small style="color:var(--muted);font-weight:400">' + esc(l.nome) + '</small></span>' + cells(l.num, 2) + '</button>';
      }).join('');
    c.querySelectorAll('[data-n]').forEach(function (b) {
      b.onclick = function () {
        var l = r.legendas.filter(function (x) { return x.num === b.dataset.n; })[0];
        escolhe(s.k, {t:'l', num:l.num, sigla:l.sigla, nome:l.nome});
      };
    });
  });
}

/* Grava o voto e volta para a colinha. */
function escolhe(k, v) {
  var c = cola();
  if (v.t === 'c' && (k === 's1' || k === 's2')) {
    var outro = c[k === 's1' ? 's2' : 's1'];
    if (outro && outro.t === 'c' && String(outro.sq) === String(v.sq)) { toast('Esse senador já está na outra vaga. Escolha um candidato diferente.'); return; }
  }
  c[k] = v; salvaCola(); vibra(18);
  var n = pilha.length;
  var depois = function () {
    if (rota() !== 'inicio') history.replaceState({}, '', BASE + '/');
    render();
    var s = slotDe(k);
    toast(v.t === 'c' ? s.rot.replace(/ \(.*/, '') + ': ' + v.nome + ' ' + v.num : v.t === 'n' ? s.rot + ': voto nulo' : v.t === 'b' ? s.rot + ': voto em branco' : s.rot + ': legenda ' + v.sigla);
  };
  fechaTudo();
  if (n) { aposPop = depois; history.go(-n); } else depois();
}

/* ---------- PERFIL ---------- */
function abrePerfil(slug, k) {
  var el = h('<div class="ov" role="dialog" aria-modal="true" aria-label="Perfil do candidato"><div class="ov__in">' +
    '<div class="ov__head" style="grid-template-columns:48px 1fr 48px"><button class="circ" data-fecha aria-label="Voltar">' + I('volta') + '</button><span class="pf-kick"></span>' +
    '<button class="circ" data-comp aria-label="Compartilhar este perfil">' + I('comp') + '</button></div>' +
    '<div class="ov__scroll"><div class="carregando"><div class="giro"></div></div></div></div></div>');
  abreCamada(el, BASE + '/candidato/' + slug);
  el.querySelector('[data-fecha]').onclick = fecha;
  el.querySelector('[data-comp]').onclick = function () {
    var u = location.origin + BASE + '/candidato/' + slug;
    if (navigator.share) navigator.share({title:document.title, url:u}).catch(function () {}); else copia(u);
  };
  api({a:'perfil', slug:slug}).then(function (p) { preenchePerfil(el, p, k); })
    .catch(function () { el.querySelector('.ov__scroll').innerHTML = '<div class="vazio">Candidato não encontrado.</div>'; });
}
function preenchePerfil(el, p, k) {
  var c = p.cand, d = p.dados || {}, fem = c.fem;
  var kk = k || slotParaCargo(c.cargo);
  var s = kk ? slotDe(kk) : null;
  el.querySelector('.pf-kick').textContent = cargoNome(c.cargo, fem) + ' · ' + (c.cargo === 1 ? 'BR' : c.uf) + ' · Eleição 2026';
  document.title = c.nome + ' ' + c.num + ' · ' + cargoNome(c.cargo, fem) + ' · Colinha Alequizão';
  var julg = c.fora ? (FORA[c.fora] || 'Fora da urna') : (d.julgamento || c.julg || '');
  var julgTxt = /^DEFERIDO$/.test(julg) ? 'Registro deferido pelo TSE' : julg ? 'Situação no TSE: ' + julg.toLowerCase() : '';
  var o = '<div class="pf-top"><div class="pf-foto">' + imgFoto(c.sq) + '</div><div><h2 class="pf-nome">' + esc(c.nome) + '</h2><div class="pf-meta">' +
    (d.idade ? d.idade + ' anos<br>' : '') + esc(d.partidoNome || c.sigla) + '<br><span style="color:var(--faint)">' + esc(julgTxt) + '</span></div></div>' +
    '<div class="cc__part">' + imgLogo(c.sigla) + '<span class="cc__sigla">' + esc(c.sigla) + '</span></div></div>' +
    '<div class="pf-num">' + cells(c.num, c.num.length, 'big') + '</div>' + (c.fora ? '<p class="aviso" style="color:var(--bad);margin-top:-6px">Esta candidatura não está mais valendo (' + esc(FORA[c.fora] || c.fora) + '). Votar nesse número pode ser anulado.</p>' : '');
  (p.chapa || []).forEach(function (v) {
    o += '<div class="vice"><span class="cc__foto">' + imgFoto(v.sq) + '</span><span class="t"><b>' + esc(v.nome) + '</b><small>' + esc(cargoNome(v.cargo)) + '</small></span>' +
      '<span style="display:flex;flex-direction:column;align-items:center;gap:3px">' + imgLogo(v.sigla) + '<span class="cc__sigla">' + esc(v.sigla) + '</span></span></div>';
  });
  var ja = kk && ehEscolhido(kk, c);
  if (s) o += '<button class="btn btn--escuro" data-add>' + (ja ? I('ok') + 'Já está na sua colinha' : 'Adicionar à colinha') + '</button>';
  (p.planos || []).forEach(function (pl) {
    o += '<a class="lk" href="' + esc(pl.url) + '" target="_blank" rel="noopener">' + I('doc') + (c.cargo === 1 || c.cargo === 3 ? 'Plano de governo' : 'Proposta') + '<span class="r">PDF</span></a>';
  });
  o += '<a class="lk" href="https://divulgacandcontas.tse.jus.br/divulga/#/" target="_blank" rel="noopener">' + I('fora') + 'Ver candidaturas no site do TSE<span class="r">TSE</span></a>';
  var links = p.links || [];
  if (links.length) {
    o += '<details class="bx" open><summary>Redes e site' + I('baixo') + '</summary><div class="bx__c"><div class="redes">' + links.map(function (l) {
      var u = l.url.replace(/^https?:\/\/(www\.|web\.)?/, '').replace(/\/$/, '');
      var m = u.match(/(?:instagram|tiktok|youtube|x|twitter|threads|kwai|facebook)\.(?:com|net)\/(@?[^/?]+)/i);
      var rot = m ? (m[1][0] === '@' ? m[1] : (/facebook/.test(u) ? m[1] : '@' + m[1])).toLowerCase() : u.toLowerCase();
      return '<a href="' + esc(l.url) + '" target="_blank" rel="noopener nofollow"><span class="tag">' + esc(l.plataforma === 'website' ? 'site' : l.plataforma) + '</span>' + esc(rot) + '</a>';
    }).join('') + '</div></div></details>';
  }
  var kv = [['Nome civil', d.nomeCivil], ['Ocupação', d.ocupacao], ['Escolaridade', d.escolaridade], ['Naturalidade', d.naturalidade], ['Gênero', d.genero],
    ['Cor/raça', d.corRaca], ['Estado civil', d.estadoCivil], ['Coligação', d.coligacao], ['Federação', d.federacao], ['Teto de gastos (1º turno)', d.tetoGastos ? brlCurto(d.tetoGastos) : '']]
    .filter(function (x) { return x[1]; });
  if (kv.length) o += '<details class="bx"><summary>Candidatura' + I('baixo') + '</summary><div class="bx__c"><dl class="kv">' + kv.map(function (x) { return '<dt>' + x[0] + '</dt><dd>' + esc(x[1]) + '</dd>'; }).join('') + '</dl></div></details>';
  var t = p.trajetoria;
  if (t && t.anos && t.anos.length) {
    o += '<details class="bx"><summary>Histórico eleitoral · ' + t.candidaturas + (t.candidaturas === 1 ? ' candidatura' : ' candidaturas') + I('baixo') + '</summary><div class="bx__c">' +
      '<div class="stat-row" style="margin:0 0 10px"><div><small>Primeira eleição</small><b>' + (t.primeiraEleicao || '—') + '</b></div><div><small>Vezes eleito</small><b>' + (t.vezesEleito || 0) + '</b></div></div>' +
      t.anos.map(function (a) {
        var v = a.votos ? Object.keys(a.votos).map(function (x) { return (x === 'segundoTurno' ? '2º t: ' : '1º t: ') + a.votos[x].toLocaleString('pt-BR'); }).join(' · ') + ' votos' : '';
        return '<div class="hist"><span class="a">' + a.ano + '</span><span class="t">' + esc(a.cargo) + ' · ' + esc(a.local) + ' · ' + esc(a.sigla) + ' ' + esc(a.numero) + (v ? '<br><small>' + v + '</small>' : '') + '</span><small>' + esc(a.resultado) + '</small></div>';
      }).join('') + '</div></details>';
  }
  var b = p.bens;
  if (b && b.itens && b.itens.length) {
    o += '<details class="bx"><summary>Bens declarados · ' + brlCurto(b.total) + I('baixo') + '</summary><div class="bx__c">' +
      b.itens.map(function (x) { return '<div class="bem"><span>' + esc(x.descricao || x.tipo) + '</span><b>' + brl(x.valor) + '</b></div>'; }).join('') + '</div></details>';
  } else if (b) o += '<details class="bx"><summary>Bens declarados · nenhum' + I('baixo') + '</summary><div class="bx__c">Nenhum bem declarado ao TSE.</div></details>';
  var vagas = p.vagas;
  o += '<p class="pf-rodape">Fonte: TSE · 2026' + (S.meta && S.meta.atualizado ? '<br>atualizado em ' + quando(S.meta.atualizado) : '') +
    (vagas && c.cargo !== 1 ? '<br>' + esc(UFS[c.uf]) + ' elege ' + vagas + ' ' + (vagas === 1 ? cargoNome(c.cargo).toLowerCase() : pluralCargo(c.cargo)) : '') + '</p>';
  var sc = el.querySelector('.ov__scroll');
  sc.innerHTML = o;
  var add = sc.querySelector('[data-add]');
  if (add) add.onclick = function () {
    var alvo = kk;
    if (c.cargo === 5 && !k) { var cc = cola(); alvo = !cc.s1 || ehEscolhido('s1', c) ? 's1' : !cc.s2 ? 's2' : 's1'; }
    if (c.cargo !== 1 && c.uf !== S.uf) { S.uf = c.uf; gravar('uf', S.uf); }
    var v = {t:'c', sq:c.sq, nome:c.nome, num:c.num, sigla:c.sigla, uf:c.uf, cargo:c.cargo, slug:c.slug, fem:c.fem || 0, julg:c.julg};
    if (c.fora) v.fora = c.fora;
    var vice = (p.chapa || []).filter(function (x) { return x.cargo === 2 || x.cargo === 4; })[0];
    if (vice) v.vice = {sq:vice.sq, nome:vice.nome, num:vice.num, sigla:vice.sigla, cargo:vice.cargo, uf:c.uf};
    escolhe(alvo, v);
  };
}
function slotParaCargo(cg) { return {6:'df', 7:'de', 8:'de', 5:'s1', 3:'gov', 1:'pres'}[cg]; }
function pluralCargo(cg) { return {5:'senadores', 6:'deputados federais', 7:'deputados estaduais', 8:'deputados distritais', 3:'governador'}[cg] || ''; }

/* ---------- passar cola / link / texto ---------- */
function codigoCola() {
  var c = cola();
  return S.uf + '_' + slots().map(function (s) { var v = c[s.k]; return !v ? '' : v.t === 'n' ? 'n' : v.t === 'b' ? 'b' : v.num; }).join('-');
}
function linkCola() { return location.origin + BASE + '/c/' + codigoCola(); }
function textoCola() {
  var c = cola(), l = ['🗳️ Minha colinha · Eleições 2026 · ' + UFS[S.uf], ''];
  slots().forEach(function (s) {
    var v = c[s.k]; if (!v) return;
    l.push(s.rot + ': ' + (v.t === 'c' ? v.num + ' · ' + v.nome + ' (' + v.sigla + ')' : v.t === 'n' ? 'nulo' : v.t === 'b' ? 'branco' : v.num + ' · legenda ' + v.sigla));
  });
  l.push('', 'Monte a sua: ' + linkCola());
  return l.join('\n');
}
function copia(txt) {
  (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(function () { toast('Link copiado'); })
    .catch(function () { prompt('Copie o link:', txt); });
}
function compartilha() {
  if (navigator.share) navigator.share({title:'Minha colinha · Eleições 2026', text:textoCola().replace(/\n\nMonte a sua:.*$/, ''), url:linkCola()}).catch(function () {});
  else copia(linkCola());
}
function folhaPassar() {
  var f = folha('Passar cola', '<p class="aviso" style="margin-top:0">Mande sua colinha para alguém. Quem abrir o link vê os mesmos números e pode usar como ponto de partida.</p>' +
    '<div class="campo mono" style="display:flex;align-items:center;font-size:13px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;margin-top:12px">' + esc(linkCola()) + '</div>' +
    '<div class="acoes"><button class="acao" data-a="copiar">' + I('link') + 'Copiar link</button><button class="acao" data-a="comp">' + I('comp') + 'Compartilhar</button>' +
    '<a class="acao" target="_blank" rel="noopener" href="https://wa.me/?text=' + encodeURIComponent(textoCola()) + '">' + I('zap') + 'WhatsApp</a><button class="acao" data-a="salvar">' + I('marca') + 'Salvar aqui</button></div>');
  f.querySelector('[data-a=copiar]').onclick = function () { copia(linkCola()); };
  f.querySelector('[data-a=comp]').onclick = compartilha;
  f.querySelector('[data-a=salvar]').onclick = function () { salvarAtual(); };
}

/* Colinha recebida por link: /colinha/c/AL_1234-12345--b-15-13 */
function abreRecebida(cod) {
  var m = /^([A-Z]{2})_(.*)$/.exec(cod);
  if (!m || !UFS[m[1]]) { toast('Link de colinha inválido'); return; }
  var uf = m[1], partes = m[2].split('-');
  var ufAntes = S.uf; S.uf = uf; var ss = slots(); S.uf = ufAntes;
  var el = h('<div class="ov" role="dialog" aria-modal="true" aria-label="Colinha recebida"><div class="ov__in">' +
    '<div class="ov__head"><button class="circ" data-fecha aria-label="Fechar">' + I('x') + '</button><h2>Colinha recebida</h2><span></span></div>' +
    '<div class="ov__scroll"><div class="sec"><span class="uf-chip">' + uf + '</span>' + esc(UFS[uf]) + '</div><div class="rc"><div class="carregando"><div class="giro"></div></div></div></div>' +
    '<div class="ov__pe"><button class="btn btn--escuro" data-usar disabled>Usar esta colinha</button><button class="btn btn--claro" data-salvar style="margin-top:10px" disabled>Salvar em Minhas colinhas</button></div></div></div>');
  abreCamada(el);
  el.querySelector('[data-fecha]').onclick = fecha;
  var nova = {};
  Promise.all(ss.map(function (s, i) {
    var x = partes[i] || '';
    if (!x) return null;
    if (x === 'n') { nova[s.k] = {t:'n'}; return null; }
    if (x === 'b') { nova[s.k] = {t:'b'}; return null; }
    if (!/^\d+$/.test(x)) return null;
    return api({a:'numero', uf:uf, cargo:s.cargo, num:x}).then(function (r) {
      var c = r.candidato;
      if (c) nova[s.k] = {t:'c', sq:c.sq, nome:c.nome, num:c.num, sigla:c.sigla, uf:c.uf, cargo:c.cargo, slug:c.slug, fem:c.fem || 0, julg:c.julg, fora:c.fora};
      else if (r.legenda) nova[s.k] = {t:'l', num:r.legenda.num, sigla:r.legenda.sigla, nome:r.legenda.nome};
    }).catch(function () {});
  })).then(function () {
    var ufA = S.uf; S.uf = uf;
    var html = ss.map(function (s) { return nova[s.k] ? slotHtml(s, nova[s.k]) : ''; }).join('');
    S.uf = ufA;
    var rc = el.querySelector('.rc');
    rc.innerHTML = html || '<div class="vazio">Essa colinha está vazia.</div>';
    rc.querySelectorAll('.cc__trocar').forEach(function (b) { b.remove(); });
    rc.querySelectorAll('[data-perfil]').forEach(function (b) { b.onclick = function () { abrePerfil(b.dataset.perfil); }; });
    if (!html) return;
    var bu = el.querySelector('[data-usar]'), bs = el.querySelector('[data-salvar]');
    bu.disabled = bs.disabled = false;
    bu.onclick = function () {
      if (Object.keys(S.cola[uf] || {}).length && !confirm('Trocar a sua colinha de ' + UFS[uf] + ' por esta?')) return;
      S.uf = uf; gravar('uf', uf); S.cola[uf] = nova; salvaCola();
      fechaTudo(); aposPop = function () { render(); toast('Colinha copiada. Confira e ajuste o que quiser.'); }; history.back();
    };
    bs.onclick = function () { guardaSalva(uf, nova, 'Colinha recebida'); bs.disabled = true; bs.textContent = 'Salva em Minhas colinhas'; };
  });
}

/* ---------- salvas ---------- */
function salvarAtual() {
  if (!preenchidos()) { toast('A colinha está vazia'); return; }
  var nome = prompt('Nome desta colinha (ex.: Minha, Mãe, Pai):', S.salvas.length ? 'Colinha ' + (S.salvas.length + 1) : 'Minha colinha');
  if (nome === null) return;
  guardaSalva(S.uf, JSON.parse(JSON.stringify(cola())), nome.trim() || 'Minha colinha');
}
function guardaSalva(uf, votos, nome) {
  S.salvas.unshift({id:Date.now().toString(36), nome:nome, uf:uf, votos:votos, em:new Date().toISOString()});
  gravar('salvas', S.salvas);
  toast('Salva em Minhas colinhas');
}

/* ---------- impressão ---------- */
function imprime() {
  var c = cola(), ss = slots();
  var img = function (src, cls) { return '<img class="' + cls + '" src="' + src + '" alt="" onerror="this.style.visibility=\'hidden\'">'; };
  var linhas = ss.map(function (s, i) {
    var v = c[s.k], num = !v ? '' : v.t === 'n' ? '0'.repeat(s.dig) : v.t === 'b' ? '' : v.num;
    var dig = v && v.t === 'l' ? 2 : s.dig;
    var nome = !v ? '—' : v.t === 'c' ? v.nome : v.t === 'n' ? 'Voto nulo' : v.t === 'b' ? 'BRANCO (tecla branca)' : 'Legenda ' + v.sigla;
    var n = '';
    for (var j = 0; j < dig; j++) n += '<i' + (num[j] == null ? ' class="v"' : '') + '>' + (num[j] || '') + '</i>';
    // foto do candidato e logo do partido (legenda só tem logo)
    var ft = v && v.t === 'c' ? img(foto(v.sq), 'f') : '<span class="f vz"></span>';
    var lg = v && (v.t === 'c' || v.t === 'l') ? '<span class="lg">' + img(logo(v.sigla), '') + '<small>' + esc(v.sigla) + '</small></span>' : '';
    var vice = v && v.t === 'c' && v.vice ? '<em>' + esc(cargoNome(v.vice.cargo)) + ': ' + esc(v.vice.nome) + '</em>' : '';
    return '<div class="imp__l"><span class="o">' + (i + 1) + '</span>' + ft + '<span class="t"><b>' + esc(s.rot) + '</b><span>' + esc(nome) + '</span>' + vice + '</span>' + lg + '<span class="n">' + n + '</span></div>';
  }).join('');
  var card = '<div class="imp__card"><h4>Minha colinha</h4><div class="s">Eleições 2026 · ' + esc(UFS[S.uf]) + ' · 1º turno 4/10</div>' + linhas +
    '<div class="imp__pe">Leve no bolso: a colinha em papel é permitida na cabine (celular não). Dados do TSE · alequizao.com/colinha</div></div>';
  var box = $('#impressao');
  box.innerHTML = '<div class="imp">' + card + card + '</div>';
  toast('Preparando a impressão…');
  // espera fotos e logos carregarem (máx. 4 s) para não sair em branco no papel
  var imgs = [].slice.call(box.querySelectorAll('img'));
  var espera = imgs.map(function (im) { return im.complete ? null : new Promise(function (r) { im.onload = im.onerror = r; }); });
  Promise.race([Promise.all(espera), new Promise(function (r) { setTimeout(r, 4000); })]).then(function () { window.print(); });
}

/* ---------- BUSCA ---------- */
function telaBusca() {
  moldura('<main class="estreito"><h1 class="tit" style="margin-top:4px">Buscar candidato</h1>' +
    '<label class="busca">' + I('busca') + '<input id="bq" type="search" enterkeyhint="search" autocomplete="off" placeholder="Nome, número ou partido" aria-label="Buscar candidato"></label>' +
    '<div class="filtros" style="justify-content:flex-start;flex-wrap:wrap" id="bc"></div>' +
    '<div class="contagem"><span id="bct">' + esc(UFS[S.uf]) + ' + Presidente</span><span></span></div><div id="br"><div class="vazio">Digite pelo menos 2 letras ou números.<br>A busca vale para ' + esc(UFS[S.uf]) + ' e para presidente.</div></div></main>');
  var cg = 0, t;
  var cargos = [[0, 'Todos']].concat(slots().filter(function (s) { return s.k !== 's2'; }).map(function (s) { return [s.cargo, s.rot.replace(/ \(.*/, '').replace('Senador', 'Senador')]; }));
  var bc = $('#bc');
  bc.innerHTML = cargos.map(function (x) { return '<button class="mini' + (x[0] === 0 ? ' on' : '') + '" data-c="' + x[0] + '" aria-pressed="' + (x[0] === 0) + '">' + x[1] + '</button>'; }).join('');
  bc.querySelectorAll('button').forEach(function (b) {
    b.onclick = function () { cg = +b.dataset.c; bc.querySelectorAll('button').forEach(function (x) { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', x === b); }); busca(); };
  });
  var inp = $('#bq');
  inp.oninput = function () { clearTimeout(t); t = setTimeout(busca, 220); };
  setTimeout(function () { inp.focus(); }, 50);
  function busca() {
    var q = inp.value.trim(), br = $('#br');
    if (q.length < 2) { br.innerHTML = '<div class="vazio">Digite pelo menos 2 letras ou números.</div>'; return; }
    br.innerHTML = '<div class="carregando"><div class="giro"></div></div>';
    var p = {a:'busca', uf:S.uf, q:q}; if (cg) p.cargo = cg;
    api(p).then(function (r) {
      if (inp.value.trim() !== q) return;
      $('#bct').textContent = r.candidatos.length + (r.candidatos.length >= 80 ? '+' : '') + ' resultados';
      br.innerHTML = r.candidatos.length ? '' : '<div class="vazio">Nada encontrado para “' + esc(q) + '”.</div>';
      r.candidatos.forEach(function (c) {
        var b = h(cartao(c, {tag:'button', cls:'tap', attr:' aria-label="Ver perfil de ' + esc(c.nome) + '"'}));
        b.onclick = function () { abrePerfil(c.slug); };
        br.appendChild(b);
      });
    }).catch(function () { br.innerHTML = '<div class="vazio">Erro na busca. Tente de novo.</div>'; });
  }
}

/* ---------- SIMULADOR ---------- */
function telaSimulador() {
  var ss = slots(), c = cola();
  var passo = -1, dig = '', estado = 'ini', achado = null, votos = [];
  app.innerHTML = '<div class="wrap"><div class="urna-wrap">' +
    '<header class="urna-topo"><a class="marca" href="' + BASE + '/" data-ir="inicio">' + MARCA_SVG + '<span>colinha</span></a>' +
    '<span class="uf-chip">' + S.uf + '</span><span class="cont" id="u-ct">0/6</span>' +
    '<button class="btn-q" id="b-tema" aria-label="Trocar tema">' + I(document.documentElement.dataset.theme === 'dark' ? 'sol' : 'lua') + '</button></header>' +
    '<div class="urna"><div class="tela" id="tela" aria-live="polite"></div>' +
    '<div class="teclado" id="tec">' +
    [1,2,3,4,5,6,7,8,9].map(function (n) { return '<button class="tecla" data-t="' + n + '">' + n + '</button>'; }).join('') +
    '<button class="tecla z" data-t="0">0</button>' +
    '<button class="tecla fx br" data-t="B">BRANCO</button><button class="tecla fx co" data-t="C">CORRIGE</button><button class="tecla fx cf" data-t="OK">CONFIRMA</button></div></div>' +
    '<div class="cola-sim" id="cola-sim"></div>' +
    '<p class="aviso" style="text-align:center">Treino com a mesma ordem e teclas da urna. Nada do que você digita aqui é enviado a ninguém.</p>' +
    rodape() + '</div></div><nav class="nav" aria-label="Navegação"><div class="nav__in">' + navLinks() + '</div></nav>';
  ligaTopo();
  var tela = $('#tela');
  $('#tec').addEventListener('click', function (e) { var b = e.target.closest('[data-t]'); if (b) tecla(b.dataset.t, b); });
  document.onkeydown = function (e) {
    if (rota() !== 'simulador' || pilha.length) return;
    if (/^\d$/.test(e.key)) tecla(e.key);
    else if (e.key === 'Enter') tecla('OK');
    else if (e.key === 'Backspace') tecla('C');
    else if (e.key.toLowerCase() === 'b') tecla('B');
  };
  desenha();

  function som(tipo) {
    try {
      var A = window.AudioContext || window.webkitAudioContext; if (!A) return;
      var ac = som.ac || (som.ac = new A()), o = ac.createOscillator(), g = ac.createGain();
      o.type = 'square'; o.frequency.value = tipo === 'fim' ? 1100 : 900; g.gain.value = .05;
      o.connect(g); g.connect(ac.destination); o.start();
      var dur = tipo === 'fim' ? 1.1 : tipo === 'ok' ? .35 : .06;
      if (tipo === 'fim') { [0.15, 0.3, 0.45].forEach(function (t) { g.gain.setValueAtTime(0, ac.currentTime + t); g.gain.setValueAtTime(.05, ac.currentTime + t + .05); }); }
      o.stop(ac.currentTime + dur);
    } catch (e) {}
  }
  function tecla(t, b) {
    if (b) { b.classList.add('aperta'); setTimeout(function () { b.classList.remove('aperta'); }, 120); }
    vibra(8);
    if (estado === 'fim') { if (t === 'OK') { passo = -1; votos = []; estado = 'ini'; desenha(); } return; }
    if (estado === 'ini') { if (t === 'OK') { som('ok'); passo = 0; novoPasso(); } return; }
    var s = ss[passo];
    if (/^\d$/.test(t)) {
      if (estado !== 'dig' || dig.length >= s.dig) return;
      som('t'); dig += t; achado = null;
      if (dig.length === 2 || dig.length === s.dig) consulta();
      desenha();
    } else if (t === 'C') { som('t'); novoPasso(); }
    else if (t === 'B') { if (dig) return; som('t'); estado = 'branco'; desenha(); }
    else if (t === 'OK') {
      var pronto = estado === 'branco' || dig.length === s.dig || (dig.length === 2 && s.cargo >= 6 && achado && achado.legenda && !achado.candidato);
      if (!pronto) return;
      votos.push({k:s.k, dig:dig, branco:estado === 'branco'});
      passo++;
      if (passo >= ss.length) { estado = 'fim'; som('fim'); desenha(); return; }
      som('ok'); novoPasso();
    }
  }
  function novoPasso() { dig = ''; achado = null; estado = 'dig'; desenha(); }
  function consulta() {
    var s = ss[passo], d = dig;
    api({a:'numero', uf:S.uf, cargo:s.cargo, num:d}).then(function (r) { if (dig === d) { achado = r; desenha(); } }).catch(function () {});
  }
  function desenha() {
    $('#u-ct').textContent = (passo < 0 ? 0 : Math.min(passo, 6)) + '/6';
    var cs = $('#cola-sim');
    var s = ss[passo];
    if (s && estado !== 'fim') {
      var v = c[s.k];
      cs.innerHTML = v ? '<span style="flex:1">Na sua colinha<br><b>' + esc(s.rot) + ': ' + esc(v.t === 'c' ? v.nome : v.t === 'n' ? 'nulo' : v.t === 'b' ? 'branco' : 'legenda ' + v.sigla) + '</b></span>' +
        (v.t === 'b' ? '<span class="branco-tecla">BRANCO</span>' : cells(v.t === 'n' ? '0'.repeat(s.dig) : v.num, v.t === 'l' ? 2 : s.dig))
        : '<span>Sem voto na colinha para <b>' + esc(s.rot) + '</b>. <a href="' + BASE + '/" data-ir="inicio">Montar colinha</a></span>';
      cs.hidden = false;
    } else cs.hidden = true;
    var marca = '<div class="tela__marca">' + MARCA_SVG + 'colinha</div>';
    if (estado === 'ini') {
      tela.innerHTML = marca + '<div class="tela__ini"><b>Passo 1 de 6</b><br>Urna pronta para receber o seu voto<br>Use o teclado numérico para digitar o seu voto<br><b>CONFIRMA</b> para iniciar o seu voto</div>';
      return;
    }
    if (estado === 'fim') {
      tela.innerHTML = '<div class="tela__fim">FIM<small>Votação concluída. Aperte CONFIRMA para treinar de novo.</small></div>';
      return;
    }
    var rotulo = s.rot.replace(/ \(.*/, '').toUpperCase();
    if (estado === 'branco') {
      tela.innerHTML = marca + '<div class="tela__voto"><div class="tela__seu">SEU VOTO PARA</div><div class="tela__cargo">' + rotulo + '</div>' +
        '<div class="tela__grande">VOTO EM BRANCO</div>' + rodTela() + '</div>';
      return;
    }
    var q = '';
    for (var i = 0; i < s.dig; i++) q += '<span class="q' + (i === dig.length ? ' pisca' : '') + '">' + (dig[i] || '') + '</span>';
    var info = '', fotos = '', completo = dig.length === s.dig;
    var r = achado;
    if (r && r.candidato && completo) {
      var cd = r.candidato;
      info = 'Nome: <b>' + esc(cd.nome) + '</b><br>Partido: ' + esc(cd.sigla) + (cd.fora ? '<br><b style="color:#c0392b">' + esc(FORA[cd.fora] || 'Fora da urna') + '</b>' : '');
      fotos = '<div class="tela__foto">' + imgFoto(cd.sq) + '<small>' + esc(cargoNome(cd.cargo, cd.fem)) + '</small></div>';
    } else if (completo && r && !r.candidato && r.legenda) {
      info = '<div class="tela__grande" style="font-size:18px">VOTO DE LEGENDA</div>Partido: ' + esc(r.legenda.sigla) + '<br><small>Número de candidato errado: o voto vai para o partido.</small>';
    } else if (completo && r) {
      info = /^0+$/.test(dig) || !r.legenda ? '<div class="tela__grande">NÚMERO ERRADO</div><div class="tela__grande" style="font-size:20px">VOTO NULO</div>' : '';
    } else if (dig.length === 2 && r && r.legenda && s.cargo >= 6) {
      info = 'Partido: <b>' + esc(r.legenda.sigla) + '</b><br><small>' + esc(r.legenda.nome) + '</small>';
    }
    tela.innerHTML = marca + '<div class="tela__voto"><div class="tela__seu">SEU VOTO PARA</div><div class="tela__cargo">' + rotulo + '</div>' +
      '<div class="tela__corpo"><div class="tela__info"><div class="tela__num">Número: ' + q + '</div>' + info + '</div><div class="tela__fotos">' + fotos + '</div></div>' +
      (completo || (dig.length === 2 && r && r.legenda && !r.candidato && s.cargo >= 6) ? rodTela() : '') + '</div>';
  }
  function rodTela() { return '<div class="tela__rod">Aperte a tecla:<br><b>CONFIRMA</b> para CONFIRMAR este voto<br><b>CORRIGE</b> para REINICIAR este voto</div>'; }
}

/* ---------- COLINHAS SALVAS ---------- */
function telaColinhas() {
  var l = S.salvas;
  var o = '<main class="estreito"><h1 class="tit" style="margin-top:4px">Minhas colinhas</h1>' +
    '<p class="aviso" style="text-align:center;margin:-10px 0 18px">Guarde a sua, a da família e as que receber. Tudo fica só neste aparelho.</p>';
  o += preenchidos() ? '<button class="btn btn--escuro" id="c-salvar" style="margin:0 0 18px">' + I('marca') + 'Salvar a colinha atual</button>' : '';
  if (!l.length) o += '<div class="vazio">Você ainda não salvou nenhuma colinha.<br><a href="' + BASE + '/" data-ir="inicio">Montar minha colinha</a></div>';
  l.forEach(function (x, i) {
    var ufA = S.uf; S.uf = x.uf; var ss = slots(); S.uf = ufA;
    o += '<div class="salva"><div class="salva__top"><span class="uf-chip">' + x.uf + '</span><b>' + esc(x.nome) + '</b><small style="color:var(--faint)">' + new Date(x.em).toLocaleDateString('pt-BR') + '</small></div>' +
      '<div class="salva__nums">' + ss.map(function (s) {
        var v = x.votos[s.k]; if (!v) return '';
        // miniatura: foto do candidato; na legenda, o logo do partido
        var mini = v.t === 'c' ? '<img class="mf" src="' + foto(v.sq) + '" alt="" loading="lazy" onerror="this.remove()">'
          : v.t === 'l' ? '<img class="mf ml" src="' + logo(v.sigla) + '" alt="" loading="lazy" onerror="this.remove()">' : '';
        return '<span' + (mini ? ' class="cm"' : '') + ' title="' + esc(v.t === 'c' ? v.nome + ' · ' + v.sigla : '') + '">' + mini + '<i><em>' + s.rot.replace('Deputado ', 'Dep. ').replace(/Senador \((\d)ª vaga\)/, 'Sen. $1') + '</em>' + esc(v.t === 'c' || v.t === 'l' ? v.num : v.t === 'n' ? 'nulo' : 'branco') + '</i></span>';
      }).join('') + '</div>' +
      '<div class="salva__acoes"><button class="mini" data-usar="' + i + '">' + I('ok') + 'Usar</button><button class="mini" data-link="' + i + '">' + I('link') + 'Link</button>' +
      '<button class="mini" data-ren="' + i + '">Renomear</button><button class="mini perigo" data-del="' + i + '">' + I('lixo') + 'Apagar</button></div></div>';
  });
  moldura(o + '</main>');
  var bs = $('#c-salvar'); if (bs) bs.onclick = function () { salvarAtual(); telaColinhas(); };
  app.querySelectorAll('[data-usar]').forEach(function (b) {
    b.onclick = function () {
      var x = l[+b.dataset.usar];
      S.uf = x.uf; gravar('uf', x.uf); S.cola[x.uf] = JSON.parse(JSON.stringify(x.votos)); salvaCola();
      ir('inicio'); toast('Colinha “' + x.nome + '” aberta');
    };
  });
  app.querySelectorAll('[data-link]').forEach(function (b) {
    b.onclick = function () { var x = l[+b.dataset.link], ufA = S.uf, cA = S.cola[x.uf]; S.uf = x.uf; S.cola[x.uf] = x.votos; var u = linkCola(); S.uf = ufA; S.cola[x.uf] = cA; copia(u); };
  });
  app.querySelectorAll('[data-ren]').forEach(function (b) {
    b.onclick = function () { var x = l[+b.dataset.ren], n = prompt('Novo nome:', x.nome); if (n && n.trim()) { x.nome = n.trim(); gravar('salvas', l); telaColinhas(); } };
  });
  app.querySelectorAll('[data-del]').forEach(function (b) {
    b.onclick = function () { if (confirm('Apagar esta colinha?')) { l.splice(+b.dataset.del, 1); gravar('salvas', l); telaColinhas(); } };
  });
}

/* ---------- páginas de texto ---------- */
function pagina(html) { moldura('<main class="pag">' + html + '</main>'); }
function telaGuia() {
  var ss = slots();
  pagina('<div class="kicker" style="text-align:left">Guia do eleitor</div><h2>Como votar nas eleições de 2026</h2>' +
    '<p>O 1º turno é no <strong>domingo, 4 de outubro de 2026</strong>, das 8h às 17h (horário de Brasília). Onde houver 2º turno para governador ou presidente, ele acontece em <strong>25 de outubro</strong>.</p>' +
    '<h3>A ordem na urna</h3><p>São 6 votos, sempre nesta ordem:</p><ol class="passos">' +
    ss.map(function (s) { return '<li>' + esc(s.rot) + cells('', s.dig) + '</li>'; }).join('') + '</ol>' +
    '<h3>O que levar</h3><ul><li>Documento oficial com foto (RG, CNH, passaporte, carteira de trabalho) ou o <strong>e-Título</strong> com foto.</li>' +
    '<li>Sua <strong>colinha em papel</strong>: é permitida. Celular, câmera e qualquer aparelho eletrônico são proibidos na cabine.</li></ul>' +
    '<h3>Dicas na hora de votar</h3><ul><li>Confira a foto, o nome e o partido na tela antes de apertar <strong>CONFIRMA</strong>.</li>' +
    '<li>Errou? Aperte <strong>CORRIGE</strong> e digite de novo.</li>' +
    '<li>Para senador são <strong>duas vagas</strong> neste ano: vote em dois candidatos diferentes.</li>' +
    '<li><strong>Voto de legenda</strong>: para deputado, digitar só os 2 números do partido manda o voto para a sigla.</li>' +
    '<li><strong>Branco</strong> e <strong>nulo</strong> não entram na conta dos votos válidos.</li></ul>' +
    '<h3>Treine antes</h3><p>Use o <a href="' + BASE + '/simulador" data-ir="simulador">simulador de urna</a> com os números da sua colinha.</p>' +
    '<p style="font-size:13px">Confirme seu local de votação no site ou app do TSE (e-Título).</p>');
}
function telaSobre() {
  pagina('<h2>Sobre a Colinha</h2><p>A Colinha ajuda você a montar a <strong>lista com os números dos seus candidatos</strong> para levar à urna nas Eleições 2026.</p>' +
    '<p>Os candidatos aparecem em <strong>ordem alfabética rotativa</strong>: a letra inicial muda todo dia, para nenhum nome ficar sempre no topo. Não recomendamos, não patrocinamos e não destacamos ninguém.</p>' +
    '<p>Não tem cadastro nem login. Sua colinha fica guardada <strong>só no seu aparelho</strong>.</p>' +
    '<h3>Quem fez</h3><p>Desenvolvido por <strong>Alequizão</strong> · <a href="https://alequizao.com/">alequizao.com</a> · alequizao.dev@gmail.com. Inspirado no projeto colinha.ai.</p>');
}
function telaDados() {
  pagina('<h2>De onde vêm os dados</h2><p>Nomes, números, partidos, fotos, situação das candidaturas, bens e planos de governo são os <strong>dados públicos do Tribunal Superior Eleitoral (TSE)</strong> para 2026 (DivulgaCandContas e Portal de Dados Abertos), republicados e atualizados todo dia.</p>' +
    '<div class="stat-row" id="dd"><div><small>Candidatos</small><b>—</b></div><div><small>Atualizado</small><b>—</b></div></div>' +
    '<p>Candidaturas com renúncia, cancelamento ou indeferimento aparecem riscadas e no fim da lista. Pode haver atraso entre uma decisão da Justiça Eleitoral e a atualização aqui: <strong>confira sempre na tela da urna</strong>.</p>');
  api({a:'stats', uf:S.uf}).then(function (m) { $('#dd').innerHTML = '<div><small>Candidatos</small><b>' + m.brasil.toLocaleString('pt-BR') + '</b></div><div><small>Atualizado</small><b>' + quando(m.atualizado) + '</b></div>'; }).catch(function () {});
}
function telaPrivacidade() {
  pagina('<h2>Privacidade</h2><p><strong>Sua colinha não sai do seu aparelho.</strong> Os candidatos escolhidos, as colinhas salvas, o estado e o tema ficam no armazenamento local do navegador (localStorage). Nada disso é enviado para o nosso servidor.</p>' +
    '<p>O servidor só entrega a lista pública de candidatos. Não usamos cadastro, cookies de rastreamento nem anúncios.</p>' +
    '<p>Quando você <strong>passa cola</strong>, os números vão dentro do link que você mesmo escolhe mandar. Quem receber o link vê esses números.</p>' +
    '<p>Para apagar tudo, limpe os dados do site no navegador.</p>');
}
function telaTermos() {
  pagina('<h2>Termos de uso</h2><p>A Colinha é gratuita e informativa. Os dados vêm do TSE e podem mudar até o dia da eleição; a informação que vale é a da urna.</p>' +
    '<p>Não fazemos propaganda eleitoral nem recomendamos candidatos. A ordem das listas é alfabética e rotativa.</p>' +
    '<p>Use com responsabilidade: é proibido usar o site para fins ilegais ou para enganar outros eleitores.</p>');
}

/* ---------- PWA ---------- */
var instalar = null;
window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); instalar = e; var b = $('#b-instalar'); if (b) ligaTopo(); });
if ('serviceWorker' in navigator) window.addEventListener('load', function () { navigator.serviceWorker.register(BASE + '/sw.js?v=' + VERSAO, {scope:BASE + '/'}).catch(function () {}); });

render();
})();
