import puppeteer from '/root/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js';
const b = await puppeteer.launch({headless:true, executablePath:'/usr/bin/chromium', args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p = await b.newPage(); await p.setViewport({width:1600,height:1000});
p.on('pageerror',e=>console.log('ERR',e.stack));
await p.goto('file:///root/caesar3d/roma.html',{waitUntil:'load'});
await new Promise(r=>setTimeout(r,1200));
console.log(JSON.stringify(await p.evaluate(()=>{
  const C=36;
  for(let i=0;i<3000;i++){ simTick(0.16); updateCarts(0.06); }
  const base={pop:G.pop,tier:blds.filter(x=>x.type==='house').reduce((s,x)=>s+x.tier,0),
    m:Math.round(G.money), maxD:Math.round(Math.max(...F_DESIRE.cache))};
  // now a vice district next to housing + a watchtower
  place('alehouse',C-10,C+10,true); place('alehouse',C-8,C+10,true);
  place('brothel',C-6,C+10,true); place('gambling',C-4,C+10,true);
  place('watchtower',C+1,C+11,true);
  fieldTick(0.25);
  const snap=[];
  for(let k=0;k<6;k++){
    for(let i=0;i<500;i++){ simTick(0.16); updateCarts(0.06); }
    snap.push({tier:blds.filter(x=>x.type==='house').reduce((s,x)=>s+x.tier,0),
      vice:G.vice, sin:Math.round(F_SIN.at(C-8,C+10)*100)/100,
      crime:Math.round(F_CRIME.at(C-8,C+10)*100)/100,
      mood:Math.round(moodAt(blds.find(x=>x.type==='house'&&x.x===C-11))*100)/100,
      crim:criminals().length, pref:prefects().length, coll:collectors().length,
      m:Math.round(G.money), stolen:Math.round(G.stolen||0), slain:G.slain||0,
      evo:blds.filter(x=>x.type==='gambling'||x.type==='opiumden').length});
  }
  return {base,snap};
}),null,1));
await b.close();
