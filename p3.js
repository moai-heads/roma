// ---------- placement ----------
function canPlace(type,x,z){
  const t=BTYPES[type];
  if(type==='road'){
    if(!inb(x,z)) return 'out';
    if(cells[idx(x,z)]===T_BLD) return 'building';
    if(cells[idx(x,z)]===T_WATER) return 'water';
    return null;
  }
  if(!inb(x,z)) return 'out';
  for(let j=0;j<t.h;j++) for(let i=0;i<t.w;i++){
    const xx=x+i, zz=z+j; if(!inb(xx,zz)) return 'out';
    const c=cells[idx(xx,zz)];
    if(c===T_WATER) return 'water';
    if(c===T_BLD) return 'building';
    if(c===T_ROCK) return 'rock';
  }
  return null;
}

// Why a tile cannot take this building right now, for the hover ghost.
// (updateGhost has called this since it was written but the function never existed --
// every mousemove threw a ReferenceError, so the ghost and the red 'cannot build here'
// message were silently dead.)
const SITE_WHY={out:'off the map', water:'needs a bridge', building:'already built on',
                rock:'clear the rock first'};
function siteProblem(type,x,z){
  if(!BTYPES[type]) return null;
  if(type==='bridge'){
    if(!inb(x,z)) return 'out';
    if(cells[idx(x,z)]!==T_WATER) return 'a bridge must span the river';
    return null;
  }
  const err=canPlace(type,x,z);
  if(err) return SITE_WHY[err]||err;
  if(G.money<BTYPES[type].cost) return 'not enough denarii';
  return null;
}

function entranceOf(b){
  // prefer road tiles adjacent to footprint
  const t=BTYPES[b.type];
  const cand=[];
  for(let j=-1;j<=t.h;j++) for(let i=-1;i<=t.w;i++){
    const isEdge = (i===-1||i===t.w||j===-1||j===t.h);
    if(!isEdge) continue;
    const xx=b.x+i, zz=b.z+j;
    if(inb(xx,zz) && roadLevel[idx(xx,zz)]>0) cand.push([xx,zz, (i<0?1:i>=t.w?-1:0), (j<0?1:j>=t.h?-1:0)]);
  }
  if(!cand.length) return null;
  cand.sort((a,c)=> a[1]*N+a[0] - c[1]*N-c[0]);
  const c=cand[0];
  return {x:c[0], z:c[1], ox:c[2]*TILE*0.5, oz:c[3]*TILE*0.5};
}

// ---------- A* over road network (point-to-point) ----------
function astar(sx,sz,tx,tz){
  if(sx===tx&&sz===tz) return [[sx,sz]];
  const n=N*N, open=[], came=new Int32Array(n).fill(-1), g=new Float32Array(n).fill(1e9);
  const s=idx(sx,sz), t=idx(tx,tz);
  const h=(i)=>{const x=i%N,z=(i/N)|0; return Math.abs(x-tx)+Math.abs(z-tz);};
  g[s]=0; open.push(s); const f=new Map([[s,h(s)]]);
  let guard=0;
  while(open.length && guard++<20000){
    let bi=0; for(let i=1;i<open.length;i++) if((f.get(open[i])??1e9)<(f.get(open[bi])??1e9)) bi=i;
    const cur=open.splice(bi,1)[0];
    if(cur===t){
      const path=[]; let c=t; while(c!==-1){ path.push([c%N,(c/N)|0]); c=came[c]; } path.reverse(); return path;
    }
    const cx=cur%N, cz=(cur/N)|0;
    for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const nx=cx+dx, nz=cz+dz; if(!inb(nx,nz)) continue;
      const ni=idx(nx,nz);
      if(roadLevel[ni]===0) continue;
      const cost = roadLevel[ni]===1?1:1.45;
      const ng=g[cur]+cost;
      if(ng<g[ni]){ g[ni]=ng; came[ni]=cur; f.set(ni,ng+h(ni)); if(!open.includes(ni)) open.push(ni); }
    }
  }
  return null;
}

// ---------- servants: carts doing point-to-point deliveries ----------
const carts=[];
function spawnCart(fromB, toB, res, amt, homeB){
  const e1=entranceOf(fromB), e2=entranceOf(toB);
  if(!e1||!e2) return false;
  const path = astar(e1.x,e1.z,e2.x,e2.z);
  if(!path) return false;
  const g=new THREE.Group();
  const body=new THREE.Mesh(new THREE.BoxGeometry(0.5,0.34,0.7),mkMat(0x8a6a3a));
  body.position.y=0.42; body.castShadow=true; g.add(body);
  const load=new THREE.Mesh(new THREE.BoxGeometry(0.44,0.3,0.5),new THREE.MeshStandardMaterial({color:RES_COLOR[res],roughness:0.7,flatShading:true}));
  load.position.y=0.72; g.add(load);
  const whG=new THREE.CylinderGeometry(0.15,0.15,0.08,8), whM=mkMat(0x3a2a18);
  for(const [ox,oz] of [[-0.28,0.22],[0.28,0.22],[-0.28,-0.22],[0.28,-0.22]]){
    const w=new THREE.Mesh(whG,whM); w.rotation.z=Math.PI/2; w.position.set(ox,0.16,oz); g.add(w);
  }
  const ox=new THREE.Mesh(new THREE.BoxGeometry(0.1,0.12,0.4),mkMat(0x3a2a18)); ox.position.set(0,0.5,0.5); g.add(ox);
  scene.add(cartGroup).add(g);
  const [wx,wz]=worldOf(e1.x,e1.z);
  g.position.set(wx+e1.ox, heightAt(e1.x,e1.z), wz+e1.oz);
  carts.push({g, path, pi:0, t:0, speed:3.4, res, amt, fromB, toB, homeB, load, stage:'out', life:0});
  return true;
}

function clearPath(cart){
  const e2=entranceOf(cart.toB), e1=entranceOf(cart.homeB);
  if(!e2||!e1){ destroyCart(cart); return; }
  cart.path = astar(e2.x,e2.z,e1.x,e1.z);
  if(!cart.path||cart.path.length<2){ destroyCart(cart); return; }
  cart.pi=0; cart.t=0; cart.stage='back'; cart.load.visible=false;
}

function destroyCart(cart){
  const i=carts.indexOf(cart); if(i>=0) carts.splice(i,1);
  cartGroup.remove(cart.g);
}

function updateCarts(dt){
  for(const c of [...carts]){
    c.life+=dt;
    if(c.path.length<2){ if(c.stage==='out'){ c.stage='done'; c.t=0; } }
    const seg=c.path.length-1;
    if(seg<=0){ 
      if(c.stage==='out'){ deliver(c); clearPath(c); }
      else destroyCart(c);
      continue;
    }
    const a=c.path[Math.min(c.pi,seg)], bpt=c.path[Math.min(c.pi+1,seg)];
    const [ax,az]=worldOf(a[0],a[1]), [bx,bz]=worldOf(bpt[0],bpt[1]);
    c.t+=dt*c.speed/(TILE);
    while(c.t>=1){
      c.t-=1; c.pi++;
      if(c.pi>=seg){
        c.pi=seg-1;
        if(c.stage==='out'){ deliver(c); clearPath(c); }
        else { destroyCart(c); break; }
        continue;
      }
      break;
    }
    const a2=c.path[Math.min(c.pi,seg)], b2=c.path[Math.min(c.pi+1,seg)];
    const [ax2,az2]=worldOf(a2[0],a2[1]), [bx2,bz2]=worldOf(b2[0],b2[1]);
    const f=c.t;
    c.g.position.set(THREE.MathUtils.lerp(ax2,bx2,f), (heightAt(a2[0],a2[1])+heightAt(b2[0],b2[1]))/2, THREE.MathUtils.lerp(az2,bz2,f));
    c.g.rotation.y=Math.atan2(bx2-ax2,bz2-az2);
  }
}

function deliver(cart){
  // goods arrive at destination building
  const b=cart.toB;
  b.inbox = b.inbox||{};
  b.inbox[cart.res]=(b.inbox[cart.res]||0)+cart.amt;
  b.lastDelivery=performance.now();
}
