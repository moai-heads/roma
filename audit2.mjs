import puppeteer from '/root/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js';
const b=await puppeteer.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage(); await p.setViewport({width:800,height:600});
await p.goto('file:///root/caesar3d/roma.html',{waitUntil:'load'});
await new Promise(r=>setTimeout(r,2500));
console.log(JSON.stringify(await p.evaluate(()=>{
  const bb=blds.map(bd=>{ const t=BTYPES[bd.type]; bd.mesh.updateMatrixWorld(true);
    return {t:bd.type, x:bd.x,z:bd.z, fw:t.w*TILE, fh:t.h*TILE,
            bb:new THREE.Box3().setFromObject(bd.mesh)}; });
  const clashes=[], over=[];
  for(const m of bb){
    const sx=m.bb.max.x-m.bb.min.x, sz=m.bb.max.z-m.bb.min.z;
    if(sx>m.fw*1.25+0.6||sz>m.fh*1.25+0.6) over.push(`${m.t} ${sx.toFixed(1)}x${sz.toFixed(1)} in ${m.fw}x${m.fh}`);
    for(const n of bb){ if(m===n) continue;
      const ox=Math.min(m.bb.max.x,n.bb.max.x)-Math.max(m.bb.min.x,n.bb.min.x);
      const oz=Math.min(m.bb.max.z,n.bb.max.z)-Math.max(m.bb.min.z,n.bb.min.z);
      const oy=Math.min(m.bb.max.y,n.bb.max.y)-Math.max(m.bb.min.y,n.bb.min.y);
      if(ox>0.12&&oz>0.12&&oy>0.12) clashes.push(`${m.t}@${m.x},${m.z} vs ${n.t}@${n.x},${n.z} (${ox.toFixed(2)}x${oz.toFixed(2)}x${oy.toFixed(2)})`);
    }
  }
  return {checked:bb.length, overlapsFootprintTooMuch:over, meshClashes:clashes.length, sample:clashes.slice(0,14)};
}),null,1));
await b.close();
