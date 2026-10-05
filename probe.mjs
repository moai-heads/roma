import puppeteer from '/root/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js';
const b=await puppeteer.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage(); p.on('pageerror',e=>console.log('ERR',e.message));
await p.goto('file:///root/caesar3d/roma.html',{waitUntil:'load'});
await new Promise(r=>setTimeout(r,1200));
console.log(await p.evaluate(()=>{
  const log=[fieldMode];
  for(let i=0;i<7;i++){ cycleFieldOverlay(); log.push(fieldMode+'/'+(fieldOverlay?'mesh':'null')); }
  return log.join(' | ');
}));
await b.close();
