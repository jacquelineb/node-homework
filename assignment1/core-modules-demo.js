const os = require('os');
const path = require('path');
const fs = require('fs');

const sampleFilesDir = path.join(__dirname, 'sample-files');
if (!fs.existsSync(sampleFilesDir)) {
  fs.mkdirSync(sampleFilesDir, { recursive: true });
}

// OS module
console.log(`Platform: ${os.platform()}`);
console.log(`CPU: ${os.cpus()[0].model}`);
console.log(`Total Memory: ${os.totalmem()}`);

// Path module
console.log(`Joined path: ${path.join(__dirname, 'file.txt')}`);

// fs.promises API
async function runfsPromisesExample() {
  const demoFile = path.join(__dirname, 'sample-files', 'demo.txt');
  try {
    await fs.promises.writeFile(demoFile, 'Hello from fs.promises!');
    const data = await fs.promises.readFile(demoFile, { encoding: 'utf8' });
    console.log(`fs.promises read: ${data}`);
  } catch (error) {
    console.error(error);
  }
}
runfsPromisesExample();

// Streams for large files- log first 40 chars of each chunk
