const fs = require('fs');
const path = require('path');

const sampleTxt = path.join(__dirname, 'sample-files', 'sample.txt');
// Write a sample file for demonstration
fs.writeFile(sampleTxt, 'Hello, async world!', (err) => {
  if (err) {
    console.error(err);
  }
});

// 1. Callback style
fs.readFile(sampleTxt, 'utf8', (err, data) => {
  if (err) {
    console.error(err);
    return;
  }
  console.log('/callback', data);
});

// Callback hell example (test and leave it in comments):
// Callback hell occurs when asynchronous operations depend on one another and therefore callback functions become deeply nested
// This ends up making the code hard to read, test, and debug.
// Example:
/*
fs.writeFile(sampleTxt, 'Original Text', (err) => {
  if (err) {
    console.error(err);
    return;
  }
  fs.readFile(sampleTxt, 'utf8', (err, data) => {
    if (err) {
      console.error(err);
      return;
    }
    console.log(data);
    fs.writeFile(sampleTxt, 'Updated Text', (err) => {
      if (err) {
        console.error(err);
        return;
      }
      fs.readFile(sampleTxt, 'utf8', (err, data) => {
        if (err) {
          console.error(err);
          return;
        }
        console.log(data);
      });
    });
  });
});
*/

// 2. Promise style
function readTextFile(path) {
  return new Promise((resolve, reject) => {
    fs.readFile(path, 'utf8', (err, data) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(data);
    });
  });
}

const samplePromise = readTextFile(sampleTxt);
samplePromise
  .then((result) => {
    console.log('/promise', result);
  })
  .catch((err) => {
    console.error(err);
  });

// 3. Async/Await style
async function run() {
  try {
    const data = await readTextFile(sampleTxt);
    console.log('/async/await', data);
  } catch (error) {
    console.error(error);
  }
}
run();
