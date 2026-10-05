import puppeteer from '/root/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js';
const b=await puppeteer.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage(); await p.setViewport({width:600,height:600,deviceScaleFactor:1});
await p.goto('file:///root/caesar3d/index.html',{waitUntil:'load'});
await new Promise(r=>setTimeout(r,2500));
const png=await p.evaluate(()=>{
  const r=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
  r.setSize(600,600,false);
  const sc=new THREE.Scene(); sc.background=new THREE.Color(0x1a1d24);
  const cam=new THREE.OrthographicCamera(-4,4,1.4,-1.4,0.1,200);
  cam.position.set(14,10,14); cam.lookAt(0,1.8,0);
  sc.add(new THREE.HemisphereLight(0xbcd4ff,0x40402e,1.0));
  const d=new THREE.DirectionalLight(0xfff0d0,1.3); d.position.set(6,10,4); sc.add(d);
  const gr=new THREE.Group();
  const names=['temple'];
  names.forEach((n,i)=>{ if(!BTYPES[n])return; const m=buildingMesh({type:n,x:0,z:0});
    m.position.set((i)*0,0,0); gr.add(m); });
  // ground
  const g=new THREE.Mesh(new THREE.PlaneGeometry(40,40),new THREE.MeshStandardMaterial({color:0x3f5a34,roughness:1,flatShading:true}));
  g.rotation.x=-Math.PI/2; g.position.y=-0.02; sc.add(g);
  sc.add(gr);
  r.render(sc,cam);
  return r.domElement.toDataURL('image/png');
});
const fs=await import('fs');
fs.writeFileSync('/root/temple-big.png',Buffer.from(png.split(',')[1],'base64'));
await b.close(); console.log('ok');
