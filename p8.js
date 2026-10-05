// ============================================================================
//  FIELDS  —  decaying point sources, never a bitmap
//  Source of truth = the source list. A cached Float32Array is only ever a
//  derived view of that list. Two layers:
//    stable  : buildings, re-painted into the cache when invalidated
//    decaying: timed influences, re-summed each field tick from age
//  Nothing depends on the cached value, so nothing can go unstable.
// ============================================================================
let simClock = 0;
let fieldAcc = 0;

const DECAY = { desire:0.055, mood:0.06, sin:0.05, crime:0.14 };

class Field {
  constructor(name, lo, hi){ this.name=name; this.lo=lo; this.hi=hi;
    this.stable=[]; this.decaying=[]; this.cache=new Float32Array(N*N); this.dirty=true; }
  // a permanent point influence (a building). removed by identity on demolish.
  addStable(x,z,amp,r){ const s={x,z,amp,r,born:simClock}; this.stable.push(s); this.dirty=true; return s; }
  // a timed point influence; amplitude falls off exp(-lambda*age) on its own.
  addDecay(x,z,amp,r,life){ const s={x,z,amp,r,born:simClock,life:life||60};
    this.decaying.push(s); return s; }
  remove(src){ let i=this.stable.indexOf(src); if(i>=0){ this.stable.splice(i,1); this.dirty=true; } }
  removeAll(pred){ this.stable=this.stable.filter(s=>!pred(s)); this.dirty=true; }
  invalidate(){ this.dirty=true; }
  repaintStable(){
    const c=this.cache; c.fill(0);
    for(const s of this.stable){
      const r=s.r, r2=r*r;
      for(let j=-r;j<=r;j++) for(let i=-r;i<=r;i++){
        if(i*i+j*j>r2) continue;
        const x=s.x+i, z=s.z+j; if(!inb(x,z)) continue;
        const k=i*i+j*j;
        c[idx(x,z)] += s.amp * (1 - 0.45*(k/r2));   // soft radial rolloff, not a hard disc
      }
    }
    this.dirty=false;
  }
  // fold the decaying layer on top of the (already valid) stable layer
  ageLayer(){
    if(!this.decaying.length) return;
    const c=this.cache, lam=DECAY[this.name];
    for(let i=this.decaying.length-1;i>=0;i--){
      const s=this.decaying[i], age=simClock-s.born;
      if(age>s.life){ this.decaying.splice(i,1); this.dirty=true; continue; }
      const w = s.amp * Math.exp(-lam*age) * (1-age/s.life);
      const r=s.r, r2=r*r;
      for(let j=-r;j<=r;j++) for(let i2=-r;i2<=r;i2++){
        if(i2*i2+j*j>r2) continue;
        const x=s.x+i2, z=s.z+j; if(!inb(x,z)) continue;
        c[idx(x,z)] += w * (1 - 0.45*((i2*i2+j*j)/r2));
      }
    }
  }
  clampAll(){ const c=this.cache; for(let i=0;i<c.length;i++){ c[i]=Math.max(this.lo,Math.min(this.hi,c[i])); } }
  at(x,z){ return inb(x,z) ? this.cache[idx(x,z)] : this.lo; }
  // neighbourhood mean over a footprint
  atBuilding(b){
    const t=BTYPES[b.type]; let s=0,n=0;
    for(let j=0;j<t.h;j++) for(let i=0;i<t.w;i++){ if(inb(b.x+i,b.z+j)){ s+=this.cache[idx(b.x+i,b.z+j)]; n++; } }
    return n? s/n : this.lo;
  }
}

const F_DESIRE = new Field('desire', 0, 100);
const F_MOOD   = new Field('mood', -1, 1);
const F_SIN    = new Field('sin', 0, 1);
const F_CRIME  = new Field('crime', 0, 1);
const FIELDS = [F_DESIRE, F_MOOD, F_SIN, F_CRIME];

// mood is a lagging state (an EMA with a time constant), not an instant value
const moodState = new Float32Array(N*N);

// what each building contributes, as point influences
const SRC = {
  well:     {desire:{a:3.0, r:6}},
  cistern:  {desire:{a:3.4, r:12}},
  aqueduct: {desire:{a:4.0, r:18}},
  market:   {desire:{a:3.0, r:6}},
  granary:  {desire:{a:2.0, r:5}},
  temple:   {desire:{a:8.0, r:9},  sin:{a:-0.34, r:9}},
  park:     {desire:{a:6.0, r:7}},
  senate:   {desire:{a:8.0, r:13}},
  // vice: sin out, desirability down
  lararium:  {sin:{a:-0.55, r:11}, desire:{a:3.0, r:9}},
  alehouse: {sin:{a:0.30, r:7},  desire:{a:-2.6, r:5}},
  gambling: {sin:{a:0.42, r:8},  desire:{a:-3.6, r:6}},
  brothel:  {sin:{a:0.52, r:9},  desire:{a:-4.6, r:7}},
  opiumden: {sin:{a:0.72, r:10}, desire:{a:-6.0, r:8}},
};

const VICE = ['alehouse','gambling','brothel','opiumden','lararium'];

function registerSources(b){
  const def=SRC[b.type]; if(!def) return;
  b._src=[];
  for(const f in def){
    const F = f==='desire'?F_DESIRE : f==='sin'?F_SIN : null;
    const cx=b.x+((BTYPES[b.type].w/2)|0), cz=b.z+((BTYPES[b.type].h/2)|0);
    b._src.push(F.addStable(cx,cz,def[f].a,def[f].r));
  }
}
function unregisterSources(b){
  if(!b._src) return;
  for(const s of b._src){ F_DESIRE.remove(s); F_SIN.remove(s); }
  b._src=null;
}

// ---------- desirability / mood / crime queries ----------
function desireAt(b){ return F_DESIRE.atBuilding(b); }
function sinAt(b){ return F_SIN.atBuilding(b); }
function moodAt(b){ return F_MOOD.atBuilding(b); }
function crimeAt(x,z){ return F_CRIME.at(x,z); }

// per-household shortages feed mood
function shortageOf(b){
  let pen=0;
  const next=HOUSE_TIERS[b.tier+1];
  if(!hasWater(b)) pen+=0.30;
  if(depot.food<10 || (b.inbox&&b.inbox.food||0)<1) pen+=0.20;
  if(next && b.tier>0){
    let short=0; for(const k in next.needs) if((b.inbox[k]||0)<next.needs[k]) short++;
    pen += Math.min(0.30, short*0.09);
  }
  if(G.balance<0) pen+=0.12;
  pen += Math.max(0,(G.taxRate-1))*0.09;
  return Math.min(0.95,pen);
}
function moodTarget(x,z){
  const d=F_DESIRE.at(x,z);
  let m = Math.tanh(d/14 - 0.30);
  m -= shortageAtTile(x,z);
  m -= Math.min(1,F_SIN.at(x,z))*0.22;
  return Math.max(-1,Math.min(1,m));
}
function shortageAtTile(x,z){
  let pen=0;
  if(depot.food<10) pen+=0.20;
  if(G.balance<0) pen+=0.12;
  pen += Math.max(0,(G.taxRate-1))*0.09;
  // water coverage at this exact tile
  let watered=false;
  for(const w of blds){
    if(w.type!=='well'&&w.type!=='cistern'&&w.type!=='aqueduct') continue;
    if(!w.active) continue;
    const r=waterRange(w);
    if(Math.hypot(w.x-x,w.z-z)<=r){ watered=true; break; }
  }
  if(!watered) pen+=0.18;
  return Math.min(0.95,pen);
}

// crime = tanh( sin * (1-mood)^1.5 * 2.4 )   -> right sign in all four quadrants
function crimeFormula(sin,mood){
  const a = Math.max(0,1-mood);
  return Math.tanh(sin * Math.pow(a,1.5) * 2.4);
}

function fieldTick(dt){
  simClock += dt;
  for(const f of FIELDS) if(f.dirty) f.repaintStable();
  for(const f of FIELDS) f.ageLayer();
  // mood lags toward its target (time constant ~8s)
  const k = 1-Math.exp(-dt/8);
  for(let z=0;z<N;z++) for(let x=0;x<N;x++){
    const i=idx(x,z);
    const d=F_DESIRE.cache[i];
    let m=Math.tanh(d/14-0.30);
    m-=shortageAtTile(x,z);
    m-=Math.min(1,F_SIN.cache[i])*0.22;
    moodState[i] += (Math.max(-1,Math.min(1,m)) - moodState[i])*k;
  }
  F_SIN.clampAll();
  // publish mood + derive crime
  F_MOOD.cache.set(moodState);
  for(let i=0;i<N*N;i++) F_CRIME.cache[i]=crimeFormula(F_SIN.cache[i], moodState[i]);
  F_CRIME.ageLayer();
  F_CRIME.clampAll();
  // sin in a house's own radius feeds the money it makes
  for(const b of blds) if(VICE.includes(b.type)) b.sinLocal=F_SIN.atBuilding(b);
  G.moodAvg = avgMood();
}
function avgMood(){
  let s=0,n=0;
  for(const b of blds){ if(b.type!=='house') continue; s+=moodAt(b); n++; }
  return n? s/n : 0;
}

// ============================================================================
//  DEBUG FIELD OVERLAY  (V cycles desire / mood / sin / crime)
// ============================================================================
let fieldOverlay=null, fieldMode=-1;
const FIELD_MODES=['desirability','mood','sin','crime'];
function cycleFieldOverlay(){
  fieldMode=(fieldMode+1)%(FIELD_MODES.length+1);
  if(fieldOverlay){ scene.remove(fieldOverlay); fieldOverlay.traverse(o=>{ if(o.isMesh) o.geometry.dispose(); }); fieldOverlay=null; }
  if(fieldMode>=0) buildFieldOverlay();
  msg(fieldMode>=0? ('Field overlay: '+FIELD_MODES[fieldMode]) : 'Field overlay off');
}
function buildFieldOverlay(){
  fieldOverlay=new THREE.Group(); scene.add(fieldOverlay);
  const geo=new THREE.PlaneGeometry(TILE*0.96,TILE*0.96); geo.rotateX(-Math.PI/2);
  const col=new THREE.Color();
  for(let z=0;z<N;z++) for(let x=0;x<N;x++){
    if(cells[idx(x,z)]===T_WATER) continue;
    const i=idx(x,z);
    if(fieldMode===0){ const v=F_DESIRE.cache[i]/40; if(v<0.04) continue; col.setHSL(0.33,0.7,0.2+v*0.35); }
    else if(fieldMode===1){ const v=moodState[i]; if(Math.abs(v)<0.05) continue;
      col.setHSL(v>0?0.32:0.0, 0.75, 0.25+Math.abs(v)*0.3); }
    else if(fieldMode===2){ const v=F_SIN.cache[i]; if(v<0.03) continue; col.setHSL(0.88,0.85,0.22+v*0.3); }
    else { const v=F_CRIME.cache[i]; if(v<0.03) continue; col.setHSL(0.02,0.9,0.25+v*0.3); }
    const m=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:0.42,depthWrite:false}));
    const [wx,wz]=worldOf(x,z); m.position.set(wx,heightAt(x,z)+0.12,wz);
    fieldOverlay.add(m);
  }
}

// ============================================================================
//  AGENTS  —  tax collectors, criminals, prefects
// ============================================================================
function figureMesh(coat,skin,hat,pack){
  const g=new THREE.Group();
  const m=mkMat(coat), s=mkMat(skin);
  const body=new THREE.Mesh(new THREE.BoxGeometry(0.42,0.66,0.28),m); body.position.y=0.72; body.castShadow=true; g.add(body);
  const head=new THREE.Mesh(new THREE.BoxGeometry(0.24,0.26,0.24),s); head.position.y=1.18; g.add(head);
  for(const ox of [-0.11,0.11]){
    const leg=new THREE.Mesh(new THREE.BoxGeometry(0.13,0.42,0.14),m);
    leg.position.set(ox,0.21,0); leg.castShadow=true; g.add(leg);
  }
  if(hat)  { const h=new THREE.Mesh(hat.g, hat.m); h.position.y=1.34; h.castShadow=true; g.add(h); }
  if(pack){ const p=new THREE.Mesh(new THREE.BoxGeometry(0.38,0.32,0.3),mkMat(pack));
    p.position.set(0,0.78,-0.3); g.add(p); }
  return g;
}
const HAT_PREFECT=()=>({g:new THREE.CylinderGeometry(0.14,0.17,0.2,8), m:mkMat(0xd4a53c)});
const HAT_THIEF=()=>({g:new THREE.ConeGeometry(0.16,0.22,6), m:mkMat(0x2a2018)});

function walkerMesh(kind){
  if(kind==='collector'){
    const g=figureMesh(0xdcd2b8,0xc9a184,null,0x8a6a3a);
    const chest=new THREE.Mesh(new THREE.BoxGeometry(0.4,0.3,0.26),mkMat(0x8a6a3a));
    chest.position.set(0,0.72,0.26); g.add(chest);
    g.userData.chest=chest;
    return g;
  }
  if(kind==='criminal'){
    const g=figureMesh(0x4a3a44,0xb08e70,HAT_THIEF(),null);
    const club=new THREE.Mesh(new THREE.BoxGeometry(0.1,0.5,0.1),mkMat(0x5a4028));
    club.position.set(0.3,0.8,0.1); club.rotation.z=-0.4; g.add(club);
    return g;
  }
  const g=figureMesh(0x8a2b2b,0xc9a184,HAT_PREFECT(),null);
  const spear=new THREE.Mesh(new THREE.CylinderGeometry(0.03,0.03,1.7,5),mkMat(0x7a5a34));
  spear.position.set(0.32,0.9,0); g.add(spear);
  const tip=new THREE.Mesh(new THREE.ConeGeometry(0.08,0.24,5),mkMat(0xb9c0c8));
  tip.position.set(0.32,1.8,0); g.add(tip);
  return g;
}
const MAX_CRIM=40, MAX_PREF=24, MAX_COLL=6;

function newAgent(kind,x,z){
  const g=walkerMesh(kind);
  const [wx,wz]=worldOf(x,z); g.position.set(wx,heightAt(x,z),wz);
  scene.add(cartGroup).add(g);
  const a={kind,g,path:null,pi:0,t:0,speed:kind==='criminal'?3.0:4.2,
    x,z, ox:0, oz:0, hp:kind==='prefect'?100:40, target:null, res:null, cd:0, life:0, purse:0};
  return a;
}
function sendAgent(a,tx,tz){
  const p=astar(a.x,a.z,tx,tz);
  if(!p||p.length<2) return false;
  a.path=p; a.pi=0; a.t=0; return true;
}
function stepAgent(a,dt){
  if(!a.path||a.path.length<2) return false;
  const seg=a.path.length-1;
  a.t+=dt*a.speed/TILE;
  let moved=false;
  while(a.t>=1){
    a.t-=1; a.pi++;
    if(a.pi>=seg){ a.x=a.path[seg][0]; a.z=a.path[seg][1]; a.path=null; return true; }
    moved=true;
  }
  const A=a.path[a.pi], B=a.path[a.pi+1];
  const [ax,az]=worldOf(A[0],A[1]), [bx,bz]=worldOf(B[0],B[1]);
  a.g.position.set(THREE.MathUtils.lerp(ax,bx,a.t), heightAt(A[0],A[1]), THREE.MathUtils.lerp(az,bz,a.t));
  a.g.rotation.y=Math.atan2(bx-ax,bz-az);
  a.x=A[0]; a.z=A[1];
  return moved;
}
function killAgent(a){ const i=agents.indexOf(a); if(i>=0) agents.splice(i,1); cartGroup.remove(a.g); }
const agents=[];

// ---------- tax collectors: greedy route over outstanding tax ----------
const collectors = () => agents.filter(a=>a.kind==='collector');
const criminals = () => agents.filter(a=>a.kind==='criminal');
const prefects  = () => agents.filter(a=>a.kind==='prefect');

function spawnCollector(){
  const m=anyMarket(); if(!m) return;
  const e=entranceOf(m); if(!e) return;
  const a=newAgent('collector',e.x,e.z); agents.push(a); planCollector(a);
}
function planCollector(a){
  // Greedy circuit: no purse ceiling at all. Walk the streets and take every
  // penny anyone owes, richest debtor first, until the road network has nothing
  // left worth walking to. Then carry the whole purse home in one go.
  a.legs=[]; a.visit=null; a.done=false; a.depositLeg=false;
  const taken=new Set();
  let cur={x:a.x,z:a.z};
  for(let stops=0; stops<16; stops++){
    let best=null,bv=0;
    for(const b of blds){
      if(b.type!=='house'||!b.active) continue;
      if((b.debt||0)<=0.5 || taken.has(b)) continue;
      const be=entranceOf(b); if(!be) continue;
      if(!astar(cur.x,cur.z,be.x,be.z)) continue;
      if(b.debt>bv){ bv=b.debt; best=b; }
    }
    if(!best) break;
    taken.add(best);
    a.legs.push(best);
    cur=entranceOf(best);
  }
  if(!a.legs.length) return false;
  const first=entranceOf(a.legs[0]);
  if(!sendAgent(a,first.x,first.z)){ a.legs=[]; return false; }
  a.visit=a.legs[0]; a.done=false;
  return true;
}
function updateCollectors(dt){
  if(collectors().length<MAX_COLL && Math.random()<dt*0.22){
    if(blds.some(b=>b.type==='house'&&(b.debt||0)>0.5)) spawnCollector();
  }
  for(const a of collectors()){
    a.life+=dt;
    // arriving at a stop: take everything that house owes, then head for the next
    if(!a.path){
      if(a.visit && !a.done){
        const b=a.visit;
        if(b && (b.debt||0)>0.5){
          const got=b.debt; a.purse+=got; b.debt=0; b.dueAge=0; b.lastPaid=simClock;
          msg('A collector took '+Math.round(got)+' denarii from a '+HOUSE_TIERS[b.tier].name.toLowerCase(),'ok',true);
        }
        a.done=true;
        a.legs.shift();
        a.visit=a.legs[0]||null;
        if(a.visit){
          const be=entranceOf(a.visit);
          // a thief shook this one off mid-route: replan from here
          if(be && sendAgent(a,be.x,be.z)) { a.done=false; continue; }
          a.visit=null;
        }
      }
      // circuit finished (or nothing left reachable): carry the purse to the market
      if(a.purse>0){
        const m=anyMarket(), e=m&&entranceOf(m);
        if(e && sendAgent(a,e.x,e.z)){ a.depositLeg=true; continue; }
        // no road home: the state takes the money directly rather than losing it
        G.money+=a.purse; G.taxHauled=(G.taxHauled||0)+a.purse; a.purse=0;
      }
      a.depositLeg=false; a.done=false; a.visit=null; a.legs=[];
      if(collectors().length>1 && !planCollector(a)) killAgent(a);   // idle: retire
      continue;
    }
    const arrived=stepAgent(a,dt);
    if(arrived && a.depositLeg){
      if(a.purse>0){ G.money+=a.purse; G.taxHauled=(G.taxHauled||0)+a.purse;
        msg('The treasury received '+Math.round(a.purse)+' denarii','good',true);
        a.purse=0; }
      a.depositLeg=false; a.done=false; a.visit=null; a.legs=[];
    }
  }
}

// ---------- criminals: they stand in the streets and hit what walks by ----------
// how often a collector has walked each road tile — thieves camp on busy streets
const traffic = new Float32Array(N*N);
function roadTileList(){ return roadTiles; }
function spawnCriminal(){
  if(criminals().length>=MAX_CRIM) return;
  const list=roadTiles; if(!list||!list.length) return;
  for(let tries=0;tries<10;tries++){
    const [x,z]=list[(Math.random()*list.length)|0];
    const c=F_CRIME.at(x,z);
    if(c<0.08) continue;
    // busy streets pull the thieves: crime decides IF, traffic decides WHERE
    const lure = Math.min(6, 1+traffic[idx(x,z)]);
    if(Math.random()> c*1.4/lure) continue;
    const a=newAgent('criminal',x,z); a.cd=0.6; agents.push(a);
    return;
  }
}
function updateCriminals(dt){
  // P(spawn) per sampled road tile per tick, straight off the crime field
  const p = crimeSpawnRate()*dt;
  const attempts=2;
  for(let i=0;i<attempts;i++) if(Math.random()<p) spawnCriminal();
  for(const a of criminals()){
    a.life+=dt; a.cd-=dt;
    if(a.cd>0) continue;
    a.cd=0.55;
    // ambush: anything that steps on my tile
    for(const c of collectors()){
      if(Math.abs(c.x-a.x)<=1 && Math.abs(c.z-a.z)<=1){
        // the purse was never credited to the treasury, so a theft simply
        // destroys that revenue rather than punching a hole in the books
        if(c.purse>0){ G.stolen=(G.stolen||0)+c.purse;
          msg('A thief robbed the tax collector of '+Math.round(c.purse)+' denarii!','bad');
          F_DESIRE.addDecay(a.x,a.z,-3.0,6,45);
          // robbed clean: the thief takes the ENTIRE purse. The collector keeps
          // their remaining route and carries on with an empty bag.
          c.purse=0; c.done=false; c.path=null;
          a.hp-=15; a.cd=2.2;
        } else a.hp-=6;
      }
    }
    for(const cart of [...carts]){
      const cx=Math.round(cart.g.position.x/TILE+N/2-0.5), cz=Math.round(cart.g.position.z/TILE+N/2-0.5);
      // only a genuinely lawless corner robs carts, and not every time
      if(Math.abs(cx-a.x)<=1 && Math.abs(cz-a.z)<=1 && cart.stage==='out'
         && F_CRIME.at(a.x,a.z)>0.45 && Math.random()<0.4){
        destroyCart(cart);
        if(cart.toB && cart.res) cart.toB.warn='delivery lost to thieves';
        G.robbed=(G.robbed||0)+1;
        msg('Thieves robbed a supply cart in the street','bad');
        F_DESIRE.addDecay(a.x,a.z,-2.2,5,40);
        a.hp-=10; a.cd=2.2;
      }
    }
    // opportunistic: with nothing to hit, drift toward streets the tax
    // money actually uses, and otherwise loiter where crime is thickest
    if(a.path) stepAgent(a,dt);
    else if(a.life>10 && Math.random()<0.06){
      let bx=a.x,bz=a.z,bs=-1;
      for(let i=0;i<14;i++){
        const x=Math.max(0,Math.min(N-1,a.x+((Math.random()*17|0)-8)));
        const z=Math.max(0,Math.min(N-1,a.z+((Math.random()*17|0)-8)));
        if(!roadLevel[idx(x,z)]) continue;
        const s2=traffic[idx(x,z)]*3+F_CRIME.at(x,z);
        if(s2>bs){ bs=s2; bx=x; bz=z; }
      }
      if(bs>0) sendAgent(a,bx,bz);
    }
    if(a.life>260 && Math.random()<0.3) killAgent(a);
  }
}
// coefficient in front of the per-tile spawn probability
function crimeSpawnRate(){ return 0.05; }

// ---------- prefects: fixed respawn, A* to a reported criminal, brawl ----------
const PREF_RESPAWN=18;
function updatePrefects(dt){
  const towers=blds.filter(b=>b.type==='watchtower'&&b.active);
  for(const tw of towers){
    tw.respawn=(tw.respawn||0)-dt;
    const mine=prefects().filter(p=>p.tower===tw.id).length;
    if(tw.respawn<=0 && mine<Math.min(4,1+Math.round(BTYPES.watchtower.jobs/3))){
      tw.respawn=PREF_RESPAWN;
      const e=entranceOf(tw); if(!e){ if(!tw._warned){ tw._warned=true; msg('A watchtower has no road access — no prefects can leave it','bad'); } continue; }
      const a=newAgent('prefect',e.x,e.z); a.tower=tw.id; a.respawn=PREF_RESPAWN;
      agents.push(a);
    }
  }
  for(const a of prefects()){
    a.life+=dt; a.cd-=dt;
    if(!a.path){
      let best=null,bd=1e9;
      for(const c of criminals()){
        const d=Math.hypot(c.x-a.x,c.z-a.z);
        if(d<bd){ bd=d; best=c; }
      }
      a.target=best;
      a.repath=(a.repath||0)-dt;
      if(best && bd<=34 && a.repath<=0){ if(sendAgent(a,best.x,best.z)) a.repath=2.5; else a.repath=0.8; }
    }
    // hold position while brawling, otherwise march on the reported crime
    const engaged = a.path && a.path.length-1>0 && Math.hypot(a.target?a.target.x-a.x:99, a.target?a.target.z-a.z:99)<=2;
    if(a.path && !engaged) stepAgent(a,dt);
    if(a.cd>0) continue;
    a.cd=0.6;
    // brawl whoever is next to me
    for(const c of [...criminals()]){
      if(Math.hypot(c.x-a.x,c.z-a.z)<=1.6){
        c.hp-=18; a.hp-=9;
        c.cd=1.1;
        if(c.hp<=0){
          killAgent(c);
          // a body in the street scares the neighbours off: a negative influence on crime
          F_CRIME.addDecay(a.x,a.z,-0.22,5,70);
          G.slain=(G.slain||0)+1;
        }
        if(a.hp<=0){
          killAgent(a);
          msg('A prefect was killed in the streets','bad');
          F_DESIRE.addDecay(a.x,a.z,-2.5,6,50);
          break;
        }
      }
    }
  }
}

function updateAgents(dt){
  updateCollectors(dt);
  updateCriminals(dt);
  updatePrefects(dt);
}

// ---------- BOOT (fields must exist before the city is founded) ----------
init();
