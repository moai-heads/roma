import puppeteer from '/root/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js';
const b = await puppeteer.launch({headless:true, executablePath:'/usr/bin/chromium', args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p = await b.newPage();
await p.setViewport({width:1400,height:900});
const errs=[];
p.on('pageerror',e=>errs.push('PAGEERR '+e.message));
p.on('console',m=>{ if(m.type()==='error') errs.push('CONSOLE '+m.text().slice(0,160)); });
p.on('requestfailed',r=>errs.push('REQFAIL '+r.url().slice(0,80)));
await p.goto('https://moai-heads.github.io/roma/',{waitUntil:'networkidle2',timeout:60000});
await new Promise(r=>setTimeout(r,2500));
const st = await p.evaluate(()=>{
  for(let i=0;i<800;i++){ simTick(0.16); updateCarts(0.06); }
  return {three: typeof THREE!=='undefined', blds:blds.length, cards:document.querySelectorAll('#dock .card').length,
    pop:G.pop, money:Math.round(G.money), balance:G.balance,
    gl: !!document.querySelector('canvas')};
});
console.log(JSON.stringify(st,null,1));
console.log('external requests:', await p.evaluate(()=>performance.getEntriesByType('resource').map(r=>r.name).filter(n=>!n.startsWith('https://moai-heads'))));
console.log('ERRORS:', errs.length? errs.slice(0,6).join('\n'):'none');
await p.evaluate(()=>{document.getElementById('intro').style.display='none';cam.tx=0;cam.tz=14;cam.dist=50;cam.pitch=0.6;});
await new Promise(r=>setTimeout(r,2500));
await p.screenshot({path:'live.png'});
await b.close();
