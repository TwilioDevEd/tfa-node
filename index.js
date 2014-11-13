// Load application configuration and a pre-configured HTTP server with
// an Express application mounted
var config = require('./config');
var server = require('./server');

// Connect to MongoDB data store using a connection string from our config file
var mongoose = require('mongoose');
mongoose.connect(config.mongoUrl, function(err) {
    if (err) throw err;
    console.log('connected to MongoDB');
});

// Start the HTTP server on configured port
server.listen(config.port, function() {
    console.log('Express server running on port ' + config.port);
});