// ---------- buildings ----------
const RES_COLOR = { water:0x3fa9e0, food:0xd8b24a, clay:0xa8673c, wood:0x6e9c3a, wine:0x8e3a7a,
  pottery:0xb8724a, tools:0x9aa7b0, iron:0x7d8894, luxury:0xe0c14a };

// cost, size, jobs, category
const BTYPES = {
  road:      {name:'Road',            cost:1,   w:1,h:1, cat:'infra', key:'road'},
  well:      {name:'Well',            cost:60,  w:1,h:1, jobs:0, cat:'civic',
              desc:'Fresh water. Every building within 6 tiles has drinking water.',
              chain:'water: radius 6'},
  cistern:   {name:'Cistern',         cost:220, w:2,h:2, jobs:2, cat:'civic',
              desc:'Holds storm water. Only works if it already has water coverage. Radius 12.',
              chain:'water: needs water cover, radius 12'},
  aqueduct:  {name:'Aqueduct',        cost:340, w:1,h:1, jobs:1, cat:'civic',
              desc:'Carries water along a road. Must touch a well/cistern. Radius 18.',
              chain:'water: needs well/cistern, radius 18'},
  house:     {name:'House',           cost:100, w:1,h:1, jobs:0, cat:'res',   desc:'Grows from tent to domus as goods are delivered. Pays tax on upgrade.'},
  farm:      {name:'Wheat Farm',      cost:120, w:3,h:3, jobs:8, cat:'prod',
              desc:'Grows wheat on FERTILE ground. Output is carted to the market.',
              chain:'fertile soil >= 45%  ->  6 food'},
  farmOlive: {name:'Olive Grove',     cost:170, w:3,h:3, jobs:6, cat:'prod',
              desc:'Gives food AND wine. Wants very rich soil.',
              chain:'fertile soil >= 60%  ->  5 food + 2 wine'},
  claypit:   {name:'Clay Pit',        cost:100, w:2,h:2, jobs:6, cat:'prod',
              desc:'Digging clay floods the pit, so it MUST sit inside a water radius.',
              chain:'water cover  ->  5 clay'},
  ironMine:  {name:'Iron Mine',       cost:240, w:3,h:3, jobs:10,cat:'prod',
              desc:'Shafts down to the ore. Needs a water radius for the workers and the foundry.',
              chain:'water cover  ->  5 iron'},
  vineyard:  {name:'Vineyard',        cost:160, w:3,h:3, jobs:8, cat:'prod',
              desc:'Produces wine. Mansions demand it.',
              chain:'fertile soil >= 45%  ->  4 wine'},
  woodcutter:{name:'Wood Cutter',     cost:110, w:2,h:2, jobs:6, cat:'prod',
              desc:'Fells trees. Cheap, but strips the soil fertility around it.',
              chain:'any soil  ->  5 wood  (lowers fertility)'},
  market:    {name:'Marketplace',     cost:200, w:2,h:2, jobs:10,cat:'civic', desc:'Central store. Servants carry goods market->house on roads.'},
  granary:   {name:'Granary',         cost:250, w:3,h:3, jobs:4, cat:'civic', desc:'Food storage. Raises food capacity 200 -> 900.'},
  potter:    {name:'Pottery',         cost:200, w:2,h:2, jobs:6, cat:'ind',
              desc:'Shapes clay into pots and amphorae.',
              chain:'3 clay + water cover  ->  4 pottery'},
  carpenter: {name:'Carpenter',       cost:200, w:2,h:2, jobs:6, cat:'ind',
              desc:'Beats timber into beams, doors and tools.',
              chain:'4 wood  ->  3 tools'},
  smith:     {name:'Smithy',          cost:280, w:2,h:2, jobs:8, cat:'ind',
              desc:'Smelts ore with charcoal. Wants its own water radius.',
              chain:'3 iron + 2 wood + water cover  ->  3 tools'},
  weaver:    {name:'Weaver',          cost:300, w:2,h:2, jobs:8, cat:'ind',
              desc:'Dyes and weaves. The final luxury step.',
              chain:'3 pottery + 2 wood  ->  3 luxury'},
  temple:    {name:'Temple',          cost:300, w:2,h:2, jobs:4, cat:'civic', desc:'+Favor, +happiness nearby.'},
  park:      {name:'Park',            cost:120, w:2,h:2, jobs:1, cat:'civic', desc:'+Happiness within 7 tiles.'},
  senate:    {name:'Senate',          cost:1200,w:3,h:3, jobs:12,cat:'civic', desc:'+Favor, allows bigger houses to evolve.'},
  alehouse: {name:'Alehouse',        cost:260,  w:2,h:2, jobs:6, cat:'vice', tax:22,
              desc:'Strong drink and worse company. Raises SIN nearby and drags desirability down, but it pays well.',
              chain:'sin +0.30 (r7)  ->  tax income  |  evolves at sin > 0.55'},
  gambling:  {name:'Gambling Den',    cost:400,  w:2,h:2, jobs:8, cat:'vice', tax:40,
              desc:'Dice and knucklebones. Richer, filthier, and it evolved out of an alehouse.',
              chain:'sin +0.42 (r8)  ->  tax income'},
  brothel:   {name:'Brothel',         cost:520,  w:2,h:2, jobs:9, cat:'vice', tax:58,
              desc:'Vice with a roof. Very high sin, very bad for the neighbourhood.',
              chain:'sin +0.52 (r9)  ->  tax income  |  evolves at sin > 0.75'},
  opiumden:  {name:'Opium Den',       cost:700,  w:2,h:2, jobs:10,cat:'vice', tax:84,
              desc:'The end of the ladder. Enormous sin, and it ruins everything around it.',
              chain:'sin +0.72 (r10)  ->  tax income'},
  lararium:  {name:'Lararium',        cost:420,  w:2,h:2, jobs:4, cat:'vice', tax:26,
              desc:'A shrine the district built for itself. It evolved out of vice, pays a cut to the state, and projects sin back DOWN harder than a temple does.',
              chain:'sin -0.55 (r11)  +  desire +3 (r9)  ->  tax income  |  evolves at sin > 0.62'},
  watchtower:{name:'Watchtower',      cost:340,  w:1,h:1, jobs:6, cat:'law',
              desc:'Spawns prefects on a fixed timer. They A* to whatever crime the field reports and fight it.',
              chain:'prefect respawns every 18s  ->  patrols the roads'},
};

const RECIPES = {
  farm:      {out:'food',  amt:6},
  farmOlive: {out:'food',  amt:5, extra:'wine', amt2:2},
  claypit:   {out:'clay',  amt:5},
  ironMine:  {out:'iron',  amt:5},
  woodcutter:{out:'wood',  amt:5},
  vineyard:  {out:'wine',  amt:4},
  potter:    {in:{clay:3},            out:'pottery', amt:4, water:true},
  carpenter: {in:{wood:4},            out:'tools',   amt:3},
  smith:     {in:{iron:3,wood:2},     out:'tools',   amt:3, water:true},
  weaver:    {in:{pottery:3,wood:2},  out:'luxury',  amt:3},
};

// which buildings need a water radius around them to operate
const NEEDS_WATER = ['claypit','ironMine','potter','smith','farm','farmOlive','vineyard'];
// how much fertility the tile needs to grow anything
const FERTILE_NEED = { farm:0.45, farmOlive:0.60, vineyard:0.45 };

const HOUSE_TIERS = [
  {name:'Tent',        cap:0,   needs:{},                                  pop:4,   tax:0,  water:false},
  {name:'Hovel',       cap:60,  needs:{food:2},                            pop:6,   tax:1,  water:true},
  {name:'Domus',       cap:140, needs:{food:3,pottery:2},                  pop:10,  tax:3,  water:true},
  {name:'Townhouse',   cap:260, needs:{food:4,pottery:3,tools:2},          pop:16,  tax:6,  water:true},
  {name:'Mansion',     cap:520, needs:{food:6,wine:2,luxury:3,tools:3},    pop:24,  tax:12, water:true},
];

function mkMat(c,rough=0.9){ return new THREE.MeshStandardMaterial({color:c,roughness:rough,flatShading:true}); }

const MAT = {};
function mats(){
  if(MAT.cream) return MAT;
  MAT.cream =new THREE.MeshStandardMaterial({color:0xead9b8,roughness:0.85,flatShading:true});
  MAT.stone =new THREE.MeshStandardMaterial({color:0xc0b8a4,roughness:0.95,flatShading:true});
  MAT.dark  =new THREE.MeshStandardMaterial({color:0x8d8578,roughness:0.95,flatShading:true});
  MAT.terr  =new THREE.MeshStandardMaterial({color:0xb4552f,roughness:0.85,flatShading:true});
  MAT.roof  =new THREE.MeshStandardMaterial({color:0x9a4a30,roughness:0.9,flatShading:true});
  MAT.roof2 =new THREE.MeshStandardMaterial({color:0x7d3b26,roughness:0.9,flatShading:true});
  MAT.wood  =new THREE.MeshStandardMaterial({color:0x7a5a34,roughness:0.9,flatShading:true});
  MAT.wood2 =new THREE.MeshStandardMaterial({color:0x54391f,roughness:0.9,flatShading:true});
  MAT.marble=new THREE.MeshStandardMaterial({color:0xf2ece0,roughness:0.5,flatShading:true});
  MAT.win   =new THREE.MeshStandardMaterial({color:0x241a12,roughness:0.4,flatShading:true});
  MAT.gold  =new THREE.MeshStandardMaterial({color:0xd4a53c,roughness:0.35,metalness:0.5,flatShading:true});
  MAT.green =new THREE.MeshStandardMaterial({color:0x4a6b2c,roughness:1,flatShading:true});
  MAT.wheat =new THREE.MeshStandardMaterial({color:0xd8b44a,roughness:1,flatShading:true});
  MAT.grape =new THREE.MeshStandardMaterial({color:0x5b3a6e,roughness:1,flatShading:true});
  MAT.olive =new THREE.MeshStandardMaterial({color:0x7f9152,roughness:1,flatShading:true});
  MAT.water =new THREE.MeshStandardMaterial({color:0x2a6a8c,roughness:0.2,metalness:0.3,flatShading:true});
  MAT.iron  =new THREE.MeshStandardMaterial({color:0x6f6a63,roughness:0.6,flatShading:true});
  MAT.clay  =new THREE.MeshStandardMaterial({color:0xa8673c,roughness:1,flatShading:true});
  return MAT;
}
function M(k){ return mats()[k]; }

function buildingMesh(b){
  const t=BTYPES[b.type], g=new THREE.Group();
  const w=t.w*TILE, h=t.h*TILE, X=w/2, Z=h/2;
  const add=(mesh,x,y,z)=>{ mesh.position.set(x,y,z); mesh.castShadow=true; mesh.receiveShadow=true; g.add(mesh); return mesh; };
  const box=(mat,sx,sy,sz,x,y,z)=>add(new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz),mat),x,y,z);
  const cyl=(mat,rt,rb,sy,x,y,z,n=10)=>add(new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,sy,n),mat),x,y,z);
  // pitched tile roof built from overlapping courses
  const tileRoof=(mat,sx,sz,baseY,rise)=>{
    const steps=7, capW=sx*0.30;
    for(let i=0;i<steps;i++){
      const t0=i/steps, t1=(i+1)/steps;
      const wAt = sx + (capW-sx)*t0;
      const y = baseY + rise*t0;
      const sl = Math.hypot((sx-capW)/steps, rise/steps);
      const m=new THREE.Mesh(new THREE.BoxGeometry(sl*1.06,0.12,sz*1.10), mat);
      add(m, X-(sx-capW)*0.5 + (sx-capW)/steps*(i+0.5), y+0.02, Z);
      const m2=m.clone(); add(m2, -((X-(sx-capW)*0.5 + (sx-capW)/steps*(i+0.5))-X) , y+0.02, Z);
    }
  };
  const flatRoof=(mat,sx,sz,y)=>box(mat,sx,0.18,sz,X,y,Z);
  const plinth=()=>box(M('dark'),w*0.97,0.22,h*0.97,0,0.11,Z*0);
  const windows=(mat,sx,y,n=2)=>{
    for(let i=0;i<n;i++){ const x=X-sx/2 + sx*(i+0.5)/n;
      box(M('win'),sx/n*0.34,0.42,0.08,x,y,Z+h/2); }
  };
  const colonnade=(mat,r,yTop,count,r2=Z-0.45)=>{
    for(let i=0;i<=count;i++){ const x=X-w/2+0.35 + (w-0.7)*i/count;
      cyl(mat,r*0.9,r,yTop,x,yTop/2,r2,8);
      box(mat,r*2.2,0.1,r*2.2,x,0.06,r2);
      box(mat,r*2.2,0.1,r*2.2,x,yTop,r2); }
  };

  switch(b.type){
    case 'well': {
      cyl(M('stone'),0.75,0.82,0.6,0,0.3,0,12);
      cyl(M('water'),0.58,0.58,0.1,0,0.62,0,12);
      cyl(M('wood2'),0.07,0.07,1.2,-0.55,1.0,0,6); cyl(M('wood2'),0.07,0.07,1.2,0.55,1.0,0,6);
      box(M('roof2'),1.6,0.14,0.9,0,1.7,0);
      cyl(M('wood'),0.05,0.05,0.9,0,1.2,0,5);
      cyl(M('wood'),0.22,0.22,0.24,0,0.86,0,8);
      break; }
    case 'cistern': {
      box(M('stone'),w*0.95,1.1,h*0.95,0,0.55,Z);
      for(let i=0;i<3;i++) box(M('dark'),w*0.95,0.09,h*0.97,0,0.3+i*0.32,Z);
      tileRoof(M('roof2'),w*0.95,h*0.95,1.12,0.45);
      box(M('win'),0.4,0.5,0.1,0,0.6,h*0.475);
      break; }
    case 'aqueduct': {
      const span=6;
      box(M('stone'),0.9,0.9,0.9,0,0.45,Z);
      for(let i=0;i<3;i++){
        const x=-span/2+ (span/3)*(i+0.5);
        cyl(M('dark'),0.34,0.44,3.2,x,1.6,Z,8);
      }
      box(M('stone'),span+1,0.55,0.95,0,3.4,Z);
      box(M('water'),span+1,0.12,0.55,0,3.68,Z);
      box(M('dark'),span+1,0.16,1.15,0,3.78,Z);
      break; }
    case 'farm': case 'farmOlive': {
      box(M('dry')||M('wheat'),w*0.95,0.1,h*0.95,0,0.05,Z);
      const crop = b.type==='farm'? M('wheat') : M('olive');
      for(let i=0;i<3;i++) for(let j=0;j<3;j++){
        const x=(i-1)*w/3.1, z=(j-1)*h/3.1;
        if(b.type==='farm'){
          box(crop,0.55,0.42,0.55,x,0.26,z);
          box(M('wheat'),0.16,0.22,0.16,x,0.55,z);
        } else {
          add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.46,0),crop),x,0.42,z);
          cyl(M('wood2'),0.05,0.06,0.4,x,0.2,z,5);
        }
      }
      // farmhouse + fence
      box(M('cream'),0.8,0.6,0.8,-w/2+0.7,0.3,-h/2+0.7);
      tileRoof(M('roof'),0.9,0.9,0.6,0.32);
      for(let i=0;i<10;i++){ const a=i/10*Math.PI*2;
        box(M('wood2'),0.07,0.42,0.07,Math.cos(a)*(w/2-0.12),0.21,Math.sin(a)*(h/2-0.12)); }
      break; }
    case 'claypit': {
      cyl(M('clay'),w*0.46,w*0.5,0.28,0,0.14,Z,12);
      cyl(M('dark'),w*0.30,w*0.34,0.34,0,0.3,Z,12);
      for(let i=0;i<5;i++) add(new THREE.Mesh(new THREE.DodecahedronGeometry(0.2+Math.random()*0.16,0),M('clay')),
        (Math.random()-0.5)*w*0.6,0.32,(Math.random()-0.5)*h*0.6);
      // washing trough fed by the river
      box(M('wood2'),0.9,0.3,0.4,-w/2+0.4,0.2,h/2-0.3);
      box(M('water'),0.8,0.1,0.3,-w/2+0.4,0.36,h/2-0.3);
      break; }
    case 'ironMine': {
      box(M('dark'),w*0.95,0.25,h*0.95,0,0.12,Z);
      // spoil heaps + headframe + ore
      for(let i=0;i<4;i++) add(new THREE.Mesh(new THREE.DodecahedronGeometry(0.26+Math.random()*0.14,0),M('iron')),
        -w/2+0.7+i*0.55,0.35,-h/2+0.6);
      const fx=w/2-0.7, fz=h/2-0.7;
      for(const [dx,dz] of [[-0.45,0],[0.45,0],[0,-0.45],[0,0.45]]){
        box(M('wood2'),0.13,1.7,0.13,fx+dx,0.85,fz+dz);
      }
      box(M('wood'),1.15,0.16,1.15,fx,1.75,fz);
      cyl(M('iron'),0.34,0.34,0.3,fx,1.6,fz,10);
      cyl(M('wood2'),0.02,0.02,1.1,fx,2.1,fz,4);
      break; }
    case 'woodcutter': {
      box(M('wood2'),0.9,0.4,0.9,0,0.2,Z);
      const logG=new THREE.CylinderGeometry(0.16,0.16,0.9,7);
      for(let i=0;i<3;i++){ const l=new THREE.Mesh(logG,M('wood2'));
        l.rotation.x=Math.PI/2; add(l,-0.2+i*0.22,0.55,Z); }
      box(M('wood'),0.14,1.3,0.14,0.75,0.65,-h/2+0.4);
      const axe=new THREE.Mesh(new THREE.BoxGeometry(0.1,0.34,0.26),M('iron'));
      add(axe,0.75,1.25,-h/2+0.4);
      add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.42,0),M('green')),-w/2+0.6,0.6,0);
      break; }
    case 'vineyard': {
      box(M('dark'),w*0.95,0.1,h*0.95,0,0.05,Z);
      for(let i=0;i<3;i++) for(let j=0;j<3;j++){
        const x=(i-1)*w/3.1, z=(j-1)*h/3.1;
        box(M('wood2'),0.07,0.7,0.07,x-0.25,0.35,z);
        box(M('wood2'),0.07,0.7,0.07,x+0.25,0.35,z);
        box(M('wood'),0.6,0.06,0.06,x,0.62,z);
        add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.34,0),M('grape')),x,0.5,z);
      }
      box(M('cream'),0.8,0.6,0.8,w/2-0.7,0.3,-h/2+0.7);
      tileRoof(M('roof'),0.9,0.9,0.6,0.3);
      break; }
    case 'market': {
      box(M('stone'),w*0.96,0.3,h*0.96,0,0.15,Z);
      // peristyle: columns round an open courtyard
      colonnade(M('marble'),0.16,2.1,4);
      colonnade(M('marble'),0.16,2.1,4,h/2-0.45);
      for(let i=0;i<4;i++) cyl(M('marble'),0.16,0.16,2.1,-w/2+0.45,1.05,-h/2+0.45+(h-0.9)*i/3,8);
      for(let i=0;i<4;i++) cyl(M('marble'),0.16,0.16,2.1,w/2-0.45,1.05,-h/2+0.45+(h-0.9)*i/3,8);
      flatRoof(M('roof2'),w*0.98,h*0.98,2.22);
      // stalls with awnings
      for(let i=0;i<3;i++){
        const x=(i-1)*w*0.28;
        box(M('wood2'),0.7,0.42,0.5,x,0.5,0.15);
        box(i%2?M('terr'):M('cream'),0.85,0.1,0.7,x,1.15,0.15);
        for(let k=0;k<3;k++) box(M('wheat'),0.14,0.14,0.14,x-0.2+k*0.2,0.78,0.15);
      }
      box(M('terr'),0.5,0.06,0.5,0,1.3,0);
      break; }
    case 'granary': {
      box(M('cream'),1.5,1.7,1.5,0,0.85,Z);
      for(let i=0;i<4;i++) box(M('dark'),1.52,0.07,1.52,0,0.4+i*0.4,Z);
      tileRoof(M('roof'),1.7,1.7,1.72,0.55);
      for(let i=-1;i<=1;i++) box(M('wood2'),0.16,0.3,0.16,i*0.4,2.32,Z);
      break; }
    case 'potter': case 'carpenter': case 'smith': case 'weaver': {
      box(M('cream'),w*0.88,1.35,h*0.88,0,0.68,Z);
      box(M('dark'),w*0.9,0.12,h*0.9,0,0.1,Z);
      windows(M('win'),w*0.88,0.85,3);
      box(M('wood2'),0.42,0.6,0.06,0,0.34,h*0.44+0.04);
      tileRoof(M('roof'),w*0.96,h*0.96,1.36,0.5);
      if(b.type==='smith'){
        cyl(M('dark'),0.24,0.34,0.9,-w/2-0.25,0.45,-h/2+0.5,8);
        box(M('iron'),0.45,0.3,0.35,-w/2+0.6,1.9,h/2-0.4);
        add(new THREE.Mesh(new THREE.BoxGeometry(0.7,0.12,0.3),M('iron')),w/2-0.5,0.75,h/2+0.3);
      }
      if(b.type==='weaver'){
        box(M('terr'),0.9,0.55,0.06,0,1.0,h*0.44+0.05);
        for(let i=0;i<3;i++) box(M('gold'),0.2,0.4,0.06,-0.3+i*0.3,1.0,h*0.44+0.09);
        box(M('wood'),1.2,0.06,0.06,0,1.28,h*0.44);
      }
      if(b.type==='carpenter'){
        box(M('wood2'),1.1,0.24,0.3,0,0.65,h*0.32);
        box(M('wood'),0.9,0.1,0.9,-w/2-0.2,0.35,-h/2+0.4);
      }
      if(b.type==='potter'){
        const potG=new THREE.LatheGeometry([new THREE.Vector2(0.02,0),new THREE.Vector2(0.12,0.05),
          new THREE.Vector2(0.18,0.22),new THREE.Vector2(0.12,0.32),new THREE.Vector2(0.14,0.36)],8);
        for(let i=0;i<4;i++) add(new THREE.Mesh(potG,M('terr')),-0.55+i*0.36,0.1,h*0.44+0.35);
        cyl(M('dark'),0.4,0.34,0.5,w/2-0.4,0.25,h/2-0.5,8);
      }
      break; }
    case 'temple': {
      box(M('stone'),w*0.94,0.7,h*0.94,0,0.35,Z);
      const cx2=X, cz2=Z-h/2+0.7;
      for(let i=0;i<6;i++) cyl(M('marble'),0.2,0.22,2.6,cx2-w*0.34+w*0.68*i/5,2.0,cz2,10);
      box(M('marble'),w*0.9,0.3,h*0.5,0,3.45,cz2);
      flatRoof(M('roof2'),w*0.95,h*0.6,3.62);
      // pediment
      for(let i=0;i<6;i++){
        const x=cx2-w*0.3+w*0.6*i/5, y=3.8+ (i===0||i===5?0:0.25);
        box(M('terr'),w*0.12,0.55,0.16,x,y+0.2,cz2-0.75);
      }
      for(let i=0;i<6;i++) cyl(M('marble'),0.2,0.22,2.2,cx2-w*0.34+w*0.68*i/5,1.8,h/2-0.3,10);
      box(M('gold'),0.5,0.5,0.16,cx2,4.5,cz2);
      break; }
    case 'park': {
      box(M('green'),w*0.96,0.1,h*0.96,0,0.05,Z);
      for(let i=0;i<7;i++){
        const x=(Math.random()-0.5)*w*0.72, z=(Math.random()-0.5)*h*0.72;
        cyl(M('wood2'),0.06,0.08,0.7,x,0.35,z,5);
        add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.34+Math.random()*0.16,0),M('green')),x,0.95,z);
      }
      cyl(M('stone'),0.55,0.55,0.18,0,0.1,Z,12);
      cyl(M('water'),0.45,0.45,0.06,0,0.2,Z,12);
      cyl(M('marble'),0.12,0.16,0.9,0,0.55,Z-0.9,8);
      box(M('marble'),0.34,0.26,0.34,0,1.05,Z-0.9);
      break; }
    case 'senate': {
      box(M('cream'),w*0.9,2.0,h*0.9,0,1.0,Z);
      windows(M('win'),w*0.9,1.4,5);
      for(let i=0;i<6;i++) cyl(M('marble'),0.17,0.19,1.9,-w*0.4+w*0.8*i/5,0.95,h*0.45+0.15,8);
      tileRoof(M('roof2'),w*0.95,h*0.95,2.0,0.6);
      box(M('gold'),0.5,0.8,0.5,0,2.95,Z);
      cyl(M('gold'),0.36,0.02,0.5,0,3.6,Z,8);
      break; }
    case 'alehouse': case 'gambling': case 'brothel': case 'opiumden': {
      box(M('dark'),w*0.94,0.22,h*0.94,0,0.11,Z);
      box(M('wood2'),w*0.86,1.25,h*0.86,0,0.75,Z);
      box(M('dark'),w*0.88,0.12,h*0.88,0,1.42,Z);
      for(let i=0;i<3;i++) box(M('gold'),0.24,0.5,0.08,-w*0.28+i*w*0.28,0.95,h*0.43+0.05);
      // awning over the door
      box(M('terr'),w*0.7,0.1,0.5,0,1.35,h/2+0.2);
      if(b.type==='gambling') for(let i=0;i<3;i++) box(M('gold'),0.1,0.1,0.1,-0.4+i*0.4,1.95,Z-0.5);
      if(b.type==='opiumden'){ cyl(M('dark'),0.2,0.24,0.5,w/2+0.2,0.35,-h/2+0.4,8);
        for(let i=0;i<3;i++) box(M('gold'),0.08,0.3,0.08,w/2+0.2,0.6,-h/2+0.4,6); }
      if(b.type==='brothel') box(M('terr'),0.5,0.36,0.06,w/2-0.3,1.9,Z);
      break; }
    case 'watchtower': {
      box(M('stone'),1.5,0.3,1.5,0,0.15,Z);
      box(M('stone'),1.05,3.0,1.05,0,1.7,Z);
      for(let i=0;i<4;i++) box(M('dark'),1.09,0.1,1.09,0,0.8+i*0.7,Z);
      box(M('dark'),1.5,0.25,1.5,0,3.35,Z);
      for(const [dx,dz] of [[-0.6,-0.6],[0.6,-0.6],[-0.6,0.6],[0.6,0.6]])
        box(M('stone'),0.24,0.6,0.24,dx,3.75,Z+dz);
      box(M('roof2'),1.7,0.16,1.7,0,4.15,Z);
      cyl(M('gold'),0.06,0.06,0.7,0,4.55,Z,5);
      break; }
    case 'import': {
      box(M('stone'),w*0.9,0.3,h*0.9,0,0.15,Z);
      box(M('cream'),w*0.85,1.3,h*0.85,0,0.95,Z);
      tileRoof(M('roof'),w*0.95,h*0.95,1.6,0.45);
      for(let i=0;i<4;i++){
        box(M('wood2'),0.45,0.45,0.45,-0.7+i*0.45,2.35,Z);
        box(M('gold'),0.46,0.06,0.46,-0.7+i*0.45,2.58,Z);
      }
      cyl(M('wood2'),0.07,0.07,1.6,w/2-0.4,0.8,-h/2+0.5,6);
      box(M('terr'),0.5,0.34,0.06,w/2-0.4,1.5,-h/2+0.5);
      break; }
  }
  if(b.type!=='house'&&b.type!=='watchtower'&&b.type!=='farm'&&b.type!=='farmOlive'&&b.type!=='vineyard'&&b.type!=='park'&&b.type!=='claypit'&&b.type!=='ironMine'&&b.type!=='woodcutter')
    box(M('stone'),w*0.98,0.22,h*0.98,0,0.11,Z);
  return g;
}

function houseMesh(tier){
  const g=new THREE.Group();
  const box=(mat,sx,sy,sz,x,y,z)=>{const o=new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz),mat);
    o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;g.add(o);return o;};
  const cyl=(mat,rt,rb,sy,x,y,z,n=10)=>{const o=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,sy,n),mat);
    o.position.set(x,y,z);o.castShadow=true;g.add(o);return o;};
  const roof=(mat,sx,sz,baseY,rise)=>{
    const steps=6, capW=sx*0.28;
    for(let i=0;i<steps;i++){
      const wAt=(sx-capW)*((steps-i)/steps);
      const y=baseY+rise*(i/steps);
      const sl=Math.hypot((sx-capW)/steps, rise/steps);
      const cx=(sx-capW)/2*(i/steps);
      box(mat,sl*1.08,0.1,sz*1.08, cx, y+0.03, 0);
      box(mat,sl*1.08,0.1,sz*1.08, -cx, y+0.03, 0);
    }
  };
  const win=(x,y,z=0.86)=>box(M('win'),0.3,0.38,0.08,x,y,z);

  if(tier===0){
    const c=new THREE.Mesh(new THREE.ConeGeometry(0.82,0.95,7),M('dark'));
    c.position.y=0.48; c.castShadow=true; g.add(c);
    box(M('wood2'),0.22,0.55,0.06,0,0.28,0.42);
  } else if(tier===1){
    box(M('dark'),1.5,0.16,1.5,0,0.08,0);
    box(M('wood2'),1.35,0.85,1.35,0,0.5,0);
    for(let i=0;i<4;i++) box(M('wood'),0.07,0.85,0.07,-0.6+i*0.4,0.5,0.68);
    roof(M('roof2'),1.5,1.5,0.92,0.35);
    box(M('wood'),0.3,0.5,0.06,0,0.28,0.68);
    box(M('clay'),0.28,0.28,0.28,0.5,1.3,0.1);
  } else if(tier===2){
    box(M('dark'),2.0,0.2,2.0,0,0.1,0);
    box(M('cream'),1.9,1.25,1.9,0,0.82,0);
    for(let i=0;i<3;i++) win(-0.55+i*0.55,0.95);
    // atrium
    box(M('terr'),0.95,1.35,1.0,0,0.88,0.35);
    box(M('marble'),0.4,0.12,0.4,0,1.6,0.35);
    roof(M('roof'),2.05,2.05,1.47,0.5);
    roof(M('roof2'),1.15,1.15,1.6,0.35);
    box(M('wood2'),0.3,0.6,0.06,0,0.5,0.97);
    for(const s of [-1,1]) cyl(M('marble'),0.11,0.13,1.2,s*0.75,0.8,0.95,8);
  } else if(tier===3){
    box(M('dark'),1.9,0.24,1.9,0,0.12,0);
    box(M('cream'),1.75,2.3,1.75,0,1.3,0);
    box(M('dark'),1.77,0.1,1.77,0,1.6,0);
    for(let i=0;i<3;i++){ win(-0.55+i*0.55,1.0); win(-0.55+i*0.55,2.0); }
    box(M('terr'),0.95,2.75,0.95,0,1.5,0.3);
    roof(M('roof'),2.0,2.0,2.5,0.55);
    roof(M('roof2'),1.15,1.15,2.72,0.38);
    box(M('wood2'),0.42,0.72,0.07,0,0.5,0.9);
    for(const s of [-1,1]) cyl(M('marble'),0.11,0.13,2.0,s*0.72,1.2,0.9,8);
    cyl(M('terr'),0.22,0.26,0.4,0.55,2.95,-0.2,8);
  } else {
    box(M('dark'),2.2,0.3,2.2,0,0.15,0);
    box(M('marble'),2.0,0.9,2.0,0,0.6,0);
    box(M('cream'),1.9,2.2,1.9,0,2.1,0);
    for(let f=0;f<2;f++){
      box(M('dark'),1.92,0.1,1.92,0,1.7+f*1.4,0);
      for(let i=0;i<4;i++){ win(-0.6+i*0.4,1.15+f*1.4); }
    }
    // portico with 6 columns
    for(let i=0;i<=5;i++) cyl(M('marble'),0.12,0.14,2.3,-0.85+1.7*i/5,1.15,1.0,8);
    box(M('marble'),2.1,0.2,0.55,0,2.35,1.0);
    roof(M('roof'),2.25,2.25,2.55,0.6);
    box(M('wood2'),0.5,0.9,0.08,0,0.6,1.02);
    box(M('gold'),0.34,0.5,0.09,0,2.0,0.97);
    box(M('terr'),0.35,0.5,0.09,-0.55,2.0,0.97);
    box(M('wood2'),0.3,0.6,0.09,0.55,2.0,0.97);
    // rooftop shrine + gilded statue
    box(M('cream'),0.8,0.8,0.8,0,3.05,-0.1);
    cyl(M('gold'),0.16,0.2,0.7,0,3.75,-0.1,8);
    box(M('gold'),0.45,0.16,0.2,0,4.05,-0.1);
    // statuary along the facade
    for(const s of [-1,1]){
      cyl(M('marble'),0.1,0.12,0.5,s*0.62,3.1,0.85,8);
      add2(g, M('marble'), s*0.62, 3.5, 0.85);
    }
  }
  return g;
}
function add2(g,mat,x,y,z){
  const o=new THREE.Mesh(new THREE.IcosahedronGeometry(0.18,0),mat);
  o.position.set(x,y,z); o.castShadow=true; g.add(o); return o;
}
