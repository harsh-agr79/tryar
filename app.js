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
        
        // Load model
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
        
        // Camera
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.01, 1000);
        this.camera.position.set(0, 1, 3);
        
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
        
        // Lighting for AR
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 10, 5);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        this.scene.add(directionalLight);
        
        // Create reticle for AR surface detection
        this.createReticle();
        
        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize());
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
        this.showStatus('Loading 3D robot model...');
        this.isLoading = true;
        
        // Create a complex procedural robot model
        this.createProceduralModel();
        
        this.isLoading = false;
    }
    
    createProceduralModel() {
        console.log('Creating procedural robot model...');
        
        // Create a complex procedural robot model
        const robotGroup = new THREE.Group();
        
        // Materials
        const bodyMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x4a90e2, 
            metalness: 0.7, 
            roughness: 0.2 
        });
        const accentMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xff6b35, 
            metalness: 0.8, 
            roughness: 0.1 
        });
        const eyeMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x00ff88, 
            emissive: 0x004422 
        });
        
        // Body (main torso)
        const bodyGeometry = new THREE.BoxGeometry(1, 1.2, 0.6);
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0;
        body.castShadow = true;
        body.receiveShadow = true;
        robotGroup.add(body);
        
        // Head
        const headGeometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
        const head = new THREE.Mesh(headGeometry, bodyMaterial);
        head.position.y = 1;
        head.castShadow = true;
        head.receiveShadow = true;
        robotGroup.add(head);
        
        // Eyes
        const eyeGeometry = new THREE.SphereGeometry(0.1, 16, 16);
        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(-0.2, 1.1, 0.35);
        leftEye.castShadow = true;
        const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        rightEye.position.set(0.2, 1.1, 0.35);
        rightEye.castShadow = true;
        robotGroup.add(leftEye, rightEye);
        
        // Arms
        const armGeometry = new THREE.CylinderGeometry(0.15, 0.15, 1, 8);
        const leftArm = new THREE.Mesh(armGeometry, accentMaterial);
        leftArm.position.set(-0.7, 0.2, 0);
        leftArm.rotation.z = Math.PI / 6;
        leftArm.castShadow = true;
        leftArm.receiveShadow = true;
        const rightArm = new THREE.Mesh(armGeometry, accentMaterial);
        rightArm.position.set(0.7, 0.2, 0);
        rightArm.rotation.z = -Math.PI / 6;
        rightArm.castShadow = true;
        rightArm.receiveShadow = true;
        robotGroup.add(leftArm, rightArm);
        
        // Hands
        const handGeometry = new THREE.SphereGeometry(0.2, 12, 12);
        const leftHand = new THREE.Mesh(handGeometry, bodyMaterial);
        leftHand.position.set(-1.1, -0.3, 0);
        leftHand.castShadow = true;
        leftHand.receiveShadow = true;
        const rightHand = new THREE.Mesh(handGeometry, bodyMaterial);
        rightHand.position.set(1.1, -0.3, 0);
        rightHand.castShadow = true;
        rightHand.receiveShadow = true;
        robotGroup.add(leftHand, rightHand);
        
        // Legs
        const legGeometry = new THREE.CylinderGeometry(0.2, 0.2, 1.2, 8);
        const leftLeg = new THREE.Mesh(legGeometry, accentMaterial);
        leftLeg.position.set(-0.3, -1.2, 0);
        leftLeg.castShadow = true;
        leftLeg.receiveShadow = true;
        const rightLeg = new THREE.Mesh(legGeometry, accentMaterial);
        rightLeg.position.set(0.3, -1.2, 0);
        rightLeg.castShadow = true;
        rightLeg.receiveShadow = true;
        robotGroup.add(leftLeg, rightLeg);
        
        // Feet
        const footGeometry = new THREE.BoxGeometry(0.4, 0.2, 0.6);
        const leftFoot = new THREE.Mesh(footGeometry, bodyMaterial);
        leftFoot.position.set(-0.3, -1.9, 0.1);
        leftFoot.castShadow = true;
        leftFoot.receiveShadow = true;
        const rightFoot = new THREE.Mesh(footGeometry, bodyMaterial);
        rightFoot.position.set(0.3, -1.9, 0.1);
        rightFoot.castShadow = true;
        rightFoot.receiveShadow = true;
        robotGroup.add(leftFoot, rightFoot);
        
        // Antenna
        const antennaGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.5, 8);
        const antenna = new THREE.Mesh(antennaGeometry, accentMaterial);
        antenna.position.set(0, 1.65, 0);
        antenna.castShadow = true;
        robotGroup.add(antenna);
        
        const antennaTipGeometry = new THREE.SphereGeometry(0.08, 8, 8);
        const antennaTip = new THREE.Mesh(antennaTipGeometry, eyeMaterial);
        antennaTip.position.set(0, 1.9, 0);
        antennaTip.castShadow = true;
        robotGroup.add(antennaTip);
        
        // Scale the model appropriately
        robotGroup.scale.setScalar(0.3);
        
        // Position the model
        robotGroup.position.set(0, -0.5, 0);
        
        this.model = robotGroup;
        
        // Always add to scene for preview (will be removed when AR starts)
        this.scene.add(this.model);
        
        console.log('Robot model created and added to scene');
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
        
        // Touch/Click events for model placement
        this.renderer.domElement.addEventListener('click', (event) => this.onSelect(event));
        
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
        this.instructionText.textContent = 'Point your device at a surface and tap to place the robot';
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
            
            console.log('Robot model placed at:', modelClone.position);
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
        this.container.classList.add('loading');
    }
    
    hideStatus() {
        this.statusElement.classList.add('hidden');
        this.container.classList.remove('loading');
    }
    
    showFallbackMessage() {
        this.fallbackMessage.classList.remove('hidden');
        this.instructionText.textContent = 'WebXR AR not available. Viewing 3D robot model in regular mode.';
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
        
        // Animate preview model (when not in AR)
        if (this.model && this.scene.children.includes(this.model) && !this.arSession) {
            this.model.rotation.y += 0.01;
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