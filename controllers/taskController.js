const { taskSchema, patchTaskSchema } = require('../validation/taskSchema');

const taskCounter = (() => {
  let lastTaskNumber = 0;
  return () => {
    lastTaskNumber += 1;
    return lastTaskNumber;
  };
})();

async function create(req, res) {
  if (!req.body) {
    req.body = {};
  }

  const { error, value } = taskSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({ message: 'Unable to create task.' });
  }

  const newTask = {
    id: taskCounter(),
    userId: global.user_id.email,
    ...value,
  };
  global.tasks.push(newTask);
  const { userId, ...sanitizedTask } = newTask;
  return res.status(201).json(sanitizedTask); // Don't send back userId in response
}

function index(req, res) {
  // Return the tasks for the logged-in user.
  const userTasks = global.tasks.filter((task) => task.userId === global.user_id.email);
  if (!userTasks) {
    return res.status(404).json({ message: 'No tasks found.' });
  }

  // Leave the userId field out of the tasks to be sent in the response
  const sanitizedTasks = userTasks.map((task) => {
    const { userId, ...sanitizedTask } = task;
    return sanitizedTask;
  });
  return res.status(200).json({ tasks: sanitizedTasks });
}

function show(req, res) {
  const taskId = parseInt(req.params?.id);
  if (isNaN(taskId)) {
    return res.status(400).json({ message: 'Invalid task ID.' });
  }
  const task = global.tasks.find((t) => t.id === taskId && t.userId === global.user_id.email);
  if (!task) {
    return res.status(404).json({ message: 'No matching task found.' });
  }

  const { userId, ...sanitizedTask } = task;
  return res.status(200).json(sanitizedTask);
}

function update(req, res) {
  if (!req.body) {
    req.body = {};
  }
  const { error, value } = patchTaskSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({ message: error.details.message });
  }

  const taskId = parseInt(req.params?.int);
  const task = global.tasks.find((t) => t.id === taskId && t.userId === global.user_id.email);
  if (!task) {
    return res.status(404).json({ message: 'No matching task found.' });
  }
  Object.assign(task, value); // Merge the validated patch fields into the stored task
  const { userId, ...sanitizedTask } = task;
  return res.status(200).json(sanitizedTask);
}

function deleteTask(req, res) {
  const taskId = parseInt(req.params?.id);
  if (isNaN(taskId)) {
    return res.status(400).json({ message: 'Invalid task ID.' });
  }

  const indexOfTaskToDelete = global.tasks.findIndex(
    (t) => t.id === taskId && t.userId === global.user_id.email,
  );

  if (indexOfTaskToDelete === -1) {
    return res.status(404).json({ message: 'No matching task found.' });
  }

  global.tasks.splice(indexOfTaskToDelete, 1);
  const sanitizedTasks = global.tasks.map((task) => {
    const { userId, ...sanitizedTask } = task;
    return sanitizedTask;
  });
  return res.status(200).json({ tasks: sanitizedTasks });
}

module.exports = {
  create,
  index,
  show,
  update,
  deleteTask,
};
