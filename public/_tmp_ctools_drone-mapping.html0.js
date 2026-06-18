
/* ============================================================
   DRONE MAPPING PLANNER — Logic (PRD v2 3D)
   Rumus presisi sesuai PRD §10. Tidak mengarang spesifikasi.
   ============================================================ */

/* ---- Database drone+sensor (spesifikasi resmi; low/manual = input manual) ---- */
const DM_DRONES = [
  {id:'m3e', label:'DJI Mavic 3 Enterprise', sw:17.3, sh:13.0, fl:12.29, iw:5280, ih:3956, batt:35, conf:'high'},
  {id:'m3m', label:'DJI Mavic 3 Multispectral', sw:17.3, sh:13.0, fl:12.29, iw:5280, ih:3956, batt:35, conf:'high', multi:true},
  {id:'p4rtk', label:'DJI Phantom 4 RTK', sw:13.2, sh:8.8, fl:8.8, iw:5472, ih:3648, batt:28, conf:'high'},
  {id:'m300-p1', label:'DJI M300 + Zenmuse P1 (35mm)', sw:35.9, sh:24.0, fl:35, iw:8192, ih:5460, batt:45, conf:'high'},
  {id:'m350-l2', label:'DJI M350 + Zenmuse L2 (LiDAR)', sw:0, sh:0, fl:0, iw:0, ih:0, batt:40, conf:'high', lidar:true, pps:240000, swath:0.95},
  {id:'m30t', label:'DJI M30T (Thermal)', sw:7.4, sh:5.6, fl:12, iw:1280, ih:1024, batt:35, conf:'medium', thermal:true},
  {id:'autel-evo2', label:'Autel EVO II Pro', sw:13.2, sh:8.8, fl:10, iw:5472, ih:3648, batt:38, conf:'medium'},
  {id:'autel-m3d', label:'Autel Dragonfish / Custom Autel', sw:0, sh:0, fl:0, iw:0, ih:0, batt:0, conf:'manual'},
  {id:'custom', label:'Custom Drone / Sensor Manual Input', sw:0, sh:0, fl:0, iw:0, ih:0, batt:0, conf:'manual'},
];

const DM_COMMODITIES = ['Tebu','Sawah/Padi','Sawit','Teh','Kopi','Kelapa','Pisang'];
const DM_MODES = ['RGB','LiDAR','Multispectral','Thermal'];
const DM_MISSIONS = ['Waypoints','Mapping / Nadir Grid','Oblique','Corridor','Detailed Inspection','Real-Time Terrain Follow'];
const DM_TARGETS = ['Orthomosaic 2D','DSM/DEM/DTM','3D Model','Stockpile/Volume','Corridor/Utility','SUTET/Telecom Inspection','Vegetation Monitoring','Plantation Monitoring','Construction Progress','Topographic Mapping','Precision Agriculture'];

const MISSION_FACTOR = {
  'Waypoints':1.0, 'Mapping / Nadir Grid':1.0, 'Oblique':2.6,
  'Corridor':1.0, 'Detailed Inspection':2.0, 'Real-Time Terrain Follow':1.0,
};
const SENSOR_SENS = { 'RGB':1.0, 'Oblique/3D':1.2, 'LiDAR':1.1, 'Multispectral':1.1, 'Thermal':1.0 };

/* Index multispectral per komoditas (PRD §logika 5) */
const MULTI_INDEX = {
  'Tebu':['NDVI','NDRE','GNDVI'], 'Sawah/Padi':['NDVI','NDRE','SAVI'],
  'Sawit':['NDVI','NDRE','GNDVI'], 'Teh':['NDVI','GNDVI','NDWI'],
  'Kopi':['NDVI','NDRE'], 'Kelapa':['NDVI','SAVI'], 'Pisang':['NDVI','NDRE','GNDVI'],
};

/* ===================== RUMUS PRD §10 ===================== */
// 1. GSD (cm/pixel) = (Altitude × SensorWidth × 100) / (FocalLength × ImageWidth)
function calcGSD(alt, sw, fl, iw){
  if(fl<=0||iw<=0) return 0;
  return (alt * sw * 100) / (fl * iw);
}
// 2. Altitude (m) = (TargetGSD × FocalLength × ImageWidth) / (SensorWidth × 100)
function calcAltitude(gsd, fl, iw, sw){
  if(sw<=0) return 0;
  return (gsd * fl * iw) / (sw * 100);
}
// 3/4. Footprint (m) = GSD(m/px) × ImagePixels ; GSD cm/px -> m/px = /100
function calcFootprint(gsdCm, px){ return (gsdCm/100) * px; }

// 5. Photo Spacing = FootprintHeight × (1 - FrontOverlap)
function photoSpacing(fpH, frontOv){ return fpH * (1 - frontOv/100); }
// 6. Line Spacing = FootprintWidth × (1 - SideOverlap)
function lineSpacing(fpW, sideOv){ return fpW * (1 - sideOv/100); }
// 7. Line Count = AOI Effective Width / Line Spacing
function lineCount(aoiW, lineSp){ return lineSp>0 ? aoiW/lineSp : 0; }
// 8. Photo Count Per Line = Line Length / Photo Spacing
function photoPerLine(lineLen, photoSp){ return photoSp>0 ? lineLen/photoSp : 0; }
// 9. Total Photos = LineCount × PhotoPerLine × MissionFactor
function totalPhotos(lc, ppl, mf){ return Math.ceil(lc * ppl * mf); }
// 10. Trigger Interval (s) = Photo Spacing / Flight Speed
function triggerInterval(photoSp, speed){ return speed>0 ? photoSp/speed : 0; }
// 11. Route Length = LineCount × LineLength + TurnDistance
function routeLength(lc, lineLen, turnDist){ return lc*lineLen + turnDist; }
// 12. Flight Time (min) = RouteLength / Speed / 60
function flightTime(routeLen, speed){ return speed>0 ? routeLen/speed/60 : 0; }
// 13. Battery Count = FlightTime / UsableBatteryTime × SafetyFactor
function batteryCount(ft, usable, safety){ return usable>0 ? Math.ceil((ft/usable)*safety) : 0; }
// 14. Wind Risk = WindSpeed × ExposureFactor × SensorSensitivity
function windRisk(wind, exposure, sensFactor){ return wind * exposure * sensFactor; }
// 15. LiDAR Point Density = (PPS × ScanEff) / (Speed × Swath)
function pointDensity(pps, eff, speed, swath){ return (speed*swath>0) ? (pps*eff)/(speed*swath) : 0; }

/* ===================== AREA & PERIMETER (geodesic) ===================== */
function polygonAreaHa(latlngs){
  // Shoelace di proyeksi lokal ekuirektangular (cukup akurat utk AOI kecil)
  if(!latlngs||latlngs.length<3) return 0;
  const R=6378137;
  const lat0 = latlngs.reduce((s,p)=>s+p[0],0)/latlngs.length * Math.PI/180;
  const pts = latlngs.map(p=>[ R*(p[1]*Math.PI/180)*Math.cos(lat0), R*(p[0]*Math.PI/180) ]);
  let area=0;
  for(let i=0;i<pts.length;i++){
    const j=(i+1)%pts.length;
    area += pts[i][0]*pts[j][1] - pts[j][0]*pts[i][1];
  }
  return Math.abs(area/2)/10000; // m² -> ha
}
function bboxDims(latlngs){
  // Lebar & tinggi efektif AOI dalam meter
  if(!latlngs||latlngs.length<2) return {w:0,h:0};
  const lats=latlngs.map(p=>p[0]), lons=latlngs.map(p=>p[1]);
  const lat0=(Math.min(...lats)+Math.max(...lats))/2 * Math.PI/180;
  const R=6378137;
  const w = R*((Math.max(...lons)-Math.min(...lons))*Math.PI/180)*Math.cos(lat0);
  const h = R*((Math.max(...lats)-Math.min(...lats))*Math.PI/180);
  return {w:Math.abs(w), h:Math.abs(h)};
}
function lineLengthM(latlngs){
  if(!latlngs||latlngs.length<2) return 0;
  let d=0;
  for(let i=0;i<latlngs.length-1;i++) d += haversine(latlngs[i],latlngs[i+1]);
  return d;
}
function haversine(a,b){
  const R=6378137, toR=Math.PI/180;
  const dLat=(b[0]-a[0])*toR, dLon=(b[1]-a[1])*toR;
  const la1=a[0]*toR, la2=b[0]*toR;
  const x=Math.sin(dLat/2)**2 + Math.cos(la1)*Math.cos(la2)*Math.sin(dLon/2)**2;
  return 2*R*Math.asin(Math.sqrt(x));
}

/* ===================== MISSION COMPUTE ===================== */
function computeMission(p){
  const o={};
  const drone=p.drone;
  // GSD & altitude
  if(p.mode==='LiDAR'){
    o.gsd=0; o.altitude=p.altitude||80;
  } else if(p.targetGSD>0 && drone.sw>0){
    o.altitude = calcAltitude(p.targetGSD, drone.fl, drone.iw, drone.sw);
    o.gsd = p.targetGSD;
  } else {
    o.altitude = p.altitude||100;
    o.gsd = calcGSD(o.altitude, drone.sw, drone.fl, drone.iw);
  }
  // Footprint
  o.fpW = calcFootprint(o.gsd, drone.iw);
  o.fpH = calcFootprint(o.gsd, drone.ih);
  // Overlap & spacing
  o.photoSp = photoSpacing(o.fpH, p.frontOv);
  o.lineSp = lineSpacing(o.fpW, p.sideOv);
  // AOI dims
  o.area = p.area;            // ha
  o.aoiW = p.aoiW;            // m
  o.lineLen = p.lineLen||p.aoiH; // m
  // Counts
  o.lineCount = Math.ceil(lineCount(o.aoiW, o.lineSp));
  o.photoPerLine = photoPerLine(o.lineLen, o.photoSp);
  const mf = p.missionFactor || MISSION_FACTOR[p.mission] || 1.0;
  o.missionFactor = mf;
  o.totalPhotos = totalPhotos(o.lineCount, o.photoPerLine, mf);
  // Timing
  o.trigger = triggerInterval(o.photoSp, p.speed);
  o.turnDist = o.lineCount * (o.lineSp + 10); // estimasi belokan
  o.routeLen = routeLength(o.lineCount, o.lineLen, o.turnDist);
  o.flightTime = flightTime(o.routeLen, p.speed);
  o.battery = batteryCount(o.flightTime, p.usableBatt||drone.batt||25, p.safety||1.2);
  o.sorties = o.battery; // 1 sortie per baterai (estimasi)
  // LiDAR density
  if(p.mode==='LiDAR' && drone.lidar){
    o.pointDensity = pointDensity(drone.pps||240000, 0.7, p.speed, (drone.swath||0.9)*2*o.altitude*Math.tan(20*Math.PI/180)||10);
  }
  return o;
}

/* ===================== QUALITY & LOD SCORE (PRD §10.16) ===================== */
function lodScore(p, m){
  let score=50;
  // GSD: makin kecil makin bagus utk 3D
  if(m.gsd>0 && m.gsd<=2) score+=20; else if(m.gsd<=4) score+=10;
  // Overlap
  if(p.frontOv>=80 && p.sideOv>=70) score+=15; else if(p.frontOv>=75 && p.sideOv>=65) score+=8;
  // Oblique / crosshatch
  if(p.mission==='Oblique') score+=15;
  if(p.mission==='Detailed Inspection') score+=10;
  // Terrain follow
  if(p.terrainFollow) score+=5;
  return Math.min(100, score);
}
function overlapQuality(front, side){
  let s=50;
  if(front>=80) s+=25; else if(front>=75) s+=15; else if(front>=70) s+=5; else s-=10;
  if(side>=70) s+=25; else if(side>=60) s+=15; else if(side>=55) s+=5; else s-=10;
  return Math.max(0,Math.min(100,s));
}

/* ===================== WEATHER & SAFETY (PRD §status akhir) ===================== */
function missionWeather(w, mode, m, p){
  const sensF = mode==='Oblique'||p.mission==='Oblique' ? 1.2 : (SENSOR_SENS[mode]||1.0);
  const exposure = w.terrain==='rugged'?1.3:1.0;
  const wRisk = windRisk(w.wind, exposure, sensF);
  const gustRisk = (w.gust - w.wind);

  const warnings=[];
  let status, statusClass;

  // Hard stops
  if(w.rainNow){ status='Jangan Terbang'; statusClass='st-bad'; warnings.push('Sedang hujan — jangan terbang.'); }
  else if(w.wind>12 || w.gust>14){ status='Jangan Terbang'; statusClass='st-bad'; warnings.push('Angin '+w.wind+' m/s (gust '+w.gust+') melebihi batas aman drone.'); }
  else if(w.rainForecast){ status='Waspada'; statusClass='st-warn'; warnings.push('Perkiraan hujan segera — siapkan rencana RTH.'); }

  // Soft warnings
  if(w.wind>8 && w.wind<=12) warnings.push('Angin kencang ('+w.wind+' m/s) — risiko blur & drift jalur; turunkan speed.');
  if(gustRisk>4) warnings.push('Turbulensi tinggi (gust−angin = '+gustRisk.toFixed(1)+' m/s) — stabilitas gimbal terganggu.');
  if(w.cloud>70 && (mode==='Multispectral'||mode==='RGB')) warnings.push('Tutupan awan tinggi — cahaya tidak konsisten, hasil ortho/indeks bias.');
  if(mode==='Thermal' && w.temp>38) warnings.push('Suhu ekstrem — kontras termal turun; terbang pagi/sore.');
  if(mode==='Thermal' && w.sunHigh) warnings.push('Matahari tinggi — risiko pantulan termal (sun glint).');
  if(p.speed>0 && m.trigger>0 && p.speed > (m.photoSp/Math.max(0.5,m.trigger))*1.2) warnings.push('Speed terlalu tinggi untuk interval trigger — risiko gap foto.');
  if(m.gsd>5 && (p.target||'').indexOf('3D')>=0) warnings.push('GSD besar ('+m.gsd.toFixed(1)+' cm/px) kurang ideal untuk 3D model.');
  if(p.frontOv<75 || p.sideOv<60) warnings.push('Overlap di bawah rekomendasi (75%/60%) — risiko lubang rekonstruksi.');
  if(w.visibility==='low') warnings.push('Jarak pandang rendah — pastikan VLOS & izin terbang.');
  if(mode==='LiDAR' && p.speed>8) warnings.push('Speed tinggi untuk LiDAR — kepadatan titik turun, strip overlap berkurang.');

  // Determine status if not hard-stopped
  if(!status){
    if(wRisk<6 && warnings.length===0){ status='Layak Terbang'; statusClass='st-ok'; }
    else if(wRisk<10 && warnings.length<=2){ status='Layak Bersyarat'; statusClass='st-cond'; }
    else if(wRisk<14){ status='Waspada'; statusClass='st-warn'; }
    else { status='Jangan Terbang'; statusClass='st-bad'; }
  }
  if(warnings.length===0) warnings.push('Kondisi mendukung. Tetap cek NOTAM/NFZ & izin sebelum terbang.');

  return {wRisk, status, statusClass, warnings, sensF};
}

/* RTK/GCP suggestion */
function rtkSuggestion(target, mode){
  if(/Topographic|DSM|DEM|DTM|Stockpile|Volume/.test(target) || mode==='LiDAR')
    return 'Disarankan RTK/PPK + minimum 5 GCP & 3 check point untuk akurasi absolut.';
  if(/3D Model|Construction/.test(target))
    return 'Disarankan RTK atau GCP terdistribusi untuk skala & akurasi model.';
  return 'GCP opsional; RTK meningkatkan akurasi absolut. Tetap pasang check point bila memungkinkan.';
}

