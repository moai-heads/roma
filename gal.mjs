import puppeteer from '/root/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js';
import fs from 'fs';
const b=await puppeteer.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage(); await p.setViewport({width:1500,height:900});
const errs=[];p.on('pageerror',e=>errs.push(String(e)));
await p.goto('file:///root/caesar3d/roma.html',{waitUntil:'load'});
await new Promise(r=>setTimeout(r,2500));
const names=await p.evaluate(()=>{
  // wipe the city, lay out one of each type on a clean grid, hide fog+HUD
  for(const b of blds){ bldGroup.remove(b.mesh); } blds.length=0;
  document.querySelectorAll('.panel,#stock,#msgs,#dock,#top,#help,.card').forEach(e=>e.style.display='none');
  scene.fog=null; scene.background=new THREE.Color(0x101820);
  const types=Object.keys(BTYPES).filter(t=>BTYPES[t].mesh!==false||true);
  const cols=6; let i=0; const out=[];
  for(const t of types){
    const d=BTYPES[t]; const x=20+ (i%cols)*6, z=22+Math.floor(i/cols)*6;
    for(let dz=0;dz<d.h;dz++)for(let dx=0;dx<d.w;dx++){cells[idx(x+dx,z+dz)]=T_BLD;}
    const m=buildingMesh({type:t,x,z});
    const [wx,wz]=worldOf(x,z);
    m.position.set(wx+(d.w-1)*TILE/2, heightAt(x,z), wz+(d.h-1)*TILE/2);
    bldGroup.add(m); out.push(t); i++;
  }
  const [cx,cz]=worldOf(38,38); cam.tx=cx; cam.tz=cz; cam.dist=95;
  return out;
});
console.log(names.length, 'errs',errs.slice(0,2));
await new Promise(r=>setTimeout(r,1500));
fs.writeFileSync('gal.png',Buffer.from((await p.evaluate(()=>document.querySelector('canvas').toDataURL('image/png'))).split(',')[1],'base64'));
console.log(names.join(' '));
await b.close();
