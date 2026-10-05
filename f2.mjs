import puppeteer from '/root/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js';
const b = await puppeteer.launch({headless:true, executablePath:'/usr/bin/chromium', args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p = await b.newPage(); await p.setViewport({width:1600,height:1000});
p.on('pageerror',e=>console.log('ERR',e.stack));
await p.goto('file:///root/caesar3d/roma.html',{waitUntil:'load'});
await new Promise(r=>setTimeout(r,1200));
console.log(JSON.stringify(await p.evaluate(()=>{
  const C=36; place('alehouse',C-8,C+20,true); place('brothel',C-4,C+20,true);
  const log=[];
  for(let k=0;k<8;k++){
    for(let i=0;i<400;i++){ simTick(0.16); updateCarts(0.06); }
    log.push({m:Math.round(G.money),tax:G.tax,up:G.upkeep,bal:G.balance,vice:G.vice,
      debt:Math.round(blds.filter(x=>x.type==='house').reduce((s,x)=>s+(x.debt||0),0)),
      hauled:Math.round(G.taxHauled||0),pop:G.pop,
      tier:blds.filter(x=>x.type==='house').reduce((s,x)=>s+x.tier,0)});
  }
  return log;
}),null,1));
await b.close();
