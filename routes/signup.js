var User = require('../models/User');
var AccessToken = require('../models/AccessToken');

// Home page for signup
exports.home = function(request, response) {
    // Is the user already logged in?
    if (request.user) {
        response.redirect('/users/'+request.user._id);
    } else {
        response.render('signup', {
            title: 'Sign Up For An Account',
            message: request.flash('message'),
            error: request.flash('error'),
            csrfToken: request.csrfToken()
        });
    }
};

// Create a new User
exports.create = function(request, response) {
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
            if (err.errors) {
                // Collect validation errors
                var messages = [];
                if (err.errors.phone) {
                    messages.push('Phone number is required.');
                }
                if (err.errors.email) {
                    messages.push('An e-mail address is required.');
                } 
                if (err.errors.fullName) {
                    messages.push('Your full name is required.');
                } 
                if (err.errors.password) {
                    messages.push('A password is required.');
                }
                request.flash('message', messages);
            } else if (err.code == 11000) {
                request.flash('message', 
                    'That e-mail has already been registered.');
            } else {
                request.flash('message', 'An error occurred: '+ err.message);
            }
            request.flash('error', true);
            response.redirect('/signup');
        } else {
            response.redirect('/users/' + u._id + '/verify');
        }
    });
};

// Display an account verification page
exports.verify = function(request, response) {
    response.render('user_verify', {
        title: 'Verify Your Account',
        id: request.param('id'),
        message: request.flash('message'),
        error: request.flash('error'),
        csrfToken: request.csrfToken()
    });
};

// Perform verification based on code submitted
exports.doVerify = function(request, response) {
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
                    request.flash('message', 'Glad to have you, ' +
                        u.fullName +'!');
                    request.flash('error', false);
                    response.redirect('/users/'+u._id);
                });
            });
        } else {
            request.flash('message', 
                'The confirmation code doesn\'t match - please re-enter');
            request.flash('error', true);
            response.redirect('/users/'+_id+'/verify');
        }
    });
};

