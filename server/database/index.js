const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

if (process.env.NODE_ENV === "production") {
  mongoose
    .connect(
      process.env.MONGO_URI || "mongodb://localhost:27017/vue3c23"
    )
    .then(() => {
      console.log("Connected [DB PROD] !");
    })
    .catch((e) => console.log(e));
} else {
  MongoMemoryServer.create().then(async (mongo) => {
    const uri = mongo.getUri();
    await mongoose.connect(uri);
    console.log("Connected [DB test] !");
  });
}
