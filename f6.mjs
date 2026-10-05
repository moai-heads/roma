import puppeteer from '/root/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js';
const b = await puppeteer.launch({headless:true, executablePath:'/usr/bin/chromium', args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p = await b.newPage(); await p.setViewport({width:1600,height:1000});
p.on('pageerror',e=>console.log('ERR',e.stack));
await p.goto('file:///root/caesar3d/roma.html',{waitUntil:'load'});
await new Promise(r=>setTimeout(r,1200));
console.log(JSON.stringify(await p.evaluate(()=>{
  const C=36;
  place('watchtower',C+2,C+9,true);
  place('alehouse',C+2,C+11,true); place('brothel',C+4,C+11,true);
  for(let i=0;i<1500;i++){ simTick(0.16); updateCarts(0.06); }
  const pr=prefects(), cr=criminals();
  const pairs=[];
  for(const a of pr){ let best=1e9,b=null;
    for(const c of cr){ const d=Math.hypot(c.x-a.x,c.z-a.z); if(d<best){best=d;b=c;} }
    pairs.push({px:a.x,pz:a.z,path:a.path?a.path.length:null,tgt:a.target?[a.target.x,a.target.z]:null,d:Math.round(best*10)/10,hp:a.hp}); }
  return {crim:cr.length, pref:pr.length, pairs, prefHp:pr.map(a=>a.hp),
    crimSample:cr.slice(0,5).map(a=>({x:a.x,z:a.z,hp:a.hp,crime:Math.round(F_CRIME.at(a.x,a.z)*100)/100})),
    towerTiles:pr.map(a=>[a.x,a.z]), crimeNear:C>0?Math.round(F_CRIME.at(C+2,C+9)*100)/100:0};
}),null,1));
await b.close();
