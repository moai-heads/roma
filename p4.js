// ---------- road connectivity flood ----------
function netReach(x0,z0){
  const seen=new Uint8Array(N*N), q=[[x0,z0]]; seen[idx(x0,z0)]=1; const out=[];
  while(q.length){
    const [x,z]=q.pop(); out.push([x,z]);
    for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const nx=x+dx,nz=z+dz; if(!inb(nx,nz)) continue;
      const ni=idx(nx,nz);
      if(roadLevel[ni]>0 && !seen[ni]){ seen[ni]=1; q.push([nx,nz]); }
    }
  }
  return out;
}
let netStamp=0, netMap=new Map();
function roadTo(b){
  const e=entranceOf(b); if(!e) return false;
  if(!roadLevel[idx(e.x,e.z)]) return false;
  if(!netMap.size || netStamp<G.netTick){ netStamp=G.netTick; netMap.clear();
    for(const x of blds){ const ee=entranceOf(x); if(!ee) continue;
      if(!netMap.has(x.type)) netMap.set(x.type, new Set(netReach(ee.x,ee.z).map(([a,b2])=>idx(a,b2)))); } }
  return true;
}
function canReach(b, targetType){
  if(!roadTo(b)) return false;
  const set=netMap.get(b.type); if(!set) return false;
  const e=entranceOf(b);
  for(const t of blds){ if(t.type!==targetType||!t.active) continue; const te=entranceOf(t);
    if(te && set.has(idx(te.x,te.z))) return true; }
  return false;
}
function anyMarket(){ return blds.find(b=>b.type==='market'&&b.active); }

// ---------- water coverage (Caesar III style: a radius, not a cargo good) ----------
function waterRange(b){ return b.type==='aqueduct'?18 : b.type==='cistern'?12 : 6; }
// a water source only works if it is itself supplied
function sourceLive(w){
  if(w.type==='well') return true;
  if(w.type==='cistern') return !!waterSourceNear(w,6,true);
  if(w.type==='aqueduct') return !!waterSourceNear(w,5,true);
  return false;
}
// find a live water source whose radius covers the given tile
function waterSourceNear(b, maxR, excludeSelf){
  for(const w of blds){
    if(w.type!=='well'&&w.type!=='cistern'&&w.type!=='aqueduct') continue;
    if(!w.active) continue;
    if(excludeSelf && w===b) continue;
    const r=Math.min(maxR, waterRange(w));
    for(let j=-r;j<=r;j++) for(let i=-r;i<=r;i++){
      if(i*i+j*j>r*r) continue;
      const x=b.x+i, z=b.z+j;
      if(!inb(x,z)) continue;
      // footprint hit test
      const t=BTYPES[b.type];
      if(x>=b.x&&x<b.x+t.w&&z>=b.z&&z<b.z+t.h) return w;
    }
  }
  return null;
}
function hasWater(b){
  const t=BTYPES[b.type];
  for(const w of blds){
    if(w.type!=='well'&&w.type!=='cistern'&&w.type!=='aqueduct') continue;
    if(!w.active || !sourceLive(w)) continue;
    const r=waterRange(w);
    for(let j=-r;j<=r;j++) for(let i=-r;i<=r;i++){
      if(i*i+j*j>r*r) continue;
      const x=b.x+i, z=b.z+j;
      if(x>=b.x && x<b.x+t.w && z>=b.z && z<b.z+t.h) return w;
    }
  }
  return null;
}

// ---------- place / demolish ----------
function clearDeco(x,z){ const o=decoCell[idx(x,z)]; if(o){ decoGroup.remove(o); delete decoCell[idx(x,z)]; } }

function clearArea(x0,z0,x1,z1,keepWater){
  for(let z=z0;z<=z1;z++) for(let x=x0;x<=x1;x++){
    if(!inb(x,z)) continue;
    const i=idx(x,z);
    if(keepWater && cells[i]===T_WATER) continue;
    clearDeco(x,z);
    if(cells[i]!==T_WATER){ cells[i]=T_EMPTY; roadLevel[i]=0; bldAt[i]=-1; }
  }
}

// BFS from every building over free land to the nearest road tile, then pave that path.
// Runs after the starter is laid out and is also safe to re-run (it is idempotent).
function connectAllBuildings(){
  const isRoad=(x,z)=>inb(x,z)&&cells[idx(x,z)]===T_ROAD;
  const K=(x,z)=>(x+','+z);
  for(const b of blds){
    const t=BTYPES[b.type];
    const inside=(x,z)=>x>=b.x&&x<b.x+t.w&&z>=b.z&&z<b.z+t.h;
    let ok=false;
    for(let j=-1;j<=t.h&&!ok;j++) for(let i=-1;i<=t.w&&!ok;i++) if(isRoad(b.x+i,b.z+j)) ok=true;
    if(ok) continue;
    // BFS from the footprint outwards; record parents so we can walk a real path back
    const parent=new Map(); const q=[];
    for(let j=-1;j<=t.h;j++) for(let i=-1;i<=t.w;i++){ const x=b.x+i,z=b.z+j;
      if(!inb(x,z)) continue; parent.set(K(x,z),null); q.push([x,z]); }
    let goal=null;
    for(let qi=0; qi<q.length && !goal; qi++){
      const [x,z]=q[qi];
      if(isRoad(x,z)&&!inside(x,z)){ goal=[x,z]; break; }
      for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
        const nx=x+dx, nz=z+dz, k=K(nx,nz);
        if(parent.has(k)||!inb(nx,nz)) continue;
        const c=cells[idx(nx,nz)];
        if(c===T_WATER||c===T_BLD||c===T_ROCK||c===T_TREE) continue;   // route around obstacles
        parent.set(k,K(x,z)); q.push([nx,nz]);
      }
    }
    if(!goal) continue;
    let cur=goal;
    while(cur){ const [x,z]=cur;
      if(!inside(x,z) && !isRoad(x,z) && cells[idx(x,z)]===T_EMPTY){ cells[idx(x,z)]=T_ROAD; roadLevel[idx(x,z)]=1; }
      const p=parent.get(K(x,z)); cur = p? p.split(',').map(Number) : null; }
  }
}

function place(type,x,z,free){
  if(type==='bridge'){
    if(!inb(x,z)) return false;
    if(cells[idx(x,z)]!==T_WATER) { msg('A bridge must span the river','bad'); return false; }
    if(!free && G.money<BTYPES.bridge.cost){ msg('Not enough denarii','bad'); return false; }
    if(!free) G.money-=BTYPES.bridge.cost;
    cells[idx(x,z)]=T_ROAD; roadLevel[idx(x,z)]=3; bridgeAt[idx(x,z)]=1;
    rebuildRoads(); msg('Bridge built','ok'); return true;
  }
  if(type==='road'){
    const err=canPlace('road',x,z);
    if(err) return false;
    if(cells[idx(x,z)]===T_ROAD) return false;
    clearDeco(x,z);
    cells[idx(x,z)]=T_ROAD; roadLevel[idx(x,z)]=1;
    if(!free && G.money<1) return false; if(!free) G.money-=1;
    rebuildRoads(); return true;
  }
  const err=canPlace(type,x,z); if(err) return false;
  const t=BTYPES[type];
  if(!free && G.money<t.cost){ msg('Not enough denarii (need '+t.cost+')','bad'); return false; }
  if(!free) G.money-=t.cost;
  for(let j=0;j<t.h;j++) for(let i=0;i<t.w;i++){ const c=idx(x+i,z+j); clearDeco(x+i,z+j); cells[c]=T_BLD; }
  const b={ id:blds.length, type, x, z, active:true, tier:type==='house'?0:0, prod:0, inbox:{},
    work:0, jobs:t.jobs||0, workers:0, level:1, merit:0, warnT:0, history:[], moneyMade:0, tierT:0 };
  for(let j=0;j<t.h;j++) for(let i=0;i<t.w;i++) bldAt[idx(x+i,z+j)]=b.id;
  blds.push(b);
  registerSources(b);
  b.mesh=buildingMesh(b); placeGroup(b);
  msg(t.name+' built','ok');
  return b;
}
function placeGroup(b){
  const [wx,wz]=worldOf(b.x,b.z); const t=BTYPES[b.type];
  const cx=wx+(t.w-1)*TILE/2, cz=wz+(t.h-1)*TILE/2;
  b.mesh.position.set(cx, heightAt(b.x,b.z), cz);
  b.mesh.rotation.y=0; bldGroup.add(b.mesh);
  b.cx=cx; b.cz=cz;
}
function demolish(b){
  const t=BTYPES[b.type];
  unregisterSources(b);
  for(const a of [...agents]) if(a.tower===b.id) killAgent(a);
  for(let j=0;j<t.h;j++) for(let i=0;i<t.w;i++){ const c=idx(b.x+i,b.z+j); cells[c]=T_EMPTY; bldAt[c]=-1; }
  bldGroup.remove(b.mesh);
  blds.splice(blds.indexOf(b),1);
  blds.forEach((x,i)=>x.id=i);
  rebuildBuildings();
  G.money+=Math.floor(t.cost*0.3);
  msg('Demolished, 30% refunded');
}
function rebuildBuildings(){
  for(const b of blds) if(b.mesh) bldGroup.remove(b.mesh);
  for(const b of blds){ b.mesh = b.type==='house'? houseMesh(b.tier) : buildingMesh(b); placeGroup(b); }
}

// ---------- roads mesh ----------
function rebuildRoads(){
  if(roadGroup){ scene.remove(roadGroup); roadGroup.traverse(o=>{if(o.isMesh)o.geometry.dispose();}); }
  roadGroup=new THREE.Group(); scene.add(roadGroup);
  for(let z=0;z<N;z++) for(let x=0;x<N;x++){
    const c=cells[idx(x,z)]; if(c!==T_ROAD) continue;
    const e=entranceOf?0:0;
    let lv=1; const n=idx(x,z);
    let conn=0; for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){ const xx=x+dx,zz=z+dz;
      if(inb(xx,zz)&&cells[idx(xx,zz)]===T_ROAD) conn++; }
    roadLevel[n]= bridgeAt[n] ? 3 : (conn>=3?2:1);
  }
  roadTiles=[];
  for(let z=0;z<N;z++) for(let x=0;x<N;x++) if(cells[idx(x,z)]===T_ROAD) roadTiles.push([x,z]);
  const mats=[null, mkMat(0x6b5f4a), mkMat(0x8a7b60)];
  for(let z=0;z<N;z++) for(let x=0;x<N;x++){
    if(cells[idx(x,z)]!==T_ROAD) continue;
    const lv=roadLevel[idx(x,z)];
    const [wx,wz]=worldOf(x,z);
    if(lv===3){ // bridge deck spanning the river
      const m=new THREE.Mesh(new THREE.BoxGeometry(TILE*1.04,0.30,TILE*1.04), mkMat(0x9a8f7a));
      m.position.set(wx, 0.10, wz);
      m.receiveShadow=true; m.castShadow=true; roadGroup.add(m); continue;
    }
    const m=new THREE.Mesh(new THREE.BoxGeometry(TILE*1.04,0.18,TILE*1.04), mats[lv]);
    m.position.set(wx,heightAt(x,z)+0.05,wz);
    m.receiveShadow=true; m.castShadow=false; roadGroup.add(m);
  }
}
