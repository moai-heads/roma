// ---------- SCENE / CAMERA ----------
let renderer, scene, camera;
const cam = {dist:46, yaw:0.9, pitch:0.85, tx:0, tz:6};
function init3D(){
  scene=new THREE.Scene();
  scene.background=new THREE.Color(0x9fc4dd);
  scene.fog=new THREE.Fog(0x9fc4dd, 90, 260);
  camera=new THREE.PerspectiveCamera(50, innerWidth/innerHeight, 0.5, 900);
  renderer=new THREE.WebGLRenderer({antialias:true});
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
  const cy=cam.dist*Math.cos(cam.pitch)*Math.sin(cam.yaw);
  const cx=cam.tx+cam.dist*Math.cos(cam.pitch)*Math.cos(cam.yaw);
  const cz=cam.tz+cam.dist*Math.sin(cam.pitch);
  camera.position.lerp(new THREE.Vector3(cx,Math.max(6,cy),cz), 1-Math.pow(0.001,dt));
  camera.lookAt(cam.tx,0,cam.tz);
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
let tool='road', sel=null, demolishMode=false, showPaths=true, pathGroup=null, chainOpen=false;
function setTool(t){ tool=t; demolishMode=false; refreshBar(); }
function setDemolish(){ demolishMode=!demolishMode; refreshBar(); }
function updateGhost(){
  if(ghostMesh){ bldGroup.remove(ghostMesh); ghostMesh.geometry.dispose(); ghostMesh=null; }
  if(!onTile) return;
  if(tool==='inspect') return;
  const err=siteProblem(tool,mouseTile.x,mouseTile.z);
  const t=BTYPES[tool];
  const w=t.w*TILE,h=t.h*TILE;
  const g=new THREE.Group();
  const mat=new THREE.MeshStandardMaterial({color: err?0xff4444:0x66ff99, transparent:true, opacity:0.35, depthWrite:false});
  const base=new THREE.Mesh(new THREE.BoxGeometry(w,0.12,h),mat); g.add(base);
  if(tool!=='road'){
    const body=tool==='house'? houseMesh(1) : buildingMesh({type:tool,x:mouseTile.x,z:mouseTile.z});
    body.traverse(o=>{ if(o.isMesh){ o.material=mat; o.castShadow=false; o.receiveShadow=false; } });
    g.add(body);
  }
  const [wx,wz]=worldOf(mouseTile.x,mouseTile.z);
  g.position.set(wx+(t.w-1)*TILE/2, mouseTile.y+0.1, wz+(t.h-1)*TILE/2);
  g.renderOrder=5; bldGroup.add(g); ghostMesh=g;
  const gi=document.getElementById('ghostinfo'); if(gi) gi.textContent = err? ('\u2716 '+err) : (BTYPES[tool].chain||'');
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
