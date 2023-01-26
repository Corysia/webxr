import "@babylonjs/core/Debug/debugLayer";
import "@babylonjs/inspector";
import "@babylonjs/loaders/glTF";
import { Engine, Scene, Vector3, HemisphericLight, Mesh, MeshBuilder, FreeCamera } from "@babylonjs/core";

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
        this.scene = new Scene(this.engine);
        this.CreateScene();

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

    async CreateScene() {
        var camera: FreeCamera = new FreeCamera("Camera", new Vector3(0, 5, -10), this.scene);
        camera.setTarget(Vector3.Zero());
        camera.attachControl(this.canvas, true);
        var light1: HemisphericLight = new HemisphericLight("light1", new Vector3(1, 1, 0), this.scene);
        light1.intensity = 0.7;
        var sphere: Mesh = MeshBuilder.CreateSphere("sphere", { diameter: 1 }, this.scene);
        sphere.position.y = 1;

        this.scene.createDefaultEnvironment();

        const xrHelper = await this.scene.createDefaultXRExperienceAsync();
    }
}
new Main();