const express = require('express');
const timeRouter = require('./routes/timeRoutes');
const userRouter = require('./routes/userRoutes');
const taskRouter = require('./routes/taskRoutes');
const authMiddleware = require('./middleware/auth');
const notFound = require('./middleware/not-found');
const errorHandler = require('./middleware/error-handler');

const app = express();

global.user_id = null;
global.users = [];
global.tasks = [];

app.use(express.json());
app.use('/api', timeRouter);
app.use('/api/users', userRouter);
app.use('/api/tasks', authMiddleware, taskRouter);

app.get('/', (req, res) => {
  res.send('Hello, World!');
});

app.post('/testpost', (req, res) => {
  res.status(200).json({
    message: 'POST route works',
  });
});

app.use(notFound);
app.use(errorHandler);

const port = process.env.PORT || 3000;

const server = app.listen(port, () => {
  console.log(`Server is listening on port ${port}...`);
});

module.exports = { app, server };
