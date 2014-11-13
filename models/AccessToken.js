var crypto = require('crypto');
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var bcrypt = require('bcrypt');
var speakeasy = require('speakeasy');
var User = require('./User');
var sender = require('./codesender');

var AccessTokenSchema = new Schema({
    token: {
        type: String,
        index: { unique: true }
    },
    userId: String,
    secret: String,
    confirmationCode: String,
    confirmed: {
        type: Boolean,
        default: false
    }
});


AccessTokenSchema.pre('save', function(next) {
    var self = this;
    if (!self.token) {
        self.token = crypto.randomBytes(32).toString('hex');
    }
    if (!self.secret) {
        self.secret = crypto.randomBytes(32).toString('hex');
    }
    next();
});

AccessTokenSchema.methods.sendToken = function(cb) {
    var self = this;

    // Create a new confirmation code
    self.confirmationCode = speakeasy.totp({
        key: self.secret
    });

    // Update confirmation code in the DB
    self.save(function(err, doc) {
        // Return with database error if needed
        if (err) return cb(err);

        // Now, get contact info for related user
        User.findById(self.userId, function(err, user) {
            if (err) return cb(err);
            sender(user.contactType, self.confirmationCode, user.phone, cb);
        });
    });
};


module.exports = mongoose.model('AccessToken', AccessTokenSchema);