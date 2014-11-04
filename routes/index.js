var path = require('path');
var express = require('express');
var morgan = require('morgan');
var bodyParser = require('body-parser');
var session = require('express-session');
var csurf = require('csurf');

// Configure appplication routes
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

    // Parse incoming request bodies as form-encoded
    app.use(bodyParser.urlencoded({
        extended: true
    }));

    // Generate CSRF tokens for all requests
    app.use(csurf());

    // Use morgan for HTTP request logging
    app.use(morgan('combined'));

    // Configure routes for user concerns (login, verification, etc.)
    require('./user')(app);

    // Home Page
    app.get('/', function(request, response) {
        response.render('index', {
            title: 'TFA Demo',
            user: request.user,
            csrfToken: request.csrfToken()
        });
    });
};