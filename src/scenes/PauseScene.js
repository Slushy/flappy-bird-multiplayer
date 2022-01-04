import BaseScene from './BaseScene';

export default class PauseScene extends BaseScene {
    constructor(config) {
        super('PauseScene', config);
        
        this.menu = [
            { scene: 'PlayScene', text: 'Continue' },
            { scene: 'MenuScene', text: 'Exit' },
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
            if (menuItem.text === 'Continue') {
                this.scene.stop();
                this.scene.resume(menuItem.scene);
            } else {
                this.scene.stop('PlayScene');
                this.scene.start(menuItem.scene);
            }
        })
    }
}
