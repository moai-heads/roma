// ---------- UI ----------
const notifications=[], seenNotices={};
function msg(t,k,quiet){
  if(!quiet){
    // collapse identical repeats into "x3" so the log never spams
    const last=notifications.find(n=>n.t===t);
    if(last){ last.n=(last.n||1)+1; last.age=0; renderMsgs(); return; }
  }
  notifications.unshift({t,k:k||'',n:1,age:0});
  if(notifications.length>4) notifications.pop();
  renderMsgs();
}
function renderMsgs(){
  document.getElementById('msgs').innerHTML=notifications.map(n=>
    `<div class="${n.k}"><span class="tx">${n.t}</span>${n.n>1?`<span class="ct">x${n.n}</span>`:''}</div>`).join('');
  document.getElementById('msgdot').style.opacity = notifications.length?1:0;
}
function tickMsgs(dt){
  let dirty=false;
  for(let i=notifications.length-1;i>=0;i--){
    notifications[i].age+=dt;
    if(notifications[i].age>7){ notifications.splice(i,1); dirty=true; }
  }
  if(dirty) renderMsgs();
}

// --- category tiles ---
// --- AoE-style command grid: every group visible, no submenus ---
const GROUPS=[
  {k:'civic', label:'\u25C9  Civic',    types:['market','well','cistern','aqueduct','temple','park','senate','granary','import']},
  {k:'prod',  label:'\u2698  Land',     types:['farm','farmOlive','vineyard','claypit','ironMine','woodcutter']},
  {k:'ind',   label:'\u2696  Industry', types:['potter','carpenter','smith','weaver']},
  {k:'res',   label:'\u2302  Housing',  types:['house']},
  {k:'infra', label:'\u25B6  Infra',    types:[]},
];
const ICONS={well:'\u283C',cistern:'\u25F0',aqueduct:'\u2248',farm:'\u2698',farmOlive:'\u2696',claypit:'\u25B2',
  ironMine:'\u2692',woodcutter:'\u2702',vineyard:'\u25C7',market:'\u25EC',granary:'\u233F',potter:'\u25CC',
  carpenter:'\u2699',smith:'\u2692',weaver:'\u274F',temple:'\u25D3',park:'\u266F',senate:'\u265F',import:'\u2696',house:'\u2302'};

function tileHTML(k, extra){
  const t=BTYPES[k];
  const on = (tool===k && !demolishMode) ? 'on':'';
  const afford = G.money>=t.cost ? '' : ' poor';
  return `<div class="card ${t.cat} ${on}${extra||''}${afford}" onclick="setTool('${k}')"
    title="${t.name} — ${t.cost} denarii&#10;${t.desc}&#10;${t.chain||''}">
    <span class="cic">${ICONS[k]||'\u25A0'}</span>
    <span class="cnm">${t.name}</span>
    <span class="ccost">${t.cost}</span></div>`;
}
function refreshBar(){
  let h='';
  for(const g of GROUPS){
    let cards='';
    if(g.k==='infra'){
      cards+=`<div class="card infra ${tool==='road'&&!demolishMode?'on':''}" onclick="setTool('road')" title="Roads. Servants can only walk on roads."><span class="cic">\u2591</span><span class="cnm">Road</span><span class="ccost">1</span></div>
      <div class="card infra ${tool==='inspect'&&!demolishMode?'on':''}" onclick="setTool('inspect')" title="Click a building to inspect it"><span class="cic">\u2315</span><span class="cnm">Inspect</span><span class="ccost">&mdash;</span></div>
      <div class="card infra ${demolishMode?'on danger':''}" onclick="setDemolish()" title="Demolish, 30% refund"><span class="cic">\u2715</span><span class="cnm">Demolish</span><span class="ccost">+30%</span></div>`;
    } else cards += g.types.map(k=>tileHTML(k)).join('');
    h += `<div class="group g-${g.k}">
            <div class="ghead"><span>${g.label}</span><span class="gsub">${g.k==='infra'?'tools':g.types.length+' buildings'}</span></div>
            <div class="cards">${cards}</div></div>`;
  }
  document.getElementById('dock').innerHTML=h;
}

// --- production chain legend, as a 2-column grid ---
const CHAIN=['well','cistern','aqueduct','farm','farmOlive','vineyard','claypit','ironMine',
  'woodcutter','potter','carpenter','smith','weaver','import','market','house'];
function renderChains(){
  const el=document.getElementById('chgrid');
  el.innerHTML=CHAIN.map(k=>{
    const t=BTYPES[k];
    const req=(t.chain||'').split('->').map(x=>x.trim()).join(' \u2192 ');
    return `<div class="chcell ${t.cat}" title="${t.desc}">
      <span class="chname"><span>${ICONS[k]||'\u25A0'}</span>${t.name}</span>
      <span class="chreq">${req||'&mdash;'}</span></div>`;
  }).join('');
  document.getElementById('chains').style.display = chainOpen ? 'block':'none';
}

const MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function renderHUD(){
  const bal=G.balance||0;
  const balCls = bal>=0?'pos':'neg';
  document.getElementById('top').innerHTML=`
  <div class="stat money"><b>${Math.floor(G.money)}</b><span>treasury</span></div>
  <div class="stat ${balCls}"><b>${bal>=0?'+':''}${bal}</b><span>per month</span></div>
  <div class="stat"><b>${G.tax||0}</b><span>tax in</span></div>
  <div class="stat"><b>-${G.upkeep||0}</b><span>upkeep</span></div>
  <div class="stat"><b>${G.pop}</b><span>populace</span></div>
  <div class="stat"><b>${G.taxpayers||0}</b><span>taxpayers</span></div>
  <div class="stat"><b>${MONTHS[G.month]} ${2040+G.year}</b><span>date</span></div>
  <div class="stat"><b>${Math.round(G.happiness)}</b><span>contentment</span></div>
  <div class="stat"><b>${Math.round(G.favor)}</b><span>favor</span></div>
  <div class="stat taxrate"><span>tax rate</span><span class="trbtns">
     ${[1,2,3].map(r=>`<button class="${G.taxRate===r?'on':''}" onclick="setTaxRate(${r})">${['Lo','Md','Hi'][r-1]}</button>`).join('')}
     </span></div>
  <div class="speeds">
    <button onclick="setSpeed(0)" class="${G.speed===0?'on':''}">\u23F8</button>
    <button onclick="setSpeed(1)" class="${G.speed===1?'on':''}">1x</button>
    <button onclick="setSpeed(3)" class="${G.speed===3?'on':''}">3x</button>
    <button onclick="setSpeed(8)" class="${G.speed===8?'on':''}">8x</button>
  </div>`;
  const order=['food','pottery','tools','wine','luxury','iron','clay','wood'];
  document.getElementById('res').innerHTML=order.map(k=>{
    const v=(k==='food'?depot.food:Math.floor(stock[k]||0));
    return `<span class="chip ${v===0?'zero':''}" title="${k} in the market"><i style="background:#${(RES_COLOR[k]).toString(16).padStart(6,'0')}"></i><b>${v}</b><em>${k}</em></span>`;
  }).join('')+`<span class="chip water" title="Drinking water is a radius, not a cargo"><i style="background:#4fb0e8"></i><b>${waterSources()}</b><em>water sources</em></span>`;
}
function waterSources(){ return blds.filter(b=>b.type==='well'||b.type==='cistern'||b.type==='aqueduct').length; }
function setSpeed(s){ G.speed=s; renderHUD(); }

// ---------- INPUT ----------
let dragStart=null, dragPaint=false, panning=false, lastX=0,lastY=0, panBtn=false;
addEventListener('mousemove',e=>{
  lastX=e.clientX; lastY=e.clientY;
  if(panBtn){ cam.tx-=Math.cos(cam.yaw)*(e.movementX)*cam.dist*0.0016; cam.tz+=Math.sin(cam.yaw)*(e.movementX)*cam.dist*0.0016;
              cam.tx-=Math.sin(cam.yaw)*(e.movementY)*cam.dist*0.0016; cam.tz-=Math.cos(cam.yaw)*(e.movementY)*cam.dist*0.0016; return; }
  if(orbiting){ cam.yaw-=e.movementX*0.005; cam.pitch=Math.max(0.18,Math.min(1.5,cam.pitch+e.movementY*0.004)); return; }
  const t=pickTile(e);
  if(t){ mouseTile=t; onTile=true;
    if(dragPaint&&tool==='road'&&!demolishMode){ place('road',t.x,t.z); }
  } else onTile=false;
  updateGhost();
});
let orbiting=false;
addEventListener('mousedown',e=>{
  if(e.button===1||(e.button===0&&e.shiftKey)){ orbiting=true; panBtn=false; return; }
  if(e.button===2){ panBtn=true; orbiting=false; return; }
  if(e.button===0){
    const t=pickTile(e);
    const b=pickBuilding(e);
    if(demolishMode){ if(b) demolish(b); else if(t&&cells[idx(t.x,t.z)]===T_ROAD){ cells[idx(t.x,t.z)]=T_EMPTY; roadLevel[idx(t.x,t.z)]=0; rebuildRoads(); } return; }
    if(tool==='inspect'){ sel=b; refreshSel(); return; }
    if(tool==='road'){ dragStart=t; dragPaint=true; if(t) place('road',t.x,t.z); return; }
    if(t){ const r=place(tool,t.x,t.z); if(r) sel=r; refreshSel(); }
  }
});
addEventListener('mouseup',e=>{
  if(e.button===2) panBtn=false;
  if(e.button===1) orbiting=false;
  dragPaint=false; dragStart=null;
});
addEventListener('contextmenu',e=>e.preventDefault());
addEventListener('wheel',e=>{ cam.dist=Math.max(10,Math.min(140,cam.dist*(1+Math.sign(e.deltaY)*0.12))); },{passive:true});
addEventListener('keydown',e=>{
  const k=e.key.toLowerCase();
  if(k==='q'){ setTool('road'); }
  if(k==='e'){ setTool('inspect'); }
  if(k==='x'){ demolishMode=!demolishMode; refreshBar(); }
  if(k===' '){ e.preventDefault(); setSpeed(G.speed===0?1:0); }
  if(k==='escape'){ sel=null; refreshSel(); }
  if('wasd'.includes(k)&&k.length===1){
    e.preventDefault();
    const sp=4*cam.dist*0.016, fx=Math.cos(cam.yaw), fz=-Math.sin(cam.yaw);
    if(k==='w'){cam.tx+=fx*sp;cam.tz+=fz*sp;}
    if(k==='s'){cam.tx-=fx*sp;cam.tz-=fz*sp;}
    if(k==='a'){cam.tx-=fz*sp;cam.tz+=fx*sp;}
    if(k==='d'){cam.tx+=fz*sp;cam.tz-=fx*sp;}
  }
  if(k==='g'){ showPaths=!showPaths; msg('Servant paths '+(showPaths?'shown':'hidden')); }
  if(k==='c'){ chainOpen=!chainOpen; renderChains(); }
  if(k==='f'){ soilOverlay.visible=!soilOverlay.visible;
    msg('Fertile ground overlay '+(soilOverlay.visible?'on':'off'),'ok'); }
});

// ---------- MAIN LOOP ----------
let last=performance.now(), hudAcc=0, simAcc=0;
function loop(now){
  requestAnimationFrame(loop);
  let dt=Math.min(0.05,(now-last)/1000); last=now;
  if(G.speed>0){
    updateCarts(dt*G.speed*0.6+dt*0.4);
    simAcc+=dt*G.speed;
    let guard=0;
    while(simAcc>0.16 && guard++<8){ simAcc-=0.16; simTick(0.16); }
  }
  tickMsgs(dt);
  if(waterMesh&&waterMesh.userData.sh) waterMesh.userData.sh.uniforms.uT.value=now*0.001;
  updateCam(dt);
  if(hoverMesh) hoverMesh.visible=false;
  if(sel && sel.mesh){ /* selection ring */ }
  renderer.render(scene,camera);
  hudAcc+=dt; if(hudAcc>0.25){ hudAcc=0; renderHUD(); refreshBar(); if(sel) refreshSel(); }
}

// ---------- BOOT ----------
function init(){
  // a little river
  for(let z=0;z<N;z++){ const wx=6+Math.round(Math.sin(z*0.22)*3);
    for(let i=-1;i<=1;i++){ if(inb(wx+i,z) && cells[idx(wx+i,z)]===T_EMPTY) cells[idx(wx+i,z)]=T_WATER; } }
  for(let i=0;i<300;i++){ const x=Math.floor(Math.random()*N),z=Math.floor(Math.random()*N);
    if(inb(x,z)&&cells[idx(x,z)]===T_EMPTY&&Math.random()<0.1) cells[idx(x,z)]=T_TREE; }
  for(let z=0;z<N;z++){ const x=Math.floor(Math.random()*N); if(inb(x,z)&&cells[idx(x,z)]===T_EMPTY) cells[idx(x,z)]=T_SAND; }
  genSoil();
  init3D();
  buildTerrain();
  rebuildRoads();
  refreshBar(); renderChains(); renderMsgs(); renderHUD();

  // --- starting colony on the big map ---
  const C=(N/2)|0;
  // bulldoze the founding site so random boulders/trees can never block the layout
  clearArea(C-16,C-4,C+14,C+24,true);
  rebuildSoilOverlay();
  // avenues (north-south) and streets (east-west); the layout is a proper Roman grid
  const AVX=[C-12,C-6,C+3,C+9], SVZ=[C+1,C+5,C+9,C+13,C+17];
  for(const x of AVX) for(let z=SVZ[0];z<=SVZ[4];z++) place('road',x,z,true);
  for(const z of SVZ) for(let x=AVX[0];x<=AVX[3];x++) place('road',x,z,true);
  // extend two avenues down to the farms
  for(let z=SVZ[0];z<=SVZ[4]+4;z++){ place('road',C-6,z,true); place('road',C+3,z,true); }
  for(let x=AVX[0];x<=AVX[3];x++) place('road',x,SVZ[4]+4,true);

  // civic core
  place('market',C-3,C+2,true);
  place('well',C+4,C+6,true);
  place('temple',C+1,C+6,true);
  place('park',C-11,C+6,true);
  place('senate',C+10,C+2,true);
  place('granary',C+10,C+6,true);
  place('aqueduct',C+2,C+11,true);
  place('cistern',C+4,C+8,true);

  // housing
  for(const [x,z] of [[C-11,C+2],[C-9,C+2],[C-8,C+2],[C-7,C+2],[C+4,C+2],[C+5,C+2],[C+6,C+2],
                     [C-11,C+4],[C-9,C+4],[C-8,C+4],[C-7,C+4],[C+4,C+4],[C+5,C+4],[C+6,C+4],
                     [C-11,C+8],[C-9,C+8],[C-8,C+8],[C-7,C+8],[C+4,C+8],[C+5,C+8],[C+6,C+8],
                     [C-2,C+8],[C-1,C+8],[C-1,C+4],[C-2,C+4],
                     [C-11,C+10],[C-9,C+10],[C-8,C+10],[C-7,C+10],[C-2,C+10],[C-1,C+10]]) place('house',x,z,true);

  // land & industry, south of the grid (water reaches here via the aqueduct)
  place('farm',C-11,C+14,true);
  place('farmOlive',C-11,C+18,true);
  place('vineyard',C-11,C+22,true);
  place('claypit',C-5,C+14,true);
  place('ironMine',C-2,C+14,true);
  place('woodcutter',C-5,C+18,true);
  place('potter',C+4,C+14,true);
  place('smith',C+4,C+18,true);
  place('carpenter',C+10,C+18,true);
  place('weaver',C+0,C+18,true);
  place('import',C-2,C+18,true);
  rebuildRoads();
  msg('A new colony on the Tiber. Roads first, then a market.','');
  msg('Households grow when servants deliver goods to their doorstep.','');
  requestAnimationFrame(loop);
}
init();
