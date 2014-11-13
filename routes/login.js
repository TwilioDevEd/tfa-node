var User = require('../models/User');
var AccessToken = require('../models/AccessToken');

// login home page
exports.home = function(request, response) {
    // Is the user already logged in?
    if (request.user) {
        response.redirect('/users/'+request.user._id);
    } else {
        response.render('login', {
            title: 'Please Log In',
            message: request.flash('message'),
            error: request.flash('error'),
            csrfToken: request.csrfToken()
        });
    }
};

// Password check and access token generation, pending a verification via SMS
exports.create = function(request, response) {
    // Test password match
    User.findOne({
        email: request.param('email')
    }, function(err, user) {
        if (err || !user) {
            request.flash('message', 'E-Mail/Password Not Valid');
            request.flash('error', true);
            return response.redirect('/login');
        }

        user.comparePassword(request.param('password'), function(err, ok) {
            if (!ok) {
                request.session.error = 'E-Mail/Password Not Valid';
                return response.redirect('/login');
            }

            // If the password is good, create a new access token that we
            // can validate with two factor auth
            var token = new AccessToken({
                userId: user._id
            });

            // After we save the token, we send the code via voice/SMS
            // and show the verification UI
            token.save(function(err, tkn) {
                if (err) {
                    request.session.error = 'Login Error';
                    return response.redirect('/login');
                }

                token.sendToken(function(err, data) {
                    response.redirect('/tokens/'+tkn._id);
                });
            });
        });
    });
};

// Show page to enter a code to verify an access token (the TFA step)
exports.verify = function(request, response) {
    AccessToken.findById(request.param('id'), function(err, tkn) {
        if (err || !tkn) {
            request.flash('message', 'Please log in again.');
            request.flash('error', true);
            return response.redirect('/login');
        }

        response.render('token_verify', {
            csrfToken: request.csrfToken(),
            title: 'Verify Your Account',
            message: request.flash('message'),
            error: request.flash('error'),
            id: tkn.token
        });
    });
};

// Process verification code for a new access token
exports.doVerify = function(request, response) {
    AccessToken.findOne({
        token: request.param('id')
    }, function(err, tkn) {
        if (err || !tkn) {
            // Assume this was reached in error
            return response.redirect('/login');
        }

        // Check the code match
        if (request.param('code') == tkn.confirmationCode) {
            // Sweet - save the code as confirmed and save the ID in session
            tkn.confirmed = true;
            tkn.save(function(err) {
                if (err) {
                    request.flash('message', 'Login error - please retry.');
                    request.flash('error', true);
                    return response.redirect('/login');
                }

                request.session.accessToken = tkn.token;
                request.flash('message', 'Welcome back!');
                request.flash('error', false);
                response.redirect('/users/' + tkn.userId);
            });
        } else {
            request.flash('message', 
                'The confirmation code doesn\'t match - please re-enter.');
            request.flash('error', true);
            return response.redirect('/tokens/'+tkn._id);
        }
    });
};

// destroy current access token, ending authenticated session
exports.destroy = function(request, response) {
    var id = request.session.accessToken;
    AccessToken.findOneAndRemove({
        _id: request.session.accessToken
    }, function() {
        request.session.accessToken = null;
        response.redirect('/');
    });
};
