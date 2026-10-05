import puppeteer from '/root/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js';
import fs from 'fs';
const b=await puppeteer.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage(); await p.setViewport({width:1300,height:750});
await p.goto('file:///root/caesar3d/roma.html',{waitUntil:'load'});
await new Promise(r=>setTimeout(r,2500));
console.log(JSON.stringify(await p.evaluate(()=>{
  // 1. roads must be refused on water
  const w=[]; for(let z=0;z<N;z++)for(let x=0;x<N;x++) if(cells[idx(x,z)]===T_WATER) w.push([x,z]);
  const [rx,rz]=w[Math.floor(w.length/2)];
  const roadErr=canPlace('road',rx,rz);
  const bldErr=canPlace('house',rx,rz);
  // 2. bridge it and see if the network now spans the river
  const IR=(x,z)=>inb(x,z)&&cells[idx(x,z)]===T_ROAD; const before=IR(rx-4,rz), ok=place('bridge',rx,rz,true);
  const after=IR(rx-4,rz);
  // 3. a full west<->east road line with bridges every river tile
  let paved=0; const zs=[]; for(let z=0;z<N;z++) if(cells[idx(rx,z)]===T_WATER) zs.push(z);
  for(const z of zs) if(place('bridge',rx,z,true)) paved++;
  const reach=new Set(); const q=[[rx,0]]; reach.add(rx+',0');
  while(q.length){const [x,z]=q.pop(); for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
    const k=(x+dx)+','+(z+dz); if(!reach.has(k)&&inb(x+dx,z+dz)&&cells[idx(x+dx,z+dz)]===T_ROAD){reach.add(k);q.push([x+dx,z+dz]);}}}
  return {riverWidth:zs.length, roadOnWaterRefused:roadErr, buildingOnWaterRefused:bldErr,
          bridgePlaced:!!ok, westReachBefore:before, westReachAfter:after,
          bridgesPaved:paved, eastTiles:(30*2)+'/'+zs.length+' crossed'};
})));
// frame the river + bridge
await p.evaluate(()=>{ const [wx,wz]=worldOf(7,36); cam.tx=wx; cam.tz=wz; cam.dist=46; });
await new Promise(r=>setTimeout(r,1200));
fs.writeFileSync('bridge.png',Buffer.from((await p.evaluate(()=>document.querySelector('canvas').toDataURL('image/png'))).split(',')[1],'base64'));
await b.close();
