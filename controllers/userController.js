const { randomUUID } = require('crypto');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const util = require('util');
const scrypt = util.promisify(crypto.scrypt);
const { userSchema } = require('../validation/userSchema');
const prisma = require('../db/prisma');

const cookieFlags = (req) => {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // only when HTTPS is available
    sameSite: 'Strict',
  };
};

const setJwtCookie = (req, res, user) => {
  // Sign JWT
  const payload = { id: user.id, csrfToken: randomUUID() };
  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' }); // 1 hour expiration
  // Set cookie.  Note that the cookie flags have to be different in production and in test.
  res.cookie('jwt', token, { ...cookieFlags(req), maxAge: 3600000 }); // 1 hour expiration
  return payload.csrfToken; // this is needed in the body returned by logon() or register()
};

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
    const csrfToken = setJwtCookie(req, res, result.user);
    return res.status(201).json({
      user: result.user,
      welcomeTasks: result.welcomeTasks,
      transactionStatus: 'success',
      csrfToken,
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
    const csrfToken = setJwtCookie(req, res, user);
    res.status(200).json({ name: user.name, email, csrfToken });
  } else {
    res.status(401).json({ message: 'Unauthorized' });
  }
}

function logoff(req, res) {
  res.clearCookie('jwt', cookieFlags(req));
  res.sendStatus(200);
}

module.exports = {
  register,
  logon,
  logoff,
};
