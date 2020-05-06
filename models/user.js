var mongoose = require("mongoose");
//var passportlocalmongoose =require("passport-local-mongoose");


var userSchema = new mongoose.Schema({
    
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    date: {
        type: Date,
        default: Date.now
    }

});
// userSchema.plugin(passportlocalmongoose);
//  module.exports=mongoose.model("User",userSchema);
 const User = mongoose.model('User', userSchema);
 module.exports = User;