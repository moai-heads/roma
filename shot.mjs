import puppeteer from '/root/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js';
const b = await puppeteer.launch({headless:true, executablePath:'/usr/bin/chromium', args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p = await b.newPage(); await p.setViewport({width:1600,height:1000});
p.on('pageerror',e=>console.log('ERR',e.stack));
await p.goto('file:///root/caesar3d/roma.html',{waitUntil:'load'});
await new Promise(r=>setTimeout(r,1200));
await p.evaluate(()=>{
  document.getElementById('intro').style.display='none';
  const C=36;
  place('watchtower',C+2,C+9,true);
  for(let i=0;i<1500;i++){ simTick(0.16); updateCarts(0.06); }
  place('alehouse',C+2,C+11,true); place('brothel',C+4,C+11,true); place('gambling',C+6,C+11,true);
  place('opiumden',C+8,C+11,true); place('watchtower',C-9,C+9,true);
  for(let i=0;i<1400;i++){ simTick(0.16); updateCarts(0.06); }
  cam.tx=6; cam.tz=22; cam.dist=30; cam.pitch=0.5; cam.yaw=0.4;
  showPaths=false; G.speed=1; renderHUD();
});
await new Promise(r=>setTimeout(r,2500));
await p.screenshot({path:'crime.png'});
await p.evaluate(()=>{ fieldMode=-1; cycleFieldOverlay(); cycleFieldOverlay(); cycleFieldOverlay(); cycleFieldOverlay(); });
await new Promise(r=>setTimeout(r,1800));
await p.screenshot({path:'crimeov.png'});
await b.close();
