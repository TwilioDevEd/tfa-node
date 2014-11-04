var crypto = require('crypto');
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var bcrypt = require('bcrypt');
var speakeasy = require('speakeasy');
var sender = require('./codesender');

// Constants
var SALT_WORK_FACTOR = 10; // protect password hash from brute force guessing
var TOKEN_EXPIRY = 60 * 10; // expire confirmation tokens after ten minutes

var UserSchema = new Schema({
    fullName: { 
        type: String, 
        required: true
    },
    email: {
        type: String,
        required: true,
        index: { unique: true }
    },
    phone: {
        type: String,
        required: true
    },
    secret: {
        type: String
    },
    contactType: {
        type: String,
        default: 'text'
    },
    confirmed: {
        type: Boolean,
        default: false
    },
    confirmationCode: String,
    password: {
        type: String, 
        required: true 
    }
});

UserSchema.pre('save', function(next) {
    var self = this;

    if (!self.secret) {
        self.secret = crypto.randomBytes(32).toString('hex');
    }

    // only hash the password if it has been modified (or is new)
    if (!self.isModified('password')) return next();

    // generate a salt
    bcrypt.genSalt(SALT_WORK_FACTOR, function(err, salt) {
        if (err) return next(err);

        // hash the password using our new salt
        bcrypt.hash(self.password, salt, function(err, hash) {
            if (err) return next(err);

            // override the cleartext password with the hashed one
            self.password = hash;
            next();
        });
    });
});

UserSchema.post('save', function(doc) {
    var self = this;

    if (!self.confirmationCode) {
        self.sendToken();
    }
});

// Send an authentication token to a user's phone number
UserSchema.methods.sendToken = function(cb) {
    var self = this;

    // Create a new confirmation code
    self.confirmationCode = speakeasy.totp({
        key: self.secret,
        step: TOKEN_EXPIRY
    });

    // Update confirmation code in the DB
    self.save(function(err, doc) {
        // Return with database error if needed
        if (err) return cb(err);

        sender(self.contactType, self.confirmationCode, self.phone, cb);
    });
};

// Standard password test
UserSchema.methods.comparePassword = function(candidatePassword, cb) {
    bcrypt.compare(candidatePassword, this.password, function(err, isMatch) {
        if (err) return cb(err);
        cb(null, isMatch);
    });
};

module.exports = mongoose.model('User', UserSchema);