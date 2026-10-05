import puppeteer from '/root/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js';
import fs from 'fs';
const b=await puppeteer.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage(); await p.setViewport({width:1400,height:800});
await p.goto('file:///root/caesar3d/roma.html',{waitUntil:'load'});
await new Promise(r=>setTimeout(r,2500));
await p.evaluate(()=>{
  for(const b of blds) bldGroup.remove(b.mesh); blds.length=0;
  document.querySelectorAll('.panel,#stock,#msgs,#dock,#top,#help').forEach(e=>e.style.display='none');
  scene.fog=null; scene.background=new THREE.Color(0x182028);
  ['weaver','watchtower','lararium','temple','carpenter','market'].forEach((t,i)=>{
    const x=30+(i%3)*5, z=30+Math.floor(i/3)*5; const d=BTYPES[t];
    for(let dz=0;dz<d.h;dz++)for(let dx=0;dx<d.w;dx++)cells[idx(x+dx,z+dz)]=T_BLD;
    const m=buildingMesh({type:t,x,z}); const [wx,wz]=worldOf(x,z);
    m.position.set(wx+(d.w-1)*TILE/2,heightAt(x,z),wz+(d.h-1)*TILE/2); bldGroup.add(m);
  });
  const [cx,cz]=worldOf(35,34); cam.tx=cx; cam.tz=cz; cam.dist=32;
});
await new Promise(r=>setTimeout(r,1500));
fs.writeFileSync('gal2.png',Buffer.from((await p.evaluate(()=>document.querySelector('canvas').toDataURL('image/png'))).split(',')[1],'base64'));
await b.close();
