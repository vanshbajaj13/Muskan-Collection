const asyncHandler = require("express-async-handler");
const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const { User } = require("../Models/user");
const bcrypt = require("bcrypt");
const tokenGenerator = require("../utils/jwt");

// sigin route

router.post(
  "/",
  asyncHandler(async (req, res) => {
    var { email, password } = req.body;
    email = email.toLowerCase();
    User.findOne({ email: email })
      .then((docs) => {
        if (docs === null) {
          res.send("invalid credential");
        } else {
          bcrypt.compare(password, docs.password, function (err, result) {
            if (err) {
              console.log(err);
              res.send("invalid credential");
            } else {
              if (result) {
                // Include the role in the token generation
                var token = tokenGenerator(docs._id.toString(), docs.role);
                res.json({ email: docs.email, token: token,role: docs.role });
              } else {
                res.send("invalid password");
              }
            }
          });
        }
      })
      .catch((err) => {
        if (err) {
          console.log(err);
        }
      });
  })
);

module.exports = router;
