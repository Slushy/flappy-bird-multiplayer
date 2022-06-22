const express = require('express');
const setup = require('./setup');

const app = express();

const server = require('http')
  .createServer(app)
  .listen(process.env.PORT || 8080, function () {
    console.log(`Server starting on port ${process.env.PORT || 8080}`);
  });

// Instantiate Socket.IO hand have it listen on the Express/HTTP server
const io = require('socket.io')(server, {
  cors: {
    origin: '*',
  },
});

setup(app, io);
