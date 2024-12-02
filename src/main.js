import './style.css';
import * as THREE from 'three';

import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({
  canvas: document.querySelector('#bg'),
});
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputEncoding = THREE.sRGBEncoding;
camera.position.setZ(30);
camera.position.setX(-3);
renderer.render(scene, camera);

// Lights
const spotLight = new THREE.PointLight(0xffffff, 80, 0, 1);
spotLight.position.set(19.8, 44.8, 7.5);
spotLight.castShadow = true;

const ambientLight = new THREE.AmbientLight(0xffffff);
scene.add(ambientLight, spotLight);

// Variables
let mixer;
let model = null;
let jarModel = null;
let ballModel = null;
let isModelClicked = false;
let isHoveringJarModel = false; // Flag to detect if mouse is over jarModel
let isBallClicked = false; // Flag for ball click detection
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const dragPlane = new THREE.Plane(); // Plane for mapping mouse to world coordinates
const planeIntersection = new THREE.Vector3(); // Intersection point on the plane
const clock = new THREE.Clock();

// Default positions
const initialPosition = { x: -34, y: -20.3, z: -9 };

// GLTF Loader
const gltfLoader = new GLTFLoader();

// Load the girl model
const girlUrl = new URL('./assets/Girl_threejs.glb', import.meta.url);
gltfLoader.load(
  girlUrl.href,
  (gltf) => {
    model = gltf.scene;
    model.scale.set(8.6, 8.6, 8.6);
    model.position.set(initialPosition.x, initialPosition.y, initialPosition.z);
    scene.add(model);

    mixer = new THREE.AnimationMixer(model);
    const clips = gltf.animations;

    const tposeClip = THREE.AnimationClip.findByName(clips, 'tpose');
    if (tposeClip) {
      const tposeAction = mixer.clipAction(tposeClip);
      tposeAction.play();
    }

    const runClip = THREE.AnimationClip.findByName(clips, 'Run Look Back');
    if (runClip) {
      const runAction = mixer.clipAction(runClip);
      runAction.stop();
    }
  },
  undefined,
  (error) => console.error(error)
);

// Load the jar model
const jarUrl = new URL('./assets/teddy_bear.glb', import.meta.url);
gltfLoader.load(
  jarUrl.href,
  (gltf) => {
    jarModel = gltf.scene;
    jarModel.scale.set(1, 1, 1);
    jarModel.position.set(10, -11, -7);
    jarModel.rotation.y = -0.9;
    jarModel.rotation.x = 0.8;
    jarModel.rotation.z = 0.2;
    scene.add(jarModel);

    // Set drag plane parallel to jarModel
    dragPlane.setFromNormalAndCoplanarPoint(new THREE.Vector3(0, 1, 0), jarModel.position);
  },
  undefined,
  (error) => console.error('Error loading jar model:', error)
);

// Load the ball model
const ballUrl = new URL('./assets/ball.glb', import.meta.url);
gltfLoader.load(
  ballUrl.href,
  (gltf) => {
    ballModel = gltf.scene;
    ballModel.scale.set(36, 36, 36);
    ballModel.position.set(-3, 1.9, -7);
    scene.add(ballModel);
  },
  undefined,
  (error) => console.error('Error loading ball model:', error)
);

// Background
const spaceUrl = new URL('./glass.png', import.meta.url);
const spaceTexture = new THREE.TextureLoader().load(spaceUrl.href);
scene.background = spaceTexture;

// Mouse events
function onMouseMove(event) {
  event.preventDefault();

  // Update mouse coordinates
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  // Raycast to detect intersection with jarModel
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObject(jarModel, true);

  if (intersects.length > 0) {
    isHoveringJarModel = true;

    // Calculate intersection with drag plane
    raycaster.ray.intersectPlane(dragPlane, planeIntersection);

    // Update jarModel position
    jarModel.position.copy(planeIntersection);
  } else {
    isHoveringJarModel = false;
  }
}

function onMouseClick(event) {
  if (isHoveringJarModel) return; // Prevent conflict during hover interaction

  event.preventDefault();
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObject(model, true);

  if (intersects.length > 0) {
    isModelClicked = true;

    if (mixer) {
      const runClip = THREE.AnimationClip.findByName(mixer._actions.map((a) => a.getClip()), 'Run Look Back');
      if (runClip) {
        const runAction = mixer.clipAction(runClip);
        runAction.reset().play();
      }
    }
  }

  // Check for click on ballModel
  const ballIntersects = raycaster.intersectObject(ballModel, true);
  if (ballIntersects.length > 0) {
    isBallClicked = true; // Set flag to move ball
  }
}

// Ball Rotation Logic (Remove movement logic)
const ballVelocity = new THREE.Vector3(5, 5, 0); // Initial velocity of the ball

// Ball Movement Logic
function moveBallTowardsCamera() {
  if (ballModel && isBallClicked) {
    ballModel.position.z += 0.1; // Move along the z-axis towards the camera
    ballModel.position.y -= 0.1;
    if (ballModel.position.z >= 20) {
      isBallClicked = false; // Stop moving the ball once it reaches a certain point
    }
  }
}

// Animation loop
function animate() {
  const deltaTime = clock.getDelta();
  requestAnimationFrame(animate);

  if (mixer) mixer.update(deltaTime);

  if (model && !isModelClicked) {
    model.rotation.y += deltaTime;
  }

  if (isModelClicked && model) {
    model.position.z += deltaTime * 3.7;
    model.position.x += deltaTime * 3.6;

    if (model.position.z >= 20) {
      model.position.set(initialPosition.x, initialPosition.y, initialPosition.z);
      isModelClicked = false;

      if (mixer) {
        mixer.stopAllAction();
        const tposeClip = THREE.AnimationClip.findByName(mixer._actions.map((a) => a.getClip()), 'tpose');
        if (tposeClip) {
          const tposeAction = mixer.clipAction(tposeClip);
          tposeAction.reset().play();
        }
      }
    }
  }

  // Rotate the ball at all times (even when it's moving towards the camera)
  if (ballModel) {
    ballModel.rotation.x += deltaTime * 2; // Continue rotating on x-axis
    ballModel.rotation.y += deltaTime * 2; // Continue rotating on y-axis
  }

  // Move the ball if clicked
  moveBallTowardsCamera();

  renderer.render(scene, camera);
}

// Event listeners
window.addEventListener('mousemove', onMouseMove);
window.addEventListener('click', onMouseClick);

animate();

