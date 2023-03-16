import "@babylonjs/core/Debug/debugLayer";
import "@babylonjs/inspector";
import "@babylonjs/loaders/glTF";
import * as CANNON from "cannon";

import { WebXRFeatureName, WebXRState } from "@babylonjs/core/XR";
import { CannonJSPlugin, PhysicsImpostor } from "@babylonjs/core/Physics";
import { EventState } from "@babylonjs/core/Misc";
import { Color3, Color4, Matrix, Quaternion, Vector3 } from "@babylonjs/core/Maths";
import { Engine } from "@babylonjs/core/Engines";
import { Scene, StandardMaterial } from "@babylonjs/core/";
import { FreeCamera } from "@babylonjs/core/Cameras";
import { HemisphericLight } from "@babylonjs/core/Lights";
import { Mesh, MeshBuilder } from "@babylonjs/core/Meshes";

class Main {

    private canvas: HTMLCanvasElement;
    private engine: Engine;
    private scene: Scene;

    constructor() {
        // create the canvas html element and attach it to the webpage
        this.canvas = document.createElement("canvas");
        this.canvas.style.width = "100%";
        this.canvas.style.height = "100%";
        this.canvas.id = "gameCanvas";
        document.body.appendChild(this.canvas);

        // initialize babylon scene and engine
        this.engine = new Engine(this.canvas, true);
        // this.scene = new Scene(this.engine);
        this.scene = Main.CreateScene(this.engine, this.canvas);

        window.addEventListener("resize", () => {
            this.engine.resize();
        });

        // hide/show the Inspector
        window.addEventListener("keydown", (ev) => {
            // Shift+Ctrl+Alt+I
            // keyCode 73 = I, need to use this because ev.key === "I" doesn't work on a Mac
            if (ev.shiftKey && ev.ctrlKey && ev.altKey && ev.keyCode === 73) {
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

    public static CreateScene(engine: Engine, canvas: HTMLCanvasElement): Scene {
        // This creates a basic Babylon Scene object (non-mesh)
        var scene = new Scene(engine);

        const gravityVector = new Vector3(0, -9.81, 0);
        const physicsPlugin = new CannonJSPlugin(true, 10, CANNON);
        scene.enablePhysics(gravityVector, physicsPlugin);

        const clearColor = Color3.Teal();
        scene.clearColor = new Color4(clearColor.r, clearColor.g, clearColor.b, 1.0);

        // This creates and positions a free camera (non-mesh)
        var camera = new FreeCamera("camera1", new Vector3(0, 2, -10), scene);

        // This targets the camera to scene origin
        camera.setTarget(Vector3.Zero());

        // This attaches the camera to the canvas
        camera.attachControl(canvas, true);

        // This creates a light, aiming 0,1,0 - to the sky (non-mesh)
        var light = new HemisphericLight("light1", new Vector3(0, 1, 0), scene);

        // Default intensity is 1. Let's dim the light a small amount
        light.intensity = 0.7;

        // Our built-in 'ground' shape. Params: name, width, depth, subdivs, scene
        var ground = Mesh.CreateGround("ground1", 40, 40, 2, scene);
        ground.physicsImpostor = new PhysicsImpostor(ground, PhysicsImpostor.BoxImpostor, { mass: 0, friction: 0.8, restitution: 0.5, disableBidirectionalTransformation: true }, scene);
        ground.checkCollisions = true;
        var groundMaterial = new StandardMaterial("groundMaterial", scene);
        groundMaterial.diffuseColor = Color3.Gray();
        ground.material = groundMaterial;
        ground.material.freeze();

        var towerMeshes = [];
        var boxMaterial = new StandardMaterial("", scene);
        boxMaterial.diffuseColor = Color3.FromHexString("#ad8762");

        // https://playground.babylonjs.com/pg/B922X8/revision/19
        var towerMeshes = [];
        for (var x = 0; x < 7; x++) {
            for (var y = 0; y < 7; y++) {
                for (var z = 0; z < 1; z++) {
                    var box1 = MeshBuilder.CreateBox("towerBox",
                        { width: 1.5, height: 1.2, depth: 1.5, sideOrientation: Mesh.FRONTSIDE, updatable: false }, scene);
                    box1.material = boxMaterial;
                    box1.material.freeze();

                    box1.position.x = (x - 3) * 1.6;
                    box1.position.y = 2 + y * 1.5;
                    box1.position.z = 15 + z * 2.5;
                    box1.physicsImpostor = new PhysicsImpostor(box1,
                        PhysicsImpostor.BoxImpostor,
                        { mass: 0.2, friction: 0.5, restitution: 0 }, scene);
                    towerMeshes.push(box1);
                }
            }
        }

        (async () => {
            await Main.MovingByWebXRController(scene, ground);
        })()

        return scene;
    }

    public static async MovingByWebXRController(scene: Scene, ground: Mesh) {
    var xrHelper = await scene.createDefaultXRExperienceAsync({
        floorMeshes: [ground]
    });

    const xrPhysics = xrHelper.baseExperience.featuresManager.enableFeature(WebXRFeatureName.PHYSICS_CONTROLLERS, "latest", {
        xrInput: xrHelper.input,
        physicsProperties: {
            restitution: 0.5,
            impostorSize: 0.1,
            impostorType: PhysicsImpostor.BoxImpostor
        },
        enableHeadsetImpostor: true
    });

    xrHelper.baseExperience.featuresManager.disableFeature(WebXRFeatureName.TELEPORTATION);

    var webXRInput = await xrHelper.input;

    xrHelper.baseExperience.onStateChangedObservable.add(function (state: WebXRState) {
        switch (state) {
            case WebXRState.IN_XR:
            case WebXRState.ENTERING_XR:
                // webXRInput.xrCamera.position = Vector3.Zero();
                // webXRInput.xrCamera.position.z = -10;
                // webXRInput.xrCamera.position.y = 2;
                webXRInput.xrCamera.setTransformationFromNonVRCamera(scene.activeCamera, true); // put the camera where the non-VR camera is
                break;
        }
    });

    // https://qiita.com/wjs_fxf/items/37c203e5432ba238dbb8
    webXRInput.onControllerAddedObservable.add((controller) => {
        const moveSpeed = 0.1;
        controller.onMotionControllerInitObservable.add((controller) => {
            if (controller.handness == "left") {
                let ids = controller.getComponentIds()
                for (let i = 0; i < ids.length; i++) {
                    let component = controller.getComponent(ids[i])
                    switch (ids[i]) {
                        case "xr-standard-thumbstick":
                            component.onAxisValueChangedObservable.add(function (
                                eventData: { x: number, y: number }, _: EventState) {
                                const { x, y } = eventData;

                                const matrix = new Matrix();
                                const deviceRotationQuaternion = webXRInput.xrCamera.rotationQuaternion;
                                Matrix.FromQuaternionToRef(deviceRotationQuaternion, matrix);

                                const move = new Vector3(x * moveSpeed, 0, -y * moveSpeed);
                                const addPos = Vector3.TransformCoordinates(move, matrix);
                                addPos.y = 0;

                                webXRInput.xrCamera.position = webXRInput.xrCamera.position.add(addPos);
                            })
                            break
                    }
                }
            } else if (controller.handness == "right") {
                let ids = controller.getComponentIds()
                for (let i = 0; i < ids.length; i++) {
                    let component = controller.getComponent(ids[i])
                    switch (ids[i]) {
                        case "xr-standard-thumbstick":
                            var isHorizontalRotate = false;

                            // https://github.com/BabylonJS/js/blob/6a6a5cfc2354fff165d9bae083185ef602440625/src/XR/features/WebXRControllerTeleportation.ts#L573-L576
                            component.onAxisValueChangedObservable.add(function (
                                eventData: { x: number, y: number }, _: EventState) {
                                const { x } = eventData;

                                if (isHorizontalRotate && Math.abs(x) > 0.8) {
                                    isHorizontalRotate = false;

                                    var rotationAngle = Math.PI / 8;
                                    if (x <= 0) {
                                        rotationAngle = -rotationAngle;
                                    }

                                    const eulerAngles = Quaternion.FromEulerAngles(0, rotationAngle, 0);
                                    // webXRInput.xrCamera.rotation.multiplyInPlace(new Vector3(0, rotationAngle, 0));
                                    webXRInput.xrCamera.rotationQuaternion.multiplyInPlace(eulerAngles);
                                } else if (Math.abs(x) < 0.8) {
                                    isHorizontalRotate = true
                                }
                            })
                            break
                    }
                }
            }
        });
    });
}
}
new Main();