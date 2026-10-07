# Node.js Fundamentals

## What is Node.js?

Node.js is a JavaScript runtime environment that uses the V8 engine to run JavaScript code outside of the browser.

## How does Node.js differ from running JavaScript in the browser?

Since Node.js runs JavaScript outside the browser, it doesn't have access to browser objects like the `window` and `document` global variables, DOM elements, browser storage, and cookies. Since it runs directly on your computer/server, it can do things like access the file system, process information, and use environment variables.

## What is the V8 engine, and how does Node use it?

The V8 engine is a program that parses and executes JavaScript. Node uses the V8 engine in order to run JavaScript code outside the browser.

## What are some key use cases for Node.js?

Some key use cases for Node.js are reading and writing files, starting web servers, automating tasks through the command-line interface, and bundling code.

## Explain the difference between CommonJS and ES Modules. Give a code example of each.

CommonJS and ES Modules are both ways to organize and share code between files. One major difference is in their syntax. With CommonJS, we use the `require()` function to load modules and `module.exports` to expose values and make them available to other files. With ES Modules, we load modules using `import` and expose values using `export`.

**CommonJS (default in Node.js):**

```js
// utils.js
function welcomeMsg(name) {
  return `Hello, ${name}`;
}

module.exports = { welcomeMsg }; // expose welcomeMsg()

// app.js
const welcomeMsg = require('./utils.js'); // load welcomMsg()
console.log(welcomeMsg('John Doe'));
```

**ES Modules (supported in modern Node.js):**

```js
// utils.js
function welcomeMsg(name) {
  return `Hello, ${name}`;
}

export welcomeMsg; // expose welcomeMsg()

// app.js
import { welcomeMsg } from './utils.js'; // load welcomeMsg()
console.log(welcomeMsg('John Doe'));
```
