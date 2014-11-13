var path = require('path');
var express = require('express');
var morgan = require('morgan');
var bodyParser = require('body-parser');
var session = require('express-session');
var flash = require('connect-flash');
var csurf = require('csurf');

// Configure appplication routes and global middleware
module.exports = function(app) {
    // Set Jade as the default template engine
    app.set('view engine', 'jade');

    // Express static file middleware - serves up JS, CSS, and images from the
    // "public" directory where we started our webapp process
    app.use(express.static(path.join(process.cwd(), 'public')));

    // Create HTTP sessions for all requests
    app.use(session({ 
        secret: require('../config').secret, 
        resave: false,
        saveUninitialized: true
    }));

    // Enable flash messages that persist across redirects
    app.use(flash());

    // Parse incoming request bodies as form-encoded
    app.use(bodyParser.urlencoded({
        extended: true
    }));

    // Generate CSRF tokens for all requests
    app.use(csurf());

    // Use morgan for HTTP request logging
    app.use(morgan('combined'));

    // Configure routes for user concerns (login, verification, etc.)
    // Will mount middleware to authenticate requests and populate
    // request.user
    require('./user')(app);

    // Render home Page
    app.get('/', function(request, response) {
        response.render('index', {
            title: 'TFA Demo',
            user: request.user,
            message: request.flash('message'),
            error: request.flash('error').length > 0,
            csrfToken: request.csrfToken()
        });
    });

    // Catch application errors with a single middleware function
    app.use(function(err, request, response, next) {
        var message = 'An application error has occurred - sorry :(';
        if (err.code === 'EBADCSRFTOKEN') {
            // CSRF error - handle as needed
            message = 'There was a problem with your request - please retry.';
        }

        // Just redirect to home page after error
        request.flash('error', true);
        request.flash('message', message);
        response.redirect('/');
    });
};