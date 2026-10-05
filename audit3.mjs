import puppeteer from '/root/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js';
const b=await puppeteer.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage(); await p.setViewport({width:800,height:600});
await p.goto('file:///root/caesar3d/roma.html',{waitUntil:'load'});
await new Promise(r=>setTimeout(r,2500));
const r = await p.evaluate(()=>{
  const rows=[];
  const test=(name,mesh)=>{
    mesh.updateMatrixWorld(true);
    const items=[];
    mesh.traverse(o=>{ if(!o.isMesh) return;
      o.geometry.computeBoundingBox();
      const bb=o.geometry.boundingBox.clone(); bb.applyMatrix4(o.matrixWorld);
      if(!isFinite(bb.min.x)) return;
      items.push({bb, area:Math.max(1e-5,(bb.max.x-bb.min.x)*(bb.max.z-bb.min.z)), h:bb.max.y-bb.min.y}); });
    if(!items.length){ rows.push({name,shell:null,roof:null,d:null,shellArea:0,totalArea:0}); return; }
    const shell=items.reduce((a,c)=>c.area>a.area?c:a);
    const above=items.filter(i=>i.bb.min.y>shell.bb.max.y-0.4);
    const roof=above.reduce((a,c)=>(!a||c.h>a.h)?c:a,null);
    const cx=bb=>+((bb.min.x+bb.max.x)/2).toFixed(3), cz=bb=>+((bb.min.z+bb.max.z)/2).toFixed(3);
    rows.push({name, shell:[cx(shell.bb),cz(shell.bb)], roof:roof?[cx(roof.bb),cz(roof.bb)]:null,
      d:roof?[+(cx(roof.bb)-cx(shell.bb)).toFixed(3),+(cz(roof.bb)-cz(shell.bb)).toFixed(3)]:null,
      shellArea:+shell.area.toFixed(2), totalArea:+items.reduce((s,i)=>s+i.area,0).toFixed(2)});
  };
  const mk=t=>{ const m=buildingMesh({type:t,x:40,z:40}); const s=new THREE.Scene(); s.add(m); m.position.set(0,0,0); return m; };
  for(const t of Object.keys(BTYPES)) test(t, mk(t));
  for(let tier=0;tier<4;tier++){ const m=houseMesh(tier); const s=new THREE.Scene(); s.add(m); m.position.set(0,0,0); test('house t'+tier,m); }
  return rows;
});
console.log('model'.padEnd(14),'shell'.padStart(15),'roof'.padStart(15),'delta'.padStart(15),' shell%');
let bad=0;
for(const x of r){ const off=x.d&&(Math.abs(x.d[0])>0.06||Math.abs(x.d[1])>0.06); if(off)bad++;
  console.log(x.name.padEnd(14), JSON.stringify(x.shell).padStart(15), (x.roof?JSON.stringify(x.roof):'-').padStart(15),
    (x.d?JSON.stringify(x.d):'-').padStart(15), (x.shellArea/(x.totalArea||1)*100).toFixed(0).padStart(5)+'%', off?' <-- OFF':''); }
console.log('roof off-centre:',bad,'/',r.length);
await b.close();
