const path = require('path');
const express = require('express');
const game = require('./game');

function setupApp(app) {
  app.use('/', express.static(__dirname + '/build'));

  app.get('/', function (request, response) {
    response.sendFile(path.join(__dirname, 'build', 'index.html'));
  });
}

function setupSocket(io) {
  // Listen for Socket.IO Connections. Once connected, start the game logic.
  io.on('connection', function (socket) {
    //console.log('client connected');
    game.initGame(io, socket);
  });
}

function setup(app, io) {
  setupApp(app);
  setupSocket(io);
}

module.exports = setup;
