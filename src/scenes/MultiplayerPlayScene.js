import { SnapshotInterpolation } from '@geckos.io/snapshot-interpolation';
import BaseScene from './BaseScene';

const SI = new SnapshotInterpolation(30);

const FLAP_VELOCITY = 300;

class MultiplayerPlayScene extends BaseScene {
    /**
     * @param {any} config
     * @param {import('socket.io-client').Socket} socket
     */
    constructor(config, socket) {
        super('MultiplayerPlayScene', config);

        this.socket = socket;
        this.playerId = null;

        this.bird = null;
        this.scoreText = null;
        this.playerStatus = false;
        this.pipes = null;

        this.otherPlayers = new Map();
        this.gameStatus = null;
        this.isHost = false;
        this.prevX = -1;
        this.prevY = -1;
        this.canPlay = false;
    }

    /**
     * @param {{ socket: import('socket.io-client').Socket}} args
     */
    init({ socket }) {
        this.socket = socket;
        this.playerId = socket.id;
    }

    create() {
        super.create();
        this.pipes = this.physics.add.group();

        this.anims.create({
            key: 'fly',
            frames: this.anims.generateFrameNumbers('bird', {
                start: 8,
                end: 15,
            }),
            frameRate: 8,
            repeat: -1,
        });

        this.socket.on('gameJoined', ({ isHost, status, statusData, players }) => {
            this.isHost = isHost;
            this.gameStatus = status;
            this.physics.pause();

            players.forEach((player) => {
                this.createPlayer(player);
            });

            this.updateScorePositions();

            this.input.on('pointerdown', this.onClick.bind(this));
            this.handleGameStatusChange(statusData);

            this.physics.add.collider(this.bird, this.pipes, () => {
                this.socket.emit('playerDead');
                this.bird.body.gravity.y = 0;
                this.bird.setAlpha(0);
                this.bird.body.setVelocityY(0);
            });
        });

        this.socket.on('playerJoined', (player) => {
            this.createPlayer(player);
            this.updateScorePositions();
        });

        this.socket.on('playerLeft', ({ playerId, hostId }) => {
            console.log(`Player ${playerId} left!`);
            this.isHost = hostId === this.playerId;

            let player = this.otherPlayers.get(playerId);
            if (player) {
                player.bird.destroy();
                player.scoreText.destroy();
                this.otherPlayers.delete(playerId);
            }

            this.updateScorePositions();
        });

        this.socket.on('gameStatus', ({ status, statusData }) => {
            this.gameStatus = status;
            this.handleGameStatusChange(statusData);
        });

        this.socket.on('gameSnapshot', (snapshot) => {
            SI.snapshot.add(snapshot);
        });

        this.socket.on('addPipe', ({ uPipe, lPipe }) => {
            console.log(uPipe);
            console.log(lPipe);
            const rightX = this.getRightMostPipe();

            this.pipes
                .create(rightX + uPipe.x, uPipe.y, 'pipe')
                .setImmovable(true)
                .setOrigin(0, 1);
            this.pipes
                .create(rightX + lPipe.x, lPipe.y, 'pipe')
                .setImmovable(true)
                .setOrigin(0, 0);
            let velocity = -200;
            this.pipes.setVelocityX(velocity);
        });

        let name = prompt('Enter your name', '') || Math.floor(Math.random() * 16777215).toString(16);
        
        this.socket.emit('joinGame', { gameId: 'apples', name: name });
    }

    createPlayer(player) {
        const bird = this.createBird(player);
        const scoreText = this.createScore(player);

        if (player.id === this.playerId) {
            this.playerStatus = player.status;
            this.bird = bird;
            this.scoreText = scoreText;
        } else {
            this.otherPlayers.set(player.id, {
                bird,
                scoreText,
            });
        }
    }

    createBird(player) {
        let bird;

        if (player.id === this.playerId) {
            bird = this.physics.add.sprite(player.x, player.y, 'bird').setFlipX(true).setScale(3).setOrigin(0);
            // .setTint(player.color);
            bird.setBodySize(bird.width, bird.height - 8);
            bird.body.gravity.y = 600;
        } else {
            bird = this.add
                .sprite(player.x, player.y, 'bird')
                .setFlipX(true)
                .setScale(3)
                .setOrigin(0)
                // .setTint(player.color)
                .setAlpha(0);
        }

        return bird;
    }

    createScore(player) {
        let scoreText = null;

        if (player.id === this.playerId) {
            scoreText = this.add.text(16, 16, `${player.name}: ${player.score}`, { fontSize: '26px', color: '#000' });
        } else {
            scoreText = this.add.text(16, 48, `${player.name}: ${player.score}`, {
                fontSize: '18px',
                color: '#000',
            });
        }

        return scoreText;
    }

    getRightMostPipe() {
        let rightMostX = 0;
        this.pipes.getChildren().forEach((pipe) => {
            rightMostX = Math.max(pipe.x, rightMostX);
        });

        return rightMostX;
    }

    update(time, delta) {
        if (this.gameStatus !== 'playing') return;

        let scored = false;
        let tempPipes = [];
        this.pipes.getChildren().forEach((pipe) => {
            if (pipe.getBounds().right <= 0) {
                tempPipes.push(pipe);
                if (tempPipes.length === 2) {
                    tempPipes.forEach(p => p.destroy());
                    scored = true;
                }
            }
        });

        if (this.bird.x !== this.prevX || this.bird.y !== this.prevY || scored) {
            this.prevX = this.bird.x;
            this.prevY = this.bird.y;
            this.socket.emit('playerMovement', { x: this.bird.x, y: this.bird.y, scored });
        }

        const snap = SI.calcInterpolation('x y');
        if (!snap) return;

        const { state } = snap;
        if (!state) return;

        state.forEach((player) => {
            const playerData = this.otherPlayers.get(player.id);
            if (playerData) {
                const { bird, scoreText } = playerData;
                scoreText.setText(`${player.name}: ${player.score}`);
                bird.setPosition(player.x, player.y);

                if (player.status === 'dead') {
                    bird.setAlpha(0);
                }
            }

            if (player.id === this.playerId) {
                this.playerStatus = player.status;
                this.scoreText.setText(`${player.name}: ${player.score}`);
                if (this.playerStatus === 'dead') {
                    this.bird.body.gravity.y = 0;
                    this.bird.setAlpha(0);
                    this.bird.setPosition(player.x, player.y);
                    this.bird.body.setVelocityY(0);
                }
            }
        });
    }

    updateScorePositions() {
        let i = 0;
        for (let [id, { scoreText }] of this.otherPlayers) {
            scoreText.setY(48 + i * 20);
            i++;
        }
    }

    onClick() {
        console.log('click', this.gameStatus);
        if (this.canPlay === false) return;

        switch (this.gameStatus) {
            case 'waiting':
                if (this.isHost) {
                    this.gameStatus = 'loading';
                    console.log('emitting start game');
                    this.socket.emit('startGame');
                }
                break;
            case 'loading':
                break;
            case 'playing':
                if (this.playerStatus !== 'dead') this.bird.body.velocity.y = -FLAP_VELOCITY;
                break;
        }
    }

    handleGameStatusChange(statusData) {
        if (!this.centerText) {
            this.centerText = this.add.text(...this.screenCenter, '', this.fontOptions).setOrigin(0.5);
        }

        switch (this.gameStatus) {
            case 'waiting':
                this.canPlay = true;
                this.bird.setAlpha(1);
                this.bird.play('fly');

                for (let [id, { bird }] of this.otherPlayers) {
                    bird.setAlpha(0);
                    console.log(`setting bird ${id} to inactive`);
                }

                this.physics.pause();
                this.centerText.setText(this.isHost ? `Click to start...` : `Waiting to start...`);
                this.pipes.clear(true, true);
                break;
            case 'loading':
                if (this.canPlay) {
                    // this.bird.setActive(true);
                    this.centerText.setText(`Flying in: ${statusData.timeRemaining}`);
                }
                if (statusData.pipes) {
                    for (let i = 0; i < statusData.pipes.length; i += 2) {
                        const uPipe = statusData.pipes[i];
                        const lPipe = statusData.pipes[i + 1];

                        this.pipes.create(uPipe.x, uPipe.y, 'pipe').setImmovable(true).setOrigin(0, 1);
                        this.pipes.create(lPipe.x, lPipe.y, 'pipe').setImmovable(true).setOrigin(0, 0);
                    }
                    let velocity = -200;
                    this.pipes.setVelocityX(velocity);
                }
                break;
            case 'playing':
                console.log('updating active');
                for (let [id, { bird }] of this.otherPlayers) {
                    // bird.setActive(true);
                    bird.play('fly');
                    bird.setAlpha(0.4);
                }

                if (this.canPlay) {
                    this.playerStatus = 'playing';
                    this.bird.play('fly');
                    this.bird.body.setVelocityY(0);
                    this.bird.body.setVelocityX(0);
                    this.bird.body.gravity.y = 600;
                } else {
                    this.bird.body.gravity.y = 0;
                }
                this.physics.resume();
                this.centerText.setText('');
                break;
        }
    }
}

export default MultiplayerPlayScene;
