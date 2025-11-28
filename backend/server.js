const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Homepage route
app.get('/', (req, res) => {
  res.send('Daily Planner Backend is running!');
});

// Database connection configuration
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'dailyplanner_db',
  port: 3306
};

// Create a connection pool
const pool = mysql.createPool(dbConfig);

// Test database connection
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('Database connected successfully!');
    connection.release();
  } catch (error) {
    console.error('Error connecting to the database:', error);
  }
}

// Initialize database
async function initializeDatabase() {
  try {
    const connection = await pool.getConnection();
    await connection.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        completed BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Database initialized successfully');
    connection.release();
  } catch (error) {
    console.error('Error initializing database:', error);
  }
}

// API Endpoints

// Add a new task
app.post('/add-task', async (req, res) => {
  try {
    const { title, description } = req.body;
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const [result] = await pool.query(
      'INSERT INTO tasks (title, description) VALUES (?, ?)',
      [title, description || '']
    );

    res.status(201).json({
      message: 'Task added successfully!',
      taskId: result.insertId
    });
  } catch (error) {
    console.error('Error adding task:', error);
    res.status(500).json({ error: 'Failed to add task' });
  }
});

// Get all tasks
app.get('/tasks', async (req, res) => {
  try {
    const [tasks] = await pool.query('SELECT * FROM tasks ORDER BY created_at DESC');
    res.json(tasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// Update a task
app.put('/tasks/:id', async (req, res) => {
  try {
    const taskId = req.params.id;
    const { title, description } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const [result] = await pool.query(
      'UPDATE tasks SET title = ?, description = ? WHERE id = ?',
      [title, description || '', taskId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json({ message: 'Task updated successfully' });
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// Delete a task
app.delete('/tasks/:id', async (req, res) => {
  try {
    const taskId = req.params.id;
    const [result] = await pool.query('DELETE FROM tasks WHERE id = ?', [taskId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

// Toggle task completion status
app.patch('/tasks/:id/toggle', async (req, res) => {
  try {
    const taskId = req.params.id;
    const [result] = await pool.query(
      'UPDATE tasks SET completed = NOT completed WHERE id = ?',
      [taskId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json({ message: 'Task status updated successfully' });
  } catch (error) {
    console.error('Error toggling task status:', error);
    res.status(500).json({ error: 'Failed to update task status' });
  }
});

// Start the server
async function startServer() {
  try {
    await testConnection();
    await initializeDatabase();
    
    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
      console.log('Server is starting...');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  // Exit process
  process.exit(1);
});
