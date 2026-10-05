import puppeteer from '/root/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js';
const b=await puppeteer.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage(); await p.setViewport({width:800,height:600});
await p.goto('file:///root/caesar3d/index.html',{waitUntil:'load'});
await new Promise(r=>setTimeout(r,2500));
console.log(await p.evaluate(()=>{
  const out=[];
  for(const t of ['temple','senate','park']){
    const m=buildingMesh({type:t,x:0,z:0});
    m.position.set(0,0,0); m.updateMatrixWorld(true);
    const box=new THREE.Box3();
    const parts=[];
    m.traverse(o=>{ if(!o.isMesh||o.userData.isDecor) return; o.geometry.computeBoundingBox();
      const bb=o.geometry.boundingBox.clone(); bb.applyMatrix4(o.matrixWorld); box.union(bb);
      parts.push({x:o.position.x,z:o.position.z,sz:bb.max.z-bb.min.z,top:+bb.max.y.toFixed(2),
        roof:!!o.userData.isRoof}); });
    const c=[(box.min.x+box.max.x)/2,(box.min.z+box.max.z)/2];
    // columns: cylinders r~0.2 -> find the two z-clusters
    const cols=parts.filter(q=>Math.abs(q.sz)<0.01||q.sz<0.1).map(q=>q.z);
    const cl=[...new Set(cols.map(v=>+v.toFixed(2)))].sort((a,b)=>a-b);
    const roofs=parts.filter(q=>q.roof);
    out.push(t+' bbox z centre='+c[1].toFixed(3)+' clusterZ='+JSON.stringify(cl)+
      ' roofs@z='+JSON.stringify(roofs.map(r=>+r.z.toFixed(2)))+' asym='+((cl[0]+cl[cl.length-1])/2).toFixed(3));
  }
  return out.join('\n');
}));
await b.close();
