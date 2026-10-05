import puppeteer from '/root/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js';
const b=await puppeteer.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage(); await p.setViewport({width:800,height:600});
await p.goto('file:///root/caesar3d/roma.html',{waitUntil:'load'});
await new Promise(r=>setTimeout(r,2500));
console.log(JSON.stringify(await p.evaluate(()=>{
  const roads=[]; for(let z=0;z<N;z++)for(let x=0;x<N;x++) if(cells[idx(x,z)]===T_ROAD) roads.push([x,z]);
  const start=roads[0]; const seen=new Set([start[0]+','+start[1]]); const q=[start];
  while(q.length){ const [x,z]=q.pop();
    for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){ const k=(x+dx)+','+(z+dz);
      if(!seen.has(k)&&inb(x+dx,z+dz)&&cells[idx(x+dx,z+dz)]===T_ROAD){seen.add(k);q.push([x+dx,z+dz]);} } }
  const isRoad=(x,z)=>inb(x,z)&&cells[idx(x,z)]===T_ROAD;
  let noRing=[], far=[];
  for(const bd of blds){ const t=BTYPES[bd.type];
    let ring=false;
    for(let j=-1;j<=t.h;j++)for(let i=-1;i<=t.w;i++) if(isRoad(bd.x+i,bd.z+j)) ring=true;
    // nearest reachable road distance
    let d=99; const vis=new Set([bd.x+','+bd.z]), qq=[[bd.x,bd.z,0]];
    while(qq.length){ const [x,z,dd]=qq.shift(); if(isRoad(x,z)&&seen.has(x+','+z)){d=dd;break;}
      if(dd>3)continue;
      for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){const k=(x+dx)+','+(z+dz);
        if(vis.has(k)||!inb(x+dx,z+dz))continue; const c=cells[idx(x+dx,z+dz)];
        if(c===T_WATER||c===T_BLD)continue; vis.add(k); qq.push([x+dx,z+dz,dd+1]);}}
    if(!ring) noRing.push(bd.type+'@'+bd.x+','+bd.z);
    if(d>1) far.push(bd.type+'@'+bd.x+','+bd.z+'(d='+d+')');
  }
  return {roads:roads.length, reachable:seen.size, noRoadInRing:noRing, needsSpur:far};
}),null,1));
await b.close();
