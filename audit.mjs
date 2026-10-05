import puppeteer from '/root/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js';
const b=await puppeteer.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage(); await p.setViewport({width:800,height:600});
await p.goto('file:///root/caesar3d/roma.html',{waitUntil:'load'});
await new Promise(r=>setTimeout(r,2500));
const rows=await p.evaluate(()=>{
  const out=[];
  for(const t of Object.keys(BTYPES).filter(k=>k!=='house')){  // houses go through houseMesh, audited separately
    const d=BTYPES[t]; const x=40,z=40;
    const m=buildingMesh({type:t,x,z});
    const [wx,wz]=worldOf(x,z);
    m.position.set(wx+(d.w-1)*TILE/2, heightAt(x,z), wz+(d.h-1)*TILE/2);
    m.updateMatrixWorld(true);
    // shell box: everything except decoration, which may legitimately overhang
    let minx=1e9,maxx=-1e9,minz=1e9,maxz=-1e9,miny=1e9;
    m.traverse(o=>{ if(!o.isMesh||o.userData.isDecor) return;
      o.geometry.computeBoundingBox();
      const bb=o.geometry.boundingBox.clone(); bb.applyMatrix4(o.matrixWorld);
      minx=Math.min(minx,bb.min.x); maxx=Math.max(maxx,bb.max.x);
      minz=Math.min(minz,bb.min.z); maxz=Math.max(maxz,bb.max.z); miny=Math.min(miny,bb.min.y); });
    const ex=wx+(d.w-1)*TILE/2, ez=wz+(d.h-1)*TILE/2;
    out.push({t,w:d.w,h:d.h, dx:+(((minx+maxx)/2)-ex).toFixed(3), dz:+(((minz+maxz)/2)-ez).toFixed(3),
      spanX:+(maxx-minx).toFixed(2), spanZ:+(maxz-minz).toFixed(2), baseY:+(miny-heightAt(x,z)).toFixed(3)});
  }
  return out;
});
console.log('type'.padEnd(12),'dx'.padStart(7),'dz'.padStart(7),'spanX'.padStart(6),'spanZ'.padStart(6),'baseY'.padStart(7));
let bad=0;
for(const r of rows){ const off=!(Math.abs(r.dx)<0.05&&Math.abs(r.dz)<0.05&&Math.abs(r.baseY)<0.05); if(off)bad++;
  console.log(r.t.padEnd(12),String(r.dx).padStart(7),String(r.dz).padStart(7),String(r.spanX).padStart(6),String(r.spanZ).padStart(6),String(r.baseY).padStart(7),off?' <-- OFF':''); }
console.log('misaligned:',bad,'/',rows.length);
await b.close();
