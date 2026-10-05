import puppeteer from '/root/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js';
const b = await puppeteer.launch({headless:true, executablePath:'/usr/bin/chromium', args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p = await b.newPage(); await p.setViewport({width:1600,height:1000});
const errs=[]; p.on('pageerror',e=>errs.push(''+e)); p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
await p.goto('file:///root/caesar3d/roma.html',{waitUntil:'load'});
await new Promise(r=>setTimeout(r,1200));
await p.evaluate(()=>{
  const C=36;
  place('watchtower',C+2,C+9,true);
  place('alehouse',C+2,C+11,true); place('brothel',C+4,C+11,true);
  place('gambling',C+6,C+11,true); place('opiumden',C+8,C+11,true);
  for(let i=0;i<2600;i++){ simTick(0.16); updateCarts(0.06); }
  cam.tx=2; cam.tz=2; cam.dist=52; cam.yaw=0.7; cam.pitch=0.62;
  renderHUD();
});
for(const [name,mode] of [['shot-crime',3],['shot-sin',2],['shot-mood',1]]){
  await p.evaluate(m=>{ for(let i=0;i<8 && fieldMode!==m;i++) cycleFieldOverlay(); },mode);
  await new Promise(r=>setTimeout(r,600));
  await p.screenshot({path:name+'.png'});
}
await p.evaluate(()=>{ for(let i=0;i<8 && fieldMode!==-1;i++) cycleFieldOverlay(); });
await new Promise(r=>setTimeout(r,500));
await p.screenshot({path:'shot-city.png'});
console.log('errors:',errs.length, errs.slice(0,5).join(' | '));
console.log(await p.evaluate(()=>({crim:criminals().length,pref:prefects().length,coll:collectors().length,vice:G.vice,m:Math.round(G.money),crime:Math.round(F_CRIME.at(40,47)*100)/100})));
await b.close();
