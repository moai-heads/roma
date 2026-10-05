import puppeteer from '/root/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js';
import fs from 'fs';
const b=await puppeteer.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage(); await p.setViewport({width:1500,height:900});
const errs=[]; p.on('console',m=>{if(m.type()==='error')errs.push(m.text())}); p.on('pageerror',e=>errs.push(String(e)));
await p.goto('file:///root/caesar3d/roma.html',{waitUntil:'load'});
await new Promise(r=>setTimeout(r,3000));
const d=await p.evaluate(()=>{
  let wt=0; for(let z=0;z<N;z++)for(let x=0;x<N;x++) if(cells[idx(x,z)]===T_WATER) wt++;
  return {waterTiles:wt, cam:{d:cam.dist,yaw:+cam.yaw.toFixed(3),pitch:+cam.pitch.toFixed(3)}, blds:blds.length};
});
console.log(JSON.stringify(d),'errs',errs.slice(0,3));
fs.writeFileSync('iso.png',Buffer.from((await p.evaluate(()=>document.querySelector('canvas').toDataURL('image/png'))).split(',')[1],'base64'));
await b.close();
