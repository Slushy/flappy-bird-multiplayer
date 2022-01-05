const path = require('path');
const express = require('express');
const game = require('./game');

const app = express();
app.use('/', express.static(__dirname + '/build'));

app.get('/', function (request, response) {
    response.sendFile(path.join(__dirname, 'build', 'index.html'));
});

const server = require('http')
    .createServer(app)
    .listen(process.env.PORT || 8080, function() {
        console.log(`Server starting on port ${process.env.PORT || 8080}`)
    });

// Instantiate Socket.IO hand have it listen on the Express/HTTP server
const io = require('socket.io')(server, {
    logLevel: 1,
});

// io.set('log level', 1);

// Listen for Socket.IO Connections. Once connected, start the game logic.
io.on('connection', function (socket) {
    //console.log('client connected');
    game.initGame(io, socket);
});
