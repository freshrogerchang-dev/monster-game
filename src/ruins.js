import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';

export function addRuins(k, theme, texture) {
  const mat=(c,extra={})=>new THREE.MeshStandardMaterial({color:c,roughness:.86,...extra});
  const rust=mat(0xb49a6b,{map:texture('#ad9973',[2,2]),metalness:.3});
  const iron=mat(0x444d4a,{metalness:.7,roughness:.55}), rubber=mat(0x202624), glass=mat(0x465e64,{metalness:.45,roughness:.24});
  const cement=mat(0x969382,{map:texture('#b0ada1',[2,2])}), wood=mat(0x665342), leaf=mat(theme==='snow'?0x6e7970:0x485d2c,{side:THREE.DoubleSide});
  const boxGeo=new THREE.BoxGeometry(1,1,1), tubeGeo=new THREE.CylinderGeometry(1,1,1,10), leafGeo=new THREE.SphereGeometry(1,6,4);
  function box(g,x,y,z,w,h,d,m){const o=k.mesh(boxGeo,m,x,y,z,g);o.scale.set(w,h,d);o.castShadow=o.receiveShadow=true;return o;}
  function beam(g,a,b,r,m){const av=new THREE.Vector3(...a),bv=new THREE.Vector3(...b),d=bv.sub(av),o=k.mesh(tubeGeo,m,0,0,0,g);o.position.copy(av).addScaledVector(d,.5);o.scale.set(r,d.length(),r);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());return o;}
  function sign(g,text,x,y,z,w,h){const c=document.createElement('canvas');c.width=512;c.height=128;const ctx=c.getContext('2d');ctx.fillStyle='#414b41';ctx.fillRect(0,0,512,128);ctx.strokeStyle='#bdb79b';ctx.lineWidth=5;ctx.strokeRect(8,8,496,112);ctx.font='bold 57px Georgia';ctx.textAlign='center';ctx.fillStyle='#d3cbb2';ctx.fillText(text,256,83);for(let i=0;i<350;i++){ctx.fillStyle='#272e2744';ctx.fillRect(Math.random()*512,Math.random()*128,Math.random()*18,2);}const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;k.mesh(new THREE.PlaneGeometry(w,h),mat(0xffffff,{map}),x,y,z,g);}
  // A corroded evacuation bus with separate windows, body panels, wheels and bumpers.
  const bus=k.group(8,0,-9);bus.rotation.y=-.24;
  box(bus,0,1.35,0,2.8,2.15,7.5,rust);box(bus,0,2.5,0,2.9,.3,7.65,rust);
  for(const side of [-1,1]){
    for(let z=-2.8;z<=2.8;z+=1.12){box(bus,side*1.415,2,z,.022,.76,.92,glass);box(bus,side*1.425,1.48,z,.024,.045,1,iron);}
    for(const z of [-2.45,2.4]){const w=k.mesh(new THREE.CylinderGeometry(.56,.56,.3,20),rubber,side*1.39,.58,z,bus);w.rotation.z=Math.PI/2;const hub=k.mesh(new THREE.CylinderGeometry(.24,.24,.32,16),iron,side*1.4,.58,z,bus);hub.rotation.z=Math.PI/2;}
    box(bus,side*1.43,.91,0,.03,.07,7.1,iron);
  }
  box(bus,0,2,3.77,2.4,.75,.04,glass);box(bus,0,.61,3.88,2.95,.18,.25,iron);
  for(const x of [-1,1])box(bus,x,1.08,3.78,.22,.17,.04,cement);
  sign(bus,'EVACUATION',0,2.64,3.84,2.6,.33);
  // Broken ticket office and a raised maintenance platform.
  const booth=k.group(-7.8,0,-11);box(booth,0,1.5,0,3.4,3,3,cement);box(booth,0,2,1.51,2.8,1.1,.04,glass);box(booth,0,1.4,1.65,3.5,.18,.5,wood);box(booth,0,3.08,0,3.8,.23,3.4,iron);sign(booth,'TICKETS',0,3.55,1.6,3.8,.7);
  const tower=k.group(-6,0,-28);for(const x of [-2,2])for(const z of [-1.5,1.5]){beam(tower,[x,0,z],[x,7,z],.12,iron);beam(tower,[x,0,z],[x===2?-2:2,4,z],.05,rust);}box(tower,0,4.2,0,4.6,.2,3.8,wood);box(tower,0,7,0,4.9,.15,4.1,iron);for(const y of [4.9,5.7])beam(tower,[-2,y,1.6],[2,y,1.6],.04,iron);
  // Fence mesh and concertina wire across the sides leave the combat lane clear.
  for(const side of [-1,1]){
    const fence=k.group(side*6.8,0,-29);fence.rotation.y=Math.PI/2;
    for(let x=-15;x<=15;x+=3)beam(fence,[x,0,0],[x,2.7,0],.045,iron);
    for(let x=-15;x<15;x+=.45){beam(fence,[x,.25,0],[Math.min(x+2,15),2.6,0],.007,iron);beam(fence,[x,2.6,0],[Math.min(x+2,15),.25,0],.007,iron);}
    for(let x=-15;x<15;x+=1.1){const wire=k.mesh(new THREE.TorusGeometry(.33,.011,4,16),iron,x,2.9,0,fence);wire.rotation.y=.5;}
  }
  // Vegetation wraps around architecture, with foreground grass and scattered rubble.
  if(theme!=='moon')for(let i=0;i<48;i++){
    const side=i%2?1:-1,x=side*(7+Math.random()*7),z=-4-Math.random()*68,y=Math.random()*5;
    beam(k.root,[x,0,z],[x+.4,y+1.4,z],.02,wood);
    for(let j=0;j<8;j++){const l=k.mesh(leafGeo,leaf,x+Math.sin(j*2)*.45,y*j/8+.3,z+Math.cos(j)*.3);l.scale.set(.26,.055,.16);l.rotation.z=j*.8;}
  }
  for(let i=0;i<90;i++){const s=i%2?1:-1,x=s*(4.6+Math.random()*2),z=-Math.random()*65;const rubble=box(k.root,x,.08,z,.1+Math.random()*.4,.12,.15+Math.random()*.3,cement);rubble.rotation.set(Math.random(),Math.random(),Math.random());}
  const gate=k.group(0,0,-49);for(const x of [-6,6])beam(gate,[x,0,0],[x,8,0],.15,iron);box(gate,0,7.4,0,12,.85,.3,wood);sign(gate,theme==='carnival'?'PARADISE PARK':'RESTRICTED AREA',0,7.4,.17,11,.78);
}
