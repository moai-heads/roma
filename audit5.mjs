// Roof/wall agreement audit.
// The old check compared the roof centroid to the overall bbox centre. A model that is
// *consistently* misbuilt is symmetric about a wrong point, so that test can never fail it
// (the temple passed at 0.034 with its pediment hanging off the back). This checks the two
// things that actually broke:
//   1. the colonnade / load-bearing rows are symmetric in x and z about the model centre
//   2. the roof spans the footprint it is supposed to cover (roof must not be narrower
//      than the walls it caps, and must be centred on them)
import puppeteer from '/root/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js';
const b=await puppeteer.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage(); await p.setViewport({width:800,height:600});
await p.goto('file:///root/caesar3d/roma.html',{waitUntil:'load'});
await new Promise(r=>setTimeout(r,2500));
const r=await p.evaluate(()=>{
  const rows=[];
  const check=(name,m)=>{
    m.position.set(0,0,0); m.updateMatrixWorld(true);
    const cols=[], roofs=[];
    m.traverse(o=>{ if(!o.isMesh||o.userData.isDecor) return; o.geometry.computeBoundingBox();
      const bb=o.geometry.boundingBox.clone(); bb.applyMatrix4(o.matrixWorld);
      const rec={x0:bb.min.x,x1:bb.max.x,z0:bb.min.z,z1:bb.max.z};
      if(o.userData.isRoof) roofs.push(rec);
      // a column/post: tall and thin in both plan axes
      else if((rec.x1-rec.x0)<0.55 && (rec.z1-rec.z0)<0.55 && (bb.max.y-bb.min.y)>0.8) cols.push(rec);
    });
    if(!cols.length){ rows.push({name,note:'no columns'}); return; }
    // cluster the column centres into rows
    const key=r=>`${((r.x0+r.x1)/2).toFixed(2)}|${((r.z0+r.z1)/2).toFixed(2)}`;
    const seen=new Set(); const rowsXY=[];
    for(const c of cols){ const k=key(c); if(seen.has(k))continue; seen.add(k); rowsXY.push(c); }
    const cxAll=rowsXY.reduce((a,c)=>a+(c.x0+c.x1)/2,0)/rowsXY.length;
    const czAll=rowsXY.reduce((a,c)=>a+(c.z0+c.z1)/2,0)/rowsXY.length;
    // every column centre must be mirrored by a partner at (-x,-z) about the mean
    let worstSym=0;
    for(const c of rowsXY){
      const x=(c.x0+c.x1)/2-cxAll, z=(c.z0+c.z1)/2-czAll;
      let best=1e9;
      for(const d of rowsXY){
        const dx=(d.x0+d.x1)/2-cxAll, dz=(d.z0+d.z1)/2-czAll;
        if(d===c) continue;
        best=Math.min(best, Math.hypot(dx+x, dz+z));
      }
      if(best<1e8) worstSym=Math.max(worstSym,best);
    }
    const rx0=Math.min(...roofs.map(r=>r.x0)), rx1=Math.max(...roofs.map(r=>r.x1));
    const rz0=Math.min(...roofs.map(r=>r.z0)), rz1=Math.max(...roofs.map(r=>r.z1));
    const wx0=Math.min(...cols.map(r=>r.x0)), wx1=Math.max(...cols.map(r=>r.x1));
    const wz0=Math.min(...cols.map(r=>r.z0)), wz1=Math.max(...cols.map(r=>r.z1));
    const cover=[ (rx1-rx0)>=(wx1-wx0)-0.02, (rz1-rz0)>=(wz1-wz0)-0.02,
                  Math.abs((rx0+rx1)/2-(wx0+wx1)/2)<0.05, Math.abs((rz0+rz1)/2-(wz0+wz1)/2)<0.05 ];
    rows.push({name,nCol:rowsXY.length,sym:+worstSym.toFixed(3),cover:cover.every(Boolean)?'ok':'FAIL',
      rSpan:[+(rx1-rx0).toFixed(2),+(rz1-rz0).toFixed(2)], wSpan:[+(wx1-wx0).toFixed(2),+(wz1-wz0).toFixed(2)]});
  };
  // only genuine colonnades; a 'thin tall' heuristic also matches well posts, window
  // frames and stall legs, which produced 8 false positives last run.
  for(const t of ['temple','senate','grand','market']){
    if(!BTYPES[t]) continue;
    const m=buildingMesh({type:t,x:0,z:0});
    const s=new THREE.Scene(); s.add(m); check(t,m);
  }
  return rows;
});
let bad=0;
for(const x of r){
  if(x.note){ continue; }
  const f=x.sym>0.05 || x.cover!=='ok';
  if(f)bad++;
  console.log(x.name.padEnd(14), 'cols='+String(x.nCol).padStart(3),
    'sym='+String(x.sym).padStart(6), 'roofSpan='+JSON.stringify(x.rSpan).padEnd(14),
    'wallSpan='+JSON.stringify(x.wSpan).padEnd(14), x.cover==='ok'?'':'COVER '+x.cover, f?'  <-- FAIL':'');
}
console.log('\ncolonnade models failing:',bad);
await b.close();
