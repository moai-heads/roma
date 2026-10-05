import puppeteer from '/root/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js';
const variants = {
 A:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'],
 B:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader','--disable-gpu-compositing'],
 C:['--no-sandbox','--enable-unsafe-swiftshader','--disable-software-rasterizer'],
 D:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-gpu-compositing','--run-all-compositor-stages-before-draw','--disable-frame-rate-limit'],
};
for(const [k,args] of Object.entries(variants)){
  try{
    const b=await puppeteer.launch({headless:true,executablePath:'/usr/bin/chromium',args});
    const p=await b.newPage(); await p.setViewport({width:1600,height:1000});
    await p.goto('file:///root/caesar3d/roma.html',{waitUntil:'load'});
    await new Promise(r=>setTimeout(r,1500));
    await p.screenshot({path:'v4-'+k+'.png'});
    const s=await p.evaluate(()=>{const c=document.createElement('canvas');c.width=200;c.height=120;
      const g=c.getContext('2d'); g.drawImage(renderer.domElement,0,0,200,120);
      const d=g.getImageData(100,60,1,1).data; return [d[0],d[1],d[2]];});
    console.log(k,'inPageSample',s.join(','));
    await b.close();
  }catch(e){ console.log(k,'FAILED',e.message.slice(0,60)); }
}
