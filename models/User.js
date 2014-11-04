var crypto = require('crypto');
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var bcrypt = require('bcrypt');
var speakeasy = require('speakeasy');
var twilio = require('twilio');
var config = require('../config');

// Constants
var SALT_WORK_FACTOR = 10; // protect password hash from brute force guessing
var TOKEN_EXPIRY = 60 * 10; // expire confirmation tokens after ten minutes

// A public service that simply echoes back TwiML that you pass it - we use
// it here so we don't have to worry about knowing our app's URL ahead of time
var twimlet = 'http://twimlets.com/echo?Twiml=';

// Pre-set twilio TwiML response
function twiml(confirmationCode) {
    // Split up numbers so the user can hear each one individually
    var numbers = confirmationCode.split('');
    var twiml = new twilio.TwimlResponse();
    twiml.say('Thank you for signing up. Your code is', {
        voice: 'alice'
    });

    function appendCode(number) {
        twiml.say(number, { voice: 'alice' });
    }

    // Say the number once...
    numbers.forEach(appendCode);

    // Prompt again...
    twiml.say('Once again, your confirmation code is:', {
        voice: 'alice'
    });

    // Say the number again...
    numbers.forEach(appendCode);

    // Prompt again...
    twiml.say('One last time, your confirmation code is:', {
        voice: 'alice'
    });

    // Say the number a final time...
    numbers.forEach(appendCode);

    // Terminate the TwiML markup
    twiml.say('Thank you for registering!', { voice: 'alice' });

    return twiml.toString();
}

// Create an authenticated Twilio REST API client to send messages
// and make calls
var client = twilio(config.accountSid, config.authToken);

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

        // Send the new token over the requested channel
        if (self.contactType === 'voice') {
            client.makeCall({
                to: self.phone,
                from: config.twilioNumber,
                url: twimlet + encodeURIComponent(twiml(self.confirmationCode))
            }, cb);
        } else {
            client.sendMessage({
                to: self.phone,
                from: config.twilioNumber,
                body: 'Your confirmation code is: '+ self.confirmationCode
            }, cb);
        }
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