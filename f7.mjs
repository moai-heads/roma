import puppeteer from '/root/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js';
const b = await puppeteer.launch({headless:true, executablePath:'/usr/bin/chromium', args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p = await b.newPage(); await p.setViewport({width:1600,height:1000});
p.on('pageerror',e=>console.log('ERR',e.stack));
await p.goto('file:///root/caesar3d/roma.html',{waitUntil:'load'});
await new Promise(r=>setTimeout(r,1200));
console.log(JSON.stringify(await p.evaluate(()=>{
  const C=36;
  place('watchtower',C+2,C+9,true);
  for(let i=0;i<2000;i++){ simTick(0.16); updateCarts(0.06); }
  place('alehouse',C+2,C+11,true); place('brothel',C+4,C+11,true); place('gambling',C+6,C+11,true);
  place('opiumden',C+8,C+11,true);
  const out=[];
  for(let k=0;k<5;k++){
    for(let i=0;i<900;i++){ simTick(0.16); updateCarts(0.06); }
    out.push({crim:criminals().length,pref:prefects().length,slain:G.slain||0,
      stolen:Math.round(G.stolen||0),robbed:G.robbed||0,coll:collectors().length,
      vice:G.vice,m:Math.round(G.money),crime:Math.round(F_CRIME.at(C+4,C+11)*100)/100,
      evo:blds.filter(x=>x.type==='gambling'||x.type==='opiumden').map(x=>x.type).join(','),
      decaying:F_DESIRE.decaying.length});
  }
  return out;
}),null,1));
await b.close();
