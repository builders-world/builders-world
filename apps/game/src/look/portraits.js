import * as THREE from 'three';
import { createAvatarModel } from '../onboarding/avatar.js';
import { prepareLook, dress, cleanLook } from './style.js';
import { rigAvatar, PEOPLE } from './anim.js';

// Portraits of people as they really look in the world (Elvis, 10 October 2026: "rather than it just being
// illustration, let it be the actual avatars"). Each is the person's own 3D avatar, dressed in their look,
// rendered once, head and shoulders, into a small image and kept. One small offscreen renderer does them all.

let R = null, scene = null, cam = null;
const cache = new Map();
function setup(size) {
  if (R) return;
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = size;
  R = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
  R.setSize(size, size, false); R.outputColorSpace = THREE.SRGBColorSpace;
  scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xfff4e0, 0x4a3f35, 1.25));
  const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(1.4, 2.6, 2.4); scene.add(key);
  const rim = new THREE.DirectionalLight(0xbfe3ff, 0.6); rim.position.set(-2, 2, -1.5); scene.add(rim);
  cam = new THREE.PerspectiveCamera(26, 1, 0.1, 20); cam.position.set(0.55, 1.5, 2.6); cam.lookAt(0, 1.38, 0);
}

/** A data URL of this look's avatar, head and shoulders, `size` pixels square (cached by look). */
export function avatarPortrait(look, size = 160) {
  const key = JSON.stringify(look) + size;
  if (cache.has(key)) return cache.get(key);
  let url = '';
  try {
    setup(size);
    const av = createAvatarModel({ color: '#888', style: 'tee' }); prepareLook(av.root); const rig = rigAvatar(av.root);
    dress(av.root, cleanLook ? cleanLook(look) : look, rig);
    rig.update(1 / 60, { speed: 0, t: 0 });
    av.root.rotation.y = 0.35; scene.add(av.root);
    R.render(scene, cam);
    url = R.domElement.toDataURL('image/png');
    scene.remove(av.root); PEOPLE.delete(av.root); rig.dispose?.(); av.dispose?.();
  } catch (err) { console.warn('portrait skipped', err); }
  cache.set(key, url);
  return url;
}
