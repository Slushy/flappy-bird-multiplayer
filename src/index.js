import Phaser from 'phaser';
import PreloadScene from './scenes/PreloadScene';
import MenuScene from './scenes/MenuScene';
import PlayScene from './scenes/PlayScene';
import ScoreScene from './scenes/ScoreScene';
import PauseScene from './scenes/PauseScene';
import MultiplayerPlayScene from './scenes/MultiplayerPlayScene';

const WIDTH = 400;
const HEIGHT = 600;
const BIRD_POSITION = { x: WIDTH * 0.1, y: HEIGHT / 2 };
const SHARED_CONFIG = {
    width: WIDTH,
    height: HEIGHT,
    startPosition: BIRD_POSITION,
};

const scenes = [PreloadScene, MenuScene, PlayScene, MultiplayerPlayScene, ScoreScene, PauseScene];
const createScene = Scene => new Scene(SHARED_CONFIG);
const initScenes = () => scenes.map(createScene);

const url = new URL(window.location.href);
const debug = url.searchParams.has('debug');

const config = {
    type: Phaser.AUTO,
    width: WIDTH,
    height: HEIGHT,
    pixelArt: true,
    physics: {
        default: 'arcade',
        arcade: {
            debug,
        },
    },

    scene: initScenes(),
};

new Phaser.Game(config);
