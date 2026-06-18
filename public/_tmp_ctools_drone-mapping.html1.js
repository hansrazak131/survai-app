/* ===================== DRONE MAPPING UI ===================== */
const DM_STEPS=['Area & Drone','Sensor & Target','Parameter','Cuaca','Hasil'];
let dmCur=0, dmMode='RGB', dmCommodity='Sawit', dmIs3D=false;
let map, aoiLayer, drawLayer, flightLayer, drawMode=null, drawPts=[], aoiData=null, aoiType=null;
let baseLayers={}, curBase='sat';

function $(id){return document.getElementById(id);}
function dmNum(id){const v=parseFloat(($(id)||{}).value);return isNaN(v)?0:v;}

/* ---- Basemaps (gratis tanpa key + slot Google bila key ada) ---- */
const GOOGLE_KEY = (window.SURVAI_GOOGLE_KEY||'').trim(); // isi via window.SURVAI_GOOGLE_KEY bila punya
function initMap(){
  map = L.map('map',{zoomControl:false,attributionControl:true}).setView([-6.12,106.15],13);

  baseLayers.sat = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    {maxZoom:19, attribution:'Esri Satellite'});
  baseLayers.osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    {maxZoom:19, attribution:'© OpenStreetMap'});
  baseLayers.topo = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    {maxZoom:17, attribution:'© OpenTopoMap'});

  // Google (hanya jika key tersedia)
  if(GOOGLE_KEY){
    baseLayers.gsat = L.tileLayer('https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}&key='+GOOGLE_KEY,{maxZoom:21,attribution:'Google Satellite'});
    baseLayers.ghyb = L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}&key='+GOOGLE_KEY,{maxZoom:21,attribution:'Google Hybrid'});
    baseLayers.groad = L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&key='+GOOGLE_KEY,{maxZoom:21,attribution:'Google Roadmap'});
    baseLayers.gterr = L.tileLayer('https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}&key='+GOOGLE_KEY,{maxZoom:21,attribution:'Google Terrain'});
    curBase='gsat';
  }
  baseLayers[curBase].addTo(map);

  aoiLayer = L.layerGroup().addTo(map);
  drawLayer = L.layerGroup().addTo(map);
  flightLayer = L.layerGroup().addTo(map);

  map.on('click', onMapClick);
  renderBasemapChips();
  renderDrawToolbar();

  // coba center ke lokasi GPS
  if(navigator.geolocation){
    navigator.geolocation.getCurrentPosition(p=>map.setView([p.coords.latitude,p.coords.longitude],15),()=>{},{timeout:8000});
  }
}

function renderBasemapChips(){
  const opts = GOOGLE_KEY
    ? [['gsat','Google Sat'],['ghyb','Google Hybrid'],['groad','Roadmap'],['gterr','Terrain'],['sat','Esri Sat'],['osm','OSM'],['topo','Topo']]
    : [['sat','Satelit'],['osm','Jalan'],['topo','Topografi']];
  $('basemapChips').innerHTML = opts.map(([k,l])=>
    '<button class="bm-chip'+(k===curBase?' active':'')+'" onclick="setBasemap(\''+k+'\')">'+l+'</button>').join('');
}
function setBasemap(k){
  if(!baseLayers[k]) return;
  if(baseLayers[curBase]) map.removeLayer(baseLayers[curBase]);
  curBase=k; baseLayers[k].addTo(map);
  renderBasemapChips();
}

function renderDrawToolbar(){
  $('drawToolbar').innerHTML =
    '<button class="draw-btn" id="db-poly" onclick="startDraw(\'polygon\')">▱ AOI</button>'+
    '<button class="draw-btn" id="db-line" onclick="startDraw(\'line\')">⟋ Corridor</button>'+
    '<button class="draw-btn" id="db-wp" onclick="startDraw(\'waypoint\')">⦿ Waypoint</button>'+
    '<button class="draw-btn" onclick="clearDraw()">✕ Hapus</button>'+
    '<button class="draw-btn" id="db-done" onclick="finishDraw()">✓ Selesai</button>';
}

function startDraw(mode){
  drawMode=mode; drawPts=[];
  drawLayer.clearLayers();
  document.querySelectorAll('.draw-btn').forEach(b=>b.classList.remove('on'));
  const id = mode==='polygon'?'db-poly':mode==='line'?'db-line':'db-wp';
  if($(id)) $(id).classList.add('on');
  $('mapInfo').textContent = mode==='polygon'?'Tap titik-titik AOI, lalu ✓ Selesai'
    : mode==='line'?'Tap titik centerline corridor, lalu ✓ Selesai'
    : 'Tap untuk menaruh waypoint, lalu ✓ Selesai';
}
function onMapClick(e){
  if(!drawMode) return;
  drawPts.push([e.latlng.lat,e.latlng.lng]);
  redrawTemp();
}
function redrawTemp(){
  drawLayer.clearLayers();
  drawPts.forEach((p,i)=>{
    L.circleMarker(p,{radius:6,color:'#14b8a6',fillColor:'#14b8a6',fillOpacity:1,weight:2}).addTo(drawLayer);
    if(drawMode==='waypoint') L.marker(p).bindTooltip(''+(i+1),{permanent:true,direction:'top'}).addTo(drawLayer);
  });
  if(drawMode==='polygon' && drawPts.length>=2)
    L.polygon(drawPts,{color:'#2563eb',weight:2,fillOpacity:.12}).addTo(drawLayer);
  if(drawMode==='line' && drawPts.length>=2)
    L.polyline(drawPts,{color:'#eab308',weight:3}).addTo(drawLayer);
}
function finishDraw(){
  if(drawPts.length<1){ $('mapInfo').textContent='Belum ada titik digambar.'; return; }
  aoiType = drawMode;
  aoiData = drawPts.slice();
  drawMode=null;
  document.querySelectorAll('.draw-btn').forEach(b=>b.classList.remove('on'));
  renderAOI();
}
function clearDraw(){
  drawPts=[]; aoiData=null; aoiType=null; drawMode=null;
  drawLayer.clearLayers(); aoiLayer.clearLayers(); flightLayer.clearLayers();
  document.querySelectorAll('.draw-btn').forEach(b=>b.classList.remove('on'));
  $('mapInfo').textContent='Gambar AOI atau import KML/GeoJSON';
}
function renderAOI(){
  aoiLayer.clearLayers(); drawLayer.clearLayers(); flightLayer.clearLayers();
  if(!aoiData) return;
  if(aoiType==='polygon'){
    const poly=L.polygon(aoiData,{color:'#2563eb',weight:2.5,fillOpacity:.1}).addTo(aoiLayer);
    map.fitBounds(poly.getBounds(),{padding:[30,30]});
    const a=polygonAreaHa(aoiData);
    const d=bboxDims(aoiData);
    $('mapInfo').textContent='AOI: '+a.toFixed(2)+' ha · '+d.w.toFixed(0)+'×'+d.h.toFixed(0)+' m';
  } else if(aoiType==='line'){
    const ln=L.polyline(aoiData,{color:'#eab308',weight:3.5}).addTo(aoiLayer);
    map.fitBounds(ln.getBounds(),{padding:[30,30]});
    const len=lineLengthM(aoiData);
    $('mapInfo').textContent='Corridor: '+len.toFixed(0)+' m';
  } else {
    aoiData.forEach((p,i)=>{
      L.marker(p).bindTooltip(''+(i+1),{permanent:true,direction:'top'}).addTo(aoiLayer);
    });
    if(aoiData.length>1) L.polyline(aoiData,{color:'#2563eb',weight:2,dashArray:'5,5'}).addTo(aoiLayer);
    $('mapInfo').textContent=aoiData.length+' waypoint';
  }
}

/* ---- Flight line preview di peta ---- */
function drawFlightLines(m){
  flightLayer.clearLayers();
  if(aoiType!=='polygon' || !aoiData) return;
  const lats=aoiData.map(p=>p[0]), lons=aoiData.map(p=>p[1]);
  const latMin=Math.min(...lats),latMax=Math.max(...lats),lonMin=Math.min(...lons),lonMax=Math.max(...lons);
  const n=Math.min(m.lineCount, 40); // batasi gambar agar ringan
  for(let i=0;i<=n;i++){
    const lat = latMin + (latMax-latMin)*i/n;
    L.polyline([[lat,lonMin],[lat,lonMax]],{color:'#3b82f6',weight:1.6,opacity:.8}).addTo(flightLayer);
  }
  // waypoint angka di ujung-ujung
  let wp=1;
  for(let i=0;i<=n && wp<=8;i++){
    if(i%Math.ceil(n/4)===0){
      const lat=latMin+(latMax-latMin)*i/n;
      L.circleMarker([lat, i%2?lonMin:lonMax],{radius:9,color:'#1d4ed8',fillColor:'#2563eb',fillOpacity:1,weight:2})
        .bindTooltip(''+(wp++),{permanent:true,direction:'center',className:'wp-lbl'}).addTo(flightLayer);
    }
  }
}

/* ---- Toggle 3D (fallback: tilt via CSS perspective pada container) ---- */
function toggle3D(){
  dmIs3D=!dmIs3D;
  $('fab3d').textContent = dmIs3D?'2D':'3D';
  $('fab3d').classList.toggle('on',dmIs3D);
  const mapEl=$('map');
  if(dmIs3D){
    // fallback oblique preview: perspektif ringan (Google Photoreal butuh key+SDK)
    mapEl.style.transform='perspective(1200px) rotateX(38deg)';
    mapEl.style.transformOrigin='center 70%';
    $('mapInfo').textContent = GOOGLE_KEY?'Mode 3D (oblique preview)':'Mode 3D oblique (fallback — Google 3D perlu API key)';
  } else {
    mapEl.style.transform='none';
  }
  setTimeout(()=>map.invalidateSize(),300);
}
function zoomMap(d){ map.setZoom(map.getZoom()+d); }
function fitAOI(){ if(aoiData&&aoiData.length){ aoiType==='polygon'?map.fitBounds(L.polygon(aoiData).getBounds(),{padding:[30,30]}):map.fitBounds(L.polyline(aoiData).getBounds(),{padding:[30,30]}); } }
function toggleFullscreen(){
  const w=$('mapWrap');
  if(!document.fullscreenElement){ (w.requestFullscreen||w.webkitRequestFullscreen||function(){}).call(w); }
  else { (document.exitFullscreen||document.webkitExitFullscreen||function(){}).call(document); }
  setTimeout(()=>map.invalidateSize(),400);
}

/* ---- Import KML / KMZ / GeoJSON ---- */
function importAOI(ev){
  const file=ev.target.files[0]; if(!file) return;
  const name=file.name.toLowerCase();
  if(name.endsWith('.kmz')){
    $('mapInfo').textContent='KMZ perlu di-unzip dulu. Gunakan KML/GeoJSON, atau ekstrak KMZ→KML.';
    // KMZ = zip; tanpa lib unzip, minta user ekstrak. (hindari library berat)
    return;
  }
  const reader=new FileReader();
  reader.onload=e=>{
    try{
      const txt=e.target.result;
      let coords=null, type='polygon';
      if(name.endsWith('.geojson')||name.endsWith('.json')){
        const gj=JSON.parse(txt);
        const g=findFirstGeom(gj);
        if(g){ const r=geomToLatlng(g); coords=r.coords; type=r.type; }
      } else { // KML
        const r=parseKML(txt); coords=r.coords; type=r.type;
      }
      if(coords&&coords.length){ aoiData=coords; aoiType=type; renderAOI(); }
      else $('mapInfo').textContent='Tidak menemukan geometri di file.';
    }catch(err){ console.error(err); $('mapInfo').textContent='Gagal baca file: '+err.message; }
  };
  reader.readAsText(file);
}
function findFirstGeom(gj){
  if(gj.type==='FeatureCollection') return gj.features.length?gj.features[0].geometry:null;
  if(gj.type==='Feature') return gj.geometry;
  if(gj.coordinates) return gj;
  return null;
}
function geomToLatlng(g){
  if(g.type==='Polygon') return {coords:g.coordinates[0].map(c=>[c[1],c[0]]),type:'polygon'};
  if(g.type==='LineString') return {coords:g.coordinates.map(c=>[c[1],c[0]]),type:'line'};
  if(g.type==='Point') return {coords:[[g.coordinates[1],g.coordinates[0]]],type:'waypoint'};
  if(g.type==='MultiPolygon') return {coords:g.coordinates[0][0].map(c=>[c[1],c[0]]),type:'polygon'};
  return {coords:[],type:'polygon'};
}
function parseKML(txt){
  const doc=new DOMParser().parseFromString(txt,'text/xml');
  // Polygon
  let node=doc.querySelector('Polygon coordinates')||doc.querySelector('LineString coordinates')||doc.querySelector('Point coordinates');
  let type = doc.querySelector('Polygon')?'polygon':doc.querySelector('LineString')?'line':'waypoint';
  if(!node) return {coords:[],type:'polygon'};
  const coords=node.textContent.trim().split(/\s+/).map(pair=>{
    const [lon,lat]=pair.split(',').map(parseFloat); return [lat,lon];
  }).filter(c=>!isNaN(c[0])&&!isNaN(c[1]));
  return {coords,type};
}

/* ===================== UI INIT ===================== */
function dmRenderStepper(){
  $('stepper').innerHTML=DM_STEPS.map((l,i)=>
    '<div class="step-pill '+(i===dmCur?'active':i<dmCur?'done':'')+'" onclick="dmStep('+i+')">'+(i+1)+'. '+l+'</div>').join('');
}
function dmStep(n){
  if(n<0||n>4)return; dmCur=n;
  document.querySelectorAll('.section-screen').forEach((s,i)=>s.classList.toggle('active',i===n));
  dmRenderStepper();
  window.scrollTo({top:0,behavior:'auto'});
  setTimeout(()=>{ if(map) map.invalidateSize(); },200);
}
function dmInitDropdowns(){
  $('dmDrone').innerHTML=DM_DRONES.map(d=>'<option value="'+d.id+'">'+d.label+(d.conf==='manual'?' ⚠':'')+'</option>').join('');
  $('missionType').innerHTML=DM_MISSIONS.map(m=>'<option value="'+m+'">'+m+'</option>').join('');
  $('target').innerHTML=DM_TARGETS.map(t=>'<option value="'+t+'">'+t+'</option>').join('');
  $('modeChips').innerHTML=DM_MODES.map(m=>'<button class="chip'+(m===dmMode?' on':'')+'" onclick="selectMode(\''+m+'\')">'+m+'</button>').join('');
  $('dmCommodityChips').innerHTML=DM_COMMODITIES.map(c=>'<button class="chip'+(c===dmCommodity?' on':'')+'" onclick="selectDmCommodity(\''+c+'\')">'+c+'</button>').join('');
  onDmDroneChange(); onTargetChange();
}
function selectMode(m){ dmMode=m; document.querySelectorAll('#modeChips .chip').forEach(b=>b.classList.toggle('on',b.textContent===m)); onTargetChange(); }
function selectDmCommodity(c){ dmCommodity=c; document.querySelectorAll('#dmCommodityChips .chip').forEach(b=>b.classList.toggle('on',b.textContent===c)); }
function onDmDroneChange(){
  const d=DM_DRONES.find(x=>x.id===$('dmDrone').value);
  if(!d)return;
  // isi field sensor
  $('sw').value=d.sw||''; $('sh').value=d.sh||''; $('fl').value=d.fl||'';
  $('iw').value=d.iw||''; $('ih').value=d.ih||''; $('usableBatt').value=d.batt||'';
  const hint=$('dmDroneHint');
  if(d.conf==='manual'){ hint.innerHTML='⚠ Spesifikasi belum lengkap. Isi sensor width/height, focal, image pixel & baterai secara manual.'; hint.style.color='#b45309'; }
  else { hint.textContent='Sensor '+(d.sw||'?')+'×'+(d.sh||'?')+'mm · f'+(d.fl||'?')+'mm · '+(d.iw||'?')+'×'+(d.ih||'?')+'px · baterai '+(d.batt||'?')+'min (confidence: '+d.conf+')'; hint.style.color='var(--muted)'; }
}
function onMissionChange(){}
function onTargetChange(){
  const isAgri = dmMode==='Multispectral' || /Agriculture|Vegetation|Plantation/.test($('target').value);
  $('commodityField').classList.toggle('hidden',!isAgri);
}

/* ---- Auto-fill weather (Open-Meteo, gratis) ---- */
function dmAutofillWeather(){
  if(!navigator.geolocation){ alert('GPS tidak tersedia'); return; }
  navigator.geolocation.getCurrentPosition(async pos=>{
    try{
      const url='https://api.open-meteo.com/v1/forecast?latitude='+pos.coords.latitude.toFixed(3)+
        '&longitude='+pos.coords.longitude.toFixed(3)+
        '&current=temperature_2m,relative_humidity_2m,precipitation,cloud_cover,wind_speed_10m,wind_gusts_10m'+
        '&wind_speed_unit=ms&timezone=auto';
      const r=await fetch(url,{cache:'no-store'}); const c=(await r.json()).current;
      $('wind').value=c.wind_speed_10m.toFixed(1); $('gust').value=c.wind_gusts_10m.toFixed(1);
      $('temp').value=Math.round(c.temperature_2m); $('humidity').value=Math.round(c.relative_humidity_2m);
      $('cloud').value=Math.round(c.cloud_cover); $('rain').value=c.precipitation>=0.5?'now':'none';
      alert('Cuaca lokasi terisi otomatis.');
    }catch(e){ alert('Gagal ambil cuaca: perlu internet.'); }
  },()=>alert('Izinkan lokasi untuk isi cuaca.'),{timeout:15000});
}

/* ===================== COMPUTE ALL ===================== */
function computeAll(){
  try{
    const drone={ sw:dmNum('sw'),sh:dmNum('sh'),fl:dmNum('fl'),iw:dmNum('iw'),ih:dmNum('ih'),
      batt:dmNum('usableBatt'), lidar:dmMode==='LiDAR',
      pps:(DM_DRONES.find(x=>x.id===$('dmDrone').value)||{}).pps,
      swath:(DM_DRONES.find(x=>x.id===$('dmDrone').value)||{}).swath };

    if(dmMode!=='LiDAR' && (drone.sw<=0||drone.fl<=0||drone.iw<=0)){
      alert('Spesifikasi sensor belum lengkap. Isi di langkah Sensor (drone custom).'); dmStep(1); return;
    }

    // AOI dims
    let area=0, aoiW=0, aoiH=0, lineLen=0;
    if(aoiType==='polygon' && aoiData){
      area=polygonAreaHa(aoiData); const d=bboxDims(aoiData); aoiW=d.w; aoiH=d.h; lineLen=d.h;
    } else if(aoiType==='line' && aoiData){
      lineLen=lineLengthM(aoiData); aoiW=dmNum('corridorW')||50; aoiH=lineLen;
    } else {
      // tanpa AOI: pakai default area kecil supaya tetap hitung parameter
      area=10; aoiW=300; aoiH=300; lineLen=300;
    }

    // Overlap auto sesuai mode/mission
    let front=dmNum('frontOv'), side=dmNum('sideOv');
    if(!front||!side){
      const m=$('missionType').value;
      if(dmMode==='Multispectral'){ front=front||85; side=side||80; }
      else if(m==='Oblique'||/3D Model/.test($('target').value)){ front=front||85; side=side||75; }
      else if(dmMode==='LiDAR'){ front=front||60; side=side||50; }
      else { front=front||80; side=side||70; }
    }

    const params={
      drone, mode:dmMode, mission:$('missionType').value, target:$('target').value,
      area, aoiW, aoiH, lineLen,
      targetGSD:dmNum('targetGSD'), altitude:dmNum('altitude'),
      speed:dmNum('speed')||5, frontOv:front, sideOv:side,
      safety:dmNum('safety')||1.2, usableBatt:dmNum('usableBatt')||drone.batt,
      terrainFollow:$('terrainFollow').value==='on',
    };
    const m=computeMission(params);
    const lod=lodScore(params,m);
    const ovq=overlapQuality(front,side);
    const w={ wind:dmNum('wind'),gust:dmNum('gust')||dmNum('wind'),temp:dmNum('temp'),humidity:dmNum('humidity'),
      cloud:dmNum('cloud'),rainNow:$('rain').value==='now',rainForecast:$('rain').value==='forecast',
      visibility:$('visibility').value,terrain:$('terrain').value,sunHigh:$('sunHigh').value==='yes' };
    const weather=missionWeather(w,dmMode,m,params);

    drawFlightLines(m);
    renderDmResults(params,m,lod,ovq,weather,front,side);
    dmStep(4);
  }catch(err){
    console.error(err);
    $('dmResult').innerHTML='<div class="card"><b style="color:#dc2626">Perhitungan gagal:</b><br>'+err.message+'</div>';
    dmStep(4);
  }
}
function dmFmt(n,d){ return (isFinite(n)?n:0).toLocaleString('id-ID',{minimumFractionDigits:d||0,maximumFractionDigits:d||2}); }
function kvRow(k,v){ return '<div class="kv"><span class="k">'+k+'</span><span class="v">'+v+'</span></div>'; }

function renderDmResults(p,m,lod,ovq,weather,front,side){
  let h='';
  h+='<div class="status-banner '+weather.statusClass+'"><div class="big">'+weather.status+'</div>'+
     '<div class="small">Wind Risk: '+dmFmt(weather.wRisk,1)+' · Overlap Quality: '+ovq+'/100</div></div>';

  // 1. Mission Summary
  h+='<div class="res-card"><h3>🗺️ Mission Summary</h3>'+
    kvRow('Mission Type',p.mission)+kvRow('Mapping Mode',p.mode)+
    kvRow(aoiType==='line'?'Corridor Length':'Luas AOI', aoiType==='line'?dmFmt(p.lineLen,0)+' m':dmFmt(p.area,2)+' ha')+
    kvRow('Drone/Payload',(DM_DRONES.find(x=>x.id===$('dmDrone').value)||{}).label)+
    kvRow('Target GSD', m.gsd>0?dmFmt(m.gsd,2)+' cm/px':'—')+
    kvRow('Altitude', dmFmt(m.altitude,1)+' m')+
    kvRow('Speed', dmFmt(p.speed,1)+' m/s')+
    kvRow('Front Overlap',front+' %')+kvRow('Side Overlap',side+' %')+
    kvRow('Gimbal Angle',(dmNum('gimbal')||-90)+'°')+
    kvRow('Flight Direction',(dmNum('flightDir')||0)+'°')+
    kvRow('Trigger Interval',dmFmt(m.trigger,2)+' s')+'</div>';

  // 3. Accuracy & Quality
  let lodColor=lod>=80?'#22c55e':lod>=65?'#eab308':'#f97316';
  h+='<div class="res-card"><h3>🎯 Accuracy & Quality</h3>'+
    kvRow('Expected GSD', m.gsd>0?dmFmt(m.gsd,2)+' cm/px':'LiDAR (n/a)')+
    kvRow('Overlap Quality', ovq+'/100')+
    '<div class="kv"><span class="k">LOD Suitability</span><span class="v"><span class="lod-badge" style="background:'+lodColor+'22;color:'+lodColor+'">'+lod+'/100</span></span></div>';
  if(p.mode==='LiDAR' && m.pointDensity) h+=kvRow('Est. Point Density',dmFmt(m.pointDensity,1)+' pts/m²');
  if(p.mode==='Multispectral'){ const idx=MULTI_INDEX[dmCommodity]||['NDVI']; h+=kvRow('Indeks ('+dmCommodity+')',idx.join(', ')); }
  if(p.mode==='Thermal') h+=kvRow('Thermal pixel footprint', m.gsd>0?dmFmt(m.gsd,1)+' cm/px':'—');
  h+=kvRow('RTK/GCP', '')+'<div class="rec-item"><span class="ic">i</span><span>'+rtkSuggestion(p.target,p.mode)+'</span></div></div>';

  // 4. Efficiency
  h+='<div class="res-card"><h3>⚡ Efficiency</h3>'+
    kvRow('Estimasi Foto', dmFmt(m.totalPhotos,0)+' foto')+
    kvRow('Jumlah Jalur (line)', m.lineCount)+
    kvRow('Route Length', dmFmt(m.routeLen,0)+' m')+
    kvRow('Durasi Terbang', dmFmt(m.flightTime,1)+' menit')+
    kvRow('Jumlah Baterai', m.battery+' baterai')+
    kvRow('Rekomendasi Sortie', m.sorties+' sortie')+'</div>';

  // 5. Weather & Safety
  h+='<div class="res-card"><h3>🌦️ Weather & Safety</h3>'+
    weather.warnings.map(wn=>'<div class="rec-item"><span class="ic">!</span><span>'+wn+'</span></div>').join('')+'</div>';

  // 2. Recommendations (logika per mode)
  const recs=[];
  if(p.mode==='RGB' && /Orthomosaic/.test(p.target)){ recs.push('Ortho RGB: overlap minimal 75% front / 60% side. Naikkan bila vegetasi rapat/area homogen.'); }
  if(p.mission==='Oblique'||/3D Model/.test(p.target)){ recs.push('3D/Oblique: aktifkan double grid/crosshatch, gimbal oblique (−45°), turunkan speed bila blur.'); }
  if(p.mission==='Corridor'){ recs.push('Corridor: pakai centerline, hitung lebar kiri/kanan, atur pass count sesuai corridor width.'); }
  if(p.terrainFollow){ recs.push('Terrain Follow: pastikan sumber AGL/DEM valid; medan curam butuh margin altitude.'); }
  if(p.mode==='Multispectral'){ recs.push('Multispectral: kalibrasi panel reflektansi sebelum & sesudah; terbang saat cahaya stabil (10.00–14.00).'); }
  if(p.mode==='LiDAR'){ recs.push('LiDAR: gunakan RTK/PPK, jaga strip overlap ≥50%, turunkan speed bila density kurang.'); }
  if(p.mode==='Thermal'){ recs.push('Thermal: terbang pagi/sore untuk kontras termal, hindari pantulan matahari & cuaca tidak stabil.'); }
  if(ovq<70) recs.push('Naikkan overlap untuk menghindari lubang rekonstruksi.');
  if(recs.length){
    h+='<div class="res-card"><h3>🔧 Rekomendasi</h3>'+recs.map(r=>'<div class="rec-item"><span class="ic">→</span><span>'+r+'</span></div>').join('')+'</div>';
  }

  $('dmResult').innerHTML=h;
}

/* INIT */
window.addEventListener('load',function(){
  try{ initMap(); }catch(e){ console.error('Map init:',e); }
  dmRenderStepper();
  dmInitDropdowns();
});
