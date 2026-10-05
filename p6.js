// ---------- SCENE / CAMERA ----------
let renderer, scene, camera;
// fixed isometric camera: no orbit, no roll, classic 45/45 city-builder view
const ISO_YAW = Math.PI*0.25;
const ISO_PITCH = Math.atan(1/Math.SQRT2);   // true isometric 35.264 deg
const cam = {dist:46, yaw:ISO_YAW, pitch:ISO_PITCH, tx:0, tz:0};
function init3D(){
  scene=new THREE.Scene();
  scene.background=new THREE.Color(0x9fc4dd);
  scene.fog=new THREE.Fog(0x9fc4dd, 90, 260);
  camera=new THREE.PerspectiveCamera(30, innerWidth/innerHeight, 1, 900);  // narrow fov = near-orthographic
  renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
  renderer.setSize(innerWidth,innerHeight);
  renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));
  document.body.appendChild(renderer.domElement);
  const sun=new THREE.DirectionalLight(0xfff0d0,1.5);
  sun.position.set(60,90,40); sun.castShadow=true;
  sun.shadow.mapSize.set(2048,2048);
  const s=70; sun.shadow.camera.left=-s;sun.shadow.camera.right=s;sun.shadow.camera.top=s;sun.shadow.camera.bottom=-s;
  sun.shadow.camera.far=300; sun.shadow.bias=-0.0006;
  scene.add(sun);
  scene.add(new THREE.HemisphereLight(0xbfe0ff,0x6a5a3a,0.75));
  roadGroup=new THREE.Group(); bldGroup=new THREE.Group(); cartGroup=new THREE.Group();
  scene.add(roadGroup,bldGroup,cartGroup);
  window.addEventListener('resize',()=>{ camera.aspect=innerWidth/innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth,innerHeight); });
}
function updateCam(dt){
  // classic iso: camera sits back along the fixed diagonal, screen-space pans stay aligned
  const d=cam.dist;
  const cx=cam.tx + d*Math.cos(cam.pitch)*Math.cos(cam.yaw);
  const cy=d*Math.sin(cam.pitch);
  const cz=cam.tz + d*Math.cos(cam.pitch)*Math.sin(cam.yaw);
  camera.position.set(cx,cy,cz);
  camera.up.set(0,1,0);
  camera.lookAt(cam.tx,0,cam.tz);
  cam.cy=cy;
}

// screen-space pan: map a 2D drag delta onto the ground plane along the camera's own
// screen axes. The basis is derived from the camera, not guessed:
//   zAxis = eye-target direction, xAxis = cross(up, zAxis) = the camera's screen-right.
// For an isometric camera those are the only two vectors that make drag follow the mouse.
function camBasis(){
  const zx=Math.cos(cam.yaw), zz=Math.sin(cam.yaw);   // camera sits at target + d*(zx,.,zz)
  return { rx:zz, rz:-zx,          // screen-right projected on the ground
           ux:-zx, uz:-zz };       // screen-up    projected on the ground
}
// dx,dy in screen pixels with y pointing DOWN (i.e. raw mouse deltas). Dragging moves the
// world with the pointer, so the target moves against it.
function panScreen(dx,dy){
  const {rx,rz,ux,uz}=camBasis();
  const k=cam.dist*0.0013;
  cam.tx -= (rx*dx + ux*dy)*k;
  cam.tz -= (rz*dx + uz*dy)*k;
}
// One key tap, in world units. Deliberately the SAME convention as panScreen -- dx/dy are
// screen-space, y pointing DOWN, and both move the world in that direction. Having two
// functions with opposite sign conventions is exactly how the axes ended up crossed.
// So "W" is panKey(0,+1): the view pans up, which slides the world down the screen,
// identical to dragging downward.
function panKey(dx,dy){
  const {rx,rz,ux,uz}=camBasis();
  const s=Math.max(1.8, cam.dist*0.030);   // scale with zoom so it stays usable far out
  cam.tx -= (rx*dx + ux*dy)*s;
  cam.tz -= (rz*dx + uz*dy)*s;
}

// ---------- raycast ----------
const ray=new THREE.Raycaster(), mouse=new THREE.Vector2();
let mouseTile={x:0,z:0}, onTile=false;
function pickTile(ev){
  mouse.set(ev.clientX/innerWidth*2-1, -(ev.clientY/innerHeight)*2+1);
  ray.setFromCamera(mouse,camera);
  const hits=ray.intersectObject(terrainGroup.children[0], false);
  if(!hits.length) return null;
  const p=hits[0].point;
  const gx=Math.floor(p.x/TILE+N/2), gz=Math.floor(p.z/TILE+N/2);
  if(!inb(gx,gz)) return null;
  return {x:gx,z:gz,y:heightAt(gx,gz)};
}
function pickBuilding(ev){
  mouse.set(ev.clientX/innerWidth*2-1, -(ev.clientY/innerHeight)*2+1);
  ray.setFromCamera(mouse,camera);
  const hits=ray.intersectObjects(bldGroup.children,true);
  if(!hits.length) return null;
  let o=hits[0].object; while(o.parent && o.parent!==bldGroup) o=o.parent;
  return blds.find(b=>b.mesh===o)||null;
}

// ---------- selection + ghost ----------
// tool === null is the neutral state: no build mode, left-click just selects/inspects.
let tool=null, sel=null, demolishMode=false, showPaths=true, pathGroup=null, chainOpen=false;
function setTool(t){
  // clicking the card you already have selected puts you back on neutral
  tool = (t===tool && t!=='inspect') ? null : t;
  if(tool==='inspect') tool='inspect';
  demolishMode=false; refreshBar(); updateGhost();
}
// Esc / right-click: back to neutral, nothing armed.
function setNeutral(){ tool=null; demolishMode=false; refreshBar(); updateGhost(); }
function setDemolish(){ demolishMode=!demolishMode; if(demolishMode) tool=null; refreshBar(); updateGhost(); }
function updateGhost(){
  // ghostMesh is a Group, not a Mesh -- it has no .geometry of its own, so dispose the
  // whole subtree (and only free the shared materials, which the ghost cloned in place).
  if(ghostMesh){ bldGroup.remove(ghostMesh); ghostMesh.traverse(o=>{ if(o.isMesh && o.geometry) o.geometry.dispose(); }); ghostMesh=null; }
  const gi=document.getElementById('ghostinfo');
  if(gi && !gi.textContent) gi.style.display='none';
  if(!tool || !BTYPES[tool]) return;
  if(!onTile) return;
  if(tool==='inspect') return;
  const err=siteProblem(tool,mouseTile.x,mouseTile.z);
  const t=BTYPES[tool];
  const w=t.w*TILE,h=t.h*TILE;
  const g=new THREE.Group();
  const mat=new THREE.MeshStandardMaterial({color: err?0xff4444:0x66ff99, transparent:true, opacity:0.35, depthWrite:false});
  const base=new THREE.Mesh(new THREE.BoxGeometry(w,0.12,h),mat); g.add(base);
  if(tool!=='road'){
    const body=tool==='house'? houseMesh(1) : buildingMesh({type:(tool==='bridge'?'bridge':tool),x:mouseTile.x,z:mouseTile.z});
    body.traverse(o=>{ if(o.isMesh){ o.material=mat; o.castShadow=false; o.receiveShadow=false; } });
    g.add(body);
  }
  const [wx,wz]=worldOf(mouseTile.x,mouseTile.z);
  g.position.set(wx+(t.w-1)*TILE/2, mouseTile.y+0.1, wz+(t.h-1)*TILE/2);
  g.renderOrder=5; bldGroup.add(g); ghostMesh=g;
  if(gi){ gi.textContent = err? ('\u2716 '+err) : (BTYPES[tool].chain||''); gi.style.display='block'; }
}
function refreshSel(){
  const p=document.getElementById('selbox');
  if(!sel){ p.style.display='none'; return; }
  p.style.display='block';
  const t=BTYPES[sel.type];
  let info='';
  if(sel.type==='house'){
    const ht=HOUSE_TIERS[sel.tier], nx=HOUSE_TIERS[sel.tier+1];
    info=`<b>${ht.name}</b> &rarr; ${nx?nx.name:'MAX'}<br>capacity ${ht.cap} &middot; tax ${ht.tax}<br>`;
    if(nx) info+='<b>needs at doorstep:</b> '+Object.entries(nx.needs).map(([k,v])=>`${v} ${k}`).join(', ')+'<br>';
    info+=`in store: `+Object.entries(sel.inbox||{}).filter(([k,v])=>v>0).map(([k,v])=>`${k} ${v}`).join(', ')||'&mdash;';
  } else if(RECIPES[sel.type]){
    const r=RECIPES[sel.type];
    info=r.in? `<b>recipe:</b> `+Object.entries(r.in).map(([k,v])=>`${v} ${k}`).join(' + ')
                 +(r.water?' <i>(+ water radius)</i>':'')+` &rarr; ${r.amt} ${r.out}`
               : `<b>makes:</b> ${r.amt} ${r.out} per cycle`;
    if(FERTILE_NEED[sel.type]!==undefined)
      info += `<br><b>soil here:</b> ${Math.round(fertilityAt(sel.x,sel.z,t.w,t.h)*100)}% (needs ${Math.round(FERTILE_NEED[sel.type]*100)}%)`;
    if(NEEDS_WATER.includes(sel.type))
      info += `<br><b>water:</b> ${hasWater(sel)?'supplied by '+(sel.waterFrom=hasWater(sel)).type:'<span style="color:#ff8080">none in range</span>'}`;
  } else info=t.desc||'';
  const cells = sel.type==='house'
    ? [[ 'Capacity', HOUSE_TIERS[sel.tier].cap],['Tax owed', Math.round(sel.debt||0)],
       ['Desirability', Math.round(desirability(sel))],['Mood', Math.round(moodAt(sel)*100)/100],
       ['Crime here', Math.round(crimeAt(sel.x,sel.z)*100)/100],['Populace', HOUSE_TIERS[sel.tier].pop]]
    : sel.type!=='road'
    ? [[ 'Desirability', Math.round(desirability(sel))],['Mood', Math.round(moodAt(sel)*100)/100],
       ['Sin here', Math.round(sinAt(sel)*100)/100],['Crime here', Math.round(crimeAt(sel.x+((t.w/2)|0),sel.z+((t.h/2)|0))*100)/100]]
    : [];
  p.innerHTML=`<div class="hdr"><span>${t.name}</span><span>${Math.round(sel.cx/2+N/2)},${Math.round(sel.cz/2+N/2)}</span></div>
   <div class="body">${info}</div>
   ${cells.length?`<div id="selgrid">${cells.map(([a,v])=>`<div><span>${a}</span>${v}</div>`).join('')}</div>`:''}
   ${sel.warn?`<div class="warn">! ${sel.warn}</div>`:''}
   <div class="body2">${t.desc||''}</div>
   <button onclick="demolish(sel)">Demolish (+${Math.floor(t.cost*0.3)})</button>`;
}
