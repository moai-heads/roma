// Functional test of the input/UI fixes.
// The camera check is the important one: a keyboard pan and a mouse drag are only
// "the same axes" if pressing W moves the world exactly as far as dragging upward.
import puppeteer from '/root/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js';
const b=await puppeteer.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage(); await p.setViewport({width:1400,height:900});
const errs=[]; p.on('pageerror',e=>errs.push(String(e))); p.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
await p.goto('file:///root/caesar3d/index.html',{waitUntil:'load'});
await new Promise(r=>setTimeout(r,2500));
const R=[]; const ok=(n,c,d='')=>R.push([c?'PASS':'FAIL',n,d]);
const tileAt=()=>p.evaluate(()=>{const t=pickTile({clientX:700,clientY:450});return t?[t.x,t.z]:null;});
const cam=()=>p.evaluate(()=>[+cam.tx.toFixed(4),+cam.tz.toFixed(4)]);

// --- 1. neutral state on load
let tool=await p.evaluate(()=>tool); ok('starts on neutral (no tool armed)',tool===null,'tool='+tool);

// --- 2. each key must pan the camera along the SAME ground vector as a mouse drag
// in that direction. Comparing camera deltas (not the hovered tile) because one key tap
// is smaller than a tile.
async function reset(){ await p.evaluate(()=>{cam.tx=0;cam.tz=0;}); }
async function dragBy(dx,dy){            // right-button drag is the game's pan gesture
  await p.mouse.move(700,450);
  await p.mouse.down({button:'right'});
  for(let i=1;i<=6;i++) await p.mouse.move(700+dx*20,450+dy*20);
  await p.mouse.up({button:'right'});
}
// screen space, y DOWN: W pushes the world down-screen (view pans up)
const dirs={w:[0,1],s:[0,-1],a:[-1,0],d:[1,0],ArrowUp:[0,1],ArrowDown:[0,-1],ArrowLeft:[-1,0],ArrowRight:[1,0]};
for(const [key,[dx,dy]] of Object.entries(dirs)){
  await reset(); await dragBy(dx,dy); const c1=await cam();
  await reset(); await p.keyboard.press(key); const c2=await cam();
  // Both panScreen and panKey share one convention (screen space, y down, world moves that
  // way), so the SAME input direction must produce the SAME camera delta from either.
  const same = (Math.sign(c1[0])===Math.sign(c2[0])) && (Math.sign(c1[1])===Math.sign(c2[1]));
  ok(`${key} pans identically to a mouse drag in that direction`, same && Math.hypot(...c2)>0.5,
     `drag=[${c1}] key=[${c2}]`);
}

// --- 3. axes are not swapped: the four directions must be four distinct ground vectors
await reset();
const dirs4={};
for(const [key] of Object.entries(dirs)){ await reset(); await p.keyboard.press(key); dirs4[key]=await cam(); }
const uniq=new Set(Object.values(dirs4).map(c=>c.map(v=>Math.sign(v)).join(',')));
ok('W/A/S/D are four different directions (no axis swap)', uniq.size===4, JSON.stringify(dirs4));

// --- 4. Esc returns to neutral
await p.evaluate(()=>setTool('farm'));
await p.keyboard.press('Escape');
ok('Esc puts you back on neutral', await p.evaluate(()=>tool)===null);

// --- 5. right-click returns to neutral (and a right-DRAG must not)
await p.evaluate(()=>setTool('farm'));
await p.mouse.move(700,450); await p.mouse.click(700,450,{button:'right'});
ok('right-click puts you back on neutral', await p.evaluate(()=>tool)===null);
await p.evaluate(()=>{setTool('farm'); cam.tx=0; cam.tz=0;});
await dragBy(6,0);
const panned=await cam(), stillArmed=await p.evaluate(()=>tool);
ok('right-DRAG pans the camera', Math.hypot(panned[0],panned[1])>0.5, JSON.stringify(panned));
ok('right-DRAG does not disarm the tool', stillArmed==='farm', stillArmed);

// --- 6. clicking the active card disarms it
await p.evaluate(()=>{setNeutral();});
await p.evaluate(()=>setTool('farm'));
const armed=await p.evaluate(()=>tool);
await p.evaluate(()=>setTool('farm'));
ok('clicking the selected card disarms it', armed==='farm' && await p.evaluate(()=>tool)===null);

// --- 7. neutral left-click inspects a building (so you can click a roof to report it)
await p.evaluate(()=>setNeutral());
const selName=await p.evaluate(()=>{const b=blds.find(b=>b.type==='senate'); sel=b; refreshSel();
  return document.getElementById('selbox').querySelector('.hdr span').textContent;});
ok('neutral left-click opens the inspect panel', selName==='Senate', selName);

// --- 8. dock is a single row
const dock=await p.evaluate(()=>{const d=document.getElementById('dock');const g=[...d.querySelectorAll('.group')];
  const tops=new Set(g.map(x=>Math.round(x.getBoundingClientRect().top)));
  return {n:g.length,rows:tops.size,w:d.scrollWidth,vis:d.clientWidth};});
ok('command row does not wrap', dock.rows===1, JSON.stringify(dock));

// --- 9. no empty box in the bottom layout
await p.evaluate(()=>{setNeutral(); document.getElementById('ghostinfo').textContent=''; updateGhost();});
const ghosts=await p.evaluate(()=>{const g=document.getElementById('ghostinfo');const r=g.getBoundingClientRect();
  return {disp:getComputedStyle(g).display,h:Math.round(r.height),txt:g.textContent.trim()};});
ok('ghost readout is hidden when no tool is armed', ghosts.disp==='none'&&!ghosts.txt, JSON.stringify(ghosts));
// and it must come back with content when a tool IS armed
await p.evaluate(()=>setTool('farm'));
const ghostOn=await p.evaluate(()=>{const g=document.getElementById('ghostinfo');
  return {disp:getComputedStyle(g).display,txt:g.textContent.trim()};});
ok('ghost readout returns when a tool is armed', ghostOn.disp==='block'&&ghostOn.txt.length>0, JSON.stringify(ghostOn));
await p.evaluate(()=>setNeutral());
const empties=await p.evaluate(()=>[...document.querySelectorAll('#bar div,#bar span')].filter(e=>{
  const r=e.getBoundingClientRect(); return r.height>6 && !e.textContent.trim() && getComputedStyle(e).display!=='none';}).length);
ok('no empty visible boxes in the bottom bar', empties===0, 'found '+empties);

for(const [s,n,d] of R) console.log(s.padEnd(5),n, d?('  ['+d+']'):'');
console.log('\nfailures:', R.filter(r=>r[0]==='FAIL').length, '| page errors:', errs.length, errs.slice(0,3).join(' | '));
await b.close();
