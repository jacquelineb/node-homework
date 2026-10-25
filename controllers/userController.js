const crypto = require('crypto');
const util = require('util');
const scrypt = util.promisify(crypto.scrypt);
const { userSchema } = require('../validation/userSchema');

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

async function register(req, res) {
  if (!req.body) {
    req.body = {};
  }

  const { error, value } = userSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({
      message: 'Unable to register account using the provided credentials',
    });
  }

  const { name, email, password } = value;
  const hashedPassword = await hashPassword(password);
  const newUser = { email, name, hashedPassword };

  global.users.push(newUser);
  global.user_id = newUser;
  res.status(201).json({
    name,
    email,
  });
}

async function logon(req, res) {
  const { email, password } = req.body;
  const user = global.users.find((usr) => usr.email === email);
  const goodCredentials = user && (await comparePassword(password, user.hashedPassword));

  if (goodCredentials) {
    global.user_id = user;
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
