import puppeteer from '/root/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js';
import fs from 'fs';
const b=await puppeteer.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage(); await p.setViewport({width:1500,height:900});
const errs=[]; p.on('console',m=>{if(m.type()==='error')errs.push(m.text())}); p.on('pageerror',e=>errs.push(String(e)));
await p.goto('file:///root/caesar3d/roma.html',{waitUntil:'load'});
await new Promise(r=>setTimeout(r,2500));
const shot=async(f,fn)=>{ if(fn) await p.evaluate(fn); await new Promise(r=>setTimeout(r,1100));
  fs.writeFileSync(f,Buffer.from((await p.evaluate(()=>document.querySelector('canvas').toDataURL('image/png'))).split(',')[1],'base64')); };
await shot('f1.png',()=>{const C=(N/2)|0;const [a,c]=worldOf(C,C+4);cam.tx=a;cam.tz=c;cam.dist=42;});
await shot('f2.png',()=>{const [a,c]=worldOf(7,36);cam.tx=a;cam.tz=c;cam.dist=34;});
console.log(JSON.stringify(await p.evaluate(()=>({pop:G.pop,money:Math.round(G.money),perMonth:Math.round(G.balance),
  buildings:blds.length, draws:renderer.info.render.calls, tris:renderer.info.render.triangles}))));
await shot('f3.png',()=>{const C=(N/2)|0;const [a,c]=worldOf(C,C);cam.tx=a;cam.tz=c;cam.dist=120;});
console.log('errors:',errs.length, errs.slice(0,2));
await b.close();
