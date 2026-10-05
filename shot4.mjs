import puppeteer from '/root/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js';
import fs from 'fs';
const b=await puppeteer.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage(); await p.setViewport({width:1600,height:1000});
const errs=[]; p.on('pageerror',e=>errs.push(''+e));
await p.goto('file:///root/caesar3d/roma.html',{waitUntil:'load'});
await new Promise(r=>setTimeout(r,1500));

const st=await p.evaluate(()=>{
  const C=36;
  place('watchtower',C+2,C+9,true);
  place('alehouse',C+2,C+11,true); place('brothel',C+4,C+11,true);
  place('gambling',C+6,C+11,true); place('opiumden',C+8,C+11,true);
  for(let i=0;i<1500;i++){ simTick(0.16); updateCarts(0.06); }
  const w=worldOf(41,48);
  cam.tx=w[0]; cam.tz=w[1]; cam.dist=38; cam.yaw=0.5; cam.pitch=0.62;
  return {aim:w, crime:F_CRIME.at(41,48), sin:F_SIN.at(41,48), mood:moodState[idx(41,48)],
          vice:blds.filter(x=>VICE.includes(x.type)).map(x=>x.type).join(','),
          crim:criminals().length, pref:prefects().length, coll:collectors().length,
          hauled:Math.round(G.taxHauled||0), stolen:Math.round(G.stolen||0), vice_rev:G.vice, money:Math.round(G.money)};
});
console.log('state',JSON.stringify(st));

// grab the WebGL canvas directly -- Chrome's screenshot path does not composite it here
async function grab(name,mode){
  await p.evaluate(m=>{ let g=0; while((fieldMode!==m) && g++<12) cycleFieldOverlay();
                         if(m<0 && fieldOverlay){ for(let i=0;i<12&&fieldMode!==-1;i++) cycleFieldOverlay(); } },mode);
  await new Promise(r=>setTimeout(r,2200));
  const d=await p.evaluate(()=>{
    renderer.render(scene,camera);
    return {url:renderer.domElement.toDataURL('image/png'), mode:fieldMode,
            overlay:fieldOverlay?fieldOverlay.children.length:0};
  });
  fs.writeFileSync(name, Buffer.from(d.url.split(',')[1],'base64'));
  console.log(name,'mode',d.mode,'overlayTiles',d.overlay);
}
await grab('f-crime.png',3); await grab('f-sin.png',2); await grab('f-mood.png',1);
await grab('f-desire.png',0); await grab('f-city.png',-1);
console.log('errors',errs.length,errs.slice(0,3).join('|'));
await b.close();
