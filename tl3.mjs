import puppeteer from '/root/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js';
const b = await puppeteer.launch({headless:true, executablePath:'/usr/bin/chromium', args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p = await b.newPage();
await p.setViewport({width:1600,height:1000});
p.on('pageerror',e=>console.log('ERR',e.stack));
await p.goto('file:///root/caesar3d/roma.html',{waitUntil:'load'});
await new Promise(r=>setTimeout(r,1200));
console.log(JSON.stringify(await p.evaluate(()=>{
  const gs=[...document.querySelectorAll('#dock .group')].map(g=>{const b=g.getBoundingClientRect();
    return {t:g.querySelector('.ghead span').textContent.trim(), x:Math.round(b.left), y:Math.round(b.top),
      w:Math.round(b.width), h:Math.round(b.height),
      cols:getComputedStyle(g.querySelector('.cards')).gridTemplateColumns.split(' ').length,
      rows:getComputedStyle(g.querySelector('.cards')).gridTemplateRows.split(' ').length,
      cards:g.querySelectorAll('.card').length};});
  return {groups:gs, barH:Math.round(document.getElementById('bar').getBoundingClientRect().height),
    overX:document.documentElement.scrollWidth>innerWidth};
}),null,1));
await p.evaluate(()=>{document.getElementById('intro').style.display='none';cam.tx=0;cam.tz=14;cam.dist=52;cam.pitch=0.62;});
await new Promise(r=>setTimeout(r,2200));
await p.screenshot({path:'c3.png'});
await b.close();
