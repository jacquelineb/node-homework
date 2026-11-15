const prisma = require('../db/prisma');

async function getUserAnalytics(req, res) {
  const userId = parseInt(req.params?.id);
  if (isNaN(userId)) {
    return res.status(400).json({ message: 'Invalid user id.' });
  }

  if (userId !== global.user_id) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  // Check that the user exists in the database
  const user = prisma.user.findUnique({
    where: { id: userId },
  });
  if (user === null) {
    return res.status(404).json({ message: 'User does not exists.' });
  }

  const taskStats = await prisma.task.groupBy({
    by: ['isCompleted'],
    where: { userId },
    _count: {
      id: true,
    },
  });

  const recentTasks = await prisma.task.findMany({
    where: { userId },
    select: {
      id: true,
      title: true,
      isCompleted: true,
      priority: true,
      createdAt: true,
      userId: true,
      User: {
        select: {
          name: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const weeklyProgress = await prisma.task.groupBy({
    by: ['createdAt'],
    where: {
      userId,
      createdAt: {
        gte: oneWeekAgo, // Tasks created within the last 7 days
      },
    },
    _count: {
      id: true,
    },
  });

  return res.status(200).json({ taskStats, recentTasks, weeklyProgress });
}

async function getUsersWithStats(req, res) {
  // Show all users with task statistics
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;

  const usersRaw = await prisma.user.findMany({
    include: {
      Task: {
        where: { isCompleted: false },
        select: { id: true },
        take: 5,
      },
      _count: {
        select: {
          Task: true,
        },
      },
    },
    take: limit,
    skip: (page - 1) * limit,
    orderBy: { createdAt: 'desc' },
  });

  // Transform result to only include the fields we want
  const users = usersRaw.map((user) => {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
      _count: user._count,
      Task: user.Task,
    };
  });

  const totalUsers = await prisma.user.count();
  const pagination = {
    page,
    limit,
    total: totalUsers,
    pages: Math.ceil(totalUsers / limit),
    hasNext: page * limit < totalUsers,
    hasPrev: page > 1,
  };

  return res.status(200).json({ users, pagination });
}

module.exports = {
  getUserAnalytics,
  getUsersWithStats,
};
