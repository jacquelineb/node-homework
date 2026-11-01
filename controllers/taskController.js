const { taskSchema, patchTaskSchema } = require('../validation/taskSchema');
const pool = require('../db/pg-pool');

async function create(req, res) {
  if (!req.body) {
    req.body = {};
  }

  const { error, value } = taskSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({ message: 'Unable to create task.' });
  }

  const result = await pool.query(
    `INSERT INTO tasks (title, is_completed, user_id)
    VALUES ( $1, $2, $3 ) RETURNING id, title, is_completed`,
    [value.title, value.isCompleted, global.user_id],
  );

  const task = result.rows[0];
  return res
    .status(201)
    .json({ id: task.id, title: task.title, isCompleted: task.is_completed });
}

async function index(req, res) {
  // Return the tasks for the logged-in user.
  const result = await pool.query(
    'SELECT id, title, is_completed FROM tasks WHERE user_id = $1',
    [global.user_id],
  );

  const tasks = result.rows;
  if (tasks.length === 0) {
    return res.status(404).json({ message: 'No tasks found.' });
  }

  return res.status(200).json(tasks);
}

async function show(req, res) {
  const taskId = parseInt(req.params?.id);
  if (isNaN(taskId)) {
    return res.status(400).json({ message: 'Invalid task ID.' });
  }

  const result = await pool.query(
    `SELECT id, title, is_completed FROM tasks
    WHERE id = $1 AND user_id = $2`,
    [taskId, global.user_id],
  );

  if (result.rowCount === 0) {
    return res.status(404).json({ message: 'No matching task found.' });
  }

  const task = result.rows[0];
  return res.status(200).json(task);
}

async function update(req, res) {
  if (!req.body) {
    req.body = {};
  }
  const { error, value } = patchTaskSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({ message: 'Unable to update task with the provided data.' });
  }

  const taskChange = value;
  let keys = Object.keys(taskChange);
  keys = keys.map((key) => (key === 'isCompleted' ? 'is_completed' : key));
  const setClauses = keys.map((key, i) => `${key} = $${i + 1}`).join(', ');
  const idParm = `$${keys.length + 1}`;
  const userParm = `$${keys.length + 2}`;
  const result = await pool.query(
    `UPDATE tasks SET ${setClauses}
    WHERE id = ${idParm} AND user_id = ${userParm} RETURNING id, title, is_completed`,
    [...Object.values(taskChange), req.params.id, global.user_id],
  );
  let updatedTask = null;
  if (result.rowCount > 0) {
    updatedTask = result.rows[0];
  }

  if (!updatedTask) {
    return res.status(404).json({ message: 'No matching task found.' });
  }
  return res.status(200).json(updatedTask);
}

async function deleteTask(req, res) {
  const taskId = parseInt(req.params?.id);
  if (isNaN(taskId)) {
    return res.status(400).json({ message: 'Invalid task ID.' });
  }

  const result = await pool.query(
    `DELETE FROM tasks WHERE id = $1 AND user_id = $2 RETURNING id, title, is_completed`,
    [taskId, global.user_id],
  );
  if (result.rowCount === 0) {
    return res.status(404).json({ message: 'No matching task found.' });
  }
  const deletedTask = result.rows[0];
  return res.status(200).json(deletedTask);
}

module.exports = {
  create,
  index,
  show,
  update,
  deleteTask,
};
