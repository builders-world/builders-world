import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createAvatarModel } from './avatar.js';

// Provisional, locally authored environments. Final art and avatar identity await
// the user's image references. No network requests or account data are made here.
export function createOnboardingScene(canvas) {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 180);
  const resources = new Set();
  const geometries = {
    box: new THREE.BoxGeometry(1, 1, 1),
    sphere: new THREE.SphereGeometry(1, 16, 12),
    cylinder: new THREE.CylinderGeometry(1, 1, 1, 16),
    cone: new THREE.ConeGeometry(1, 1, 12),
    plane: new THREE.PlaneGeometry(1, 1),
  };
  Object.values(geometries).forEach(g => resources.add(g));
  const material = (color, props = {}) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness: 0.75, ...props });
    resources.add(m); return m;
  };
  const M = {
    ivory: material('#ded8c8'), white: material('#f7f1df'), stone: material('#c3bdae'),
    floor: material('#afa89a', { roughness: 0.4 }), dark: material('#263832'),
    green: material('#326952'), mint: material('#90ae91'), amber: material('#eeb962'),
    metal: material('#7b867d', { roughness: 0.35, metalness: 0.65 }), wood: material('#a87950'),
    leaf: material('#45694c'), leafLight: material('#7d9263'), skin: material('#986746'),
    hair: material('#252722'), trouser: material('#304344'), shoe: material('#ddd5be'),
    glass: material('#bed8d0', { transparent: true, opacity: 0.19, roughness: 0.08, depthWrite: false }),
    light: material('#fff4cc', { emissive: '#ffdc91', emissiveIntensity: 0.8 }),
    blue: material('#82afbf'), runway: material('#819184'), grass: material('#a4ab7c'),
  };
  const box = (parent, m, x,y,z, sx,sy,sz, rz=0) => {
    const o = new THREE.Mesh(geometries.box, m); o.position.set(x,y,z); o.scale.set(sx,sy,sz); o.rotation.z=rz; parent.add(o); return o;
  };
  const form = (parent, kind, m, x,y,z,sx,sy,sz) => {
    const o = new THREE.Mesh(geometries[kind],m); o.position.set(x,y,z); o.scale.set(sx,sy,sz); parent.add(o); return o;
  };
  function sign(parent, text, sub, x,y,z,w=4,h=1,bg='#243d32',fg='#f5dfae') {
    const c=document.createElement('canvas'); c.width=1024; c.height=Math.round(1024*h/w);
    const ctx=c.getContext('2d'); ctx.fillStyle=bg; ctx.fillRect(0,0,c.width,c.height);
    ctx.fillStyle=fg; ctx.textAlign='left'; ctx.textBaseline='middle';
    ctx.font=`600 ${sub ? c.height*0.34 : c.height*0.43}px sans-serif`; ctx.fillText(text,45,c.height*(sub?0.4:0.5));
    if(sub){ctx.globalAlpha=0.72;ctx.font=`400 ${c.height*0.16}px sans-serif`;ctx.fillText(sub,48,c.height*0.75);}
    const tex=new THREE.CanvasTexture(c); tex.colorSpace=THREE.SRGBColorSpace; resources.add(tex);
    const mat=new THREE.MeshBasicMaterial({map:tex});resources.add(mat);
    const mesh=new THREE.Mesh(geometries.plane,mat);mesh.position.set(x,y,z);mesh.scale.set(w,h,1);parent.add(mesh);return {mesh,ctx,tex};
  }
  function plant(parent,x,z,scale=1) {
    const g=new THREE.Group();g.position.set(x,0,z);g.scale.setScalar(scale);parent.add(g);
    form(g,'cylinder',M.stone,0,.3,0,.34,.6,.34);
    form(g,'cylinder',M.wood,0,1.05,0,.055,1.5,.055);
    for(let i=0;i<7;i++){const a=i*2.4;const l=form(g,'sphere',i%2?M.leaf:M.leafLight,Math.cos(a)*.3,1.2+i*.13,Math.sin(a)*.3,.13,.5,.22); l.rotation.set(Math.sin(a)*.6,0,Math.cos(a)*.7);}
  }
  const avatars=[];
  function person(parent,color='#ce9256') {
    const avatar=createAvatarModel({color});parent.add(avatar.root);avatars.push(avatar);return avatar;
  }
  // Bake static kit by material: repeated architecture costs a handful of draws.
  function bake(group) {
    group.updateMatrixWorld(true); const batches=new Map();
    group.traverse(o=>{if(o.isMesh && !o.userData.dynamic && o.visible && o.material && !o.material.transparent){const list=batches.get(o.material)||[];list.push(o);batches.set(o.material,list);}});
    for(const [mat,list] of batches){if(list.length<3)continue;const gs=list.map(o=>o.geometry.clone().applyMatrix4(o.matrixWorld));const geom=mergeGeometries(gs,false);gs.forEach(g=>g.dispose());if(!geom)continue;resources.add(geom);list.forEach(o=>o.removeFromParent());group.add(new THREE.Mesh(geom,mat));}
  }
  const hemisphere=new THREE.HemisphereLight('#d7e6e4','#817151',2.5);scene.add(hemisphere);
  const sun=new THREE.DirectionalLight('#ffe0ac',3.3);sun.position.set(-10,18,4);scene.add(sun);
  const fill=new THREE.DirectionalLight('#b8d9df',0.8);fill.position.set(8,4,0);scene.add(fill);
  const terminal=new THREE.Group();scene.add(terminal);
  box(terminal,M.floor,0,-.13,-5,28,.25,54);
  box(terminal,M.ivory,13.9,3,-5,.3,6,54);box(terminal,M.ivory,0,3,-31,28,6,.4);
  box(terminal,M.ivory,0,6.1,-5,28,.25,54);
  for(let i=0;i<10;i++){
    const z=17-i*5.2;
    box(terminal,M.wood,-12.9,3,z,.2,6,.22);box(terminal,M.wood,12.9,3,z,.2,6,.22);
    box(terminal,M.wood,0,5.85,z,26,.23,.28);
    box(terminal,M.light,-4,5.68,z,5,.05,.07);box(terminal,M.light,5,5.68,z,5,.05,.07);
    box(terminal,M.metal,-13.85,3,z,.08,6,.09);
    box(terminal,M.glass,-13.9,3,z-2.5,.04,5.8,5);
  }
  box(terminal,M.metal,-13.8,2.4,-5,.08,.06,54);
  box(terminal,M.runway,-38,-.2,-5,48,.2,110);
  for(let i=0;i<12;i++)box(terminal,M.white,-29,-.08,30-i*8,.2,.015,3);
  box(terminal,M.grass,-64,-.2,-5,6,.2,110);
  // Distant apron aircraft with fuselage, wings, tail and paired engines.
  const plane=new THREE.Group();plane.position.set(-28,1.4,-19);plane.rotation.y=.3;terminal.add(plane);
  form(plane,'sphere',M.white,0,0,0,1.2,1.05,8);
  box(plane,M.white,0,0,-.4,14,.17,2.6,-.035);
  box(plane,M.green,0,1.3,-5.6,.17,3,2.1);
  box(plane,M.green,0,.4,-6,5,.13,1.4);
  for(const s of [-1,1]){form(plane,'sphere',M.metal,s*3,-.55,0,.6,.6,1.7);for(let i=0;i<9;i++)box(plane,M.dark,s*1.07,.22,-3+i*.7,.025,.22,.27);}
  for(let z=-25;z<=14;z+=3)for(let x=-12;x<=12;x+=3){box(terminal,M.stone,x,.005,z,.025,.006,3);box(terminal,M.stone,x,.005,z,3,.006,.025);}
  // Clearly marked route and broad overhead arrivals gantry.
  for(let z=7;z>-10;z-=3){box(terminal,M.amber,0,.015,z,.07,.01,1.2);}
  sign(terminal,'NIGERIA  /  ARRIVALS','BUILDERS WORLD     •     YOUR NEXT CHAPTER STARTS HERE',0,4.3,-11,9,1.35);
  box(terminal,M.dark,0,4.3,-11.1,9.2,1.5,.16);
  for(const x of [-4,4])box(terminal,M.metal,x,5.1,-11,.035,1.3,.035);
  // Check-in islands; center booth is the conversational focal point.
  for(const x of [-6,0,6]){
    box(terminal,M.green,x,.59,-14.7,3.8,1.18,1.3);box(terminal,M.wood,x,1.2,-14.7,4.05,.15,1.55);
    box(terminal,M.amber,x,.92,-14.025,3.3,.035,.02);
    sign(terminal,x===0?'01  WELCOME':'02  ARRIVALS','BUILD YOUR PLACE IN THE WORLD',x,.58,-14.03,2.6,.5);
    box(terminal,M.dark,x-.9,1.5,-14.65,.64,.43,.08);box(terminal,M.metal,x-.9,1.27,-14.6,.07,.2,.07);
    for(const s of [-1,1]){form(terminal,'cylinder',M.metal,x+s*1.65,.56,-11.9,.045,1.12,.045);form(terminal,'cylinder',M.dark,x+s*1.65,.025,-11.9,.19,.05,.19);}
  }
  const attendant=person(terminal,'#e4bd79');attendant.root.position.set(0,0,-15.1);
  // Attendant remains separate for a breathing idle animation.
  attendant.root.traverse(o=>{if(o.isMesh)o.userData.dynamic=true;});
  sign(terminal,'A PLACE FOR EVERY BUILDER','DEVELOPERS  /  DESIGNERS  /  MAKERS',0,2.9,-19,9,.85,'#ded8c8','#375a45');
  for(const x of [-10,10]){plant(terminal,x,-13,1.3);plant(terminal,x,6,1.5);}
  function bench(x,z){box(terminal,M.dark,x,.52,z,3.3,.15,.63);box(terminal,M.green,x,.93,z-.3,3.3,.65,.12);for(const s of [-1,1])box(terminal,M.metal,x+s*1.3,.25,z,.07,.5,.44);}
  for(const z of [-5,3,11])bench(-10,z);
  // Destination selection concourse occupies the right-hand terminal wing.
  box(terminal,M.dark,7,2.2,-9.1,5.9,3.5,.3);
  sign(terminal,'CHOOSE YOUR CITY','ONE COUNTRY. MANY PLACES TO BELONG.',7,3.37,-8.93,5.3,.66);
  ['LAGOS','ABUJA','UYO','PORT HARCOURT'].forEach((s,i)=>sign(terminal,`0${i+1}    ${s}`,null,7,2.7-i*.58,-8.92,5.3,.48,'#304b3d','#ecd6a7'));
  sign(terminal,'DESTINATIONS  →','FIND YOUR COMMUNITY',8,4.45,-4.5,5.4,.9);
  box(terminal,M.green,7,.56,-7.9,1.25,1.12,.65);box(terminal,M.dark,7,1.16,-7.9,1.45,.09,.8);
  bake(terminal);

  const cabin=new THREE.Group();scene.add(cabin);
  box(cabin,M.dark,0,-.12,-7,6,.2,23);
  box(cabin,M.ivory,-2.4,1.65,-7,.25,3.5,23);box(cabin,M.ivory,2.4,1.65,-7,.25,3.5,23);
  box(cabin,M.white,0,3.1,-7,5,.2,23);
  for(const x of [-1.8,1.8]){box(cabin,M.ivory,x,2.75,-7,1.1,.65,23);box(cabin,M.light,x,2.35,-7,.04,.035,23);}
  for(let z=2;z>-17;z-=2.3){
    for(const side of [-1,1]){
      const win=new THREE.Group();win.position.set(side*2.25,1.7,z);win.rotation.y=side===-1?Math.PI/2:-Math.PI/2;cabin.add(win);
      form(win,'sphere',M.stone,0,0,0,.39,.57,.035);form(win,'sphere',M.blue,0,0,.035,.31,.47,.025);
      form(win,'sphere',M.white,-.06,.08,.06,.26,.07,.02);form(win,'sphere',M.white,.07,-.13,.06,.2,.05,.02);
    }
    box(cabin,M.stone,0,3,z,4.8,.02,.025);
  }
  function seat(x,z){
    box(cabin,M.green,x,1.03,z,1.04,1.54,.29);box(cabin,M.mint,x,1.7,z+.025,.66,.25,.32);
    box(cabin,M.green,x,.39,z+.4,1.02,.22,.85);
    for(const s of [-1,1]){box(cabin,M.dark,x+s*.49,.72,z+.42,.075,.12,.7);box(cabin,M.metal,x+s*.38,.18,z,.06,.36,.07);}
    box(cabin,M.stone,x,1.25,z+.157,.77,.53,.035);
    box(cabin,M.dark,x,1.25,z+.18,.64,.39,.02);
    box(cabin,M.ivory,x,.77,z+.18,.74,.33,.045);
  }
  for(let z=-4.7;z>-17;z-=2.3)for(const x of [-1.23,1.23])seat(x,z);
  // Near seatback is authored around the film and character customisation display.
  box(cabin,M.green,0,1.14,-1.8,2.14,2.08,.3);box(cabin,M.mint,0,2.14,-1.76,1.5,.21,.34);
  box(cabin,M.stone,-.37,1.47,-1.625,1.24,.88,.08);box(cabin,M.dark,-.37,1.47,-1.57,1.12,.73,.035);
  box(cabin,M.ivory,0,.82,-1.5,1.84,.16,.49);
  box(cabin,M.dark,.66,1.49,-1.59,.63,.86,.045);
  sign(cabin,'YOUR AVATAR',null,.66,1.91,-1.55,.57,.09,'#263832','#f5dfae');
  box(cabin,M.wood,0,.79,-.95,1.84,.065,1.4);
  form(cabin,'cylinder',M.ivory,-.6,.94,-.63,.095,.25,.095);
  sign(cabin,'BUILDERS WORLD','WELCOME ABOARD',-.43,1.98,-1.57,1.1,.2,'#326952','#f5dfae');
  const preview=person(cabin);preview.root.position.set(.66,1.06,-1.46);preview.root.scale.setScalar(.4);
  preview.root.traverse(o=>{if(o.isMesh)o.userData.dynamic=true;});
  const filmCanvas=document.createElement('canvas');filmCanvas.width=960;filmCanvas.height=600;
  const filmCtx=filmCanvas.getContext('2d');const filmTexture=new THREE.CanvasTexture(filmCanvas);filmTexture.colorSpace=THREE.SRGBColorSpace;resources.add(filmTexture);
  const filmMaterial=new THREE.MeshBasicMaterial({map:filmTexture});resources.add(filmMaterial);
  const filmMesh=new THREE.Mesh(geometries.plane,filmMaterial);filmMesh.position.set(-.37,1.47,-1.546);filmMesh.scale.set(1.07,.67,1);filmMesh.userData.dynamic=true;cabin.add(filmMesh);
  bake(cabin);

  const neighborhood=new THREE.Group();scene.add(neighborhood);
  box(neighborhood,M.grass,0,-.13,0,70,.2,70);
  box(neighborhood,M.stone,0,-.015,7,5,.035,12);
  box(neighborhood,M.runway,0,-.015,15,70,.03,5);
  function house(x,z,small=false){
    const g=new THREE.Group();g.position.set(x,0,z);if(small)g.scale.setScalar(.75);neighborhood.add(g);
    box(g,M.ivory,0,1.3,0,5.8,2.6,4.7);box(g,M.green,-1.25,1.5,2.38,2.5,2.7,.15);
    box(g,M.dark,-1.25,1.18,2.48,.98,2.3,.05);box(g,M.amber,-.94,1.17,2.52,.045,.13,.035);
    box(g,M.wood,1.55,1.47,2.4,1.65,1.35,.1);box(g,M.blue,1.55,1.47,2.47,1.47,1.18,.04);
    box(g,M.white,1.55,1.47,2.5,.035,1.19,.035);box(g,M.white,1.55,1.47,2.5,1.48,.035,.035);
    box(g,M.wood,0,2.8,0,6.3,.26,5.25);box(g,M.dark,0,3,0,6.1,.15,5.05);
    box(g,M.ivory,0,3.15,-2.4,6.1,.3,.15);box(g,M.ivory,-2.97,3.15,0,.15,.3,4.8);
    box(g,M.stone,-1.25,.12,2.95,2.1,.24,1.15);box(g,M.stone,-1.25,.055,3.55,2.5,.11,.5);
    for(let i=0;i<5;i++)box(g,M.wood,3.5,.7,-2+i,1.1,1.4,.07);
    plant(g,2.7,3.1,.8);return g;
  }
  const mainHouse=house(0,-2);
  const homeAccent=material('#326952');
  mainHouse.traverse(o=>{if(o.isMesh){o.userData.dynamic=true;if(o.material===M.green)o.material=homeAccent;}});
  const homeCanopy=box(mainHouse,homeAccent,-1.25,2.57,2.85,2.3,.12,1.02);
  homeCanopy.userData.dynamic=true;
  house(-10,-6,true);house(11,-8,true);house(-12,8,true);house(13,8,true);
  for(const [x,z] of [[-5,2],[6,-4],[-7,-10],[9,2],[-17,1],[17,-12]])plant(neighborhood,x,z,2.1);
  const homeAvatar=person(neighborhood);homeAvatar.root.position.set(-1.3,0,2);
  homeAvatar.root.traverse(o=>{if(o.isMesh)o.userData.dynamic=true;});
  const homeSign=sign(neighborhood,'YOUR FIRST HOME','LAGOS  /  YABA',1.35,1.15,.48,1.7,.57,'#263832','#f5dfae');homeSign.mesh.userData.dynamic=true;
  bake(neighborhood);

  let stage='lobby',time=0,film={index:0,progress:0,playing:false},filmTick=-1,filmDirty=true,homeSeed='',disposed=false;
  const targetPosition=new THREE.Vector3(0,1.7,8),targetLook=new THREE.Vector3(0,1.7,-14);
  const currentLook=targetLook.clone(), keys=new Set(),pointer={active:false,x:0,y:0,yaw:0,pitch:0};
  let width=1,height=1,mobile=false;
  const stages={
    lobby:{p:[0,1.7,8],l:[0,1.8,-14]},checkin:{p:[0,1.7,-10.7],l:[0,1.68,-15]},
    destination:{p:[7,1.7,-2.1],l:[7,2.05,-9]},flight:{p:[-.2,1.48,.65],l:[-.06,1.5,-1.7]},
    home:{p:[6.5,3.9,12],l:[0,1.2,-.5]},
  };
  function resize(){
    width=canvas.clientWidth||window.innerWidth;height=canvas.clientHeight||window.innerHeight;mobile=width<760;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,mobile?1.5:2));renderer.setSize(width,height,false);
    camera.aspect=width/height;camera.fov=mobile?67:58;
    camera.setViewOffset(width,height,mobile?0:width*.16,mobile?height*.18:0,width,height);camera.updateProjectionMatrix();
    if(stage==='flight'||stage==='home'){
      applyStageFrame();camera.position.copy(targetPosition);currentLook.copy(targetLook);camera.lookAt(currentLook);
    }
  }
  function applyStageFrame(){
    const s=stages[stage];
    const portraitPositions={flight:[0,1.48,3.6],home:[5,4,22]};
    targetPosition.fromArray(mobile&&portraitPositions[stage]?portraitPositions[stage]:s.p);
    targetLook.fromArray(mobile&&stage==='flight'?[0,1.5,-1.7]:s.l);
  }
  function setStage(next,profile={}){
    stage=stages[next]?next:'lobby';keys.clear();pointer.yaw=pointer.pitch=0;pointer.active=false;
    applyStageFrame();
    terminal.visible=['lobby','checkin','destination'].includes(stage);cabin.visible=stage==='flight';neighborhood.visible=stage==='home';
    scene.background=new THREE.Color(stage==='flight'?'#bfcfc8':stage==='home'?'#c6d5c7':'#d7ded0');
    scene.fog=new THREE.Fog(scene.background,stage==='flight'?25:45,stage==='flight'?55:145);
    hemisphere.intensity=stage==='flight'?2.1:2.5;sun.intensity=stage==='flight'?1.7:3.3;
    if(reduced.matches||stage==='flight'||stage==='home'||next==='lobby'){camera.position.copy(targetPosition);currentLook.copy(targetLook);}
    if(profile.avatar)setAvatar(profile.avatar);
    const seed=String(profile.seed || `${profile.name||'Builder'}:${profile.city||'Lagos'}:${profile.district||'Yaba'}`);
    if(seed!==homeSeed){
      homeSeed=seed;let hash=2166136261;
      for(let i=0;i<seed.length;i++){hash^=seed.charCodeAt(i);hash=Math.imul(hash,16777619);}
      hash>>>=0;
      const breadth=.9+(hash%5)*.055;
      mainHouse.scale.set(breadth,.96+((hash>>>4)%5)*.035,1);
      homeAccent.color.set(['#326952','#4f707d','#86654f','#738052','#5c6780'][hash%5]);
      homeCanopy.visible=((hash>>>7)%2)===0;
      homeSign.mesh.position.x=1.35*breadth;
    }
    const c=homeSign.ctx;c.fillStyle='#263832';c.fillRect(0,0,1024,343);c.fillStyle='#f5dfae';c.font='600 90px sans-serif';c.fillText('YOUR FIRST HOME',45,130);c.font='400 48px sans-serif';c.fillText(`${profile.city||'Lagos'} / ${profile.district||'Your community'}`.toUpperCase(),45,250,934);homeSign.tex.needsUpdate=true;
    camera.lookAt(currentLook);
  }
  function setAvatar(value){preview.set(value);homeAvatar.set(value);}
  function setFilm(index,progress,playing){
    const next={index:Math.max(0,Math.min(2,Math.floor(Number(index)||0))),progress:Math.round(Math.max(0,Math.min(1,Number(progress)||0))*144)/144,playing:!!playing};
    if(next.index!==film.index){filmDirty=true;filmTick=-1;}
    if(next.progress!==film.progress)filmDirty=true;
    film=next;
  }
  function drawFilm(){
    const c=filmCtx,w=960,h=600,p=film.progress;
    c.fillStyle='#e7dcc0';c.fillRect(0,0,w,h);c.fillStyle='#254937';c.fillRect(0,0,w,74);
    c.fillStyle='#e9d7a7';c.font='500 25px sans-serif';c.fillText('BUILDERS WORLD  /  IN-FLIGHT GUIDE',38,48);
    const titles=['A place for your work','Find your people','Make yourself at home'];
    const subtitles=['Connect your craft. Bring your story.','Meet the builders in your district.','Your first home is only the beginning.'];
    if(film.index===0){
      for(let i=0;i<7;i++){const x=115+i*108,y=245+(i%3)*15;c.fillStyle=i<Math.round(p*7)?'#d29b54':'#809476';c.fillRect(x,y,65,65);c.fillStyle='#254937';c.fillRect(x+11,y+15,42,4);c.fillRect(x+11,y+28,30,4);if(i<6){c.fillStyle='#b4b99c';c.fillRect(x+70,y+31,28,3);}}
      c.fillStyle='#254937';c.font='600 28px sans-serif';c.fillText('BUILD  →  SHARE  →  BELONG',256,370);
    }else if(film.index===1){
      c.strokeStyle='#a5b296';c.lineWidth=4;for(let i=0;i<5;i++){const x=200+i*140,y=210+(i%2)*75;c.beginPath();c.moveTo(480,335);c.lineTo(x,y);c.stroke();c.fillStyle=i%2?'#d29b54':'#4b7962';c.beginPath();c.arc(x,y,30,0,Math.PI*2);c.fill();c.fillRect(x-29,y+36,58,54);}
      c.fillStyle='#254937';c.font='600 26px sans-serif';c.fillText('YOUR CITY. YOUR DISTRICT. YOUR COMMUNITY.',146,403);
    }else{
      c.fillStyle='#a5b296';c.beginPath();c.ellipse(480,383,260,38,0,0,Math.PI*2);c.fill();c.fillStyle='#eee5cc';c.fillRect(320,196,320,190);c.fillStyle='#40664b';c.fillRect(310,182,340,27);c.fillStyle='#254937';c.fillRect(360,268,65,118);c.fillStyle='#8ab1b3';c.fillRect(471,248,114,79);c.fillStyle='#c99a5c';c.fillRect(465,240,128,9);for(let i=0;i<3;i++){c.fillStyle='#618457';c.beginPath();c.arc(260+i*235,312-((i%2)*30),35,0,Math.PI*2);c.fill();}
    }
    c.fillStyle='#254937';c.font='600 42px sans-serif';c.textAlign='center';c.fillText(titles[film.index],480,475);c.font='400 25px sans-serif';c.fillText(subtitles[film.index],480,520);c.textAlign='left';c.fillStyle='#c5c5a9';c.fillRect(38,564,884,5);c.fillStyle='#4b7962';c.fillRect(38,564,884*p,5);filmTexture.needsUpdate=true;
  }
  function editable(target){return target?.closest?.('input,textarea,select,[contenteditable="true"]');}
  const keydown=e=>{if(stage!=='lobby'||document.querySelector('dialog[open]')||editable(e.target)||e.ctrlKey||e.metaKey||e.altKey)return;const k=e.key.toLowerCase();if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(k)){keys.add(k);e.preventDefault();}};
  const keyup=e=>keys.delete(e.key.toLowerCase());
  const blur=()=>{keys.clear();pointer.active=false;};
  const down=e=>{if(stage!=='lobby'||e.button!==0)return;pointer.active=true;pointer.x=e.clientX;pointer.y=e.clientY;canvas.setPointerCapture?.(e.pointerId);};
  const move=e=>{if(!pointer.active)return;pointer.yaw=THREE.MathUtils.clamp(pointer.yaw-(e.clientX-pointer.x)*.002,-.65,.65);pointer.pitch=THREE.MathUtils.clamp(pointer.pitch-(e.clientY-pointer.y)*.002,-.2,.25);pointer.x=e.clientX;pointer.y=e.clientY;};
  const up=()=>{pointer.active=false;};
  window.addEventListener('keydown',keydown);window.addEventListener('keyup',keyup);window.addEventListener('blur',blur);window.addEventListener('resize',resize);
  canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);
  function walk(direction,on){const key={forward:'w',back:'s',backward:'s',left:'a',right:'d'}[direction];if(key){if(on&&stage==='lobby')keys.add(key);else keys.delete(key);}}
  function update(dt=0.016){
    if(disposed)return;dt=Math.min(Math.max(dt,0),.05);time+=dt;
    if(stage==='lobby'){
      const f=(keys.has('w')||keys.has('arrowup')?1:0)-(keys.has('s')||keys.has('arrowdown')?1:0);
      const s=(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0);
      const step=dt*3.2/Math.max(1,Math.hypot(f,s));targetPosition.x=THREE.MathUtils.clamp(targetPosition.x+(s*Math.cos(pointer.yaw)-f*Math.sin(pointer.yaw))*step,-7.8,3.5);
      targetPosition.z=THREE.MathUtils.clamp(targetPosition.z+(-f*Math.cos(pointer.yaw)-s*Math.sin(pointer.yaw))*step,-10,13);
      targetLook.set(targetPosition.x-Math.sin(pointer.yaw)*15,targetPosition.y+Math.sin(pointer.pitch)*15,targetPosition.z-Math.cos(pointer.yaw)*15);
    }
    const a=reduced.matches?1:1-Math.exp(-dt*4);camera.position.lerp(targetPosition,a);currentLook.lerp(targetLook,a);camera.lookAt(currentLook);
    if(stage==='flight'&&filmDirty&&filmTick!==Math.floor(time*12)){filmTick=Math.floor(time*12);drawFilm();filmDirty=false;}
    renderer.render(scene,camera);
  }
  function dispose(){
    if(disposed)return;disposed=true;
    window.removeEventListener('keydown',keydown);window.removeEventListener('keyup',keyup);window.removeEventListener('blur',blur);window.removeEventListener('resize',resize);
    canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointercancel',up);
    avatars.forEach(a=>a.dispose());resources.forEach(r=>r.dispose());renderer.dispose();scene.clear();
  }
  resize();setStage('lobby');drawFilm();
  return {setStage,setAvatar,setFilm,update,resize,dispose,walk,get diagnostics(){return {calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures,cameraPosition:camera.position.toArray(),nearDesk:camera.position.distanceTo(new THREE.Vector3(0,1.7,-12))<2.5,homeSeed};}};
}
