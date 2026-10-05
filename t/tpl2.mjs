import puppeteer from '/root/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js';
const b=await puppeteer.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage(); await p.setViewport({width:800,height:600});
await p.goto('file:///root/caesar3d/index.html',{waitUntil:'load'});
await new Promise(r=>setTimeout(r,2500));
console.log(await p.evaluate(()=>{
  const m=buildingMesh({type:'temple',x:0,z:0}); m.position.set(0,0,0); m.updateMatrixWorld(true);
  const rows=[];
  m.traverse(o=>{ if(!o.isMesh) return; o.geometry.computeBoundingBox();
    const bb=o.geometry.boundingBox.clone(); bb.applyMatrix4(o.matrixWorld);
    rows.push(`z ${bb.min.z.toFixed(2)}..${bb.max.z.toFixed(2)} (c=${((bb.min.z+bb.max.z)/2).toFixed(2)}) x ${bb.min.x.toFixed(2)}..${bb.max.x.toFixed(2)} y ${bb.min.y.toFixed(2)}..${bb.max.y.toFixed(2)} ${o.userData.isRoof?'ROOF':''}`); });
  return 'TILE='+TILE+' w='+BTYPES.temple.w+' h='+BTYPES.temple.h+'\n'+rows.join('\n');
}));
await b.close();
