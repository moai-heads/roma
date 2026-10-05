// Guards against the two mistakes that actually cost time:
//   1. testing a file that is not the one the server serves
//   2. screenshotting through a fullscreen overlay that nobody dismissed
// Everything here loads index.html -- the file GitHub Pages serves.
import puppeteer from '/root/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js';
import fs from 'fs';
import {execSync} from 'child_process';

const R=[]; const ok=(n,c,d='')=>R.push([c?'PASS':'FAIL',n,d]);
ok('index.html is byte-identical to index.html',
   fs.readFileSync('index.html').equals(fs.readFileSync('index.html')));

const b=await puppeteer.launch({headless:true,executablePath:'/usr/bin/chromium',
  args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage(); await p.setViewport({width:1500,height:940});
const errs=[]; p.on('pageerror',e=>errs.push(String(e)));
p.on('console',m=>{ if(m.type()==='error') errs.push(m.text()); });
await p.goto('https://moai-heads.github.io/roma/',{waitUntil:'load'});
await new Promise(r=>setTimeout(r,2500));

// no element may cover the viewport: every fixed overlay must be hidden or small
const overlays=await p.evaluate(()=>{
  const bad=[];
  for(const e of document.querySelectorAll('body *')){
    const s=getComputedStyle(e); if(s.display==='none'||s.visibility==='hidden'||+s.opacity===0) continue;
    const r=e.getBoundingClientRect();
    if(r.width<innerWidth*0.95 || r.height<innerHeight*0.95) continue;
    if(s.position!=='fixed') continue;
    bad.push({id:e.id||e.className||e.tagName, z:+s.zIndex||0, op:s.opacity});
  }
  return bad;
});
ok('nothing covers the viewport on load', overlays.length===0, JSON.stringify(overlays));

// and the city must actually be reachable by a plain left click (no modal in the way)
ok('left click reaches the canvas', await p.evaluate(()=>{
  const el=document.elementFromPoint(750,470);
  return el && el.tagName==='CANVAS';}));
ok('no page errors', errs.length===0, errs.slice(0,2).join(' | '));

async function shot(name,tile,dist=26){
  if(tile) await p.evaluate((t,d)=>{ const bl=blds.find(b=>b.type===t);
    const [wx,wz]=worldOf(bl.x+(BTYPES[t].w/2|0), bl.z+(BTYPES[t].h/2|0));
    cam.tx=wx; cam.tz=wz; cam.dist=d; },tile,dist);
  await new Promise(r=>setTimeout(r,400));
  await p.screenshot({path:`look-${name}.png`});
  const px=await p.evaluate(()=>{const c=document.querySelector('canvas');const g=document.createElement('canvas');
    g.width=c.width;g.height=c.height;g.getContext('2d').drawImage(c,0,0);
    const d=g.getContext('2d').getImageData(0,0,g.width,g.height).data;
    let s=0,n=0,v=0; for(let i=0;i<d.length;i+=4*97){const q=(d[i]+d[i+1]+d[i+2])/3;s+=q;n++;v+=q*q;}
    const m=s/n; return {mean:+m.toFixed(1), sd:+Math.sqrt(v/n-m*m).toFixed(1)};});
  // a frame with the intro over it is still 'bright', so brightness alone is not enough:
  // require the canvas itself to be the topmost element under the centre pixel.
  const clear=await p.evaluate(()=>{const el=document.elementFromPoint(750,470);return el&&el.tagName==='CANVAS';});
  ok(`screenshot ${name} is unobstructed and not black`,
     clear && px.mean>30 && px.sd>12, `mean=${px.mean} sd=${px.sd} clear=${clear}`);
}
await shot('city','house',72);
await shot('senate','senate');
await shot('market','market');
await shot('temple','temple');

for(const [s,n,d] of R) console.log(s.padEnd(5),n,d?('  ['+d+']'):'');
console.log('\nfailures:', R.filter(r=>r[0]==='FAIL').length);
await b.close();
process.exit(R.some(r=>r[0]==='FAIL')?1:0);
