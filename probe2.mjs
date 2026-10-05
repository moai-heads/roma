import puppeteer from '/root/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js';
const b=await puppeteer.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage(); await p.setViewport({width:1600,height:1000});
p.on('pageerror',e=>console.log('ERR',e.message));
await p.goto('file:///root/caesar3d/roma.html',{waitUntil:'load'});
await new Promise(r=>setTimeout(r,1500));
console.log('BEFORE', await p.evaluate(()=>({canvas:!!document.querySelector('canvas'),
  w:renderer.domElement.width,h:renderer.domElement.height,
  lost:renderer.getContext().isContextLost&&renderer.getContext().isContextLost(),
  cam:[Math.round(camera.position.x),Math.round(camera.position.y),Math.round(camera.position.z)],
  children:scene.children.length, top:document.getElementById('top')?getComputedStyle(document.getElementById('top')).display:'none',
  dock:!!document.getElementById('dock')})));
await p.screenshot({path:'probe-before.png'});
await p.evaluate(()=>{ for(let i=0;i<1500;i++){ simTick(0.16); updateCarts(0.06);} });
await new Promise(r=>setTimeout(r,1500));
await p.screenshot({path:'probe-after.png'});
console.log('AFTER', await p.evaluate(()=>({lost:renderer.getContext().isContextLost&&renderer.getContext().isContextLost(),
  cam:[Math.round(camera.position.x),Math.round(camera.position.y),Math.round(camera.position.z)],children:scene.children.length})));
await b.close();
