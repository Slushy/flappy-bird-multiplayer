const path = require('path');
const express = require('express');
const game = require('./game');

function getAppRouter() {
  const router = express.Router();
  router.use('/', express.static(__dirname + '/build'));

  router.get('/', function (request, response) {
    response.sendFile(path.join(__dirname, 'build', 'index.html'));
  });

  return router;
}

function setupSocket(io) {
  const server = io.of('/flappy-bird');

  // Listen for Socket.IO Connections. Once connected, start the game logic.
  server.on('connection', function (socket) {
    //console.log('client connected');
    game.initGame(server, socket);
  });
}

async function setup({ io }) {
  setupSocket(io);

  return getAppRouter();
}

module.exports = setup;
