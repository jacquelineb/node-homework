const { taskSchema, patchTaskSchema } = require('../validation/taskSchema');
const prisma = require('../db/prisma');

async function create(req, res, next) {
  if (!req.body) {
    req.body = {};
  }

  const { error, value } = taskSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({ message: 'Unable to create task.' });
  }

  const { title, isCompleted } = value;
  let newTask = null;
  try {
    newTask = await prisma.task.create({
      data: { title, isCompleted, userId: global.user_id },
      select: { title: true, isCompleted: true, id: true },
    });
  } catch (err) {
    return next(err);
  }

  return res.status(201).json(newTask);
}

async function index(req, res) {
  // Return the tasks for the logged-in user.
  const tasks = await prisma.task.findMany({
    where: {
      userId: global.user_id,
    },
    select: { title: true, isCompleted: true, id: true },
  });

  if (tasks.length === 0) {
    return res.status(404).json({ message: 'No tasks found.' });
  }

  return res.status(200).json(tasks);
}

async function show(req, res, next) {
  const taskId = parseInt(req.params?.id);
  if (isNaN(taskId)) {
    return res.status(400).json({ message: 'Invalid task ID.' });
  }

  let task = null;
  try {
    task = await prisma.task.findUnique({
      where: { id: taskId, userId: global.user_id },
      select: { id: true, title: true, isCompleted: true },
    });
  } catch (err) {
    return next(err); // pass other errors to the global error handler
  }

  if (task === null) {
    return res.status(404).json({ message: 'The task was not found.' });
  }

  return res.status(200).json(task);
}

async function update(req, res, next) {
  if (!req.body) {
    req.body = {};
  }
  const { error, value } = patchTaskSchema.validate(req.body, { abortEarly: false });
  const taskId = parseInt(req.params?.id);
  if (error || isNaN(taskId)) {
    return res.status(400).json({ message: 'Unable to update task with the provided data.' });
  }

  let task = null;
  try {
    task = await prisma.task.update({
      data: value,
      where: {
        id: taskId,
        userId: global.user_id,
      },
      select: { title: true, isCompleted: true, id: true },
    });
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ message: 'The task was not found.' });
    } else {
      return next(err); // pass other errors to the global error handler
    }
  }
  return res.status(200).json(task);
}

async function deleteTask(req, res, next) {
  const taskId = parseInt(req.params?.id);
  if (isNaN(taskId)) {
    return res.status(400).json({ message: 'Invalid task ID.' });
  }

  let deletedTask = null;
  try {
    deletedTask = await prisma.task.delete({
      where: { id: taskId, userId: global.user_id },
      select: { id: true, title: true, isCompleted: true },
    });
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ message: 'The task was not found.' });
    } else {
      return next(err); // pass other errors to the global error handler
    }
  }

  return res.status(200).json(deletedTask);
}

module.exports = {
  create,
  index,
  show,
  update,
  deleteTask,
};
