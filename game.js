require('@geckos.io/phaser-on-nodejs')
const Phaser = require('phaser');
const { SnapshotInterpolation } = require('@geckos.io/snapshot-interpolation');
const SI = new SnapshotInterpolation();

let games = new Map();
let players = new Map();
const WIDTH = 400;
const HEIGHT = 600;

/**
 *
 * @param {import("socket.io").Server} io
 * @param {import("socket.io").Socket} socket
 */
function leaveGame(io, socket) {
    const player = players.get(socket.id);
    if (!player) return;

    players.delete(player.id);
    console.log(`user ${player.name} is leaving game`);

    const gameId = player.gameId;
    const game = gameId && games.get(gameId);
    if (game) {
        game.playerIds = game.playerIds.filter((id) => id !== player.id);

        if (socket.connected) {
            socket.leave(gameId);
        }

        if (game.playerIds.length === 0) {
            games.delete(gameId);
        } else {
            if (player.id === game.hostId) {
                game.hostId = game.playerIds[0];
            }

            io.in(gameId).emit('playerLeft', { playerId: player.id, hostId: game.hostId });
            io.in(gameId).emit('gameStatus', { status: game.status, statusData: game.statusData });
        }
    }
}

/**
 *
 * @param {import("socket.io").Server} io
 * @param {import("socket.io").Socket} socket
 */
exports.initGame = (io, socket) => {
    socket.on('joinGame', ({ gameId, name }) => {
        console.log(`user ${socket.id} joining game ${gameId} with name ${name}`);

        // create new player
        const player = {
            id: socket.id,
            score: 0,
            gameId: gameId,
            name: name,
            x: 30,
            y: 200,
            status: 'dead',
            color: getRandomColor(),
        };
        players.set(player.id, player);

        // create or join room
        if (!games.has(gameId)) {
            games.set(gameId, new Game(io, gameId, player.id));
        }

        const game = games.get(gameId);
        game.playerIds.push(player.id);

        socket.join(gameId);
        socket.emit('gameJoined', {
            status: game.status,
            statusData: game.statusData,
            players: game.playerIds.map((id) => players.get(id)),
            isHost: game.hostId === player.id,
        });
        socket.broadcast.to(gameId).emit('playerJoined', player);
    });

    socket.on('startGame', () => {
        console.log('startGame called');
        const player = players.get(socket.id);
        if (!player || !player.gameId) return;

        const game = games.get(player.gameId);
        if (!game || game.hostId !== player.id) return;

        game.startGame();
    });

    socket.on('playerMovement', ({ x, y, scored }) => {
        const player = players.get(socket.id);
        if (!player || !player.gameId) return;

        if (player.status === 'dead') return;

        player.x = x;
        player.y = y;
        if (scored) {
            player.score++;
        }
        
        if (player.y >= HEIGHT || player.y < -16) {
            player.status = 'dead';
            player.x = 30;
            player.y = 200;
        }
    });

    socket.on('playerDead', () => {
        const player = players.get(socket.id);
        if (!player || !player.gameId) return;

        player.status = 'dead';
        player.x = 30;
        player.y = 200;
    })

    socket.on('leaveGame', () => {
        leaveGame(io, socket);
    });

    socket.on('disconnect', () => {
        leaveGame(io, socket);
    });
};

function getRandomColor() {
    return '0x' + Math.floor(Math.random() * 16777215).toString(16);
}

class Game {
    /**
     *
     * @param {import("socket.io").Server} io
     * @param {string} gameId
     * @param {string} hostId
     */
    constructor(io, gameId, hostId) {
        this.io = io;
        this.id = gameId;
        this.status = 'waiting';
        this.statusData = '';
        this.playerIds = [];
        this.hostId = hostId;
        this.playingTimer = null;
        this.pipeTimeout = null;
        this.pipes = [];

        this.currentDifficulty = 'hard';
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
                pipeHorizontalDistanceRange: [300, 350],
                pipeVerticalDistanceRange: [130, 180],
            },
        };
    }

    startGame() {
        console.log('starting game');
        this.pipes = [];

        for (let i = 0; i < 4; i++) {
            const upperPipe = { x: 0, y: 0 };
            const lowerPipe = { x: 0, y: 0 };

            this.placePipe(upperPipe, lowerPipe);
        }

        let timeRemaining = 3;
        this.updateStatus('loading', { timeRemaining, pipes: [...this.pipes] });
        for (let playerId of this.playerIds) {
            players.get(playerId).status = 'playing';
            // players.get(playerId).score = 0;
        }

        const interval = setInterval(() => {
            if (--timeRemaining === 0) {
                this.updateStatus('playing');
                clearInterval(interval);
                this.playingTimer = setInterval(() => {
                    this.update();
                }, 1000 / 30);

                this.pipeTimeout = setInterval(() => {
                    console.log('adding')
                    const uPipe = this.pipes.shift();
                    const lPipe = this.pipes.shift();
                    this.placePipe(uPipe, lPipe, false);
                    this.io.in(this.id).emit('addPipe', { uPipe, lPipe });
                }, 1000);
            } else {
                this.updateStatus('loading', { timeRemaining });
            }
        }, 1000);
    }

    updateStatus(status, statusData) {
        if (status !== 'playing') {
            clearInterval(this.playingTimer);
            clearInterval(this.pipeTimeout);
            this.pipeTimeout = null;
            this.playingTimer = null;
        }

        this.status = status;
        this.statusData = statusData;
        console.log(`emitting gameStatus ${status} to ${this.id}`);
        this.io.in(this.id).emit('gameStatus', { status, statusData });
    }

    placePipe(uPipe, lPipe, getRiteMost = true) {
        const difficulty = this.difficulties[this.currentDifficulty];
        const rightMostX = this.getRightMostPipe();
        const pipeVerticalDistance = Phaser.Math.Between(...difficulty.pipeVerticalDistanceRange);
        const pipeVerticalPosition = Phaser.Math.Between(0 + 20, HEIGHT - 20 - pipeVerticalDistance);
        const pipeHorizontalDistance = Phaser.Math.Between(...difficulty.pipeHorizontalDistanceRange);
        let rm = getRiteMost ? rightMostX : 0
        uPipe.x = rm + pipeHorizontalDistance;
        uPipe.y = pipeVerticalPosition;

        lPipe.x = uPipe.x;
        lPipe.y = uPipe.y + pipeVerticalDistance;
        this.pipes.push(uPipe, lPipe);
    }

    getRightMostPipe() {
        let rightMostX = 0;
        this.pipes.forEach((pipe) => {
            rightMostX = Math.max(pipe.x, rightMostX);
        });
        return rightMostX;
    }

    update() {
        if (this.status !== 'playing') return;

        let stillAlive = false;
        const playerArr = this.playerIds.map((id) => {
            const player = players.get(id);
            if (player.status !== 'dead') {
                stillAlive = true;
            }

            return player;
        });

        const snapshot = SI.snapshot.create(playerArr);
        this.io.in(this.id).emit('gameSnapshot', snapshot);

        if (!stillAlive) {
            clearInterval(this.playingTimer);
            setTimeout(() => {
                this.updateStatus('waiting');
            }, 100);
        }
    }
}
