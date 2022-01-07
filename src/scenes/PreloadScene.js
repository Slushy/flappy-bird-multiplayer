import Phaser from 'phaser';
import io from 'socket.io-client';

export default class PreloadScene extends Phaser.Scene {
    constructor() {
        super('PreloadScene');
    }

    preload() {
        this.load.image('sky', 'assets/sky.png');
        this.load.spritesheet('bird', 'assets/birdSprite.png', {
            frameWidth: 16,
            frameHeight: 16,
        });
        this.load.image('pipe', 'assets/pipe.png');
        this.load.image('pause', 'assets/pause.png');
        this.load.image('back', 'assets/back.png');
    }

    create() {
        const socket = io('//flapp-bird.herokuapp.com');
        socket.on('connect', () => {
            console.log('Connected!');
            this.scene.start('MenuScene', { socket });
        });
    }
}
