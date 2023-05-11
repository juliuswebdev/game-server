const express = require('express');
const app = express();
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

let allUsers = [];

io.on('connection', (socket) => {
  console.log(`User connected ${socket.id}`);

  // Write our socket event listeners in here...

  // join room
  socket.on('join_room', (data) => {
    const { username, room, role } = data;
    socket.join(room);

    // listener all users
    if(role === 'player'){
      allUsers.push(
        { 
          id: socket.id,
          username,
          room,
          distance: 0,
          obstacles: 0,
          time: 0,
          status: 'waiting'
        }
      );
    }
    socket.to(room).emit('room_users', allUsers);
    socket.emit('room_users', allUsers);
  });

  // game start
  socket.on('game_start', (data) => {
    const { room, track } = data;
    allUsers = allUsers.map(user => {
      user.distance = 0;
      user.obstacles = 0;
      user.time = 0;
      user.status = 'playing';
      return user;
    });
    socket.emit('room_users', allUsers); // emit to all including admin
    socket.to(room).emit('room_users', allUsers); // emit to players
    socket.to(room).emit('user_start', track);
  });

  // game over
  socket.on('game_over', (data) => {
    const { room, time } = data;
    const datas = [...allUsers];
    const item = datas.find(data => data.id == socket.id);
    const index = datas.indexOf(item);
    datas[index].status = 'gameover';
    datas[index].time = time;
    allUsers = datas;
    socket.emit('room_users', allUsers);
    socket.to(room).emit('room_users', allUsers);
  });

  // game over
  socket.on('finished', (data) => {
    const { room, time } = data;
    const datas = [...allUsers];
    const item = datas.find(data => data.id == socket.id);
    const index = datas.indexOf(item);
    datas[index].status = 'finished';
    datas[index].time = time;
    allUsers = datas;
    socket.emit('room_users', allUsers);
    socket.to(room).emit('room_users', allUsers);
  });

  // set player distance
  socket.on('set_player_distance', (data) => {
    const { room, distance, time } = data;
    const datas = [...allUsers];
    const item = datas.find(data => data.id == socket.id);
    const index = datas.indexOf(item);
    datas[index].distance = distance;
    datas[index].time = time;
    allUsers = datas;
    socket.emit('room_users', allUsers);
    socket.to(room).emit('room_users', allUsers);
  });

  // leave room
  socket.on('leave_room', (data) => {
    const { room } = data;
    socket.leave(room);
    allUsers = allUsers.filter((user) => user.id != socket.id);
    socket.to(room).emit('room_users', allUsers);
  });

  // disconnected
  socket.on('disconnect', () => {
    const user = allUsers.find((user) => user.id == socket.id);
    if (user?.username) {
      allUsers = allUsers.filter((user) => user.id != socket.id);
      socket.to(user.room).emit('room_users', allUsers);
    }
  });
});

server.listen(4000, () => 'Server is running on port 3000');