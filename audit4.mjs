import puppeteer from '/root/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js';
const b=await puppeteer.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage(); await p.setViewport({width:800,height:600});
await p.goto('file:///root/caesar3d/roma.html',{waitUntil:'load'});
await new Promise(r=>setTimeout(r,2500));
const r=await p.evaluate(()=>{
  const rows=[];
  const test=(name,mesh)=>{
    mesh.updateMatrixWorld(true);
    const roof=[],foot=[],all=[];
    mesh.traverse(o=>{ if(!o.isMesh) return; o.geometry.computeBoundingBox();
      const bb=o.geometry.boundingBox.clone(); bb.applyMatrix4(o.matrixWorld);
      const c=[(bb.min.x+bb.max.x)/2,(bb.min.z+bb.max.z)/2];
      all.push({c,a:(bb.max.x-bb.min.x)*(bb.max.z-bb.min.z)});
      if(o.userData.isRoof) roof.push(c);
      if(o.userData.isFooting) foot.push(c); });
    if(!all.length){rows.push({name,shell:null,roof:null,foot:null});return;}
    const shell=all.reduce((a,c)=>c.a>a.a?c:a);
    const avg=l=>l.length?[+(l.reduce((s,c)=>s+c[0],0)/l.length).toFixed(3),+(l.reduce((s,c)=>s+c[1],0)/l.length).toFixed(3)]:null;
    rows.push({name, shell:[+shell.c[0].toFixed(3),+shell.c[1].toFixed(3)], roof:avg(roof), foot:avg(foot)});
  };
  for(const t of Object.keys(BTYPES)){ const m=buildingMesh({type:t,x:40,z:40}); const s=new THREE.Scene(); s.add(m); m.position.set(0,0,0); test(t,m); }
  for(let tier=0;tier<4;tier++){ const m=houseMesh(tier); const s=new THREE.Scene(); s.add(m); m.position.set(0,0,0); test('house t'+tier,m); }
  return rows;
});
console.log('model'.padEnd(13),'shell'.padStart(14),'roof'.padStart(14),'footing'.padStart(14),'worst');
let bad=0;
for(const x of r){
  const vals=[x.shell,x.roof,x.foot].filter(Boolean).flat();
  const worst=Math.max(...vals.map(Math.abs));
  const off=worst>0.06; if(off)bad++;
  console.log(x.name.padEnd(13), JSON.stringify(x.shell).padStart(14), (x.roof?JSON.stringify(x.roof):'-').padStart(14),
   (x.foot?JSON.stringify(x.foot):'-').padStart(14), worst.toFixed(3).padStart(6), off?' <-- OFF':'');
}
console.log('off-axis models:',bad,'/',r.length);
await b.close();
