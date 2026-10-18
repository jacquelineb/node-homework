const express = require('express');
const dogsRouter = require('./routes/dogs');
const { randomUUID } = require('crypto');

const app = express();

app.use(express.json());
app.use(express.static('public/images'));

// Assignment 3b and 3c ask you to add middleware in this file.
app.use((req, res, next) => {
  req.requestId = randomUUID();
  res.setHeader('X-Request-Id', req.requestId);
  next();
});

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}]: ${req.method} ${req.path} ${req.requestId}`);
  next();
});

app.use('/', dogsRouter); // Do not remove this line

if (require.main === module) {
  app.listen(3000, () => {
    console.log('Dog rescue app is listening on port 3000...');
  });
}

module.exports = app;
