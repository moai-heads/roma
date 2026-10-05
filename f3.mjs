import puppeteer from '/root/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js';
const b = await puppeteer.launch({headless:true, executablePath:'/usr/bin/chromium', args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p = await b.newPage(); await p.setViewport({width:1600,height:1000});
p.on('pageerror',e=>console.log('ERR',e.stack));
await p.goto('file:///root/caesar3d/roma.html',{waitUntil:'load'});
await new Promise(r=>setTimeout(r,1200));
console.log(JSON.stringify(await p.evaluate(()=>{
  fieldTick(0.25);
  const hs=blds.filter(x=>x.type==='house').slice(0,8).map(x=>({x:x.x,z:x.z,d:Math.round(F_DESIRE.atBuilding(x)),m:Math.round(moodAt(x)*100)/100}));
  let mx=0; for(let i=0;i<N*N;i++) mx=Math.max(mx,F_DESIRE.cache[i]);
  let nz=0; for(let i=0;i<N*N;i++) if(F_DESIRE.cache[i]>1) nz++;
  return {hs, maxDesire:Math.round(mx), litTiles:nz, moodAvg:Math.round(G.moodAvg*100)};
}),null,1));
await b.close();
