import BaseScene from './BaseScene';

const PIPES_TO_RENDER = 4;

class PlayScene extends BaseScene {
    constructor(config) {
        super('PlayScene', config);

        this.bird = null;
        this.pipes = null;
        this.isPaused = false;

        this.pipeHorizontalDistance = 0;
        this.pipeHorizontalDistanceRange = [500, 550];
        this.pipeVerticalDistanceRange = [150, 250];
        this.flapVelocity = 300;

        this.score = 0;
        this.scoreText = null;

        this.currentDifficulty = 'easy';
        this.difficulties = {
            easy: {
                pipeHorizontalDistanceRange: [500, 550],
                pipeVerticalDistanceRange: [150, 250],
            },
            normal: {
                pipeHorizontalDistanceRange: [350, 400],
                pipeVerticalDistanceRange: [140, 200],
            },
            hard: {
                pipeHorizontalDistanceRange: [280, 320],
                pipeVerticalDistanceRange: [120, 160],
            },
        };
    }

    create() {
        super.create();
        this.currentDifficulty = 'easy';
        this.createBird();
        this.createPipes();
        this.createColliders();
        this.createScore();
        this.createPause();
        this.handleInputs();
        this.listenToEvents();
    }

    update(time, delta) {
        this.checkGameStatus();
        this.recyclePipes();
    }

    createBird() {
        this.bird = this.physics.add
            .sprite(this.config.startPosition.x, this.config.startPosition.y, 'bird')
            .setFlipX(true)
            .setScale(3)
            .setOrigin(0);

        this.bird.setBodySize(this.bird.width, this.bird.height - 8)
        this.bird.body.gravity.y = 600;

        this.anims.create({
            key: 'fly',
            frames: this.anims.generateFrameNumbers('bird', {
                start: 8, end: 15,
            }),
            frameRate: 8,
            repeat: -1,
        });

        this.bird.play('fly');
        // this.bird.setCollideWorldBounds(true);
    }

    createPipes() {
        this.pipes = this.physics.add.group();
        for (let i = 0; i < PIPES_TO_RENDER; i++) {
            const upperPipe = this.pipes.create(0, 0, 'pipe').setImmovable(true).setOrigin(0, 1);
            const lowerPipe = this.pipes.create(0, 0, 'pipe').setImmovable(true).setOrigin(0, 0);

            this.placePipe(upperPipe, lowerPipe);
        }
        let velocity = -200;
        this.pipes.setVelocityX(velocity);
        // this.time.addEvent({
        //     delay: 1000,
        //     callback: () => {
        //         velocity -= 10;
        //         this.pipes.setVelocityX(velocity);
        //     },
        //     loop: true,
        // })
    }

    createColliders() {
        this.physics.add.collider(this.bird, this.pipes, this.gameOver.bind(this));
    }

    createScore() {
        this.score = 0;
        const bestScore = localStorage.getItem('bestScore') || 0;
        this.scoreText = this.add.text(16, 16, `Score: ${this.score}`, { fontSize: '32px', color: '#000' });
        this.add.text(16, 52, `Best Score: ${bestScore}`, { fontSize: '18px', color: '#000' });
    }

    createPause() {
        this.isPaused = false;
        const pauseButton = this.add
            .image(this.config.width - 10, this.config.height - 10, 'pause')
            .setScale(3)
            .setOrigin(1)
            .setInteractive();

        pauseButton.on('pointerdown', () => {
            this.isPaused = true;
            this.physics.pause();
            this.scene.pause();
            this.scene.launch('PauseScene');
        });
    }

    handleInputs() {
        this.input.on('pointerdown', this.flap.bind(this));
        this.input.keyboard.on('keydown-SPACE', this.flap.bind(this));
    }

    listenToEvents() {
        if (this.pauseEvent) { return }

        this.pauseEvent = this.events.on('resume', () => {
            this.initialTime = 3;
            this.countdownText = this.add
                .text(...this.screenCenter, `Fly in: ${this.initialTime}`, this.fontOptions)
                .setOrigin(0.5);

            this.timedEvent = this.time.addEvent({
                delay: 1000,
                callback: this.countdown.bind(this),
                loop: true,
            });
        });
    }

    countdown() {
        this.initialTime--;
        this.countdownText.setText(`Fly in: ${this.initialTime}`);
        if (this.initialTime <= 0) {
            this.isPaused = false;
            this.countdownText.destroy();
            this.countdownText = null;
            this.physics.resume();
            this.timedEvent.remove();
        }
    }

    placePipe(uPipe, lPipe) {
        const difficulty = this.difficulties[this.currentDifficulty];
        const rightMostX = this.getRightMostPipe();
        const pipeVerticalDistance = Phaser.Math.Between(...difficulty.pipeVerticalDistanceRange);
        const pipeVerticalPosition = Phaser.Math.Between(0 + 20, this.config.height - 20 - pipeVerticalDistance);
        const pipeHorizontalDistance = Phaser.Math.Between(...difficulty.pipeHorizontalDistanceRange);

        uPipe.x = rightMostX + pipeHorizontalDistance;
        uPipe.y = pipeVerticalPosition;

        lPipe.x = uPipe.x;
        lPipe.y = uPipe.y + pipeVerticalDistance;
    }

    checkGameStatus() {
        if (this.bird.y >= this.config.height || this.bird.y < -this.bird.body.height) {
            this.gameOver();
        }
    }

    recyclePipes() {
        const tempPipes = [];
        this.pipes.getChildren().forEach((pipe) => {
            if (pipe.getBounds().right <= 0) {
                tempPipes.push(pipe);
                if (tempPipes.length === 2) {
                    this.placePipe(...tempPipes);
                    this.increaseScore();
                    this.saveBestScore();
                    this.increaseDifficulty();
                }
            }
        });
    }

    increaseDifficulty() {
        if (this.score === 15) {
            this.currentDifficulty = 'normal';
        } else if (this.score === 30) {
            this.currentDifficulty = 'hard';
        }
    }

    getRightMostPipe() {
        let rightMostX = 0;
        this.pipes.getChildren().forEach((pipe) => {
            rightMostX = Math.max(pipe.x, rightMostX);
        });

        return rightMostX;
    }

    saveBestScore() {
        const bestScoreText = localStorage.getItem('bestScore');
        const bestScore = bestScoreText && parseInt(bestScoreText, 10);
        if (!bestScore || this.score > bestScore) {
            localStorage.setItem('bestScore', this.score);
        }
    }

    gameOver() {
        this.bird.stop();
        this.physics.pause();
        this.bird.setTint(0xee4824);

        this.saveBestScore();

        this.time.addEvent({
            delay: 1000,
            callback: () => {
                this.scene.restart();
            },
            loop: false,
        });
    }

    flap() {
        if (this.isPaused) return;

        this.bird.body.velocity.y = -this.flapVelocity;
    }

    increaseScore() {
        this.score++;
        this.scoreText.setText(`Score: ${this.score}`);
    }
}

export default PlayScene;
