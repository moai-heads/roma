import puppeteer from '/root/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js';
const b = await puppeteer.launch({headless:true, executablePath:'/usr/bin/chromium', args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p = await b.newPage(); await p.setViewport({width:1600,height:1000});
p.on('pageerror',e=>console.log('ERR',e.stack));
p.on('console',m=>{ if(m.type()==='error') console.log('CON',m.text()); });
await p.goto('file:///root/caesar3d/roma.html',{waitUntil:'load'});
await new Promise(r=>setTimeout(r,1200));
console.log(JSON.stringify(await p.evaluate(()=>{
  const C=36; const out={};
  // build a vice district + a watchtower
  place('alehouse',C-8,C+20,true); place('alehouse',C-6,C+20,true);
  place('brothel',C-4,C+20,true); place('gambling',C-2,C+20,true);
  place('watchtower',C+5,C+20,true); place('temple',C+1,C+19,true);
  fieldTick(0.25); fieldTick(0.25);
  const sinv=F_SIN.at(C-5,C+20), crv=F_CRIME.at(C-5,C+20);
  for(let i=0;i<4000;i++){ simTick(0.16); updateCarts(0.06); }
  return {sinAfterBuild:Math.round(sinv*100)/100, crimeAfterBuild:Math.round(crv*100)/100,
    agents:agents.length, crim:criminals().length, pref:prefects().length, coll:collectors().length,
    pop:G.pop, money:Math.round(G.money), vice:G.vice, mood:Math.round((G.moodAvg||0)*100),
    stolen:Math.round(G.stolen||0), hauled:Math.round(G.taxHauled||0),
    debt:Math.round(blds.filter(x=>x.type==='house').reduce((s,x)=>s+(x.debt||0),0)),
    crimeNow:Math.round(F_CRIME.at(C-5,C+20)*100)/100,
    sinNow:Math.round(F_SIN.at(C-5,C+20)*100)/100,
    evolved:blds.filter(x=>x.type==='gambling'||x.type==='opiumden').map(x=>x.type),
    sources:F_SIN.stable.length, decaying:F_DESIRE.decaying.length};
}),null,1));
await b.close();
