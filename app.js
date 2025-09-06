// AR Space Application using Three.js and WebXR
class ARSpace {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.model = null;
        this.placedModels = [];
        this.reticle = null;
        this.hitTestSource = null;
        this.hitTestSourceRequested = false;
        this.arSession = null;
        this.isARSupported = false;
        this.isLoading = false;
        this.groundPlane = null;
        this.controls = null;
        this.modelType = null; // 'glb' or 'icosahedron'
        
        // UI elements
        this.arButton = document.getElementById('ar-button');
        this.stopArButton = document.getElementById('stop-ar-button');
        this.instructionText = document.getElementById('instruction-text');
        this.statusElement = document.getElementById('status');
        this.statusText = document.getElementById('status-text');
        this.fallbackMessage = document.getElementById('fallback-message');
        this.reticleElement = document.getElementById('reticle');
        this.container = document.getElementById('container');
        
        this.init();
    }
    
    async init() {
        this.showStatus('Initializing AR Space...');
        
        // Initialize Three.js first
        this.initThreeJS();
        
        // Load model (GLB first, then fallback)
        await this.loadModel();
        
        // Check WebXR support
        await this.checkARSupport();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Start render loop
        this.animate();
        
        this.hideStatus();
        
        if (!this.isARSupported) {
            this.showFallbackMessage();
        }
    }
    
    async checkARSupport() {
        if ('xr' in navigator) {
            try {
                this.isARSupported = await navigator.xr.isSessionSupported('immersive-ar');
            } catch (error) {
                console.log('WebXR AR not supported:', error);
                this.isARSupported = false;
            }
        }
        console.log('AR Support:', this.isARSupported);
    }
    
    initThreeJS() {
        // Scene
        this.scene = new THREE.Scene();
        
        // Camera - better positioning for viewing the icosahedron
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.01, 1000);
        this.camera.position.set(0, 2, 5);
        this.camera.lookAt(0, 0, 0);
        
        // Renderer
        const canvas = document.getElementById('ar-canvas');
        this.renderer = new THREE.WebGLRenderer({ 
            canvas: canvas,
            antialias: true, 
            alpha: true 
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.xr.enabled = true;
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        // Lighting setup as specified in instructions
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
        directionalLight.position.set(10, 15, 10);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 50;
        directionalLight.shadow.camera.left = -15;
        directionalLight.shadow.camera.right = 15;
        directionalLight.shadow.camera.top = 15;
        directionalLight.shadow.camera.bottom = -15;
        this.scene.add(directionalLight);
        
        // Create invisible ground plane to receive shadows
        this.createGroundPlane();
        
        // Create reticle for AR surface detection
        this.createReticle();
        
        // Simple mouse controls for non-AR mode
        this.setupMouseControls();
        
        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize());
    }
    
    createGroundPlane() {
        const groundGeometry = new THREE.PlaneGeometry(30, 30);
        const groundMaterial = new THREE.ShadowMaterial({ opacity: 0.3 });
        this.groundPlane = new THREE.Mesh(groundGeometry, groundMaterial);
        this.groundPlane.rotation.x = -Math.PI / 2;
        this.groundPlane.position.y = -3;
        this.groundPlane.receiveShadow = true;
        this.scene.add(this.groundPlane);
    }
    
    setupMouseControls() {
        let isDragging = false;
        let previousMousePosition = { x: 0, y: 0 };
        
        this.renderer.domElement.addEventListener('mousedown', (e) => {
            if (!this.arSession) {
                isDragging = true;
                previousMousePosition = { x: e.clientX, y: e.clientY };
                e.preventDefault();
            }
        });
        
        this.renderer.domElement.addEventListener('mousemove', (e) => {
            if (isDragging && !this.arSession) {
                const deltaMove = {
                    x: e.clientX - previousMousePosition.x,
                    y: e.clientY - previousMousePosition.y
                };
                
                // Rotate camera around the object instead of rotating the object
                const spherical = new THREE.Spherical();
                spherical.setFromVector3(this.camera.position);
                spherical.theta -= deltaMove.x * 0.01;
                spherical.phi += deltaMove.y * 0.01;
                spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.phi));
                
                this.camera.position.setFromSpherical(spherical);
                this.camera.lookAt(0, 0, 0);
                
                previousMousePosition = { x: e.clientX, y: e.clientY };
                e.preventDefault();
            }
        });
        
        this.renderer.domElement.addEventListener('mouseup', (e) => {
            isDragging = false;
            e.preventDefault();
        });
        
        // Touch controls
        this.renderer.domElement.addEventListener('touchstart', (e) => {
            if (!this.arSession && e.touches.length === 1) {
                isDragging = true;
                previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
                e.preventDefault();
            }
        });
        
        this.renderer.domElement.addEventListener('touchmove', (e) => {
            if (isDragging && !this.arSession && e.touches.length === 1) {
                const deltaMove = {
                    x: e.touches[0].clientX - previousMousePosition.x,
                    y: e.touches[0].clientY - previousMousePosition.y
                };
                
                // Rotate camera around the object
                const spherical = new THREE.Spherical();
                spherical.setFromVector3(this.camera.position);
                spherical.theta -= deltaMove.x * 0.01;
                spherical.phi += deltaMove.y * 0.01;
                spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.phi));
                
                this.camera.position.setFromSpherical(spherical);
                this.camera.lookAt(0, 0, 0);
                
                previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
                e.preventDefault();
            }
        });
        
        this.renderer.domElement.addEventListener('touchend', (e) => {
            isDragging = false;
            e.preventDefault();
        });
    }
    
    createReticle() {
        const geometry = new THREE.RingGeometry(0.15, 0.2, 32).rotateX(-Math.PI / 2);
        const material = new THREE.MeshBasicMaterial({ 
            color: 0x00ffff,
            transparent: true,
            opacity: 0.7
        });
        this.reticle = new THREE.Mesh(geometry, material);
        this.reticle.visible = false;
        this.scene.add(this.reticle);
    }
    
    async loadModel() {
        this.showStatus('Loading test.glb model...');
        this.isLoading = true;
        
        // Try to load GLB first
        const loader = new THREE.GLTFLoader();
        
        try {
            const gltf = await new Promise((resolve, reject) => {
                loader.load(
                    'test.glb',
                    resolve,
                    (progress) => {
                        console.log('Loading progress:', (progress.loaded / progress.total * 100) + '%');
                    },
                    reject
                );
            });
            
            console.log('GLB model loaded successfully');
            this.modelType = 'glb';
            this.model = gltf.scene;
            
            // Configure shadows for GLB model
            this.model.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });
            
            // Scale and position the model appropriately
            this.model.scale.setScalar(0.5);
            this.model.position.set(0, 0, 0);
            
            this.showSuccessStatus('GLB model loaded successfully!');
            
        } catch (error) {
            console.log('GLB loading failed, creating fallback icosahedron:', error);
            this.createFallbackIcosahedron();
        }
        
        // Always add to scene for preview (will be removed when AR starts)
        if (this.model) {
            this.scene.add(this.model);
        }
        
        this.isLoading = false;
        setTimeout(() => this.hideStatus(), 2000);
    }
    
    createFallbackIcosahedron() {
        console.log('Creating large polygonal icosahedron with shadows...');
        this.modelType = 'icosahedron';
        
        // Create large icosahedron geometry as specified (radius: 2)
        const geometry = new THREE.IcosahedronGeometry(2, 1);
        
        // Apply materials as specified in instructions
        const material = new THREE.MeshStandardMaterial({
            color: 0x4444ff,  // Blue color as specified
            metalness: 0.3,   // As specified
            roughness: 0.4    // As specified
        });
        
        this.model = new THREE.Mesh(geometry, material);
        
        // Enable shadow casting and receiving as specified
        this.model.castShadow = true;
        this.model.receiveShadow = true;
        
        // Position at origin as specified
        this.model.position.set(0, 0, 0);
        
        // Add rotation animation
        this.model.userData.rotationSpeed = 0.01;
        
        this.showSuccessStatus('Polygonal icosahedron created with shadows!');
        
        console.log('Large polygonal icosahedron created successfully');
    }
    
    setupEventListeners() {
        // AR Button
        this.arButton.addEventListener('click', () => {
            if (this.isARSupported) {
                this.startAR();
            } else {
                // In fallback mode, just show that AR is not supported
                this.showStatus('WebXR AR not supported on this device');
                setTimeout(() => this.hideStatus(), 3000);
            }
        });
        
        this.stopArButton.addEventListener('click', () => this.stopAR());
        
        // Touch/Click events for model placement in AR mode only
        this.renderer.domElement.addEventListener('click', (event) => {
            if (this.arSession) {
                this.onSelect(event);
            }
        });
        
        // XR Session events
        if (this.renderer.xr) {
            this.renderer.xr.addEventListener('sessionstart', () => this.onARSessionStart());
            this.renderer.xr.addEventListener('sessionend', () => this.onARSessionEnd());
        }
    }
    
    async startAR() {
        if (!this.isARSupported) {
            this.showFallbackMessage();
            return;
        }
        
        try {
            this.showStatus('Starting AR session...');
            
            const session = await navigator.xr.requestSession('immersive-ar', {
                requiredFeatures: ['hit-test']
            });
            
            await this.renderer.xr.setSession(session);
            this.arSession = session;
            
        } catch (error) {
            console.error('Failed to start AR session:', error);
            this.showStatus('Failed to start AR session');
            setTimeout(() => this.hideStatus(), 3000);
        }
    }
    
    stopAR() {
        if (this.arSession) {
            this.arSession.end();
        }
    }
    
    onARSessionStart() {
        console.log('AR session started');
        this.container.classList.add('ar-active');
        this.arButton.classList.add('hidden');
        this.stopArButton.classList.remove('hidden');
        this.reticleElement.classList.remove('hidden');
        
        const modelText = this.modelType === 'glb' ? 'GLB model' : 'polygonal shape';
        this.instructionText.textContent = `Point your device at a surface and tap to place the ${modelText}`;
        this.hideStatus();
        
        // Remove model from scene (it will be placed via AR interaction)
        if (this.model && this.scene.children.includes(this.model)) {
            this.scene.remove(this.model);
        }
    }
    
    onARSessionEnd() {
        console.log('AR session ended');
        this.container.classList.remove('ar-active', 'surface-detected');
        this.arButton.classList.remove('hidden');
        this.stopArButton.classList.add('hidden');
        this.reticleElement.classList.add('hidden');
        this.instructionText.textContent = 'Click "Start AR" to begin augmented reality experience';
        
        // Clean up placed models
        this.placedModels.forEach(model => this.scene.remove(model));
        this.placedModels = [];
        
        // Reset hit test
        this.hitTestSource = null;
        this.hitTestSourceRequested = false;
        
        // Add model back for preview
        if (this.model && !this.scene.children.includes(this.model)) {
            this.scene.add(this.model);
        }
    }
    
    onSelect(event) {
        if (!this.arSession || !this.reticle.visible) return;
        
        // Clone and place the model
        if (this.model) {
            const modelClone = this.model.clone();
            modelClone.position.copy(this.reticle.position);
            modelClone.quaternion.copy(this.reticle.quaternion);
            
            // Add rotation animation
            modelClone.userData.rotationSpeed = 0.01;
            modelClone.userData.isPlaced = true;
            
            this.scene.add(modelClone);
            this.placedModels.push(modelClone);
            
            const modelText = this.modelType === 'glb' ? 'GLB model' : 'polygonal icosahedron';
            console.log(`${modelText} placed at:`, modelClone.position);
        }
    }
    
    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    showStatus(message) {
        this.statusText.textContent = message;
        this.statusElement.classList.remove('hidden');
        this.statusElement.className = 'status status--info';
        this.container.classList.add('loading');
    }
    
    showSuccessStatus(message) {
        this.statusText.textContent = message;
        this.statusElement.classList.remove('hidden');
        this.statusElement.className = 'status status--success';
        this.container.classList.add('success');
    }
    
    hideStatus() {
        this.statusElement.classList.add('hidden');
        this.container.classList.remove('loading', 'success');
    }
    
    showFallbackMessage() {
        this.fallbackMessage.classList.remove('hidden');
        const modelText = this.modelType === 'glb' ? 'GLB model' : 'polygonal icosahedron';
        this.instructionText.textContent = `WebXR AR not available. Viewing ${modelText} in regular 3D mode. Use mouse/touch to rotate view.`;
    }
    
    animate() {
        this.renderer.setAnimationLoop(() => this.render());
    }
    
    render() {
        const frame = this.renderer.xr.getFrame();
        
        if (frame && this.arSession) {
            this.handleHitTest(frame);
        }
        
        // Animate placed models in AR
        this.placedModels.forEach(model => {
            if (model.userData.rotationSpeed) {
                model.rotation.y += model.userData.rotationSpeed;
            }
        });
        
        // Animate preview model (when not in AR) - rotation animation as specified
        if (this.model && this.scene.children.includes(this.model) && !this.arSession) {
            if (this.model.userData.rotationSpeed) {
                this.model.rotation.y += this.model.userData.rotationSpeed;
            } else {
                this.model.rotation.y += 0.01;
            }
        }
        
        this.renderer.render(this.scene, this.camera);
    }
    
    async handleHitTest(frame) {
        const referenceSpace = this.renderer.xr.getReferenceSpace();
        const session = frame.session;
        
        if (!this.hitTestSourceRequested) {
            try {
                const hitTestSource = await session.requestHitTestSource({ space: referenceSpace });
                this.hitTestSource = hitTestSource;
                this.hitTestSourceRequested = true;
            } catch (error) {
                console.log('Hit test not supported:', error);
            }
        }
        
        if (this.hitTestSource) {
            const hitTestResults = frame.getHitTestResults(this.hitTestSource);
            
            if (hitTestResults.length > 0) {
                const hit = hitTestResults[0];
                const pose = hit.getPose(referenceSpace);
                
                if (pose) {
                    this.reticle.visible = true;
                    this.reticle.position.setFromMatrixPosition(pose.transform.matrix);
                    this.reticle.quaternion.setFromRotationMatrix(pose.transform.matrix);
                    
                    this.container.classList.add('surface-detected');
                }
            } else {
                this.reticle.visible = false;
                this.container.classList.remove('surface-detected');
            }
        }
    }
}

// Initialize the AR Space application when the page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing AR Space application...');
    new ARSpace();
});