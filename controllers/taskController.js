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

  const { title, isCompleted, priority } = value;
  try {
    const newTask = await prisma.task.create({
      data: { title, isCompleted, priority, userId: global.user_id },
      select: { title: true, isCompleted: true, id: true, priority: true },
    });
    return res.status(201).json(newTask);
  } catch (err) {
    return next(err);
  }
}

async function index(req, res) {
  // Return the tasks for the logged-in user.
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  // Build where clause with optional search filter to search by title
  const whereClause = { userId: global.user_id };
  const { find, isCompleted, priority, min_date, max_date } = req.query;
  if (find) {
    whereClause.title = {
      contains: find, // Matches %find% pattern
      mode: 'insensitive', // Case-insensitive search (ILIKE in PostgreSQL)
    };
  }

  if (isCompleted !== undefined) {
    whereClause.isCompleted = isCompleted === 'true';
  }

  const validPriorityValues = ['low', 'medium', 'high'];
  if (validPriorityValues.includes(priority)) {
    whereClause.priority = priority;
  }

  if (min_date) {
    whereClause.createdAt = {
      gte: new Date(min_date), // Greater than or equal to
    };
  }

  if (max_date) {
    whereClause.createdAt = {
      ...whereClause.createdAt, //
      lte: new Date(min_date), // Less than or equal to
    };
  }

  const getOrderBy = (query) => {
    const validSortFields = ['title', 'priority', 'createdAt', 'id', 'isCompleted'];
    const sortBy = query.sortBy || 'createdAt';
    const sortDirection = query.sortDirection === 'asc' ? 'asc' : 'desc';

    if (validSortFields.includes(sortBy)) {
      return { [sortBy]: sortDirection };
    }
    return { createdAt: 'desc' }; // default fallback
  };

  const tasks = await prisma.task.findMany({
    where: whereClause,
    select: {
      id: true,
      title: true,
      isCompleted: true,
      priority: true,
      createdAt: true,
      User: {
        select: {
          name: true,
          email: true,
        },
      },
    },
    take: limit, // Limit results
    skip: skip, // Offset for page
    orderBy: getOrderBy(req.query),
  });

  // Get total count for pagination metadata
  const totalTasks = await prisma.task.count({
    where: whereClause,
  });

  // Build pagination object with complete metadata
  const pagination = {
    page,
    limit,
    total: totalTasks,
    pages: Math.ceil(totalTasks / limit),
    hasNext: page * limit < totalTasks,
    hasPrev: page > 1,
  };

  if (tasks.length === 0) {
    return res.status(404).json({ message: 'No tasks found.' });
  }

  return res.status(200).json({ tasks, pagination });
}

async function show(req, res, next) {
  const taskId = parseInt(req.params?.id);
  if (isNaN(taskId)) {
    return res.status(400).json({ message: 'Invalid task ID.' });
  }

  try {
    const task = await prisma.task.findUnique({
      where: { id: taskId, userId: global.user_id },
      select: {
        id: true,
        title: true,
        isCompleted: true,
        priority: true,
        User: {
          select: {
            name: true,
          },
        },
      },
    });

    if (task === null) {
      return res.status(404).json({ message: 'The task was not found.' });
    }
    return res.status(200).json(task);
  } catch (err) {
    return next(err); // pass other errors to the global error handler
  }
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

  try {
    const task = await prisma.task.update({
      data: value,
      where: {
        id: taskId,
        userId: global.user_id,
      },
      select: { title: true, isCompleted: true, priority: true, id: true },
    });
    return res.status(200).json(task);
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ message: 'The task was not found.' });
    } else {
      return next(err); // pass other errors to the global error handler
    }
  }
}

async function deleteTask(req, res, next) {
  const taskId = parseInt(req.params?.id);
  if (isNaN(taskId)) {
    return res.status(400).json({ message: 'Invalid task ID.' });
  }

  try {
    const deletedTask = await prisma.task.delete({
      where: { id: taskId, userId: global.user_id },
      select: { id: true, title: true, isCompleted: true },
    });
    return res.status(200).json(deletedTask);
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ message: 'The task was not found.' });
    } else {
      return next(err); // pass other errors to the global error handler
    }
  }
}

async function bulkCreate(req, res, next) {
  // Create tasks in bulk
  const { tasks } = req.body;

  // Validate the tasks array
  if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
    return res.status(400).json({
      error: 'Invalid request data. Expected an array of tasks.',
    });
  }

  // Validate all tasks before insertion
  const validTasks = [];
  for (const task of tasks) {
    const { error, value } = taskSchema.validate(task);
    if (error) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details,
      });
    }
    validTasks.push({
      title: value.title,
      isCompleted: value.isCompleted || false,
      priority: value.priority || 'medium',
      userId: global.user_id,
    });
  }

  try {
    const result = await prisma.task.createMany({
      data: validTasks,
      skipDuplicates: false,
    });

    return res.status(201).json({
      message: 'success!',
      tasksCreated: result.count,
      totalRequested: validTasks.length,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  create,
  index,
  show,
  update,
  deleteTask,
  bulkCreate,
};
