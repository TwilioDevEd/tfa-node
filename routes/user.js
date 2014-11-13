var csurf = require('csurf');
var User = require('../models/User');
var AccessToken = require('../models/AccessToken');
var signup = require('./signup');
var login = require('./login');

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

    // Middleware function to require a logged in user
    function auth(request, response, next) {
        if (request.user) {
            next();
        } else {
            response.status(403);
            request.flash('message', 'Please Log In.');
            request.flash('error', true);
            response.redirect('/');
        }
    }

    // Display account details for an individual user
    app.get('/users/:id', auth, function(request, response) {
        var requestId = request.param('id');

        // The current logged in user can view their own information, but not
        // anyone else's
        if (request.user.id == requestId) {
            console.log(request.flash('error'));

            response.render('user', {
                title: 'User Profile Information',
                user: request.user,
                message: request.flash('message'),
                error: request.flash('error').length > 0,
                csrfToken: request.csrfToken()
            });
        } else {
            response.status(404);
            response.send('No user found by given ID.');
        }
    });

    // Display a new user page
    app.get('/signup', signup.home);

    // user login page
    app.get('/login', login.home);

    // Create a new user, pending account verification
    app.post('/users', signup.create);

    // Enter verification code for a new account
    app.get('/users/:id/verify', signup.verify);

    // Process verification code for a new account
    app.post('/users/:id/verify', signup.doVerify);

    // Create a new access token, pending TFA verification
    app.post('/tokens', login.create);

    // Enter verification code for a new access token
    app.get('/tokens/:id', login.verify);

    // Process verification code for a new access token
    app.post('/tokens/:id', login.doVerify);

    // Log out - null out reference to access token and delete it
    app.post('/logout', login.destroy);
};
