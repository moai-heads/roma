import puppeteer from '/root/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js';
import fs from 'fs';
const b=await puppeteer.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage(); await p.setViewport({width:1500,height:940});
await p.goto('file:///root/caesar3d/index.html',{waitUntil:'load'});
await new Promise(r=>setTimeout(r,2500));
async function look(name,tile,dist=26){
  await p.evaluate((t,d)=>{ const b=blds.find(b=>b.type===t);
    const [wx,wz]=worldOf(b.x+(BTYPES[t].w/2|0), b.z+(BTYPES[t].h/2|0));
    cam.tx=wx; cam.tz=wz; cam.dist=d; },tile,dist);
  await new Promise(r=>setTimeout(r,400));
  const f=`look-${name}.png`;
  await p.screenshot({path:f});
  const px=await p.evaluate(()=>{const c=document.querySelector('canvas');const g=document.createElement('canvas');
    g.width=c.width;g.height=c.height;g.getContext('2d').drawImage(c,0,0);
    const d=g.getContext('2d').getImageData(0,0,g.width,g.height).data;let s=0,n=0,var_=0;
    for(let i=0;i<d.length;i+=4*97){const v=(d[i]+d[i+1]+d[i+2])/3;s+=v;n++;var_+=v*v;}
    const m=s/n; return {mean:+m.toFixed(1), sd:+Math.sqrt(var_/n-m*m).toFixed(1)};});
  console.log(f.padEnd(20), 'mean='+String(px.mean).padStart(6), 'sd='+String(px.sd).padStart(6),
    px.mean<30?'  <-- BLACK FRAME':(px.sd<12?'  <-- FLAT':'ok'));
}
await look('senate','senate');
await look('market','market');
await look('temple','temple');
await look('city','house',70);
await b.close();
