var twilio = require('twilio');
var config = require('../config');

// A public service that simply echoes back TwiML that you pass it - we use
// it here so we don't have to worry about knowing our app's URL ahead of time
var twimlet = 'http://twimlets.com/echo?Twiml=';

// Create an authenticated Twilio REST API client to send messages
// and make calls
var client = twilio(config.accountSid, config.authToken);

// Pre-set twilio TwiML response
function twiml(confirmationCode) {
    // Split up numbers so the user can hear each one individually
    var numbers = confirmationCode.split('');
    var twiml = new twilio.TwimlResponse();
    twiml.say('Your verification code is', {
        voice: 'alice'
    });

    function appendCode(number) {
        twiml.say(number, { voice: 'alice' });
    }

    // Say the number once...
    numbers.forEach(appendCode);

    // Prompt again...
    twiml.say('Once again, your confirmation code is:', {
        voice: 'alice'
    });

    // Say the number again...
    numbers.forEach(appendCode);

    // Prompt again...
    twiml.say('One last time, your confirmation code is:', {
        voice: 'alice'
    });

    // Say the number a final time...
    numbers.forEach(appendCode);

    // Terminate the TwiML markup
    twiml.say('Thank you!', { voice: 'alice' });

    return twiml.toString();
}

module.exports = function(type, code, to, callback) {
    // Send the new token over the requested channel
    if (type === 'voice') {
        client.makeCall({
            to: to,
            from: config.twilioNumber,
            url: twimlet + encodeURIComponent(twiml(code))
        }, callback);
    } else {
        client.sendMessage({
            to: to,
            from: config.twilioNumber,
            body: 'Your confirmation code is: '+ code
        }, callback);
    }
};