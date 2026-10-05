import puppeteer from '/root/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js';
const b=await puppeteer.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage(); await p.setViewport({width:800,height:600});
await p.goto('file:///root/caesar3d/roma.html',{waitUntil:'load'});
await new Promise(r=>setTimeout(r,2500));
console.log(JSON.stringify(await p.evaluate(()=>{
  // bulldoze the whole starter, back to bare ground
  for(const bd of [...blds]) demolish(bd);
  for(let z=0;z<N;z++)for(let x=0;x<N;x++) if(cells[idx(x,z)]===T_ROAD){cells[idx(x,z)]=T_EMPTY;roadLevel[idx(x,z)]=0;}
  rebuildRoads();
  G.money=5000;
  const C=(N/2)|0;
  const log=[];
  const tryBuild=(t,x,z)=>{ const before=G.money; const r=place(t,x,z); log.push(`${t}: ${r?'OK':'FAIL'} money ${Math.round(before)}->${Math.round(G.money)}`); return r; };
  tryBuild('well',C,C);
  for(let x=C-4;x<=C+4;x++) place('road',x,C,true===false);   // roads cost money, from the player's wallet
  tryBuild('road',C+5,C);
  tryBuild('market',C-3,C+2);
  tryBuild('granary',C+3,C+2);
  tryBuild('house',C-1,C+2);
  tryBuild('house',C+1,C+2);
  tryBuild('temple',C-3,C+4);
  log.push('senate reason: '+canPlace('senate',C+1,C+4));
  tryBuild('senate',C+1,C+4);
  tryBuild('senate',C+8,C+8);
  tryBuild('farm',C-8,C+8);
  return {log, moneyLeft:Math.round(G.money), pop:G.pop, blds:blds.length};
}),null,1));
await b.close();
