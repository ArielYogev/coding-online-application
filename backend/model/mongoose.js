const mongoose = require('mongoose');

mongoose.Promise = global.Promise;

const connectDB = async () => {
    try{
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("DB Connected");

    } catch (err) {
        console.error("Connection Failed', err.message");
        process.exit(1);
    }
};

connectDB();

module.exports = mongoose.connection;