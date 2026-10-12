import * as THREE from 'three';

// Temporary shared avatar identity: this same factory is used aboard the flight,
// beside the generated home, and in the playable district. Replace its art after
// the user supplies the default-avatar reference while preserving this contract.
export function createAvatarModel(options = {}) {
  const root = new THREE.Group();
  const geometries = {
    box: new THREE.BoxGeometry(1, 1, 1),
    sphere: new THREE.SphereGeometry(1, 16, 12),
    cylinder: new THREE.CylinderGeometry(1, 1, 1, 16),
  };
  const materials = [];
  const material = color => {
    const m = new THREE.MeshStandardMaterial({ color, roughness: 0.75 });
    materials.push(m); return m;
  };
  const shirt = material(options.color || '#ce9256');
  const skin = material('#986746'), hair = material('#252722');
  const trouser = material('#304344'), shoe = material('#ddd5be');
  const ivory = material('#ded8c8'), white = material('#f7f1df'), dark = material('#263832');
  const mesh = (kind, mat, x,y,z, sx,sy,sz, rz=0) => {
    const o = new THREE.Mesh(geometries[kind], mat);
    o.position.set(x,y,z);o.scale.set(sx,sy,sz);o.rotation.z=rz;
    o.userData.dynamic=true;root.add(o);return o;
  };
  mesh('box',shirt,0,1.03,0,.49,.58,.28);
  const hood=mesh('sphere',shirt,0,1.32,-.1,.26,.2,.19);
  for(const side of [-1,1]){
    mesh('box',trouser,side*.135,.49,0,.19,.65,.23);
    mesh('box',shoe,side*.135,.13,.055,.23,.16,.36);
    mesh('box',shirt,side*.32,1.04,0,.14,.45,.2,-side*.1);
    mesh('sphere',skin,side*.345,.76,0,.077,.1,.077);
    mesh('box',hair,side*.071,1.65,.174,.031,.018,.02);
  }
  mesh('cylinder',skin,0,1.4,0,.095,.15,.095);
  mesh('sphere',skin,0,1.61,0,.205,.24,.19);
  mesh('sphere',hair,0,1.77,-.025,.208,.105,.19);
  const zipper=mesh('box',ivory,0,1.06,.146,.016,.51,.014);
  const collar=mesh('box',white,0,1.28,.151,.16,.07,.02);
  const pocket=mesh('box',dark,.12,1.14,.15,.08,.06,.015);
  function set(value={}) {
    shirt.color.set(value.color || '#ce9256');
    hood.visible=value.style==='hoodie';
    zipper.visible=value.style==='jacket';
    collar.visible=value.style!=='hoodie';
    pocket.visible=value.style==='jacket';
  }
  let disposed=false;
  function dispose() {
    if(disposed)return;disposed=true;
    Object.values(geometries).forEach(g=>g.dispose());materials.forEach(m=>m.dispose());
    root.removeFromParent();root.clear();
  }
  set(options);
  return {root,set,dispose};
}
