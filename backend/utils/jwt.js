var jwt = require("jsonwebtoken");

function tokenGenerator(id) {
  return jwt.sign({ id: id }, process.env.JWT_SECRET, {
    expiresIn: 60 * 60 * 24,
  });
}

module.exports = tokenGenerator;
