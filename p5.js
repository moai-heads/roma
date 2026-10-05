// ---------- SIMULATION ----------
function foodCap(){ return blds.some(b=>b.type==='granary')?900:200; }
function allJobs(){ return blds.reduce((s,b)=>s+(b.type==='house'?0:BTYPES[b.type].jobs||0),0); }
function countPop(){ return blds.filter(b=>b.type==='house').reduce((s,b)=>s+HOUSE_TIERS[b.tier].pop,0); }
function desirability(b){ return F_DESIRE.atBuilding(b); }

function simTick(dt){
  G.netTick=(G.netTick||0)+1;
  // tick accumulator handled in loop
  const market=anyMarket();
  // --- producers generate output into market stock (needs road link) ---
  for(const b of blds){
    if(!b.active) continue;
    const r=RECIPES[b.type]; if(!r) continue;
    const linked = (b.type==='import')? true : canReach(b,'market');
    if(!roadTo(b)){ b.warn='no road access'; continue; }
    b.warn = linked? null : 'no road to a market';
    b.work=Math.min(1,(b.work||0)+dt*0.22);
    if(b.work<1) continue;
    b.work=0;
    if(NEEDS_WATER.includes(b.type) && !hasWater(b)){ b.warn='needs a water supply nearby'; continue; }
    const fneed=FERTILE_NEED[b.type];
    if(fneed!==undefined && fertilityAt(b.x,b.z,BTYPES[b.type].w,BTYPES[b.type].h)<fneed){ b.warn='soil too poor'; continue; }
    if(r.in){
      let can=true; for(const k in r.in) if((stock[k]||0)<r.in[k]) can=false;
      if(!can) continue;
      for(const k in r.in) stock[k]-=r.in[k];
      if(!market){ for(const k in r.in) stock[k]+=r.in[k]; continue; }
    }
    const tgt = (r.out==='food')? 'food' : r.out;
    const cap = (r.out==='food')? foodCap() : 9999;
    if(r.out==='food' && depot.food>=cap) continue;
    if(r.out==='food') depot.food+=r.amt; else stock[r.out]=(stock[r.out]||0)+r.amt;
    if(b.type==='woodcutter'){
      const t=BTYPES[b.type]; let strip=0;
      for(let j=-3;j<=3;j++) for(let i=-3;i<=3;i++){ const xx=b.x+i,zz=b.z+j;
        if(inb(xx,zz)){ soil[idx(xx,zz)]=Math.max(0.05,soil[idx(xx,zz)]-0.035); strip++; } }
      if(b._stripped!==strip){ b._stripped=strip; rebuildSoilOverlay(); }
    }
    if(r.extra) stock[r.extra]=(stock[r.extra]||0)+r.amt2;
    if(b.type==='import'){ b.tradeTimer=(b.tradeTimer||0)+1; if(b.tradeTimer>=3){ b.tradeTimer=0; G.money+=r.amt*14; } }
  }
  // --- houses: request goods, point-to-point carts from market ---
  const mk = market;
  for(const b of blds){
    if(b.type!=='house'||!b.active) continue;
    const next=HOUSE_TIERS[b.tier+1];
    if(!next){ continue; }
    if(!roadTo(b)){ b.warn='no road access'; continue; }
    if(!mk){ b.warn='no market'; continue; }
    // already being served?
    if(carts.some(c=>c.toB===b)) continue;
    const canAfford = b.level>=1 && (b.level>=4? true : true);
    b.warn=null;
    // work out which needed good is short at the doorstep AND available at the market
    let pick=null;
    for(const k in next.needs){
      const have=b.inbox[k]||0;
      if(have>=next.needs[k]) continue;
      const avail=(k==='food'?depot.food:stock[k]||0);
      if(avail>=2){ pick=k; break; }
    }
    if(!pick){ b.warn='short of: '+Object.entries(next.needs).filter(([k,v])=>(b.inbox[k]||0)<v).map(([k,v])=>`${v} ${k}`).join(', '); continue; }
    const amt=Math.min(4,Math.max(2,next.needs[pick]-(b.inbox[pick]||0)));
    if(spawnCart(mk,b,pick,amt,mk)){
      if(pick==='food') depot.food-=amt; else stock[pick]-=amt;
      b.demand=pick;
    } else b.warn='cart has no path (road to market?)';
  }
  // --- house tier up ---
  for(const b of blds){
    if(b.type!=='house') continue;
    const cur=HOUSE_TIERS[b.tier];
    const next=HOUSE_TIERS[b.tier+1]; if(!next) continue;
    const inbox=b.inbox||{};
    if(b.tierT>0) b.tierT-=1;
    if(b.tierT>0) continue;
    let ok=true;
    for(const k in next.needs) if((inbox[k]||0)<next.needs[k]) ok=false;
    if(!ok) continue;
    if(!roadTo(b)) continue;
    // desirability requirement
    if(next.water && !hasWater(b)){ b.warn='no drinking water in reach'; continue; }
    if(desirability(b) < (b.tier+1)*2.6) continue;
    if(moodAt(b) < -0.02) { b.warn='the mood here is too low to grow'; continue; }
    for(const k in next.needs) inbox[k]-=next.needs[k];
    b.tier++;
    b.level=b.tier+1;
    bldGroup.remove(b.mesh); b.mesh=houseMesh(b.tier); placeGroup(b);
    b.tierT=2;
    G.money+=cur.tax*10;
    msg(blds.indexOf(b)<0?'':(HOUSE_TIERS[b.tier].name+' completed!'),'good');
    notifications.push({t:'A house grew into a '+HOUSE_TIERS[b.tier].name+'!',k:'evolve'});
  }
  // --- bad mood, or a supply that keeps failing, drives a house back down a tier ---
  for(const b of blds){
    if(b.type!=='house'||!b.active) continue;
    if(b.tier<1) continue;
    if(b.tierT>0){ b.tierT-=1; continue; }
    const m=moodAt(b);
    b.mood=m;
    const starving = (depot.food<10) || (b.inbox.food||0)<1;
    if(m<-0.22 || (starving && m<-0.05)){
      b.demoteT=(b.demoteT||0)+1;
      if(b.demoteT>3){
        b.demoteT=0; b.tier--; b.level=b.tier+1;
        bldGroup.remove(b.mesh); b.mesh=houseMesh(b.tier); placeGroup(b);
        msg('A household slipped back to a '+(HOUSE_TIERS[b.tier].name||'tent')+' — bad mood','bad');
      }
    } else b.demoteT=0;
  }
  // --- vice evolves out of sustained sin ---
  for(const b of blds){
    if(b.type!=='alehouse'&&b.type!=='brothel') continue;
    const s2=b.sinLocal||0;
    const gate = b.type==='alehouse'?0.55:0.75;
    if(s2>gate){
      b.evoT=(b.evoT||0)+dt;
      if(b.evoT>45){
        b.evoT=0;
        const to = b.type==='alehouse'?'gambling':'opiumden';
        unregisterSources(b); b.type=to;
        registerSources(b);
        bldGroup.remove(b.mesh); b.mesh=buildingMesh(b); placeGroup(b);
        msg('The '+BTYPES[to].name+' has grown out of the local vice','bad');
      }
    } else b.evoT=Math.max(0,(b.evoT||0)-dt*0.5);
  }
  // --- field + agent simulation ---
  fieldAcc+=dt;
  while(fieldAcc>=0.25){ fieldAcc-=0.25; fieldTick(0.25); }
  updateAgents(dt);
  // --- despawn/downgrade if abandoned ---
  for(const b of [...blds]){
    if(b.type!=='house') continue;
    if(b.tier>0 && (b.abandoned=(b.abandoned||0)+(roadTo(b)?0:1))>0){
      // no road -> decay
    }
  }
  // --- pop, tax, happiness ---
  G.pop=countPop();
  taxTick(dt);
  G.happiness=Math.max(0,Math.min(100, 50 + (G.moodAvg||0)*70 + (blds.some(b=>b.type==='park')?10:0) + (stock.wine>5?5:0)
      - (G.taxRate-1)*11                      // heavy taxation angers the plebs
      + (G.balance>0?4:-6)                    // solvent or not
      - (depot.food<10?15:0) - (blds.filter(b=>b.warn).length>6?10:0)));
  G.favor=Math.max(0,Math.min(100,40 + blds.filter(b=>b.type==='temple').length*8
      + blds.filter(b=>b.type==='senate').length*10 + (G.taxRate-1)*6 - (G.balance<0?8:0)));
  G.timeAcc=(G.timeAcc||0)+dt;
  if(G.timeAcc>2.0){ G.timeAcc=0; G.month++; if(G.month>=12){G.month=0;G.year++;} settleMonth(); }
  // --- servant path visualisation ---
  if(showPaths){
    if(!pathGroup){ pathGroup=new THREE.Group(); scene.add(pathGroup); }
    while(pathGroup.children.length){ const o=pathGroup.children.pop(); o.geometry.dispose(); }
    const mats={food:0xd8b24a};
    for(const c of carts){
      const pts=c.path.map(([x,z])=>new THREE.Vector3(...(()=>{const [wx,wz]=worldOf(x,z);return [wx,heightAt(x,z)+0.4,wz];})()));
      if(pts.length<2) continue;
      const col=new THREE.Color(RES_COLOR[c.res]||0xffffff);
      const g=new THREE.BufferGeometry().setFromPoints(pts);
      pathGroup.add(new THREE.Line(g,new THREE.LineBasicMaterial({color:col,transparent:true,opacity:0.75})));
    }
  } else if(pathGroup){ while(pathGroup.children.length){ const o=pathGroup.children.pop(); o.geometry.dispose(); } }
  // carts cap
  const jobs=allJobs();
  if(carts.length> Math.max(6, jobs*1.2)) { const c=carts[0]; destroyCart(c); }
}


// ================= TAX & TREASURY =================
function upkeepOf(b){
  const t=BTYPES[b.type];
  if(b.type==='road') return 0;
  return Math.max(1, Math.round(t.cost*0.008 + (t.jobs||0)*0.045));
}
function taxRate(){ return G.taxRate; }
function setTaxRate(r){ G.taxRate=r; computeBooks(); renderHUD(); msg('Tax rate set to '+['Low','Balanced','High'][r-1],'ok'); }

function computeBooks(){
  let gross=0, active=0;
  for(const b of blds){
    if(b.type!=='house') continue;
    const t=HOUSE_TIERS[b.tier];
    if(t.tax<=0) continue;
    // a delighted household pays more; an unhappy one pays less (or nothing)
    const mood = 0.45 + Math.min(1.5, desirability(b)/4.5);
    gross += t.tax * mood * G.taxRate;
    active++;
  }
  let upkeep=0;
  for(const b of blds){
    let u=upkeepOf(b);
    // an idle or broken building costs you less than a working one
    if(b.warn) u=Math.round(u*0.6);
    upkeep += u;
  }
  let vice=0;
  for(const b of blds){
    if(!VICE.includes(b.type)||!b.active) continue;
    const local=Math.max(0,b.sinLocal||0);
    const m=moodAt(b);
    if(m<-0.55){ b.warn='condemned: the neighbourhood will not tolerate it'; continue; }
    b.warn=null;
    // revenue scales with how much sin is actually around it, times the
    // neighbourhood's tolerance — a contented, sin-free block pays nothing
    vice += BTYPES[b.type].tax * local * Math.max(0, 0.45+m) * 3.2 * G.taxRate;
  }
  G.vice=Math.floor(vice);
  gross += vice;
  const roads=[...cells].filter(c=>c===T_ROAD).length;
  upkeep += roads*0.03;
  G.tax=Math.floor(gross);
  G.upkeep=Math.round(upkeep);
  G.balance=G.tax-G.upkeep;
  G.taxpayers=active;
  G.serfTax=G.tax-Math.round(vice);
  G.solvent = G.money + Math.max(0,G.balance) > 60;
}

function taxTick(dt){
  // continuous accrual so the treasury never feels frozen
  computeBooks();
  G.money += G.vice * dt * 0.08;     // vice pays straight in
  G.money -= G.upkeep * dt * 0.10;   // services are paid for continuously
  if(G.balance < 0){
    // unpaid public services start to rot
    G.unpaid = (G.unpaid||0) + dt*0.02;
    if(G.unpaid>1){ G.unpaid=0;
      G.happiness=Math.max(0,(G.happiness||55)-1);
      for(const b of blds) if(b.type==='house') b.unpaidMonths=(b.unpaidMonths||0)+1;
    }
  } else G.unpaid=0;
}

function settleMonth(){
  computeBooks();
  G.lastMonth = {tax:G.tax, upkeep:G.upkeep, bal:G.balance};
  // house tax becomes debt on the household; a collector has to walk it to the market
  for(const b of blds){
    if(b.type!=='house') continue;
    const t=HOUSE_TIERS[b.tier];
    if(t.tax<=0) continue;
    const mood=0.45+Math.min(1.5, moodAt(b)/4.5);
    b.debt=(b.debt||0) + t.tax*mood*G.taxRate;
    b.dueAge=(b.dueAge||0)+1;
    // tax uncollected for 3 months is eventually recovered by the state, at a loss
    if(b.dueAge>=4 && b.debt>0){ G.money += b.debt*0.85; b.debt=0; b.dueAge=0;
      msg('The state recovered uncollected tax','bad',true); }
  }
  if(G.balance<0){
    msg('The treasury is in deficit: '+(G.balance)+' denarii. Services decay.','bad');
  }
  // unpaid households abandon
  for(const b of [...blds]){
    if(b.type!=='house') continue;
    if((b.unpaidMonths||0)>=6 && b.tier>0 && G.money<0){
      b.tier--; b.level=b.tier+1; b.unpaidMonths=0;
      bldGroup.remove(b.mesh); b.mesh=houseMesh(b.tier); placeGroup(b);
      msg('A household abandoned its domus — they could not pay the tax.','bad');
    }
  }
}
