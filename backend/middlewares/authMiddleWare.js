const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");

dotenv.config();
// to protect the apis 


const protect = (req, res, next) => {
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];

      //decode token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      next();
    } catch (err) {
      res.status(401);
      res.send(err);
      // throw new Error("Not authorized, token failed or toekn expired");
    //   console.log(err);
    }
  }
  if (!token) {
    res.status(401);
    // throw new Error("Not authorized, no token");
  }
};

module.exports = protect;
