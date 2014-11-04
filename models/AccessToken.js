var crypto = require('crypto');
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var bcrypt = require('bcrypt');
var speakeasy = require('speakeasy');
var twilio = require('twilio');
var config = require('../config');

var AccessTokenSchema = new Schema({
    token: String,
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
});

AccessTokenSchema.post('save', function() {
    
});

module.exports = mongoose.model('AccessToken', AccessTokenSchema);