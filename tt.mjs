import puppeteer from '/root/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js';
const b = await puppeteer.launch({headless:true, executablePath:'/usr/bin/chromium', args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p = await b.newPage();
await p.setViewport({width:1600,height:1000});
p.on('pageerror',e=>console.log('ERR',e.stack));
await p.goto('file:///root/caesar3d/roma.html',{waitUntil:'load'});
await new Promise(r=>setTimeout(r,1200));
console.log(JSON.stringify(await p.evaluate(()=>{
  const o=[]; for(let i=0;i<3000;i++){ simTick(0.16); updateCarts(0.06); }
  return {pop:G.pop,money:Math.round(G.money),tax:G.tax,up:G.upkeep,bal:G.balance,
    tiers:blds.filter(b=>b.type==='house').map(b=>b.tier).join('')};
}),null,1));
await b.close();
