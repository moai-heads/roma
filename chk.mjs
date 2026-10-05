import puppeteer from '/root/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js';
const b=await puppeteer.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage(); await p.setViewport({width:800,height:600});
await p.goto('file:///root/caesar3d/roma.html',{waitUntil:'load'});
await new Promise(r=>setTimeout(r,2500));
console.log(JSON.stringify(await p.evaluate(()=>{
  let w=0; for(let i=0;i<N*N;i++) if(cells[i]===T_WATER) w++;
  const onRiver=[]; for(const bd of blds){ const t=BTYPES[bd.type];
    for(let j=0;j<t.h;j++)for(let i=0;i<t.w;i++) if(cells[idx(bd.x+i,bd.z+j)]===T_WATER) onRiver.push(bd.type); }
  return {waterTiles:w, starterOnRiver:onRiver, blds:blds.map(x=>x.type+'@'+x.x+','+x.z), money:G.money, pop:G.pop};
}),null,1));
await b.close();
