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

module.exports = {
  getUserAnalytics,
};
