// ============ ROMA: a Caesar III style city builder ============
const TILE = 2;            // world units per tile
const N = 72;              // grid size
const HALF = (N*TILE)/2;

const T_EMPTY=0, T_ROAD=1, T_BLD=2, T_WATER=3, T_TREE=4, T_ROCK=5, T_SAND=6;

// ---------- soil fertility ----------
const soil = new Float32Array(N*N);
function genSoil(){
  for(let z=0;z<N;z++) for(let x=0;x<N;x++){
    const n = 0.5 + 0.28*Math.sin(x*0.13+1.3)*Math.cos(z*0.11-0.4)
                   + 0.16*Math.sin((x*0.07+z*0.09)+2.1)
                   + 0.10*Math.cos(Math.hypot(x-N/2,z-N/2)*0.07);
    soil[idx(x,z)] = Math.max(0, Math.min(1, n));
  }
  // river banks are fertile; deep water and marsh is not
  for(let z=0;z<N;z++) for(let x=0;x<N;x++){
    let near=false;
    for(let j=-2;j<=2;j++) for(let i=-2;i<=2;i++){
      const xx=x+i, zz=z+j;
      if(inb(xx,zz) && (cells[idx(xx,zz)]===T_WATER)) near=true;
    }
    if(near) soil[idx(x,z)]=Math.min(1,soil[idx(x,z)]+0.22);
  }
}
function fertilityAt(x,z,w,h){
  let s=0,n=0;
  for(let j=0;j<h;j++) for(let i=0;i<w;i++){ if(inb(x+i,z+j)){ s+=soil[idx(x+i,z+j)]; n++; } }
  return n? s/n : 0;
}

const G = {                // global state
  money: 5000, month: 0, year: 0, speed: 1, paused: false,
  pop: 0, happiness: 70, favor: 50, taxRate: 2, tax: 0, upkeep: 0, balance: 0, taxpayers: 0, netTick: 0,
};
const stock = { food:0, clay:0, wood:0, wine:0, pottery:0, tools:0, iron:0, luxury:0 };
const depot = { food:0 }; // granary storage

// ---------- terrain ----------
const cells = new Uint8Array(N*N);      // T_*
const bldAt = new Int16Array(N*N).fill(-1);
const roadLevel = new Uint8Array(N*N);

let terrainGroup, roadGroup, bldGroup, cartGroup, decoGroup;
const blds = [];
let hoverMesh, ghostMesh;

function idx(x,z){ return z*N+x; }
function inb(x,z){ return x>=0 && z>=0 && x<N && z<N; }
function heightAt(x,z){
  // gentle rolling hills, flattened by roads nearby is not needed
  const s = 0.9;
  return 0.35*Math.sin(x*0.21)*Math.cos(z*0.18) + 0.18*Math.sin((x+z)*0.11) + 0.9*s*0.2;
}
function worldOf(x,z){ return [ (x-N/2+0.5)*TILE, (z-N/2+0.5)*TILE ]; }

function buildTerrain(){
  terrainGroup = new THREE.Group();
  scene.add(terrainGroup);
  const SEG=N*2;
  const g = new THREE.PlaneGeometry(N*TILE, N*TILE, SEG, SEG);
  g.rotateX(-Math.PI/2);
  const p = g.attributes.position;
  for(let i=0;i<p.count;i++){
    const wx=p.getX(i), wz=p.getZ(i);
    const gx=Math.floor(wx/TILE+N/2), gz=Math.floor(wz/TILE+N/2);
    p.setY(i, (inb(gx,gz)? heightAt(gx,gz):0) - 0.15);
  }
  g.computeVertexNormals();
  const cols=[];
  for(let i=0;i<p.count;i++){
    const wx=p.getX(i), wz=p.getZ(i);
    const gx=Math.floor(wx/TILE+N/2), gz=Math.floor(wz/TILE+N/2);
    let c;
    if(!inb(gx,gz)) c=new THREE.Color(0x3a5227);
    else {
      const cc=cells[idx(gx,gz)], f=soil[idx(gx,gz)];
      if(cc===T_WATER){
        const d=heightAt(gx,gz);
        c=new THREE.Color().setHSL(0.55,0.42,0.20+d*0.03);
      } else if(cc===T_SAND){ c=new THREE.Color(0xc9b47a); }
      else {
        // fertile ground is richer / more yellow-green, barren is pale grey-brown
        c=new THREE.Color().setHSL(0.22-0.06*(1-f), 0.16+0.34*f, 0.20+0.16*f);
        const h=heightAt(gx,gz);
        c.offsetHSL(0,0,-h*0.09);
        // patchy noise so it doesn't look like a flat wash
        const n=Math.sin(gx*1.7)*Math.sin(gz*1.3)*0.5+Math.sin(gx*0.6+gz*0.9)*0.5;
        c.offsetHSL(0, 0.03*n, 0.035*n);
      }
    }
    cols.push(c.r,c.g,c.b);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(cols,3));
  const m = new THREE.MeshStandardMaterial({vertexColors:true, roughness:0.98, metalness:0});
  const mesh = new THREE.Mesh(g,m);
  mesh.receiveShadow = true;
  terrainGroup.add(mesh);
  mesh.userData.isGround = true;
  buildWater();
  buildSoilOverlay();
  decoTerrain();
}

// animated water plane
let waterMesh;
function buildWater(){
  const g=new THREE.PlaneGeometry(N*TILE*1.4, N*TILE*1.4, 90,90);
  g.rotateX(-Math.PI/2);
  const m=new THREE.MeshStandardMaterial({color:0x2b5f86, roughness:0.16, metalness:0.35,
    transparent:true, opacity:0.86});
  m.onBeforeCompile=sh=>{
    sh.uniforms.uT={value:0};
    waterMesh.userData.sh=sh;
    sh.vertexShader='uniform float uT;\n'+sh.vertexShader.replace('#include <begin_vertex>',
      '#include <begin_vertex>\n transformed.y += sin(position.x*0.22+uT*1.3)*0.06 + cos(position.z*0.19+uT)*0.05;');
    sh.fragmentShader=sh.fragmentShader.replace('#include <color_fragment>',
      '#include <color_fragment>\n diffuseColor.rgb *= 0.9+0.2*sin(vViewPosition.x*0.6+vViewPosition.z*0.4);');
  };
  waterMesh=new THREE.Mesh(g,m);
  waterMesh.position.y=0.32;
  scene.add(waterMesh);
}

// soil overlay (toggle with F)
let soilOverlay;
function rebuildSoilOverlay(){
  if(soilOverlay){ scene.remove(soilOverlay); soilOverlay.traverse(o=>{if(o.isMesh&&o.material)o.material.dispose();}); }
  buildSoilOverlay();
}
function buildSoilOverlay(){
  soilOverlay=new THREE.Group(); soilOverlay.visible=false; scene.add(soilOverlay);
  const geo=new THREE.PlaneGeometry(TILE*0.98,TILE*0.98); geo.rotateX(-Math.PI/2);
  for(let z=0;z<N;z++) for(let x=0;x<N;x++){
    if(cells[idx(x,z)]!==T_EMPTY) continue;
    const f=soil[idx(x,z)];
    if(f<0.42) continue;
    const mat=new THREE.MeshBasicMaterial({color:new THREE.Color().setHSL(0.16,0.85,0.30+f*0.22),
      transparent:true, opacity:0.14+ (f-0.42)*0.42, depthWrite:false});
    const m=new THREE.Mesh(geo,mat);
    const [wx,wz]=worldOf(x,z); m.position.set(wx,heightAt(x,z)+0.10,wz);
    soilOverlay.add(m);
  }
}

const decoCell={};
function decoTerrain(){
  decoGroup=new THREE.Group(); scene.add(decoGroup);
  // shared geometry/materials so thousands of props stay cheap
  const trunkG=new THREE.CylinderGeometry(0.07,0.12,0.85,5);
  const leafG=new THREE.IcosahedronGeometry(0.6,0);
  const pineG=new THREE.ConeGeometry(0.52,1.5,6);
  const bushG=new THREE.IcosahedronGeometry(0.3,0);
  const rockG=new THREE.DodecahedronGeometry(0.3,0);
  const grassG=new THREE.PlaneGeometry(0.5,0.42);
  const trunkM=new THREE.MeshStandardMaterial({color:0x5a3d22,flatShading:true,roughness:1});
  const leafM =new THREE.MeshStandardMaterial({color:0x33551f,flatShading:true,roughness:1});
  const leafM2=new THREE.MeshStandardMaterial({color:0x2a4a1c,flatShading:true,roughness:1});
  const bushM =new THREE.MeshStandardMaterial({color:0x4a6b2c,flatShading:true,roughness:1});
  const rockM =new THREE.MeshStandardMaterial({color:0x8a8577,flatShading:true,roughness:1});
  const grassM=new THREE.MeshStandardMaterial({color:0x6f8f42,roughness:1,side:THREE.DoubleSide});
  for(let z=0;z<N;z++) for(let x=0;x<N;x++){
    if(cells[idx(x,z)]!==T_EMPTY) continue;
    const f=soil[idx(x,z)];
    const c=Math.random();
    let obj=null;
    if(c<0.052 && f>0.30){ cells[idx(x,z)]=T_TREE;
      obj=new THREE.Group();
      const t=new THREE.Mesh(trunkG,trunkM); t.position.y=0.42; obj.add(t);
      const l=new THREE.Mesh(Math.random()<0.5?leafG:pineG, Math.random()<0.5?leafM:leafM2);
      l.position.y=1.05; l.scale.setScalar(0.8+Math.random()*0.7); obj.add(l);
      if(Math.random()<0.35){ const l2=new THREE.Mesh(leafG,leafM2);
        l2.position.set(0.3,0.85,0.25); l2.scale.setScalar(0.55); obj.add(l2); }
    } else if(c<0.072){ cells[idx(x,z)]=T_ROCK;
      obj=new THREE.Mesh(rockG,rockM); obj.scale.set(0.7+Math.random()*1.1,0.5+Math.random()*0.5,0.7+Math.random());
      obj.rotation.y=Math.random()*3;
    } else if(c<0.085){ cells[idx(x,z)]=T_TREE;
      obj=new THREE.Mesh(bushG,bushM); obj.scale.setScalar(0.8+Math.random()*0.8);
    } else if(c<0.30 && f<0.45){       // scrub only on poor ground
      obj=new THREE.Mesh(bushG,new THREE.MeshStandardMaterial({color:0x7d7a4a,flatShading:true}));
      obj.scale.setScalar(0.45+Math.random()*0.4);
    }
    if(!obj){ // grass tufts are pure decoration, stay on T_EMPTY
      if(Math.random()<0.55){
        obj=new THREE.Mesh(grassG,grassM);
        obj.rotation.x=-Math.PI/2+0.25; obj.rotation.z=Math.random()*3;
        obj.position.y=0.06;
      } else continue;
    }
    const [wx,wz]=worldOf(x,z); obj.position.set(wx,heightAt(x,z),wz);
    obj.castShadow=obj.children.length>0; obj.receiveShadow=true;
    decoGroup.add(obj);
    if(cells[idx(x,z)]!==T_EMPTY) decoCell[idx(x,z)]=obj;
  }
}
