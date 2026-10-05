import puppeteer from '/root/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js';
const b=await puppeteer.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage(); await p.setViewport({width:1600,height:1000});
await p.goto('file:///root/caesar3d/roma.html',{waitUntil:'load'});
await new Promise(r=>setTimeout(r,1500));
console.log('renderInfo', await p.evaluate(()=>({calls:renderer.info.render.calls,tris:renderer.info.render.triangles,
  bg:scene.background.getHexString(), camY:Math.round(camera.position.y), speed:G.speed})));
// force a render inside a rAF and let the compositor pick it up
await p.evaluate(()=>new Promise(res=>requestAnimationFrame(()=>{ renderer.render(scene,camera); res(); })));
await p.screenshot({path:'probe-forced.png'});
// sample the canvas pixels directly from inside the page
console.log('canvasSample', await p.evaluate(()=>{
  const c=document.createElement('canvas'); c.width=1600;c.height=1000;
  const g=c.getContext('2d'); g.drawImage(renderer.domElement,0,0);
  const d=g.getImageData(800,500,1,1).data; return [d[0],d[1],d[2]];
}));
await b.close();
