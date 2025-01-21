const express = require('express');
const http = require('http'); 
const { Server } = require('socket.io'); 
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const server = http.createServer(app); 
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3001',
    methods: ['GET', 'POST'],
  },
  transports: ['websocket'], // Use WebSocket for real-time communication
});

const PORT = process.env.PORT || 5000;

// Enable CORS for requests coming from the frontend
app.use(cors({
  origin: 'http://localhost:3001', 
  methods: ['GET', 'POST', 'PUT', 'DELETE'], 
  credentials: true, 
}));

// Configure PostgreSQL connection
const pool = new Pool({
  user: 'postgres',        
  host: 'localhost',      
  database: 'code_blocks', 
  password: '1111',
  port: 5432,            
});

app.use(express.json());

// Endpoint to fetch all code blocks
app.get('/api/code-blocks', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM code_blocks ORDER BY id ASC');
    res.json(result.rows); // שולח את הנתונים ל-Frontend
  } catch (error) {
    console.error('Error fetching code blocks:', error.message);
    res.status(500).send('Server error');
  }
});

// Endpoint to fetch a single code block by ID
app.get('/api/code-blocks/:id', async (req, res) => {
  try {
    const { id } = req.params; 
    const result = await pool.query('SELECT * FROM code_blocks WHERE id = $1', [id]); 
    if (result.rows.length === 0) {
      return res.status(404).send('Code Block not found'); 
    }
    res.json(result.rows[0]); 
  } catch (error) {
    console.error('Error fetching code block:', error.message);
    res.status(500).send('Server error');
  }
});

// Endpoint to update a code block
app.put('/api/code-blocks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { template } = req.body;

    const result = await pool.query(
      'UPDATE code_blocks SET template = $1 WHERE id = $2 RETURNING *',
      [template, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).send('Code Block not found');
    }

    res.json(result.rows[0]);
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
      rooms[blockId].studentCount--; // מעדכנים את מספר הסטודנטים
      io.to(blockId).emit('userCount', rooms[blockId].studentCount);
    }

    if (role === 'mentor') {
      rooms[blockId].mentor = null;
      io.to(blockId).emit('mentorLeft'); 
    }
    io.to(blockId).emit('userCount', rooms[blockId].studentCount);  });
});


server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});