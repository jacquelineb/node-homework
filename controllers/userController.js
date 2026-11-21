const crypto = require('crypto');
const util = require('util');
const scrypt = util.promisify(crypto.scrypt);
const { userSchema } = require('../validation/userSchema');
const prisma = require('../db/prisma');

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = await scrypt(password, salt, 64);
  return `${salt}:${derivedKey.toString('hex')}`;
}

async function comparePassword(inputPassword, storedHash) {
  const [salt, key] = storedHash.split(':');
  const keyBuffer = Buffer.from(key, 'hex');
  const derivedKey = await scrypt(inputPassword, salt, 64);
  return crypto.timingSafeEqual(keyBuffer, derivedKey);
}

async function register(req, res, next) {
  if (!req.body) {
    req.body = {};
  }

  const { error, value } = userSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({
      message: 'Unable to register account using the provided credentials',
    });
  }

  value.hashedPassword = await hashPassword(value.password);
  delete value.password;
  const { name, email, hashedPassword } = value;

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Create user
      const newUser = await tx.user.create({
        data: { name, email, hashedPassword },
        select: {
          id: true,
          name: true,
          email: true,
        },
      });

      // Create welcome tasks for the user
      const welcomeTasksData = [
        {
          title: 'Complete your profile',
          userId: newUser.id,
          priority: 'medium',
        },
        {
          title: 'Add your first task',
          userId: newUser.id,
          priority: 'high',
        },
        {
          title: 'Explore the app',
          userId: newUser.id,
          priority: 'low',
        },
      ];
      await tx.task.createMany({ data: welcomeTasksData });

      // Fetch the created tasks so we can return them
      const welcomeTasks = await tx.task.findMany({
        where: {
          userId: newUser.id,
          title: { in: welcomeTasksData.map((t) => t.title) },
        },
        select: {
          id: true,
          title: true,
          isCompleted: true,
          userId: true,
          priority: true,
        },
      });
      return { user: newUser, welcomeTasks };
    });
    global.user_id = result.user.id;
    return res.status(201).json({
      user: result.user,
      welcomeTasks: result.welcomeTasks,
      transactionStatus: 'success',
    });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Email already registered' });
    } else {
      return next(error);
    }
  }
}

async function logon(req, res) {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({
    where: {
      email: email.toLowerCase(),
    },
  });
  const goodCredentials = user && (await comparePassword(password, user.hashedPassword));
  if (goodCredentials) {
    global.user_id = user.id;
    res.status(200).json({ name: user.name, email });
  } else {
    res.status(401).json({ message: 'Unauthorized' });
  }
}

function logoff(req, res) {
  global.user_id = null;
  res.sendStatus(200);
}

module.exports = {
  register,
  logon,
  logoff,
};
