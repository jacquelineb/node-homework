const crypto = require('crypto');
const util = require('util');
const scrypt = util.promisify(crypto.scrypt);
const { userSchema } = require('../validation/userSchema');
const pool = require('../db/pg-pool');
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

  let result = null;
  value.hashed_password = await hashPassword(value.password);
  // the code to here is like the in-memory version
  try {
    result = await pool.query(
      `INSERT INTO users (email, name, hashed_password)
      VALUES ($1, $2, $3) RETURNING id, email, name`,
      [value.email, value.name, value.hashed_password],
    ); // note that you use a parameterized query
  } catch (e) {
    // the email might already be registered
    if (e.code === '23505') {
      // this means the unique constraint for email was violated
      // here you return the 400 and the error message.  Use a return statement, so that
      return res
        .status(400)
        .json({ message: 'Unable to register with the provided credentials.' });
      // you don't keep going in this function
    }
    return next(e); // all other errors get passed to the error handler
  }

  const user = result.rows[0];
  global.user_id = user.id;
  return res.status(201).json({
    name: value.name,
    email: value.email,
  });
}

async function logon(req, res) {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
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
