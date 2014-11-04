// Define app configuration in a single location, but pull in values from
// system environment variables (so we don't check them in to source control!)
module.exports = {
    // Twilio Account SID - found on your dashboard
    accountSid: process.env.TWILIO_ACCOUNT_SID,

    // Twilio Auth Token - found on your dashboard
    authToken: process.env.TWILIO_AUTH_TOKEN,

    // A Twilio number that you have purchased through the twilio.com web
    // interface or API
    twilioNumber: process.env.TWILIO_NUMBER,

    // MongoDB connection URL
    mongoUrl: process.env.MONGOHQ_URL,

    // A random secret string used to generate secure tokens
    secret: process.env.SHARED_SECRET,

    // The port your web application will run on
    port: process.env.PORT || 3000
};