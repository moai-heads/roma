import puppeteer from '/root/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js';
const b = await puppeteer.launch({headless:true, executablePath:'/usr/bin/chromium', args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p = await b.newPage(); p.on('pageerror',e=>console.log('ERR',e.stack));
await p.goto('file:///root/caesar3d/roma.html',{waitUntil:'load'});
await new Promise(r=>setTimeout(r,1000));
console.log(JSON.stringify(await p.evaluate(()=>{
  const C=36;
  place('alehouse',C+2,C+11,true); place('brothel',C+4,C+11,true); place('gambling',C+6,C+11,true);
  place('opiumden',C+8,C+11,true);
  for(let i=0;i<4000;i++){ simTick(0.16); updateCarts(0.06); }
  return blds.filter(x=>/alehouse|brothel|gambling|opiumden|lararium/.test(x.type))
    .map(x=>({t:x.type,sin:Math.round((x.sinLocal||0)*100)/100,evoT:Math.round(x.evoT||0),warn:x.warn||''}));
}),null,1));
await b.close();
