const express = require('express');
const http = require('http'); 
const { Server } = require('socket.io'); 
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const mongoose = require('mongoose');
const corsOrigin = ["https://coding-online-application.onrender.com", process.env.REACT_APP_API_URL, 'http://localhost:3001'];
const CodeBlock = require('./model/CodeBlocks');

dotenv.config();

const app = express();
const server = http.createServer(app); 
const connectDB = async () => {
    try{
      console.log("Mongo: ", process.env.MONGODB_URI)
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("DB Connected");

    } catch (err) {
        console.error("Connection Failed", err.message);
        process.exit(1);
    }
};

connectDB();


const io = new Server(server, {
  cors: {
    origin: "*",  
    methods: ["GET", "POST"],
    allowedHeaders: ["*"],
    credentials: true
  },
  path: '/socket.io/',  
  transports: ['websocket', 'polling'],  
  allowEIO3: true 
});


// Enable CORS for requests coming from the frontend
app.use(cors({
  origin: corsOrigin, 
  methods: ['GET', 'POST', 'PUT', 'DELETE'], 
  credentials: true, 
}));

app.use(express.static(path.join(__dirname, '../Frontend/block_party/build')));



app.use(express.json());

// Endpoint to fetch all code blocks
app.get('/api/code-blocks', async (req, res) => {
  try {
    console.log("GOT REQ")
    const codeBlocks = await CodeBlock.find().sort({ _id: 1 });
    res.json(codeBlocks); 
  } catch (error) {
    console.error('Error fetching code blocks:', error.message);
    res.status(500).send('Server error');
  }
});



// Endpoint to fetch a single code block by ID
app.get('/api/code-blocks/:id', async (req, res) => {
  try {
    const { id } = req.params; 
    console.log("Got request, room id: ", id)
    const codeBlock  = await CodeBlock.findById(id);
    res.json(codeBlock); 
  } catch (error) {
    console.error('Error fetching code block:', error.message);
    res.status(500).send('Server error');
  }
});
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../Frontend/block_party/build/index.html'));
});


// Endpoint to update a code block
app.put('/api/code-blocks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { template } = req.body;

    const updatedCodeBlock = await CodeBlock.findByIdAndUpdate(id, { template }, { new: true });
    if (!updatedCodeBlock) {
      return res.status(404).send('Code Block not found');
    }
    res.json(updatedCodeBlock);
  } catch (error) {
    console.error('Error updating code block:', error.message);
    res.status(500).send('Server error');
  }

});

// Object to store room data
let rooms = {};

io.on('connection', (socket) => {
  const  blockId  = socket.handshake.query.blockId;

  if (!blockId) {
    console.log("Error: blockId not provided.");
    return;
  }

  socket.join(blockId);

  // Initialize room data if it doesn't exist
  if (!rooms[blockId]) {
    rooms[blockId] = { studentCount: 0, mentor: null };
  }
 
   // Determine the role of the user 
  const role = rooms[blockId]?.mentor ? 'student' : 'mentor';  
  console.log(`Assigning role: ${role} to socket: ${socket.id} in room: ${blockId}`);

  // Assign roles and update room data
  if (role === 'mentor' && !rooms[blockId].mentor) {
    rooms[blockId].mentor = socket.id;
    io.to(blockId).emit('userCount', rooms[blockId].studentCount);
  } else if (role === 'student') {
  rooms[blockId].studentCount++; 
  io.to(blockId).emit('userCount', rooms[blockId].studentCount); // הוספת תלמיד
}
 
  console.log(`Room ${blockId} - Total users: ${rooms[blockId].studentCount}`);

  // Send initial role and user count to the connected client
  socket.emit('initialRoleAndCount', { role, userCount: rooms[blockId].studentCount });

  socket.on('requestInitialData', () => {
    console.log(`Sending initial data to socket: ${socket.id}`);
    socket.emit('initialData', { role, userCount: rooms[blockId].studentCount });
  });

  socket.on('updateCode', (updatedCode) => {
    console.log(`Code updated by ${socket.id}:`, updatedCode);
    io.to(blockId).emit('codeUpdated', updatedCode); 
  });

  socket.on('disconnect', () => {
    if (role === 'student') {
      rooms[blockId].studentCount--; 
      io.to(blockId).emit('userCount', rooms[blockId].studentCount);
    }

    if (role === 'mentor') {
      rooms[blockId].mentor = null;
      io.to(blockId).emit('mentorLeft'); 
    }
    io.to(blockId).emit('userCount', rooms[blockId].studentCount);  });
});

const PORT = process.env.PORT || 5000;
app.set('port', PORT); 

server.listen(5000, process.env.IP, () => {
  console.log(`Server is running on http://${PORT}`);
});