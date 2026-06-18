
/* =========================================================================
   SurvAI Shell — lazy-loading, hierarchical back, no srcdoc, Android-first
   ========================================================================= */

/* ---- DATA: Calculator menu (urutan sesuai instruksi) ---- */
const CALC_ITEMS = [
  {file:'basic-survey.html',     title:'Basic Survey',    desc:'Perhitungan koordinat dan jarak.', icon:icoNodes()},
  {file:'cut-fill.html',         title:'Cut & Fill',      desc:'Estimasi volume galian dan timbunan.', icon:icoLayers()},
  {file:'tambang.html',          title:'Tambang',         desc:'Kalkulasi spesifik untuk area tambang.', icon:icoMountain()},
  {file:'poligon-terbuka.html',  title:'Poligon Terbuka', desc:'Hitung koordinat titik poligon.', icon:icoTrend()},
  {file:'level-jalan.html',      title:'Level Jalan',     desc:'Elevasi dan kemiringan desain jalan.', icon:icoLevels()},
  {file:'konverter.html',        title:'Konverter',       desc:'Konversi satuan sudut, jarak, koordinat.', icon:icoSwap()},
  {file:'advance-survey.html',   title:'Advance Survey',  desc:'Geodesi kompleks dan koreksi.', icon:icoCompass()},
  {file:'kdv.html',              title:'K.D. Vertikal',   desc:'Kerangka Dasar Vertikal / Sipat datar.', icon:icoUpDown()},
  {file:'kdh.html',              title:'K.D. Horizontal', desc:'Perataan jaring kontrol horizontal.', icon:icoBars()},
  {file:'volume.html',           title:'Volume',          desc:'Kapasitas stockpile atau galian.', icon:icoCube()},
];

/* ---- DATA: Tools menu ---- */
const TOOL_ITEMS = [
  {file:'utility-tools.html',    title:'Utility Tools',  desc:'Konversi & Dasar', icon:icoTools()},
  {file:'tools-field.html',      title:'Field Tools',    desc:'Navigasi & GPS', icon:icoCompass()},
  {file:'tools-curve.html',      title:'Curve Tools',    desc:'Geometri Jalan', icon:icoTrend()},
  {file:'aktivitas-tambang.html',title:'Produktivitas',  desc:'Aktivitas Tambang', icon:icoChartUp()},
  {file:'drone-spraying.html',   title:'Drone Spraying', desc:'Kalkulator Semprot Drone', icon:icoDrone()},
  {file:'drone-mapping.html',    title:'Drone Mapping',  desc:'Mission Planner 2D/3D', icon:icoMapping()},
];

/* ---- Master list semua menu yang bisa di-pin ke Akses Cepat ---- */
/* open: parameter ?open= untuk deep-link langsung ke sub-screen dalam file */
const ALL_QA = [
  {tab:'calc',  file:'basic-survey.html',     title:'Basic Survey'},
  {tab:'calc',  file:'konverter.html',        title:'Konverter'},
  {tab:'tools', file:'utility-tools.html',    title:'Photo Annotation',   open:'photo'},
  {tab:'tools', file:'tools-field.html',      title:'Digital Compass',    open:'compass'},
  {tab:'calc',  file:'volume.html',           title:'Volume'},
  {tab:'tools', file:'tools-field.html',      title:'Digital Level Book', open:'levelbook'},
  {tab:'tools', file:'aktivitas-tambang.html',title:'Excavator',          open:'excavator'},
  {tab:'tools', file:'aktivitas-tambang.html',title:'Hauler',             open:'hauler'},
  {tab:'tools', file:'aktivitas-tambang.html',title:'Bulldozer',          open:'bulldozer'},
  {tab:'calc',  file:'kdh.html',              title:'K.D. Horizontal'},
  {tab:'calc',  file:'tambang.html',          title:'OB Volume',          open:'ob-volume'},
  {tab:'calc',  file:'tambang.html',          title:'Tonase Coal/Ore',    open:'tonase-coal'},
  {tab:'calc',  file:'tambang.html',          title:'Stripping Ratio',    open:'stripping-ratio'},
  {tab:'calc',  file:'cut-fill.html',         title:'Cut & Fill'},
  {tab:'calc',  file:'level-jalan.html',      title:'Level Jalan'},
  {tab:'calc',  file:'poligon-terbuka.html',  title:'Poligon Terbuka'},
  {tab:'calc',  file:'advance-survey.html',   title:'Advance Survey'},
  {tab:'calc',  file:'kdv.html',              title:'K.D. Vertikal'},
  {tab:'tools', file:'utility-tools.html',    title:'Utility Tools'},
  {tab:'tools', file:'tools-curve.html',      title:'Curve Tools'},
  {tab:'tools', file:'aktivitas-tambang.html',title:'Produktivitas'},
  {tab:'maps',  file:null,                    title:'Maps'},
];

/* ---- Quick access: 8 slot, tersimpan di localStorage ---- */
const QA_KEY = 'survai_qa_slots_v1';
const QA_DEFAULT = [
  'Basic Survey','Konverter','Photo Annotation','Digital Compass',
  'Volume','Digital Level Book','Excavator','Hauler'
];
function getQaSlots(){
  try{
    const s = JSON.parse(localStorage.getItem(QA_KEY)||'null');
    if(Array.isArray(s) && s.length) return s;
  }catch(e){}
  return [...QA_DEFAULT];
}
function saveQaSlots(arr){
  try{ localStorage.setItem(QA_KEY, JSON.stringify(arr)); }catch(e){}
}
function qaItemByTitle(title){
  return ALL_QA.find(q=>q.title===title) || null;
}

/* ---- Recent: dinamis dari localStorage, max 3 ---- */
const RECENT_KEY = 'survai_recent_v1';
function getRecent(){
  try{ return JSON.parse(localStorage.getItem(RECENT_KEY)||'[]'); }catch(e){ return []; }
}
function saveRecent(tab, file, title){
  let list = getRecent().filter(r=>!(r.tab===tab && r.file===file && r.title===title));
  list.unshift({tab, file, title, ts: Date.now()});
  list = list.slice(0,3);
  try{ localStorage.setItem(RECENT_KEY, JSON.stringify(list)); }catch(e){}
}
function qaIcon(title){
  const m = {
    'Basic Survey':icoNodes(), 'Konverter':icoSwap(), 'Photo Annotation':icoPhoto(),
    'Digital Compass':icoCompass(), 'Volume':icoCube(), 'Digital Level Book':icoBook(),
    'Excavator':icoExcavator(), 'Hauler':icoHauler(), 'Bulldozer':icoBulldozer(),
    'K.D. Horizontal':icoBars(), 'OB Volume':icoMountain(), 'Tonase Coal/Ore':icoOre(),
    'Stripping Ratio':icoLayers(), 'Cut & Fill':icoLayers(), 'Level Jalan':icoLevels(),
    'Poligon Terbuka':icoTrend(), 'Advance Survey':icoCompass(), 'K.D. Vertikal':icoUpDown(),
    'Utility Tools':icoTools(), 'Curve Tools':icoTrend(), 'Produktivitas':icoChartUp(),
    'Maps':icoMap(),
  };
  return m[title] || icoTools();
}
function recentIcon(tab, file, title){ return qaIcon(title); }
function timeAgo(ts){
  const sec = Math.floor((Date.now()-ts)/1000);
  if(sec<120) return 'Baru saja';
  if(sec<3600) return Math.floor(sec/60)+' menit lalu';
  if(sec<86400) return Math.floor(sec/3600)+' jam lalu';
  if(sec<172800) return 'Kemarin';
  return Math.floor(sec/86400)+' hari lalu';
}

/* =================== NAVIGATION STATE =================== */
let currentTab = 'home';
// nav stack untuk back hierarkis: 'tab' | 'calc-detail' | 'tools-detail'
let stack = [{level:'tab', tab:'home'}];

function setHeader(title, sub){
  document.getElementById('hdrTitle').textContent = title;
  document.getElementById('hdrSub').textContent = sub || '';
}
function updateBackBtn(){
  document.getElementById('backBtn').hidden = (stack.length <= 1);
}

function activateView(viewId){
  document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active', v.id===viewId));
}
function activateNav(tab){
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.toggle('active', n.dataset.tab===tab));
}

function switchTab(tab){
  currentTab = tab;
  stack = [{level:'tab', tab:tab}];     // pindah tab = reset stack tab itu
  activateNav(tab);

  const appHeader = document.querySelector('.app-header');
  if(appHeader) appHeader.style.display = (tab==='maps') ? 'none' : '';

  if(tab==='home'){ showView('view-home'); renderRecent(); }
  else if(tab==='maps'){ showView('view-maps'); loadMaps(); }
  else if(tab==='calc'){ showView('view-calc'); showCalcMenu(); }
  else if(tab==='tools'){ showView('view-tools'); showToolsMenu(); }
  else if(tab==='ai'){ showView('view-ai'); }

  updateBackBtn();
}
function showView(id){
  const el = document.getElementById(id);
  activateView(id);
  setHeader(el.dataset.title, el.dataset.sub);
}

/* -------- Calculator: menu <-> detail -------- */
function showCalcMenu(){
  document.getElementById('calcMenu').classList.remove('hidden');
  document.getElementById('calcFrameWrap').classList.add('hidden');
  const v = document.getElementById('view-calc');
  setHeader(v.dataset.title, v.dataset.sub);
}
function openCalculatorPage(file, title, open){
  stack.push({level:'calc-detail', tab:'calc', file:file, title:title});
  setHeader(title, 'Pilih dan gunakan fitur');
  document.getElementById('calcMenu').classList.add('hidden');
  document.getElementById('calcFrameWrap').classList.remove('hidden');
  loadFrame('calcFrame','calcOverlay', 'calculator/' + file, title, open);
  updateBackBtn();
}

/* -------- Tools: menu <-> detail -------- */
function showToolsMenu(){
  document.getElementById('toolsMenu').classList.remove('hidden');
  document.getElementById('toolsFrameWrap').classList.add('hidden');
  const v = document.getElementById('view-tools');
  setHeader(v.dataset.title, v.dataset.sub);
}
function openToolsPage(file, title, open){
  stack.push({level:'tools-detail', tab:'tools', file:file, title:title});
  setHeader(title, 'Pilih dan gunakan fitur');
  document.getElementById('toolsMenu').classList.add('hidden');
  document.getElementById('toolsFrameWrap').classList.remove('hidden');
  loadFrame('toolsFrame','toolsOverlay', 'tools/' + file, title, open);
  updateBackBtn();
}

/* -------- Lazy frame loader (iframe src, bukan srcdoc) -------- */
function loadFrame(frameId, overlayId, url, title, open){
  const iframe  = document.getElementById(frameId);
  const overlay = document.getElementById(overlayId);
  showLoading(overlay, 'Memuat ' + title + '...');
  let done = false;
  iframe.onload = ()=>{ done = true; hideLoading(overlay); };
  iframe.onerror = ()=>{ showError(overlay, frameId, url, title); };
  // fallback: jika tidak ada onload dalam 12 dtk, anggap gagal
  const t = setTimeout(()=>{ if(!done) showError(overlay, frameId, url, title); }, 12000);
  iframe.addEventListener('load', ()=>clearTimeout(t), {once:true});
  iframe.removeAttribute('srcdoc');
  const sep = url.indexOf('?')>=0 ? '&' : '?';
  iframe.src = url + sep + 'embed=1' + (open ? '&open='+encodeURIComponent(open) : '');
}
function showLoading(overlay, text){
  overlay.className = 'overlay show';
  overlay.innerHTML = '<div class="spinner"></div><p>'+text+'</p>';
}
function hideLoading(overlay){ overlay.className = 'overlay'; overlay.innerHTML=''; }
function showError(overlay, frameId, url, title){
  overlay.className = 'overlay show err';
  overlay.innerHTML =
    '<div class="err-ico">!</div>'+
    '<p class="err-title">Submenu gagal dimuat</p>'+
    '<p>Tidak dapat membuka <b>'+title+'</b>.<br>Periksa koneksi atau file: '+url+'</p>'+
    '<button class="retry">Coba lagi</button>';
  overlay.querySelector('.retry').onclick = ()=>{
    const fr = document.getElementById(frameId);
    showLoading(overlay,'Memuat '+title+'...');
    fr.onload = ()=>hideLoading(overlay);
    fr.onerror = ()=>showError(overlay,frameId,url,title);
    fr.src = url + (url.indexOf('?')>=0?'&':'?') + 'embed=1&_=' + Date.now();
  };
}

/* -------- Maps frame -------- */
let mapsLoaded = false;
function loadMaps(){
  const iframe = document.getElementById('mapsFrame');
  const overlay = document.getElementById('mapsOverlay');
  if(mapsLoaded) return;
  mapsLoaded = true;
  overlay.classList.add('show');
  iframe.onload = ()=>overlay.classList.remove('show');
  iframe.onerror = ()=>{ overlay.className='overlay show err';
    overlay.innerHTML='<div class="err-ico">!</div><p class="err-title">Peta gagal dimuat</p><p>maps.html tidak ditemukan.</p>'; };
  iframe.src = 'maps.html?embed=1';
}

/* =================== BACK (hierarki) =================== */
function goBack(){
  if(stack.length<=1) return;
  const top = stack.pop();
  if(top.level==='calc-detail'){
    showCalcMenu();              // detail -> daftar Calculator
  }else if(top.level==='tools-detail'){
    showToolsMenu();             // detail -> daftar Tools
  }else if(top.level==='gnss'){
    activateView('view-'+top.tab);     // gnss -> tab sebelumnya
    const prevView = document.getElementById('view-'+top.tab);
    setHeader(prevView.dataset.title, prevView.dataset.sub);
  }
  updateBackBtn();
}
// Android hardware back -> samakan dengan tombol back header
window.addEventListener('popstate', ()=>{ if(stack.length>1){ goBack(); history.pushState(null,'',location.href);} });
history.pushState(null,'',location.href);

/* =================== RENDER MENUS =================== */
function card(item, onclick){
  return '<button class="feat" onclick="'+onclick+'">'+
    '<span class="ibox">'+item.icon+'</span>'+
    '<span class="ftitle">'+item.title+'</span>'+
    '<span class="fdesc">'+item.desc+'</span>'+
  '</button>';
}
function renderGrid(){
  document.getElementById('calcGrid').innerHTML =
    CALC_ITEMS.map(i=>card(i, "openCalculatorPage('"+i.file+"','"+esc(i.title)+"')")).join('');
  document.getElementById('toolsGrid').innerHTML =
    TOOL_ITEMS.map(i=>card(i, "openToolsPage('"+i.file+"','"+esc(i.title)+"')")).join('');
  renderQaGrid();
  renderRecent();
}
function renderQaGrid(){
  const slots = getQaSlots();
  document.getElementById('qaGrid').innerHTML = slots.map(title=>{
    const q = qaItemByTitle(title);
    if(!q) return '';
    const act = q.file ? "quickOpen('"+q.tab+"','"+q.file+"','"+esc(q.title)+"')" : "switchTab('"+q.tab+"')";
    return '<button class="qa" onclick="'+act+'"><span class="ibox">'+qaIcon(q.title)+'</span><span>'+q.title+'</span></button>';
  }).join('');
}
function renderRecent(){
  const list = getRecent();
  const chev = '<span class="chev"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 6l6 6-6 6" stroke-linecap="round"/></svg></span>';
  const el = document.getElementById('recentList');
  if(!list.length){
    el.innerHTML = '<p style="color:var(--muted);font-size:13px;padding:8px 0">Belum ada riwayat penggunaan.</p>';
    return;
  }
  el.innerHTML = list.map(r=>
    '<button class="item" style="text-align:left;width:100%;border:1px solid var(--line)" onclick="quickOpen(\''+r.tab+'\',\''+r.file+'\',\''+esc(r.title)+'\')">'+
      '<span class="ibox">'+recentIcon(r.tab,r.file,r.title)+'</span>'+
      '<span class="meta"><b>'+r.title+'</b><small>'+timeAgo(r.ts)+'</small></span>'+
      chev+
    '</button>').join('');
}
function quickOpen(tab, file, title){
  saveRecent(tab, file, title);
  const q = ALL_QA.find(x=>x.tab===tab && x.file===file && x.title===title);
  const open = q && q.open ? q.open : null;
  switchTab(tab);
  if(tab==='calc') openCalculatorPage(file, title, open);
  else if(tab==='tools') openToolsPage(file, title, open);
}

/* =================== QA EDIT MODAL =================== */
function openQaEdit(){
  renderQaEditModal();
  document.getElementById('qaModalBackdrop').classList.add('open');
}
function closeQaEdit(){
  document.getElementById('qaModalBackdrop').classList.remove('open');
}
function handleQaBackdropClick(e){
  if(e.target===document.getElementById('qaModalBackdrop')) closeQaEdit();
}
function renderQaEditModal(){
  const slots = getQaSlots();
  const slotsEl = document.getElementById('qaSlots');
  const allEl   = document.getElementById('qaAll');

  // render 8 slot (isi + kosong)
  let sHtml = '';
  for(let i=0;i<8;i++){
    const t = slots[i];
    if(t){
      sHtml += '<div class="qa-slot">'+
        '<span class="ibox">'+qaIcon(t)+'</span>'+
        '<span class="lbl">'+t+'</span>'+
        '<button class="rm" onclick="qaRemoveSlot('+i+')" title="Hapus">×</button>'+
      '</div>';
    } else {
      sHtml += '<div class="qa-slot empty"><span class="lbl">Kosong</span></div>';
    }
  }
  slotsEl.innerHTML = sHtml;

  // render semua item
  allEl.innerHTML = ALL_QA.map(q=>{
    const active = slots.includes(q.title) ? ' active-slot' : '';
    return '<div class="qa-all-item'+active+'" onclick="qaToggleItem(\''+esc(q.title)+'\')">'+
      '<span class="ibox">'+qaIcon(q.title)+'</span>'+
      '<span>'+q.title+'</span>'+
    '</div>';
  }).join('');
}
function qaRemoveSlot(idx){
  const slots = getQaSlots();
  slots.splice(idx,1);
  saveQaSlots(slots);
  renderQaGrid();
  renderQaEditModal();
}
function qaToggleItem(title){
  let slots = getQaSlots();
  if(slots.includes(title)){
    slots = slots.filter(t=>t!==title);
  } else {
    if(slots.length>=8){ alert('Slot penuh (maks. 8). Hapus salah satu slot terlebih dahulu.'); return; }
    slots.push(title);
  }
  saveQaSlots(slots);
  renderQaGrid();
  renderQaEditModal();
}
function esc(s){ return String(s).replace(/'/g,"\\'"); }

function filterGrid(gridId, q){
  q = (q||'').toLowerCase().trim();
  document.querySelectorAll('#'+gridId+' .feat').forEach(el=>{
    const t = el.textContent.toLowerCase();
    el.style.display = (!q || t.indexOf(q)>=0) ? '' : 'none';
  });
}

/* =================== AI ASSISTANT =================== */
const AI_CHIPS = ['Hitung Azimuth','Cek Toleransi','Bantuan Volume','Konversi Koordinat'];
function renderChips(){
  document.getElementById('aiChips').innerHTML =
    AI_CHIPS.map(c=>'<button class="chip" onclick="aiChip(\''+esc(c)+'\')">'+c+'</button>').join('');
}
function aiChip(text){ document.getElementById('aiInput').value=text; aiSend(); }
function aiAppend(role, html){
  const wrap = document.getElementById('aiScroll');
  const av = '<div class="av">'+(role==='bot'
      ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a5 5 0 0 0-5 5v1a4 4 0 0 0-1 7.7V18a3 3 0 0 0 6 0 3 3 0 0 0 6 0v-2.3A4 4 0 0 0 17 8V7a5 5 0 0 0-5-5z"/></svg>'
      : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>')+'</div>';
  const el = document.createElement('div');
  el.className = 'msg '+(role==='bot'?'bot':'me');
  el.innerHTML = av + '<div class="bubble">'+html+'</div>';
  wrap.appendChild(el);
  wrap.scrollTop = wrap.scrollHeight;
  return el;
}
async function aiSend(){
  const inp = document.getElementById('aiInput');
  const text = inp.value.trim();
  if(!text) return;
  aiAppend('me', escapeHtml(text));
  inp.value='';
  const typing = aiAppend('bot','<i style="color:var(--muted)">Mengetik…</i>');
  try{
    const res = await fetch('/api/chat', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ message: text })
    });
    if(!res.ok) throw new Error('offline');
    const data = await res.json();
    typing.querySelector('.bubble').innerHTML = escapeHtml(data.reply || aiOffline(text));
  }catch(e){
    typing.querySelector('.bubble').innerHTML = escapeHtml(aiOffline(text));
  }
  document.getElementById('aiScroll').scrollTop = 9e9;
}
function aiOffline(text){
  // Template offline ringan bila API key tidak tersedia di Vercel
  return 'Mode offline aktif (belum ada API key di server). '+
    'Untuk "'+text+'", buka menu Calculator/Tools terkait untuk perhitungan akurat. '+
    'Aktifkan GEMINI_API_KEY atau GROQ_API_KEY di Vercel untuk jawaban AI online.';
}
function escapeHtml(s){ return String(s).replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

/* =================== ICONS (inline SVG, ringan) =================== */
function svg(p){return '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">'+p+'</svg>';}
function icoNodes(){return svg('<circle cx="6" cy="6" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="12" cy="18" r="2.5"/><path d="M7.7 7.7l3 8.6M16.3 7.7l-3 8.6"/>');}
function icoLayers(){return svg('<path d="M12 3l9 5-9 5-9-5 9-5z"/><path d="M3 13l9 5 9-5"/>');}
function icoMountain(){return svg('<path d="M3 19l6-9 4 5 3-4 5 8z"/>');}
function icoTrend(){return svg('<path d="M3 16l5-5 4 3 8-8"/><path d="M17 6h4v4"/>');}
function icoLevels(){return svg('<path d="M5 4v16M12 4v16M19 4v16"/><path d="M3 8h4M10 14h4M17 6h4"/>');}
function icoSwap(){return svg('<path d="M7 7h12l-3-3M17 17H5l3 3"/>');}
function icoCompass(){return svg('<circle cx="12" cy="12" r="9"/><path d="M15 9l-2 5-4 1 2-5 4-1z"/>');}
function icoUpDown(){return svg('<path d="M12 3v18M8 7l4-4 4 4M8 17l4 4 4-4"/>');}
function icoBars(){return svg('<path d="M6 5v14M12 9v10M18 7v12"/>');}
function icoCube(){return svg('<path d="M12 3l8 4v10l-8 4-8-4V7l8-4z"/><path d="M12 11l8-4M12 11v10M12 11L4 7"/>');}
function icoTools(){return svg('<path d="M14 7l3-3 4 4-3 3M10 11l-7 7v3h3l7-7"/>');}
function icoChartUp(){return svg('<path d="M4 20V4M4 20h16"/><path d="M8 15l3-4 3 2 4-6"/>');}
function icoDrone(){return svg('<circle cx="12" cy="12" r="2.5"/><path d="M12 9.5V6M9.5 12H6M14.5 12H18M12 14.5V18"/><circle cx="5" cy="5" r="2"/><circle cx="19" cy="5" r="2"/><circle cx="5" cy="19" r="2"/><circle cx="19" cy="19" r="2"/><path d="M6.5 6.5L10 10M17.5 6.5L14 10M6.5 17.5L10 14M17.5 17.5L14 14"/>');}
function icoMapping(){return svg('<path d="M9 3L3 6v15l6-3 6 3 6-3V3l-6 3z"/><path d="M9 3v15M15 6v15"/><circle cx="12" cy="10" r="1.5"/>');}
function icoMap(){return svg('<path d="M9 4L3 7v13l6-3 6 3 6-3V4l-6 3-6-3z"/><path d="M9 4v13M15 7v13"/>');}
function icoPhoto(){return svg('<rect x="2" y="5" width="20" height="15" rx="2"/><circle cx="12" cy="12" r="4"/><path d="M8 5l1-3h6l1 3"/>'); }
function icoBook(){return svg('<path d="M4 4h7a1 1 0 0 1 1 1v14a1 1 0 0 0-1-1H4z"/><path d="M20 4h-7a1 1 0 0 0-1 1v14a1 1 0 0 1 1-1h7z"/>');}
function icoExcavator(){return svg('<path d="M4 17h10l2-6H8z"/><rect x="2" y="17" width="14" height="3" rx="1"/><path d="M16 11l4-5"/><circle cx="5" cy="20" r="1"/><circle cx="13" cy="20" r="1"/>'); }
function icoHauler(){return svg('<rect x="1" y="10" width="15" height="8" rx="1"/><path d="M16 14h4l2 3v1h-6z"/><circle cx="5" cy="19" r="1.5"/><circle cx="13" cy="19" r="1.5"/><circle cx="20" cy="19" r="1.5"/>'); }
function icoBulldozer(){return svg('<rect x="2" y="9" width="13" height="8" rx="1"/><path d="M2 13H0M15 11h5v4l2 2H15z"/><circle cx="5" cy="18" r="1.5"/><circle cx="12" cy="18" r="1.5"/>'); }
function icoOre(){return svg('<path d="M12 3l8 5v8l-8 5-8-5V8z"/><path d="M12 8l4 2.5v5L12 18l-4-2.5v-5z"/>');}

/* =================== GNSS STATUS =================== */
let gnssLoaded = false;
function openGnssStatus(){
  stack.push({level:'gnss', tab:currentTab});
  activateView('view-gnss');
  setHeader('GNSS Status', 'Monitoring sinyal GPS');
  updateBackBtn();
  if(gnssLoaded) return;
  gnssLoaded = true;
  const iframe  = document.getElementById('gnssFrame');
  const overlay = document.getElementById('gnssOverlay');
  overlay.classList.add('show');
  iframe.onload  = ()=>overlay.classList.remove('show');
  iframe.onerror = ()=>{
    overlay.className='overlay show err';
    overlay.innerHTML='<div class="err-ico">!</div><p class="err-title">GNSS gagal dimuat</p><p>gnss-status.html tidak ditemukan.</p>';
  };
  iframe.src = 'gnss-status.html?embed=1';
}




/* =================== GPS REAL-TIME =================== */
let _gpsWatch = null;

function setGPSCard(status, cls, detail){
  const dot = document.getElementById('gpsDot');
  const val = document.getElementById('gpsVal');
  const acc = document.getElementById('gpsAcc');
  if(dot){ dot.className='dot '+cls; }
  if(val) val.textContent = status;
  if(acc) acc.textContent = detail || '';
}

function startGPS(){
  if(!navigator.geolocation){
    setGPSCard('NO GPS','dot-nofix','Tidak tersedia di perangkat'); return;
  }
  setGPSCard('Mendeteksi…','dot-wait','');
  const interval = parseInt(localStorage.getItem('survai_gps_interval')||'5000');
  if(_gpsWatch) navigator.geolocation.clearWatch(_gpsWatch);
  _gpsWatch = navigator.geolocation.watchPosition(
    pos => {
      const a = pos.coords.accuracy;
      if(a <= 3)       setGPSCard('FIX',   'dot dot-fix',   'Akurasi: '+a.toFixed(1)+' m');
      else if(a <= 15) setGPSCard('FLOAT', 'dot dot-float', 'Akurasi: '+a.toFixed(1)+' m');
      else if(a <= 80) setGPSCard('POOR',  'dot dot-poor',  'Akurasi: '+a.toFixed(0)+' m');
      else             setGPSCard('NO FIX','dot dot-nofix', 'Akurasi: '+a.toFixed(0)+' m');
    },
    err => {
      const m={1:'Akses GPS ditolak',2:'Sinyal tidak tersedia',3:'Timeout GPS'};
      setGPSCard('NO GPS','dot dot-nofix', m[err.code]||'GPS Error');
    },
    { enableHighAccuracy:true, timeout:25000, maximumAge: interval }
  );
}

function restartGPS(){
  if(_gpsWatch){ navigator.geolocation.clearWatch(_gpsWatch); _gpsWatch=null; }
  startGPS();
}

/* =================== CUACA LAPANGAN (GPS + Open-Meteo) =================== */
/* Open-Meteo: API cuaca gratis, TANPA API key. Pakai lokasi GPS pengguna.    */
let _weatherLast = 0;
function initWeather(){ fetchWeatherByGPS(); }

function refreshWeather(){
  // throttle: minimal 30 detik antar refresh manual
  if(Date.now() - _weatherLast < 30000){ return; }
  fetchWeatherByGPS();
}

function fetchWeatherByGPS(){
  setWeatherCard('Memuat…','dot-wait','Mencari lokasi…','cloud');
  if(!navigator.geolocation){
    setWeatherCard('Tidak tersedia','dot-nofix','GPS tidak didukung','cloud'); return;
  }
  navigator.geolocation.getCurrentPosition(
    pos => loadWeather(pos.coords.latitude, pos.coords.longitude),
    ()  => setWeatherCard('Lokasi off','dot-nofix','Izinkan GPS untuk cuaca','cloud'),
    { enableHighAccuracy:false, timeout:15000, maximumAge:600000 }
  );
}

async function loadWeather(lat, lon){
  _weatherLast = Date.now();
  setWeatherCard('Memuat…','dot-wait','Mengambil data cuaca…','cloud');
  try{
    const url = 'https://api.open-meteo.com/v1/forecast'
      + '?latitude='+lat.toFixed(3)+'&longitude='+lon.toFixed(3)
      + '&current=temperature_2m,relative_humidity_2m,precipitation,rain,'
      + 'weather_code,wind_speed_10m,wind_gusts_10m,wind_direction_10m'
      + '&wind_speed_unit=ms&timezone=auto';
    const res = await fetch(url, {cache:'no-store'});
    if(!res.ok) throw new Error('HTTP '+res.status);
    const d = await res.json();
    renderWeather(d.current);
  }catch(e){
    setWeatherCard('Offline','dot-nofix','Cuaca perlu internet','cloud');
  }
}

function renderWeather(c){
  if(!c){ setWeatherCard('—','dot-nofix','Data kosong','cloud'); return; }
  const wind  = c.wind_speed_10m;          // m/s
  const gust  = c.wind_gusts_10m;          // m/s — indikator turbulensi
  const rain  = c.precipitation;           // mm
  const temp  = c.temperature_2m;          // °C
  const hum   = c.relative_humidity_2m;    // %
  const code  = c.weather_code;

  // Penilaian untuk antisipasi kerja lapangan / drone:
  // Turbulensi: selisih gust vs wind tinggi = udara bergolak
  const turbul = (gust - wind);
  let status, cls, icon;

  if(rain >= 0.5){
    status='HUJAN'; cls='dot-nofix'; icon='rain';
  } else if(wind > 8 || gust > 10){
    status='ANGIN KENCANG'; cls='dot-nofix'; icon='wind';
  } else if(wind > 4.5 || gust > 7 || turbul > 4){
    status='BERANGIN'; cls='dot-float'; icon='wind';
  } else if(code >= 95){
    status='BADAI'; cls='dot-nofix'; icon='storm';
  } else if(code >= 51 && code <= 67){
    status='GERIMIS'; cls='dot-poor'; icon='rain';
  } else {
    status='CERAH'; cls='dot-fix'; icon='sun';
  }

  const detail = Math.round(temp)+'°C · Angin '+wind.toFixed(1)+' m/s'
    + (gust>wind+2 ? ' · Hembus '+gust.toFixed(0) : '');
  setWeatherCard(status, cls, detail, icon);
}

function setWeatherCard(status, cls, detail, icon){
  const ds=document.getElementById('weatherDot');
  const st=document.getElementById('weatherStatus');
  const dt=document.getElementById('weatherDetail');
  const ic=document.getElementById('weatherIcon');
  if(ds) ds.className='dot '+cls;
  if(st) st.textContent=status;
  if(dt) dt.textContent=detail||'';
  if(ic) ic.innerHTML=weatherSvg(icon);
}

function weatherSvg(kind){
  const w='width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
  if(kind==='sun')   return '<svg '+w+'><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19"/></svg>';
  if(kind==='rain')  return '<svg '+w+'><path d="M17.5 17a4.5 4.5 0 0 0 0-9 6 6 0 0 0-11.6-1.5A4 4 0 0 0 6 17z"/><path d="M8 19v2M12 19v2M16 19v2"/></svg>';
  if(kind==='wind')  return '<svg '+w+'><path d="M3 8h11a3 3 0 1 0-3-3M3 16h15a3 3 0 1 1-3 3M3 12h8"/></svg>';
  if(kind==='storm') return '<svg '+w+'><path d="M17.5 16a4.5 4.5 0 0 0 0-9 6 6 0 0 0-11.6-1.5A4 4 0 0 0 6 16z"/><path d="M12 13l-2 4h3l-2 4"/></svg>';
  return '<svg '+w+'><path d="M17.5 19a4.5 4.5 0 0 0 0-9 6 6 0 0 0-11.6-1.5A4 4 0 0 0 6 19z"/></svg>'; // cloud
}

/* =================== AUTH / LOGIN =================== */
const AUTH_KEY='survai_user'; const USERS_KEY='survai_users';
let _lsEmail='', _lsStep='choose';

function getUser(){ try{return JSON.parse(localStorage.getItem(AUTH_KEY));}catch(e){return null;} }
function saveUser(u){ localStorage.setItem(AUTH_KEY, JSON.stringify(u)); }
function clearUser(){ localStorage.removeItem(AUTH_KEY); }
function getUsers(){ try{return JSON.parse(localStorage.getItem(USERS_KEY))||{};}catch(e){return {};} }
function saveUsers(us){ try{localStorage.setItem(USERS_KEY,JSON.stringify(us));}catch(e){} }

function checkAuth(){
  const u=getUser();
  if(u){ hideLoginScreen(); }
  else  { showLoginScreen(); }
  updateProfileAvatar();
}
function showLoginScreen(){
  document.getElementById('loginScreen').classList.remove('ls-hidden');
  lsGoStep('choose');
}
function hideLoginScreen(){
  document.getElementById('loginScreen').classList.add('ls-hidden');
}
function lsSkip(){
  saveUser({name:'Tamu',email:'',guest:true});
  hideLoginScreen(); updateProfileAvatar();
}
function lsGoStep(step){
  _lsStep=step;
  document.querySelectorAll('.ls-step').forEach(el=>el.classList.remove('active'));
  const el=document.getElementById('ls-'+step);
  if(el) el.classList.add('active');
}
function lsCheckEmail(){
  const email=(document.getElementById('ls-email-input').value||'').trim().toLowerCase();
  const msg=document.getElementById('ls-msg-email');
  if(!email||!email.includes('@')){ msg.textContent='Masukkan email yang valid.'; return; }
  _lsEmail=email;
  const users=getUsers();
  if(users[email]){
    // terdaftar → minta password
    document.getElementById('ls-pw-sub').textContent='Halo '+users[email].name+'! Masukkan password Anda.';
    document.getElementById('ls-pw-input').value='';
    lsGoStep('password');
  } else {
    // baru → daftar
    document.getElementById('ls-name-input').value='';
    document.getElementById('ls-newpw-input').value='';
    lsGoStep('setpw');
  }
}
function lsDoLogin(){
  const pw=(document.getElementById('ls-pw-input').value||'');
  const msg=document.getElementById('ls-msg-pw');
  const users=getUsers();
  if(!users[_lsEmail]){ msg.textContent='Akun tidak ditemukan.'; return; }
  if(users[_lsEmail].pw!==btoa(pw)){ msg.textContent='Password salah.'; return; }
  const u=users[_lsEmail];
  saveUser({name:u.name,email:_lsEmail});
  hideLoginScreen(); updateProfileAvatar();
}
function lsDoRegister(){
  const name=(document.getElementById('ls-name-input').value||'').trim();
  const pw=(document.getElementById('ls-newpw-input').value||'');
  const msg=document.getElementById('ls-msg-setpw');
  if(!name){ msg.textContent='Nama tidak boleh kosong.'; return; }
  if(pw.length<6){ msg.textContent='Password minimal 6 karakter.'; return; }
  const users=getUsers();
  users[_lsEmail]={name,pw:btoa(pw)};
  saveUsers(users);
  saveUser({name,email:_lsEmail});
  hideLoginScreen(); updateProfileAvatar();
}
function lsGoogleLogin(){
  // Google Sign-In: memerlukan konfigurasi Google OAuth Client ID
  // Untuk sekarang, tampilkan pesan panduan
  alert('Google Sign-In belum dikonfigurasi.\nGunakan tombol "Masuk dengan Email" atau "Lewati sebagai Tamu".\n\nUntuk mengaktifkan Google Sign-In, tambahkan Google OAuth Client ID di konfigurasi aplikasi.');
}

/* =================== PROFILE PANEL =================== */
let _ppSection = 'main'; // 'main' | 'feedback' | 'about'

function openPP(){
  _ppSection='main';
  renderPP();
  document.getElementById('ppPanel').classList.add('open');
  document.getElementById('ppOverlay').classList.add('open');
}
function closePP(){
  document.getElementById('ppPanel').classList.remove('open');
  document.getElementById('ppOverlay').classList.remove('open');
}
function renderPP(){
  const u=getUser(); const isGuest=!u||u.guest;
  const unit=localStorage.getItem('survai_unit')||'metric';
  const gpsInt=localStorage.getItem('survai_gps_interval')||'5000';
  // HEAD
  const head=document.getElementById('ppHead');
  if(u){
    head.innerHTML='<div class="pp-av '+(isGuest?'guest':'')+'">'+(isGuest?
      '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 20a8 8 0 0 1 16 0"/></svg>'
      :escapeHtml(u.name.charAt(0).toUpperCase())
    )+'</div>'+
    '<div class="pp-head-info"><div class="pp-name">'+escapeHtml(u.name)+'</div>'+
    '<div class="pp-email">'+(isGuest?'Mode Tamu — belum masuk':escapeHtml(u.email||''))+'</div></div>';
  }else{
    head.innerHTML='<div class="pp-av guest"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 20a8 8 0 0 1 16 0"/></svg></div><div class="pp-head-info"><div class="pp-name">Tamu</div><div class="pp-email">Belum masuk</div></div>';
  }
  // BODY
  const body=document.getElementById('ppBody');
  if(_ppSection==='feedback'){
    body.innerHTML='<div class="pp-section"><button class="ls-back-link" onclick="ppGoMain()"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M15 18l-6-6 6-6" stroke-linecap="round"/></svg> Kembali</button><div class="pp-section-title">Kirim Feedback</div></div><div class="pp-fb"><textarea id="ppFbText" placeholder="Tulis saran, keluhan, atau pertanyaan Anda di sini..."></textarea><div class="pp-fb-btns"><button class="cancel" onclick="ppGoMain()">Batal</button><button class="send" onclick="ppSendFeedback()">Kirim Feedback</button></div></div>';
    return;
  }
  if(_ppSection==='about'){
    body.innerHTML='<div class="pp-section"><button class="ls-back-link" onclick="ppGoMain()"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M15 18l-6-6 6-6" stroke-linecap="round"/></svg> Kembali</button><div class="pp-section-title">Tentang Aplikasi</div></div><div class="pp-about"><span class="badge">SurvAI v1.0.0</span><p style="margin-top:14px">Tukang Ngukur / SurvAI adalah aplikasi survey profesional berbasis PWA, dirancang untuk kebutuhan lapangan surveyor tambang dan konstruksi.</p><p>Fitur: Kalkulator survey, Tools lapangan, Peta GPS, AI Assistant, dan Produktivitas alat tambang.</p><p style="font-size:12px;color:var(--muted)">© 2025 SurvAI. Seluruh formula dan algoritma berdasarkan standar teknis survey Indonesia.</p></div>';
    return;
  }
  // MAIN
  body.innerHTML=
  '<div class="pp-section"><div class="pp-section-title">Pengaturan GPS</div></div>'+
  '<div class="pp-row"><div class="ic"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke-linecap="round"/><circle cx="12" cy="12" r="5"/></svg></div><div class="info"><div class="lbl">Interval GPS</div><div class="sub">Frekuensi pembaruan posisi</div></div><div class="ctrl"><select class="pp-select" id="ppGpsInt" onchange="ppSetGpsInterval(this.value)"><option value="1000" '+(gpsInt==='1000'?'selected':'')+'>1 detik</option><option value="3000" '+(gpsInt==='3000'?'selected':'')+'>3 detik</option><option value="5000" '+(gpsInt==='5000'?'selected':'')+'>5 detik</option><option value="10000" '+(gpsInt==='10000'?'selected':'')+'>10 detik</option><option value="30000" '+(gpsInt==='30000'?'selected':'')+'>30 detik</option></select></div></div>'+
  '<div class="pp-divider"></div>'+
  '<div class="pp-section"><div class="pp-section-title">Satuan</div></div>'+
  '<div class="pp-row"><div class="ic"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/></svg></div><div class="info"><div class="lbl">Satuan Unit</div><div class="sub">Sistem pengukuran</div></div><div class="ctrl"><div class="pp-toggle"><button class="'+(unit==='metric'?'on':'')+'" data-unit="metric" onclick="ppSetUnit(this.dataset.unit,this)">Metrik</button><button class="'+(unit==='imperial'?'on':'')+'" data-unit="imperial" onclick="ppSetUnit(this.dataset.unit,this)">Imperial</button></div></div></div>'+
  '<div class="pp-divider"></div>'+
  '<button class="pp-row" onclick="ppGoFeedback()"><div class="ic"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></div><div class="info"><div class="lbl">Kirim Feedback</div><div class="sub">Saran dan masukan Anda</div></div><div class="ctrl"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 6l6 6-6 6" stroke-linecap="round"/></svg></div></button>'+
  '<button class="pp-row" onclick="ppGoAbout()"><div class="ic"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg></div><div class="info"><div class="lbl">Tentang SurvAI</div><div class="sub">Versi aplikasi & informasi</div></div><div class="ctrl"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 6l6 6-6 6" stroke-linecap="round"/></svg></div></button>'+
  '<div class="pp-divider"></div>'+
  '<div class="pp-footer"><button class="pp-logout" onclick="ppLogout()">'+(isGuest?'Masuk / Daftar Akun':'Keluar dari Akun')+'</button></div>';
}
function ppSetGpsInterval(val){
  localStorage.setItem('survai_gps_interval', val);
  restartGPS(); // tanpa notifikasi
}
function ppSetUnit(unit, btn){
  localStorage.setItem('survai_unit', unit);
  btn.parentElement.querySelectorAll('button').forEach(b=>b.classList.remove('on'));
  btn.classList.add('on');
}
function ppSendFeedback(){
  const txt=(document.getElementById('ppFbText').value||'').trim();
  if(!txt){ return; }
  // feedback disimpan lokal, siap untuk dikirim ke endpoint
  const feedbacks=JSON.parse(localStorage.getItem('survai_feedbacks')||'[]');
  feedbacks.push({ts:Date.now(),text:txt,user:(getUser()||{}).email||'tamu'});
  try{ localStorage.setItem('survai_feedbacks',JSON.stringify(feedbacks)); }catch(e){}
  document.getElementById('ppFbText').value='';
  document.getElementById('ppBody').innerHTML='<div style="padding:40px 24px;text-align:center"><div style="font-size:48px;margin-bottom:16px">✅</div><div style="font-family:var(--serif);font-weight:800;font-size:20px;margin-bottom:8px">Terima kasih!</div><p style="color:var(--muted);font-size:14px">Feedback Anda telah diterima dan akan diproses.</p><button onclick="ppGoMain()" style="margin-top:20px;background:var(--blue);color:#fff;border:0;border-radius:12px;padding:12px 24px;font-size:14px;font-weight:700;cursor:pointer">Kembali</button></div>';
}
function ppLogout(){
  const u=getUser();
  if(!u||u.guest){ closePP(); showLoginScreen(); return; }
  clearUser(); updateProfileAvatar(); closePP(); showLoginScreen();
}

/* =================== PROFILE AVATAR (update) =================== */
function updateProfileAvatar(){
  const u=getUser(); const av=document.getElementById('profileAvatar');
  if(!av) return;
  if(u && !u.guest){
    av.className='profile-avatar logged-in';
    av.textContent=u.name.charAt(0).toUpperCase();
  } else {
    av.className='profile-avatar';
    av.innerHTML='<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20a8 8 0 0 1 16 0"/></svg>';
  }
}

/* =================== OVERRIDE toggleProfile → openPP =================== */
function toggleProfile(){ openPP(); }
function closeProfile(){ closePP(); }
function doLogout(){ ppLogout(); }


/* safeRun — shell-level fallback */
window.safeRun = window.safeRun || function(fn,id){
  try{ typeof fn==='function'?fn():window[fn]&&window[fn](); }
  catch(e){ console.error(e); }
};


/* PP navigation helpers */
function ppGoMain(){    _ppSection='main';     renderPP(); }
function ppGoFeedback(){ _ppSection='feedback'; renderPP(); }
function ppGoAbout(){   _ppSection='about';    renderPP(); }

/* =================== INIT =================== */
renderGrid();
renderChips();
checkAuth();  // auth check sebelum switchTab
switchTab('home');
startGPS();   // mulai GPS real-time
initWeather(); // cuaca lapangan (GPS + Open-Meteo)

/* =================== SERVICE WORKER =================== */
if('serviceWorker' in navigator){
  window.addEventListener('load', ()=>{
    navigator.serviceWorker.register('service-worker.js').catch(e=>console.warn('SW gagal:',e));
  });
}


