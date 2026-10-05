import puppeteer from '/root/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js';
import fs from 'fs';
const b=await puppeteer.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage(); await p.setViewport({width:1500,height:900});
await p.goto('file:///root/caesar3d/roma.html',{waitUntil:'load'});
await new Promise(r=>setTimeout(r,2500));
// frame the town centre tightly
await p.evaluate(()=>{ const C=(N/2)|0; const [wx,wz]=worldOf(C,C+8); cam.tx=wx; cam.tz=wz; cam.dist=24; });
await new Promise(r=>setTimeout(r,1200));
fs.writeFileSync('iso2.png',Buffer.from((await p.evaluate(()=>document.querySelector('canvas').toDataURL('image/png'))).split(',')[1],'base64'));
await b.close();
