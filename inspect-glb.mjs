import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const loader = new GLTFLoader();

const files = [
  'file:///Users/admin/Documents/www/chemistry/docs/Bliss%20Bar/Bliss%20Bar%20Small.glb',
  'file:///Users/admin/Documents/www/chemistry/docs/Bliss%20Bar/Bliss%20Bar%20Smooth%20Small.glb',
  'file:///Users/admin/Documents/www/chemistry/docs/Bliss%20Bar/Bliss%20Bar%20Smooth.glb',
  'file:///Users/admin/Documents/www/chemistry/docs/Bliss%20Bar/Bliss%20Bar%20Textured.glb',
  'file:///Users/admin/Documents/www/chemistry/docs/Bliss%20Bar/Bliss%20Bar.glb',
  'file:///Users/admin/Documents/www/chemistry/docs/Bliss%20Bar/Silver/Bliss%20Bar_Silver.glb',
];

function inspectGLB(filePath) {
  return new Promise((resolve, reject) => {
    loader.load(
      filePath,
      (gltf) => {
        const scene = gltf.scene;
        const box = new THREE.Box3().setFromObject(scene);
        const size = box.getSize(new THREE.Vector3());
        
        resolve({
          file: filePath.split('/').pop(),
          size: { x: (size.x * 1000).toFixed(2), y: (size.y * 1000).toFixed(2), z: (size.z * 1000).toFixed(2) },
          bbox: {
            min: { x: box.min.x.toFixed(4), y: box.min.y.toFixed(4), z: box.min.z.toFixed(4) },
            max: { x: box.max.x.toFixed(4), y: box.max.y.toFixed(4), z: box.max.z.toFixed(4) },
          },
        });
      },
      undefined,
      (error) => {
        reject({ file: filePath.split('/').pop(), error: error.message });
      }
    );
  });
}

async function inspectAll() {
  const results = [];
  for (const file of files) {
    try {
      const result = await inspectGLB(file);
      results.push(result);
    } catch (e) {
      results.push(e);
    }
  }
  console.log(JSON.stringify(results, null, 2));
}

inspectAll();
