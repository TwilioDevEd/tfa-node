// Connect to MongoDB data store
var mongoose = require('mongoose');
mongoose.connect(require('./config').mongoUrl, function(err) {
    if (err) throw err;
    console.log('connected to MongoDB');
});

// Create and start server on configured port
var config = require('./config');
var server = require('./server');
server.listen(config.port, function() {
    console.log('Express server running on port ' + config.port);
});