var jwt = require("jsonwebtoken");

function tokenGenerator(id,role) {
  return jwt.sign({ id: id,role:role }, process.env.JWT_SECRET, {
    expiresIn: 60 * 60 * 24,
  });
}

module.exports = tokenGenerator;
