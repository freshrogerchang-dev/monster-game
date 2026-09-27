import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
const cache = new Map();
// Original tileable surface maps. Cached textures are shared, never owned by enemies.
export function surface(kind) {
  if(cache.has(kind)) return cache.get(kind);
  const c=document.createElement('canvas');c.width=c.height=512;const g=c.getContext('2d');
  g.fillStyle=kind==='skin'?'#aaa28d':kind==='fabric'?'#aaa99d':'#8f9690';g.fillRect(0,0,512,512);
  for(let i=0;i<14000;i++){const n=Math.random()*70+85;g.fillStyle=`rgba(${n},${n},${n},${Math.random()*.3})`;g.fillRect(Math.random()*512,Math.random()*512,Math.random()*3+1,Math.random()*4+1);}
  for(let i=0;i<95;i++){
    const x=Math.random()*512,y=Math.random()*512,r=8+Math.random()*42;
    const grad=g.createRadialGradient(x,y,0,x,y,r);grad.addColorStop(0,kind==='skin'?'#505b4955':'#342e2244');grad.addColorStop(1,'#40342b00');g.fillStyle=grad;g.fillRect(x-r,y-r,r*2,r*2);
  }
  if(kind==='fabric'){
    for(let i=0;i<512;i+=4){g.strokeStyle=i%8?'#121d1415':'#eeeeee20';g.beginPath();g.moveTo(i,0);g.lineTo(i,512);g.moveTo(0,i);g.lineTo(512,i);g.stroke();}
    for(let i=0;i<17;i++){const x=Math.random()*512,y=Math.random()*512;g.strokeStyle='#302d26aa';g.lineWidth=1+Math.random()*2;g.beginPath();g.moveTo(x,y);g.lineTo(x+8,y+15);g.lineTo(x-5,y+30);g.stroke();}
  } else if(kind==='skin') {
    for(let i=0;i<26;i++){let x=Math.random()*512,y=Math.random()*512;g.strokeStyle='#495d5550';g.lineWidth=.8;g.beginPath();g.moveTo(x,y);for(let j=0;j<5;j++){x+=Math.random()*14-7;y+=Math.random()*17;g.lineTo(x,y);}g.stroke();}
  }
  const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;map.wrapS=map.wrapT=THREE.RepeatWrapping;map.anisotropy=4;cache.set(kind,map);return map;
}
