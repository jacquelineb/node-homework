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
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });
  if (user === null) {
    return res.status(404).json({ message: 'User not found.' });
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
  let page = parseInt(req.query.page) || 1;
  if (page < 1) {
    page = 1;
  }
  let limit = parseInt(req.query.limit) || 10;
  if (limit > 100) {
    limit = 100;
  }

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

async function searchTasks(req, res) {
  const searchQuery = req.query.q;
  if (!searchQuery || searchQuery.trim().length < 2) {
    return res.status(400).json({ error: 'Search query must be at least 2 characters' });
  }
  let limit = parseInt(req.query.limit) || 20;
  if (limit > 100) {
    limit = 100;
  }

  const searchPattern = `%${searchQuery}%`;
  const exactMatch = searchQuery;
  const startsWith = `${searchQuery}%`;

  // User raw SQL for complex text search with parameterized queries
  const searchResults = await prisma.$queryRaw`
    SELECT
      t.id,
      t.title,
      t.is_completed as "isCompleted",
      t.priority,
      t.created_at as "createdAt",
      t.user_id as "userId",
      u.name as "user_name"
    FROM tasks t
    JOIN users u ON t.user_id = u.id
    WHERE t.title ILIKE ${searchPattern}
      OR u.name ILIKE ${searchPattern}
    ORDER BY
      CASE
        WHEN t.title ILIKE ${exactMatch} THEN 1
        WHEN t.title ILIKE ${startsWith} THEN 2
        WHEN t.title ILIKE ${searchPattern} THEN 3
        ELSE 4
      END,
      t.created_at DESC
    LIMIT ${parseInt(limit)}
  `;

  return res.status(200).json({
    results: searchResults,
    query: searchQuery,
    count: searchResults.length,
  });
}

module.exports = {
  getUserAnalytics,
  getUsersWithStats,
  searchTasks,
};
