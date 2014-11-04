var csurf = require('csurf');
var User = require('../models/User');
var AccessToken = require('../models/AccessToken');

// Configure routes for user-specific functionality around login
module.exports = function(app) {

    // Middleware function to check for a valid access token and grab the 
    // appropriate user object. This is the main authentication pass for the
    // middleware stack.
    app.use(function(request, response, next) {
        var accessToken = request.session.accessToken;
        next();
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
    app.get('/users/:id', /*auth,*/ function(request, response) {
        User.findById(request.param('id'), function(err, user) {
            response.render('user', {
                fullName: user.fullName,
                phone: user.phone
            });
        });
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
                response.status(500);
                request.session.error = err;
                response.redirect('/');
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
            } else if (u && !u.confirmed && code === u.confimationCode) {
                // success
                u.confirmed = true;
                u.save(function(err, u) {
                    // Create a new access token and save it to the session
                    var tkn = new AccessToken({
                        userId: u._id,
                        confirmed: true 
                    });

                    tkn.save(function(err, doc) {
                        request.session.token = doc;
                        response.redirect('/users/'+request.user._id);
                    });
                });
            } else {
                response.status(500);
                response.send(err);
            }
        });
    });

    // Create a new access token, pending TFA verification
    app.post('/tokens', csrfCheck, function(request, response) {

    });

    // Enter verification code for a new access token
    app.get('/tokens/:id', function(request, response) {

    });

    // Process verification code for a new access token
    app.post('/tokens/:id', csrfCheck, function(request, response) {

    });
};