import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';

// Shared geometry stays GPU resident for switching; no per-shot allocations.
export function createFirearm(camera) {
  const root = new THREE.Group(), rifle = new THREE.Group(), sniper = new THREE.Group(); root.add(rifle, sniper); camera.add(root);
  const steel = new THREE.MeshStandardMaterial({ color: 0x555d5d, metalness: .45, roughness: .36 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x161c1e, metalness: .45, roughness: .62 });
  const tan = new THREE.MeshStandardMaterial({ color: 0x74684f, roughness: .8, metalness: .12 });
  const rubber = new THREE.MeshStandardMaterial({ color: 0x222622, roughness: 1 });
  const lens = new THREE.MeshStandardMaterial({ color: 0x245d68, emissive: 0x0b2830, metalness: .65, roughness: .1 });
  function box(g, w, h, d, mat, x, y, z) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x,y,z); g.add(m); return m; }
  function tube(g, r, length, mat, x,y,z) { const m = new THREE.Mesh(new THREE.CylinderGeometry(r,r,length,20),mat); m.rotation.x = Math.PI/2; m.position.set(x,y,z); g.add(m); return m; }
  for (const [g, scoped] of [[rifle,false],[sniper,true]]) {
    box(g,.18,.23,.59,steel,0,0,-.38); // receiver
    box(g,.15,.18,scoped ? .75 : .48,tan,0,.025,scoped ? -.99 : -.88);
    tube(g,.028,scoped ? 1.1 : .72,steel,0,.02,scoped ? -1.45 : -1.15);
    tube(g,.046,.15,dark,0,.02,scoped ? -2 : -1.52);
    box(g,.16,.25,.52,tan,0,-.03,.13); box(g,.18,.28,.07,rubber,0,-.04,.43);
    box(g,.105,.27,.14,rubber,0,-.22,-.19).rotation.x = -.28;
    box(g,.13,scoped ? .2 : .38,.22,dark,0,-.24,-.49).rotation.x = .12;
    box(g,.07,.02,.14,steel,0,-.19,-.31); // trigger guard
    for (let i=0;i<18;i++) box(g,.19,.023,.019,dark,0,.151,-.2-i*.047);
    for (let i=0;i<7;i++) for (const side of [-1,1]) {
      box(g,.007,.04,.045,dark,side*.078,.016,-.75-i*.063);
      tube(g,.012,.013,steel,side*.099,-.035,-.25-i*.055).rotation.set(0,0,Math.PI/2);
    }
    if (scoped) {
      for (const z of [-.3,-.72]) box(g,.1,.15,.07,steel,0,.22,z);
      tube(g,.083,.65,dark,0,.34,-.51); tube(g,.12,.15,steel,0,.34,-.16);
      tube(g,.116,.008,lens,0,.34,-.078); tube(g,.13,.17,dark,0,.34,-.87);
      tube(g,.124,.008,lens,0,.34,-.96); box(g,.09,.12,.09,steel,0,.46,-.48);
    } else {
      box(g,.14,.16,.055,dark,0,.23,-.59);
      box(g,.095,.085,.008,lens,0,.25,-.555);
      box(g,.015,.015,.01,new THREE.MeshBasicMaterial({color:0xff5442}),0,.25,-.544);
    }
    // Sleeves and articulated glove shapes.
    for (const [x,y,z,angle] of [[.08,-.34,.12,-.22],[-.13,-.22,-.75,.65]]) {
      const arm = new THREE.Mesh(new THREE.CapsuleGeometry(.085,.36,6,14),tan); arm.position.set(x,y,z); arm.rotation.x=angle; g.add(arm);
      const hand = box(g,.15,.12,.19,rubber,x,y+.12,z-.08); hand.rotation.z = -.18;
      for(let i=0;i<4;i++) box(g,.023,.065,.095,dark,x-.05+i*.032,y+.16,z-.1);
    }
  }
  const flash = new THREE.Mesh(new THREE.OctahedronGeometry(.12),new THREE.MeshBasicMaterial({color:0xa8efff,transparent:true,opacity:.9})); root.add(flash); flash.visible=false;
  const lamp = new THREE.PointLight(0xa0dcff,0,4); root.add(lamp);
  const fill = new THREE.PointLight(0xdce7e8,1.1,3);fill.position.set(-.4,.8,.2);root.add(fill);
  let kick=0, flashTime=0;
  return {
    root,
    shot(kind) { kick=kind==='sniper' ? .12 : .055; flashTime=.045; flash.rotation.z=Math.random()*6; },
    update(dt, loadout, active, time) {
      root.visible=active && !loadout.scoped; rifle.visible=loadout.selected==='rifle'; sniper.visible=!rifle.visible;
      kick *= Math.exp(-dt*16); flashTime=Math.max(0,flashTime-dt);
      flash.visible=flashTime>0; flash.position.set(0,.02,rifle.visible ? -1.61 : -2.09); lamp.position.copy(flash.position); lamp.intensity=flash.visible ? 3 : 0;
      root.position.set(.32,-.37 + Math.sin(time*1.5)*.004 - (loadout.reloadLeft>0 ? .2 : 0),-.46+kick);
      root.rotation.set(kick*.5, .025, loadout.reloadLeft>0 ? -.4 : -.035);
    }
  };
}
