let mongoose = require("mongoose");
const Comment = require("./comment");

//SCHEMA SETUP
let destinationSchema = new mongoose.Schema({
    destination: String,
    image: String,
    description: String,
    author: {
        id: {
            type: mongoose.Schema.Types.ObjectId
        },
        username: String
    },
    comments: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Comment"
        }
    ]
});

destinationSchema.pre("remove", async function() {
    await Comment.remove({
        _id: {
            $in: this.comments
        }
    });
});

module.exports = mongoose.model("Destination", destinationSchema);