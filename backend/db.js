const dotenv = require("dotenv");
const mongoose = require("mongoose");

dotenv.config();

async function connectToMongo() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("connected to data base");
      } catch (error) {
        console.log(error);
    }
  }

  
  module.exports = connectToMongo;
