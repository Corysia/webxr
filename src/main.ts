import "@babylonjs/core/Debug/debugLayer";
import "@babylonjs/inspector";
import "@babylonjs/loaders/glTF";

import { Engine } from "@babylonjs/core/Engines";
import * as CANNON from "cannon";
import { Color3, Vector3 } from "@babylonjs/core/Maths";
import { CannonJSPlugin, FreeCamera, HemisphericLight, MeshBuilder, PhysicsImpostor, Scene, StandardMaterial, Texture, WebXRControllerComponent, WebXRControllerMovement, WebXRFeatureName, WebXRMotionControllerTeleportation, WebXRState } from "@babylonjs/core";
/*
 * Main application
 * 
 * @class Main
*/
class Main {

    private canvas: HTMLCanvasElement;
    private engine: Engine;
    private scene: Scene;
    private disableTeleportation = false;
    private movementOrientationHandedness = true; // true for right, false for left
    private movementSpeed = 0.1;
    private movementOrientationHMD = true; // can't change this yet as it seems to be broken in Babylon
    private movementParabolicRay = true;
    private movementDisableTorusAnimation = true;
    private movementDisableTorusLighting = true;
    private movementRotationOnTeleport = true;
    private movementTeleportBackwards = false;
    private movementTeleportBackwardsDistance = 0.7;
    private movementTeleportSnapPointsOnly = true;
    private movementRotationAngle = Math.PI / 8;

    private enableHandTracking = true;
    private disableDefaultHandMeshes = false;
    private enableHandPhysics = true;


    private colors = {
        seaFoam: Color3.FromHexString("#16a085"),
        green: Color3.FromHexString("#27ae60"),
        blue: Color3.FromHexString("#2980b9"),
        purple: Color3.FromHexString("#8e44ad"),
        navy: Color3.FromHexString("#2c3e50"),
        yellow: Color3.FromHexString("#f39c12"),
        orange: Color3.FromHexString("#d35400"),
        red: Color3.FromHexString("#c0392b"),
        white: Color3.FromHexString("#bdc3c7"),
        gray: Color3.FromHexString("#7f8c8d")
    }

    /**
     * Creates an instance of Main.
     * 
     * @memberOf Main
     */
    constructor() {
        // create the canvas html element and attach it to the webpage
        this.canvas = document.createElement("canvas");
        this.canvas.style.width = "100%";
        this.canvas.style.height = "100%";
        this.canvas.id = "gameCanvas";
        document.body.appendChild(this.canvas);

        // initialize babylon scene and engine
        this.engine = new Engine(this.canvas, true);
        this.scene = this.CreateScene(this.engine, this.canvas);
        this.setupCamera();
        this.setupXR();

        window.addEventListener("resize", () => {
            this.engine.resize();
        });

        // hide/show the Inspector
        window.addEventListener("keydown", (ev) => {
            // Shift+Ctrl+Alt+I
            if (ev.shiftKey && ev.ctrlKey && ev.altKey && ev.code == "KeyI") {
                if (this.scene.debugLayer.isVisible()) {
                    this.scene.debugLayer.hide();
                } else {
                    this.scene.debugLayer.show();
                }
            }
        });

        // run the main render loop
        this.engine.runRenderLoop(() => {
            this.scene.render();
        });
    }

    /**
     * Create the scene and add all the elements to it
     * @param {Engine} engine
     * @param {HTMLCanvasElement} canvas
     * @returns {Scene}
     */
    public CreateScene(engine: Engine, canvas: HTMLCanvasElement): Scene {
        let scene = new Scene(engine);

        scene.gravity = new Vector3(0, -9.81 / 60, 0);
        const gravityVector = new Vector3(0, -9.81, 0);
        const physicsPlugin = new CannonJSPlugin(true, 10, CANNON);
        scene.enablePhysics(gravityVector, physicsPlugin);
        scene.collisionsEnabled = true;

        let light = new HemisphericLight("light1", new Vector3(0, 1, 0), scene);
        light.intensity = 0.7;
        let sphere = MeshBuilder.CreateSphere("sphere1", { segments: 16, diameter: 1 }, scene);
        sphere.position.y = 1.25;

        const ground1 = MeshBuilder.CreateGround('ground1', { width: 200, height: 200, subdivisions: 16 }, scene);
        ground1.position.y = 0;
        ground1.checkCollisions = true;

        // Simple crate
        let box = MeshBuilder.CreateBox("crate", { size: 2 }, scene);
        const boxMaterial = new StandardMaterial("Mat", scene);
        boxMaterial.diffuseTexture = new Texture("textures/crate.png", scene);
        boxMaterial.diffuseTexture.hasAlpha = true;
        box.position = new Vector3(5, 1, 5);
        box.checkCollisions = true;
        box.material = boxMaterial;

        const orangeMaterial = new StandardMaterial('orangeMat', scene);
        orangeMaterial.specularColor = Color3.Black();
        orangeMaterial.emissiveColor = this.colors.orange;

        const greenMaterial = new StandardMaterial('greenMat', scene);
        greenMaterial.specularColor = Color3.Black();
        greenMaterial.emissiveColor = Color3.Green();

        const redMaterial = new StandardMaterial('redMat', scene);
        redMaterial.specularColor = Color3.Black();
        redMaterial.emissiveColor = Color3.Red();

        const ground2 = MeshBuilder.CreateGround('ground2', { width: 4, height: 4, subdivisions: 16 }, scene);
        ground2.position.y = 0.25;
        ground2.material = greenMaterial;
        ground2.checkCollisions = true;

        const ground3 = MeshBuilder.CreateGround('ground3', { width: 3, height: 3, subdivisions: 16 }, scene);
        ground3.position.y = 0.5;
        ground3.material = orangeMaterial;
        ground3.checkCollisions = true;

        const ground4 = MeshBuilder.CreateGround('ground4', { width: 2, height: 2, subdivisions: 16 }, scene);
        ground4.position.y = 0.75;
        ground4.material = redMaterial;

        const triangle = MeshBuilder.CreateCylinder('triangle', { height: 1, diameter: 1, tessellation: 4, subdivisions: 4 }, scene);
        const triangleMaterial = new StandardMaterial('triangle-mat', scene);
        triangleMaterial.emissiveColor = Color3.Red();
        triangleMaterial.specularColor = Color3.Black();
        triangle.material = triangleMaterial;
        triangle.isVisible = false;

        return scene;
    }

    private setupCamera(): FreeCamera {
        const camera = new FreeCamera("FirstPersonController", new Vector3(0, 2.5, -6), this.scene);
        camera.inputs.addMouse();
        camera.inputs._mouseInput.buttons = [2];
        camera.setTarget(Vector3.Zero());
        camera.attachControl(this.canvas, true);
        camera.speed = 0.5;
        camera.minZ = 0.2;
        camera.angularSensibility = 4000;

        // set up collisions
        camera.checkCollisions = true;
        camera.applyGravity = true;
        camera.ellipsoid = new Vector3(0.3, 1, 0.3);

        // Enable WASD keys
        camera.keysUp.push(87); // W
        camera.keysDown.push(83); // S
        camera.keysLeft.push(65); // A
        camera.keysRight.push(68); // D

        this.scene.onPointerDown = (evt) => {
            // evt.button === 0 is the left mouse button
            // evt.button === 1 is the middle mouse button
            // evt.button === 2 is the right mouse button
            if (evt.button === 2) {
                this.engine.enterPointerlock();
                // } else if (evt.button === 1) { // middle mouse
                //     SceneManager.Instance.Engine.exitPointerlock();
            }
        };

        this.scene.onPointerUp = (evt) => {
            if (evt.button === 2) {
                this.engine.exitPointerlock();
            }
        }
        return camera;
    }

    private createRightHandMovementConfiguration(): any[] {
        return [
            {
                allowedComponentTypes: [WebXRControllerComponent.THUMBSTICK_TYPE, WebXRControllerComponent.TOUCHPAD_TYPE],
                forceHandedness: "right",
                axisChangedHandler: (axes: { x: number; y: number; }, movementState: { rotateX: any; rotateY: any; }, featureContext: { rotationThreshold: number; }, xrInput: any) => {
                    movementState.rotateX = Math.abs(axes.x) > featureContext.rotationThreshold ? axes.x : 0;
                    movementState.rotateY = Math.abs(axes.y) > featureContext.rotationThreshold ? axes.y : 0;
                },
            },
            {
                allowedComponentTypes: [WebXRControllerComponent.THUMBSTICK_TYPE, WebXRControllerComponent.TOUCHPAD_TYPE],
                forceHandedness: "left",
                axisChangedHandler: (axes: { x: number; y: number; }, movementState: { moveX: any; moveY: any; }, featureContext: { movementThreshold: number; }, xrInput: any) => {
                    movementState.moveX = Math.abs(axes.x) > featureContext.movementThreshold ? axes.x : 0;
                    movementState.moveY = Math.abs(axes.y) > featureContext.movementThreshold ? axes.y : 0;
                },
            },
        ];
    }

    private createLeftHandMovementConfiguration(): any[] {
        return [
            {
                allowedComponentTypes: [WebXRControllerComponent.THUMBSTICK_TYPE, WebXRControllerComponent.TOUCHPAD_TYPE],
                forceHandedness: "left",
                axisChangedHandler: (axes: { x: number; y: number; }, movementState: { rotateX: any; rotateY: any; }, featureContext: { rotationThreshold: number; }, xrInput: any) => {
                    movementState.rotateX = Math.abs(axes.x) > featureContext.rotationThreshold ? axes.x : 0;
                    movementState.rotateY = Math.abs(axes.y) > featureContext.rotationThreshold ? axes.y : 0;
                },
            },
            {
                allowedComponentTypes: [WebXRControllerComponent.THUMBSTICK_TYPE, WebXRControllerComponent.TOUCHPAD_TYPE],
                forceHandedness: "right",
                axisChangedHandler: (axes: { x: number; y: number; }, movementState: { moveX: any; moveY: any; }, featureContext: { movementThreshold: number; }, xrInput: any) => {
                    movementState.moveX = Math.abs(axes.x) > featureContext.movementThreshold ? axes.x : 0;
                    movementState.moveY = Math.abs(axes.y) > featureContext.movementThreshold ? axes.y : 0;
                },
            },
        ];
    }

    /**
     * Setup the XR experience
     * @returns {Promise<void>}
     * @memberof Main
     * @private
     * @async
     */
    private async setupXR(): Promise<void> {

        const rightHandedMovementConfiguration = this.createRightHandMovementConfiguration();
        const leftHandedMovementConfiguration = this.createLeftHandMovementConfiguration();
        const swappedHandednessConfiguration = this.movementOrientationHandedness ? rightHandedMovementConfiguration : leftHandedMovementConfiguration;

        const xr = await this.scene.createDefaultXRExperienceAsync({
            disableTeleportation: this.disableTeleportation,
            floorMeshes: [this.scene.getMeshByName('ground1')!]
        });


        const featureManager = xr.baseExperience.featuresManager;

        // enable hand tracking
        if (this.enableHandTracking) {
            try {
                featureManager.enableFeature(WebXRFeatureName.HAND_TRACKING, 'latest', {
                    xrInput: xr.input,
                    jointMeshes: {
                        disableDefaultMeshes: this.disableDefaultHandMeshes,
                        enablePhysics: this.enableHandPhysics,
                        physicsProps: {
                            impostorType: PhysicsImpostor.BoxImpostor,
                            friction: 0.5,
                            restitution: 0.3,
                        },
                        // see the documentation for custom hand meshes: https://doc.babylonjs.com/features/featuresDeepDive/webXR/WebXRSelectedFeatures#hand-meshes
                    }
                });
            }
            catch (e) {
                console.log('Hand tracking not supported');
            }
        }

        // Remember: Need to reconfigure as the previous configuration is overwritten
        if (this.disableTeleportation) {
            featureManager.disableFeature(WebXRFeatureName.TELEPORTATION);
            const smoothLocomotion = featureManager.enableFeature(WebXRFeatureName.MOVEMENT, 'latest', {
                xrInput: xr.input,
                floorMeshes: [this.scene.getMeshByName('ground1')!],
                customRegistrationConfigurations: swappedHandednessConfiguration,
                // add options here
                movementOrientationFollowsViewerPose: this.movementOrientationHMD,
                rotationAngle: this.movementRotationAngle
            }) as WebXRControllerMovement;
            smoothLocomotion.movementSpeed = this.movementSpeed;
        }
        else {
            const torusMaterial = new StandardMaterial('torusMaterial', this.scene);
            torusMaterial.backFaceCulling = false;
            torusMaterial.diffuseColor = Color3.Green();
            torusMaterial.specularColor = Color3.Black();
            torusMaterial.emissiveColor = Color3.FromHexString('#55FF99');
            torusMaterial.alpha = 0.5;
            // you can apply a texture, too

            // Snap-to (hot spot) locations (optional)
            const spotMaterial = new StandardMaterial('spotMaterial', this.scene);
            spotMaterial.diffuseColor = Color3.Teal();
            spotMaterial.emissiveColor = Color3.Teal();
            const interestingSpot = new Vector3(-4, 0, 4);
            const interestingSpotBox = MeshBuilder.CreateBox('interestingSpotBox', { height: 0.01, width: 1, depth: 1 }, this.scene);
            interestingSpotBox.position = interestingSpot;
            interestingSpotBox.material = spotMaterial;
            const interestingSpot2 = new Vector3(4, 0, 4);
            const interestingSpotBox2 = MeshBuilder.CreateBox('interestingSpotBox2', { height: 0.01, width: 1, depth: 1 }, this.scene);
            interestingSpotBox2.position = interestingSpot2;
            interestingSpotBox2.material = spotMaterial;

            featureManager.disableFeature(WebXRFeatureName.MOVEMENT);
            const teleportation = featureManager.enableFeature(WebXRFeatureName.TELEPORTATION, 'latest', {
                xrInput: xr.input,
                floorMeshes: [this.scene.getMeshByName('ground1')!],
                parabolicRayEnabled: this.movementParabolicRay,
                rotationEnabled: this.movementRotationOnTeleport,
                backwardsMovementEnabled: this.movementTeleportBackwards,
                backwardsTeleportationDistance: this.movementTeleportBackwardsDistance,
                rotationAngle: this.movementRotationAngle,
                renderGroupId: 1,
                snapPositions: [interestingSpot, interestingSpot2],
                snapToPositionRadius: 1.2,
                snapPointsOnly: this.movementTeleportSnapPointsOnly,
                defaultTargetMeshOptions: {
                    teleportationFillColor: "#55FF99",
                    teleportationBorderColor: "blue",
                    torusArrowMaterial: torusMaterial,
                    disableAnimation: this.movementDisableTorusAnimation,
                    disableLighting: this.movementDisableTorusLighting,
                },
            }) as WebXRMotionControllerTeleportation;

            // dynamically add a new hot spot
            const dynamicSpotPoint = new Vector3(0, 0, 4);
            teleportation.addSnapPoint(dynamicSpotPoint);
            const dynamicSpotBox = MeshBuilder.CreateBox('dynamicSpotBox', { height: 0.01, width: 1, depth: 1 }, this.scene);
            dynamicSpotBox.position = dynamicSpotPoint;
            dynamicSpotBox.material = spotMaterial;

        }

        // setup xr camera collisions
        const camera = xr.input.xrCamera;
        camera.checkCollisions = true;
        camera.applyGravity = true;
        camera.ellipsoid = new Vector3(0.3, 1, 0.3);

        xr.baseExperience.onStateChangedObservable.add((webXRState) => {
            const triangle = this.scene.getMeshByName('triangle')!;
            switch (webXRState) {
                case WebXRState.ENTERING_XR:
                case WebXRState.IN_XR:
                    triangle.isVisible = true;
                    break;
                case WebXRState.EXITING_XR:
                case WebXRState.NOT_IN_XR:
                default:
                    triangle.isVisible = false;
                    break;
            }
        });

        xr.baseExperience.sessionManager.onXRFrameObservable.add(() => {
            if (xr.baseExperience.state === WebXRState.IN_XR) {
                if (this.disableTeleportation) {
                    const triangle = this.scene.getMeshByName('triangle')!;
                    const movementFeature = xr.baseExperience.featuresManager.getEnabledFeature("xr-controller-movement") as WebXRControllerMovement;
                    xr.input.xrCamera.setTransformationFromNonVRCamera(this.scene.activeCamera, true); // put the camera where the non-VR camera is
                    triangle.rotation.y = (0.5 + movementFeature.movementDirection.toEulerAngles().y);
                    triangle.position.set(xr.input.xrCamera.position.x, 0.001, xr.input.xrCamera.position.z);
                } else {
                    const triangle = this.scene.getMeshByName('triangle')!;
                    triangle.isVisible = false;
                }
            }
        });
    }

}
const main = new Main();