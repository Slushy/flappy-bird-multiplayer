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
  // Listen for Socket.IO Connections. Once connected, start the game logic.
  io.on('connection', function (socket) {
    //console.log('client connected');
    game.initGame(io, socket);
  });
}

async function setup({ io }) {
  setupSocket(io);

  return getAppRouter();
}

module.exports = setup;
