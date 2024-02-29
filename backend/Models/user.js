const mongoose  = require("mongoose");

const userSchema = new mongoose.Schema(
    {
      email: {
        type: String,
        required: true,
        unique: true,
      },
      password: {
        type: String,
        required: true,
      },
    },
    { timestamps: true }
  );
  function createUser(email,password) {
    const user = new User({
      email: email,
      password : password
    });
    return user;
  }
  const User = new mongoose.model("User", userSchema)

module.exports = {User,createUser};
