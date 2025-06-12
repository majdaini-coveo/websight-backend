const {OAuth2Client} = require('google-auth-library');

const client = new OAuth2Client();

async function googleOathverification(token) {
  const ticket = await client.verifyIdToken({
    idToken: token,
    audience: process.env.WEB_CLIENT_ID,
  });
  const payload = ticket.getPayload();
  if (payload['hd'] !== 'coveo.com') {
    throw new Error("Unauthorized user");
  }
}


module.exports = googleOathverification