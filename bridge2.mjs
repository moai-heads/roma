import puppeteer from '/root/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js';
const b=await puppeteer.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage(); await p.setViewport({width:800,height:600});
await p.goto('file:///root/caesar3d/roma.html',{waitUntil:'load'});
await new Promise(r=>setTimeout(r,2500));
console.log(JSON.stringify(await p.evaluate(()=>{
  const IR=(x,z)=>inb(x,z)&&cells[idx(x,z)]===T_ROAD;
  const comp=(x,z)=>{const s=new Set(),q=[[x,z]];s.add(x+','+z);
    while(q.length){const [a,c]=q.pop();for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const k=(a+dx)+','+(c+dz); if(!s.has(k)&&IR(a+dx,c+dz)){s.add(k);q.push([a+dx,c+dz]);}}} return s;};
  // the starter network
  let sx,sz; for(let z=0;z<N;z++)for(let x=0;x<N;x++) if(IR(x,z)){sx=x;sz=z;break;}
  const main=comp(sx,sz);
  // west bank reachable before any bridge?
  let west=0; for(let z=0;z<N;z++) if(IR(3,z)&&main.has('3,'+z)) west++;
  // now pave a road west from the starter, bridging the river
  const Z=40; let built=0,bridges=0;
  for(let x=sx;x>=2;x--){ if(cells[idx(x,Z)]===T_WATER){ if(place('bridge',x,Z,true)){bridges++;built++;} }
                              else if(place('road',x,Z,true)) built++; }
  const after=comp(sx,sz);
  let west2=0; for(let z=0;z<N;z++) if(IR(3,z)&&after.has('3,'+z)) west2++;
  return {westReachableBefore:west, built, bridgesUsed:bridges, westReachableAfter:west2, netGrew: after.size-main.size};
}),null,1));
await b.close();
