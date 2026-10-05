import puppeteer from '/root/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js';
const b = await puppeteer.launch({headless:true, executablePath:'/usr/bin/chromium', args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p = await b.newPage(); await p.setViewport({width:1600,height:1000});
const errs=[]; p.on('pageerror',e=>errs.push(''+e));
await p.goto('file:///root/caesar3d/roma.html',{waitUntil:'load'});
await new Promise(r=>setTimeout(r,1200));

// place the vice block and run only until sin is high but BEFORE larariums form
const state = await p.evaluate(()=>{
  const C=36;
  place('watchtower',C+2,C+9,true);
  place('alehouse',C+2,C+11,true); place('brothel',C+4,C+11,true);
  place('gambling',C+6,C+11,true); place('opiumden',C+8,C+11,true);
  for(let i=0;i<1500;i++){ simTick(0.16); updateCarts(0.06); }
  // aim at the actual world position of the vice block, not a guessed origin
  const w=worldOf(41,48);
  cam.tx=w[0]; cam.tz=w[1]; cam.dist=40; cam.yaw=0.55; cam.pitch=0.72;
  renderHUD();
  return {aim:[w[0],w[1]], crime:Math.round(F_CRIME.at(41,48)*100)/100,
          sin:Math.round(F_SIN.at(41,48)*100)/100,
          vice:blds.filter(x=>VICE.includes(x.type)).map(x=>x.type).join(','),
          crim:criminals().length, pref:prefects().length, coll:collectors().length};
});
console.log('state', JSON.stringify(state));

async function shot(name,mode){
  await p.evaluate(m=>{ for(let i=0;i<8 && fieldMode!==m;i++) cycleFieldOverlay(); },mode);
  await new Promise(r=>setTimeout(r,2500));      // let the camera lerp settle
  await p.screenshot({path:name});
  return p.evaluate(()=>({mode:fieldMode,cam:[Math.round(camera.position.x),Math.round(camera.position.y),Math.round(camera.position.z)]}));
}
for(const [n,m] of [['v-crime.png',3],['v-sin.png',2],['v-desire.png',0]]){
  console.log(n, JSON.stringify(await shot(n,m)));
}
console.log('off', JSON.stringify(await shot('v-plain.png',-1)));
console.log('overlayNow', await p.evaluate(()=>fieldMode));
await p.screenshot({path:'v-plain.png'});
console.log('errors', errs.length, errs.slice(0,3).join('|'));
await b.close();
