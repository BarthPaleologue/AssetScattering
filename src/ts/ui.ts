import {AdvancedDynamicTexture, Rectangle, TextBlock} from "@babylonjs/gui";
import {Scene} from "@babylonjs/core/scene";

export class UI {
    private readonly gui: AdvancedDynamicTexture;

    private readonly text1: TextBlock;
    constructor(scene: Scene) {
        this.gui = AdvancedDynamicTexture.CreateFullscreenUI("ui", true, scene);

        // text block on the bottom left
        const container = new Rectangle("container");
        container.width = "370px";
        container.height = "100px";
        container.cornerRadius = 5;
        container.background = "rgba(0, 0, 0, 0.9)";
        container.horizontalAlignment = 0;
        container.verticalAlignment = 1;
        container.left = "20px";
        container.top = "-20px";
        this.gui.addControl(container);

        // text block on the bottom left
        this.text1 = new TextBlock();
        this.text1.text = "";
        this.text1.color = "white";
        this.text1.fontSize = 24;
        container.addControl(this.text1);
    }

    public setText(text: string) {
        this.text1.text = text;
    }
}