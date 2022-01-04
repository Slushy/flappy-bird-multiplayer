import BaseScene from './BaseScene';

export default class MenuScene extends BaseScene {
    constructor(config) {
        super('MenuScene', config);
        
        this.menu = [
            { scene: 'PlayScene', text: 'Play' },
            { scene: 'ScoreScene', text: 'Score' },
            { scene: null, text: 'Exit' },
        ]
    }

    create() {
        super.create();

        this.createMenu(this.menu, this.setupMenuEvents.bind(this));
    }

    setupMenuEvents(menuItem) {
        const textGO = menuItem.textGO;
        textGO.setInteractive();

        textGO.on('pointerover', () => {
            textGO.setStyle({ color: '#FF0' });
        })

        textGO.on('pointerout', () => {
            textGO.setStyle({ color: '#FFF' });
        })

        textGO.on('pointerup', () => {
            menuItem.scene ? this.scene.start(menuItem.scene) : this.game.destroy(true);
        })
    }
}
