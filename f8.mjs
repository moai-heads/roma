import puppeteer from '/root/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js';
const b = await puppeteer.launch({headless:true, executablePath:'/usr/bin/chromium', args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p = await b.newPage(); await p.setViewport({width:1600,height:1000});
p.on('pageerror',e=>console.log('ERR',e.stack));
await p.goto('file:///root/caesar3d/roma.html',{waitUntil:'load'});
await new Promise(r=>setTimeout(r,1200));
console.log(JSON.stringify(await p.evaluate(()=>{
  const out=[];
  for(let k=0;k<5;k++){
    for(let i=0;i<1200;i++){ simTick(0.16); updateCarts(0.06); }
    let debt=0,houses=0,tiers={};
    for(const x of blds){ if(x.type==='house'){houses++;debt+=x.debt||0;tiers[x.tier]=(tiers[x.tier]||0)+1;} }
    out.push({yr:G.year,mo:G.month,houses,tiers,debt:Math.round(debt),tax:G.tax,up:G.upkeep,bal:G.balance,m:Math.round(G.money),hauled:Math.round(G.taxHauled||0),vice:G.vice});
  }
  return out;
}),null,1));
await b.close();
