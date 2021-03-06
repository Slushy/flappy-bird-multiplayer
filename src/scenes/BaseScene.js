import Phaser from 'phaser';

export default class BaseScene extends Phaser.Scene {
    constructor(key, config, socket) {
        super(key);
        this.config = config;
        this.socket = socket;
        this.screenCenter = [config.width / 2, config.height / 2];
        this.fontSize = 34;
        this.lineHeight = 42;
        this.fontOptions = {
            fontSize: `${this.fontSize}px`,
            color: '#FFF',
        };
    }

    create() {
        this.add.image(0, 0, 'sky').setOrigin(0);

        if (this.config.canGoBack) {
            const backButton = this.add
                .image(this.config.width - 10, this.config.height - 10, 'back')
                .setInteractive()
                .setScale(2)
                .setOrigin(1);

            backButton.on('pointerup', () => {
                this.scene.start('MenuScene');
            });
        }
    }

    /**
     *
     * @param {string[]} menu
     */
    createMenu(menu, setupMenuEvents) {
        let lastMenuPositionY = 0;

        menu.forEach((menuItem) => {
            const menuPosition = [this.screenCenter[0], this.screenCenter[1] + lastMenuPositionY];
            menuItem.textGO = this.add.text(...menuPosition, menuItem.text, this.fontOptions).setOrigin(0.5, 1);
            setupMenuEvents(menuItem);
            lastMenuPositionY += this.lineHeight;
        });
    }
}
