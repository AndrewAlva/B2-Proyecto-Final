import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import GUI from 'lil-gui'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import * as CANNON from 'cannon-es'

/**
 * Base
 */
// Debug
// const gui = new GUI()

// Canvas
const canvas = document.querySelector('canvas.webgl')

// Scene
const scene = new THREE.Scene()

/**
 * Models
 */
const dracoLoader = new DRACOLoader()
dracoLoader.setDecoderPath('/draco/')

const gltfLoader = new GLTFLoader()
gltfLoader.setDRACOLoader(dracoLoader)

let fox = null
let foxPlayer = new THREE.Group()
scene.add(foxPlayer)
let mixer = null
let actionIdle = null
let actionRun = null

gltfLoader.load(
    '/models/Fox/glTF/Fox.gltf',
    (gltf) =>
    {
        fox = gltf.scene
        fox.scale.set(0.025, 0.025, 0.025)
        fox.position.y = -playerHeight;
        foxPlayer.add(fox)

        fox.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });

        // Animation
        console.log(gltf.animations)
        mixer = new THREE.AnimationMixer(fox)
        
        // Create actions for animation 0 (idle) and animation 2 (run)
        actionIdle = mixer.clipAction(gltf.animations[0])
        actionRun = mixer.clipAction(gltf.animations[1])
        
        // Set initial weights
        actionIdle.setEffectiveWeight(1)
        actionRun.setEffectiveWeight(0)
        
        // Play both actions
        actionIdle.play()
        actionRun.play()
    }
)

/**
 * Floor
 */
const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(30, 30),
    new THREE.MeshStandardMaterial({
        color: '#444444',
        metalness: 0,
        roughness: 0.5
    })
)
floor.receiveShadow = true
floor.rotation.x = - Math.PI * 0.5
scene.add(floor)

// Position tester
const testCube = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshStandardMaterial({ color: 0xff0000 })
)
testCube.position.set(1, 1, 0)
scene.add(testCube)

/**
 * Lights
 */
const ambientLight = new THREE.AmbientLight(0xffffff, 2.4)
scene.add(ambientLight)

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.8)
directionalLight.castShadow = true
directionalLight.shadow.mapSize.set(1024 * 2, 1024 * 2)
directionalLight.shadow.camera.far = 40
directionalLight.shadow.camera.left = - 40
directionalLight.shadow.camera.top = 40
directionalLight.shadow.camera.right = 40
directionalLight.shadow.camera.bottom = - 40
directionalLight.position.set(-5, 5, -20)
scene.add(directionalLight)

// Mesh like a sun to visualize directional light.
const sun = new THREE.Mesh(
    new THREE.SphereGeometry(1, 32, 32),
    new THREE.MeshBasicMaterial({ color: 0xffffff })
)
sun.position.copy(directionalLight.position)
scene.add(sun)

/**
 * Sizes
 */
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}

window.addEventListener('resize', () =>
{
    // Update sizes
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight

    // Update camera
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    // Update renderer
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})

/**
 * Camera
 */
// Base camera
const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100)
camera.position.set(2, 2, 2)
scene.add(camera)

// Controls
const controls = new OrbitControls(camera, canvas)
controls.target.set(0, 0.75, 0)
controls.enableDamping = true

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
    canvas: canvas
})
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

/**
 * Physics
 */
const world = new CANNON.World({
    gravity: new CANNON.Vec3(0, -9.82, 0) // m/s^2 (Earth's gravity)
});

// Dynamic Body
const radius = 0.5 // m
const sphereBody = new CANNON.Body({
    mass: 5, // kg
    shape: new CANNON.Sphere(radius),
});
sphereBody.position.set(0, 4, -1.8) // m
world.addBody(sphereBody)


// Static Body
const groundBody = new CANNON.Body({
    type: CANNON.Body.STATIC,
    shape: new CANNON.Plane(),
});
groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0) // make it face up
groundBody.position.set(0, 0, 0) // m
world.addBody(groundBody)

const obstacleSize = 1
const obstacleBody = new CANNON.Body({
    type: CANNON.Body.STATIC,
    shape: new CANNON.Box(new CANNON.Vec3(obstacleSize, obstacleSize, obstacleSize)),
});
obstacleBody.position.set(-obstacleSize * 2, obstacleSize, 0) // m
world.addBody(obstacleBody)


///// Three.JS objects
const sphereMesh = new THREE.Mesh(
    new THREE.SphereGeometry(radius),
    new THREE.MeshStandardMaterial({metalness: 0.995, roughness: 0.5})
);
sphereMesh.castShadow = true;
sphereMesh.receiveShadow = true;
scene.add(sphereMesh);

const obstacleMesh = new THREE.Mesh(
    new THREE.BoxGeometry(obstacleSize * 2, obstacleSize * 2, obstacleSize * 2),
    new THREE.MeshStandardMaterial({metalness: 0.995, roughness: 0.5})
);
obstacleMesh.castShadow = true;
obstacleMesh.receiveShadow = true;
obstacleMesh.position.copy(obstacleBody.position)
scene.add(obstacleMesh)

/**
 * Trees
 */
const treeCount = 15
const treeSpawnRadius = 30 // meters

// Tree materials
const trunkMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x504c49, // Brown
    metalness: 0.95,
    roughness: 0.5
})
trunkMaterial.castShadow = true
trunkMaterial.receiveShadow = true

const foliageMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x596859, // Dark green
    metalness: 0.95,
    roughness: 0.5
})
foliageMaterial.castShadow = true
foliageMaterial.receiveShadow = true

// Function to create a tree
const createTree = (x, z) => {
    const treeGroup = new THREE.Group()
    
    // Trunk (cylinder)
    const trunkHeight = 3 + Math.random() * 3 // 3-6 meters
    const trunkRadius = 0.2 + Math.random() * 0.5 // 0.2-0.75 meters
    const trunkGeometry = new THREE.CylinderGeometry(trunkRadius, trunkRadius * 1.2, trunkHeight, 8)
    const trunkMesh = new THREE.Mesh(trunkGeometry, trunkMaterial)
    trunkMesh.position.y = trunkHeight / 2
    trunkMesh.castShadow = true
    trunkMesh.receiveShadow = true
    treeGroup.add(trunkMesh)
    
    // Foliage (cone)
    const foliageHeight = 2 + Math.random() * 1 // 2-3 meters
    const foliageRadius = trunkRadius + 0.5 + Math.random() * 1 // trunk radius - 1.5 meters
    const foliageGeometry = new THREE.ConeGeometry(foliageRadius, foliageHeight, 8)
    const foliageMesh = new THREE.Mesh(foliageGeometry, foliageMaterial)
    foliageMesh.position.y = trunkHeight + foliageHeight / 2
    foliageMesh.castShadow = true
    foliageMesh.receiveShadow = true
    treeGroup.add(foliageMesh)
    
    // Position the tree
    treeGroup.position.set(x, 0, z)
    
    // Physics body for the tree (using box shape for collision)
    const trunkWidth = trunkRadius * 2
    const treeBody = new CANNON.Body({
        type: CANNON.Body.STATIC,
        shape: new CANNON.Box(new CANNON.Vec3(trunkWidth, trunkHeight / 2, trunkWidth))
    })
    treeBody.position.set(x, trunkHeight / 2, z)
    world.addBody(treeBody)
    
    return { treeGroup, treeBody }
}

// Generate trees at random positions
const trees = []
for (let i = 0; i < treeCount; i++) {
    // Generate random position within spawn radius
    const angle = Math.random() * Math.PI * 2
    const distance = Math.random() * treeSpawnRadius
    const x = Math.cos(angle) * distance
    const z = Math.sin(angle) * distance
    
    // Check if position is too close to origin (player spawn) or existing obstacle
    const minDistanceFromOrigin = 3
    const minDistanceFromObstacle = 2
    const distanceFromOrigin = Math.sqrt(x * x + z * z)
    const distanceFromObstacle = Math.sqrt(
        Math.pow(x - obstacleBody.position.x, 2) + 
        Math.pow(z - obstacleBody.position.z, 2)
    )
    
    if (distanceFromOrigin < minDistanceFromOrigin || distanceFromObstacle < minDistanceFromObstacle) {
        // Try again with a new position
        i--
        continue
    }
    
    const { treeGroup, treeBody } = createTree(x, z)
    scene.add(treeGroup)
    trees.push({ treeGroup, treeBody })
}

// Player physics
const playerWidth = 0.3;
const playerHeight = 0.78;
const playerDepth = 1.5;
const boxShape = new CANNON.Box(new CANNON.Vec3(playerWidth, playerHeight, playerDepth));
const playerBody = new CANNON.Body({ mass: 99999, shape: boxShape })
playerBody.position.set(0, playerHeight + 0.5, 0) // m
world.addBody(playerBody)

// Player mesh is the Fox
const playerMesh = new THREE.Mesh(
    new THREE.BoxGeometry(playerWidth * 2, playerHeight * 2, playerDepth * 2),
    new THREE.MeshBasicMaterial({ color: 0x00ff00 })
)
playerMesh.position.copy(playerBody.position)
// scene.add(playerMesh)



/**
 * Keyboard controls
 */

const playerMovement = {
    speed: 0.1,
    forward: false,
    backward: false,
    left: false,
    right: false,
    jump: false,
}

window.addEventListener('keydown', (event) => {
    switch (event.key) {
        case 'w':
            playerMovement.forward = true
            break
        case 's':
            playerMovement.backward = true
            break
        case 'a':
            playerMovement.left = true
            break
        case 'd':
            playerMovement.right = true
            break
        case ' ':
            playerMovement.jump = true
            break
    }
});

window.addEventListener('keyup', (event) => {
    switch (event.key) {
        case 'w':
            playerMovement.forward = false
            break
        case 's':
            playerMovement.backward = false
            break
        case 'a':
            playerMovement.left = false
            break
        case 'd':
            playerMovement.right = false
            break
        case ' ':
            playerMovement.jump = false
            break
    }
});


/**
 * Animate
 */
const clock = new THREE.Clock()
let previousTime = 0
const transitionSpeed = 5 // Speed of interpolation (higher = faster transition)
const rotationSpeed = 16 // Speed of rotation interpolation (higher = faster rotation)
const maxCameraDistance = 7 // Maximum horizontal distance between player and camera

const tick = () =>
{
    const elapsedTime = clock.getElapsedTime()
    const deltaTime = elapsedTime - previousTime
    previousTime = elapsedTime

    // Model animation
    if (mixer && actionIdle && actionRun) {
        mixer.update(deltaTime)
        
        // Check if any arrow key is pressed
        const anyArrowKeyPressed = playerMovement.forward || playerMovement.backward || 
                                   playerMovement.left || playerMovement.right
        
        // Smoothly interpolate between idle (0) and run (2) animations
        const targetIdleWeight = anyArrowKeyPressed ? 0 : 1
        const targetRunWeight = anyArrowKeyPressed ? 1 : 0
        
        // Get current weights
        const currentIdleWeight = actionIdle.getEffectiveWeight()
        const currentRunWeight = actionRun.getEffectiveWeight()
        
        // Interpolate weights (frame-rate independent)
        const lerpFactor = 1 - Math.exp(-transitionSpeed * deltaTime)
        const newIdleWeight = THREE.MathUtils.lerp(currentIdleWeight, targetIdleWeight, lerpFactor)
        const newRunWeight = THREE.MathUtils.lerp(currentRunWeight, targetRunWeight, lerpFactor)
        
        // Apply new weights
        actionIdle.setEffectiveWeight(newIdleWeight)
        actionRun.setEffectiveWeight(newRunWeight)
    }

    // Physics
    world.fixedStep();

    // Player movement (relative to camera)
    const cameraForward = new THREE.Vector3()
    camera.getWorldDirection(cameraForward)
    cameraForward.y = 0 // Keep movement on horizontal plane
    cameraForward.normalize()
    
    const cameraRight = new THREE.Vector3()
    cameraRight.crossVectors(cameraForward, camera.up).normalize()
    
    const movementVector = new THREE.Vector3(0, 0, 0)
    
    if (playerMovement.forward) {
        movementVector.add(cameraForward)
    }
    if (playerMovement.backward) {
        movementVector.sub(cameraForward)
    }
    if (playerMovement.left) {
        movementVector.sub(cameraRight)
    }
    if (playerMovement.right) {
        movementVector.add(cameraRight)
    }
    
    if (movementVector.length() > 0) {
        movementVector.normalize()
        
        // Calculate target rotation to face movement direction
        // Calculate angle from movement direction (in XZ plane)
        const targetAngle = Math.atan2(movementVector.x, movementVector.z)
        
        // Use THREE.js quaternions for easier interpolation
        const currentQuat = new THREE.Quaternion()
        currentQuat.set(
            playerBody.quaternion.x,
            playerBody.quaternion.y,
            playerBody.quaternion.z,
            playerBody.quaternion.w
        )
        
        const targetQuat = new THREE.Quaternion()
        targetQuat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), targetAngle)
        
        // Smoothly interpolate current quaternion towards target
        const lerpFactor = 1 - Math.exp(-rotationSpeed * deltaTime)
        currentQuat.slerp(targetQuat, lerpFactor)
        
        // Apply back to CANNON quaternion
        playerBody.quaternion.set(currentQuat.x, currentQuat.y, currentQuat.z, currentQuat.w)
        
        // Apply movement
        movementVector.multiplyScalar(playerMovement.speed)
        playerBody.position.x += movementVector.x
        playerBody.position.z += movementVector.z

        controls.object.position.x += movementVector.x
        controls.object.position.z += movementVector.z
    }
    
    if (playerMovement.jump) {
        playerBody.position.y += playerMovement.speed
    }


    sphereMesh.position.copy(sphereBody.position)
    sphereMesh.quaternion.copy(sphereBody.quaternion)

    // Player
    if (playerBody && fox && foxPlayer) {
        foxPlayer.position.copy(playerBody.position)
        foxPlayer.quaternion.copy(playerBody.quaternion)

        playerMesh.position.copy(playerBody.position)
        playerMesh.quaternion.copy(playerBody.quaternion)
    }

    controls.target.copy(playerBody.position);

    // Always enforce maximum camera distance from player (even when not moving)
    const cameraToPlayer = new THREE.Vector3(
        controls.object.position.x - playerBody.position.x,
        0, // Only check horizontal distance
        controls.object.position.z - playerBody.position.z
    )
    const horizontalDistance = cameraToPlayer.length()
    
    if (horizontalDistance > maxCameraDistance) {
        // Clamp camera position to maximum distance
        cameraToPlayer.normalize().multiplyScalar(maxCameraDistance)
        controls.object.position.x = playerBody.position.x + cameraToPlayer.x
        controls.object.position.z = playerBody.position.z + cameraToPlayer.z
    }

    // Update controls
    controls.update() 

    // Render
    renderer.render(scene, camera)

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()