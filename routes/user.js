var csurf = require('csurf');
var User = require('../models/User');
var AccessToken = require('../models/AccessToken');

// Configure routes for user-specific functionality around login
module.exports = function(app) {

    // Middleware function to check for a valid access token and grab the 
    // appropriate user object. This is the main authentication pass for the
    // middleware stack, other routes will reference request.user to determine
    // login status
    app.use(function(request, response, next) {
        var accessToken = request.session.accessToken;
        if (!accessToken) return next();

        AccessToken.findOne({
            token: accessToken
        }, function(err, token) {
            if (err) return next();

            // Get user data associated with the token
            User.findById(token.userId, function(err, user) {
                if (err) return next();
                request.user = user;
                next();
            });
        });
    });

    // Redirect to home page after an authentication error
    function fail(request, response, message) {
        response.status(403);
        request.session.error = message;
        response.redirect('/');
    }

    // Middleware function to check CSRF token
    function csrfCheck(err, request, response, next) {
        if (err.code !== 'EBADCSRFTOKEN') return next(err);
        fail(request, response, 'Session expired - please log in.');
    }

    // Middleware function to require a logged in user
    function auth(request, response, next) {
        if (request.user) {
            next();
        } else {
            fail(request, response, 'Please Log In.')
        }
    }

    // Display a new user page
    app.get('/signup', function(request, response) {
        // Is the user already logged in?
        if (request.user) {
            response.redirect('/users/'+request.user._id);
        } else {
            response.render('signup', {
                title: 'Sign Up For An Account',
                csrfToken: request.csrfToken()
            });
        }
    });

    // user login page
    app.get('/login', function(request, response) {
        // Is the user already logged in?
        if (request.user) {
            response.redirect('/users/'+request.user._id);
        } else {
            response.render('login', {
                title: 'Please Log In',
                csrfToken: request.csrfToken()
            });
        }
    });

    // Display account details for an individual user
    app.get('/users/:id', auth, function(request, response) {
        var requestId = request.param('id');

        // The current logged in user can view their own information, but not
        // anyone else's
        if (request.user.id == requestId) {
            response.render('user', {
                title: 'User Profile Information',
                user: request.user,
                csrfToken: request.csrfToken()
            });
        } else {
            response.status(404);
            response.send('No user found by given ID.');
        }
    });

    // Create a new user, pending account verification
    app.post('/users', csrfCheck, function(request, response) {
        // Create user from request
        var u = new User({
            email: request.param('email'),
            fullName: request.param('fullName'),
            password: request.param('password'),
            phone: request.param('phone'),
            contactType: request.param('contactType')
        });

        // Save a new user, unverified
        u.save(function(err) {
            if (err) {
                request.session.error = err;
                response.redirect('/signup');
            } else {
                response.redirect('/users/' + u._id + '/verify');
            }
        });
    });

    // Enter verification code for a new account
    app.get('/users/:id/verify', function(request, response) {
        response.render('user_verify', {
            title: 'Verify Your Account',
            id: request.param('id'),
            csrfToken: request.csrfToken()
        });
    });

    // Process verification code for a new account
    app.post('/users/:id/verify', csrfCheck, function(request, response) {
        var _id = request.param('id');
        var code = request.param('code');

        User.findById(_id, function(err, u) {
            if (err) {
                response.status(404);
                response.redirect('/');
            } else if (u && !u.confirmed && code === u.confirmationCode) {
                // success
                u.confirmed = true;
                u.save(function(err, u) {
                    // Create a new access token and save it to the session
                    var tkn = new AccessToken({
                        userId: u._id,
                        confirmed: true 
                    });

                    tkn.save(function(err, doc) {
                        request.session.accessToken = doc.token;
                        response.redirect('/users/'+u._id);
                    });
                });
            } else {
                request.session.error = err;
                response.redirect('/users/'+_id+'/verify');
            }
        });
    });

    // Create a new access token, pending TFA verification
    app.post('/tokens', csrfCheck, function(request, response) {
        // Test password match
        User.findOne({
            email: request.param('email')
        }, function(err, user) {
            if (err) {
                request.session.error = 'E-Mail/Password Not Valid';
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
    });

    // Enter verification code for a new access token
    app.get('/tokens/:id', function(request, response) {
        AccessToken.findById(request.param('id'), function(err, tkn) {
            if (err || !tkn) {
                request.session.error = 'Invalid token ID';
                return response.redirect('/login');
            }

            response.render('token_verify', {
                csrfToken: request.csrfToken(),
                title: 'Verify Your Account',
                id: tkn.token
            });
        });
    });

    // Process verification code for a new access token
    app.post('/tokens/:id', csrfCheck, function(request, response) {
        AccessToken.findOne({
            token: request.param('id')
        }, function(err, tkn) {
            if (err || !tkn) {
                console.log('>'+err);
                request.session.error = 'Invalid token ID';
                return response.redirect('/login');
            }

            // Check the code match
            if (request.param('code') == tkn.confirmationCode) {
                // Sweet - save the code as confirmed and save the ID in session
                tkn.confirmed = true;
                tkn.save(function(err) {
                    if (err) {
                        console.log('>>'+err);
                        request.session.error = 'Verification Error.';
                        return response.redirect('/login');
                    }

                    request.session.accessToken = tkn.token;
                    response.redirect('/users/' + tkn.userId);
                });
            } else {
                console.log('>>>'+err);
                request.session.error = 'Invalid confirmation code.';
                return response.redirect('/login');
            }
        });
    });

    // Log out - null out reference to access token and delete it
    app.post('/logout', csrfCheck, function(request, response) {
        var id = request.session.accessToken;
        AccessToken.findOneAndRemove({
            _id: request.session.accessToken
        }, function() {
            request.session.accessToken = null;
            response.redirect('/');
        });
    });
};