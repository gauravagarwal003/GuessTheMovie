require('dotenv').config();
const { pushChanges } = require('./scheduler');

async function testPush() {
  try {
    const commitMessage = `Test commit for ${new Date().toLocaleDateString()}`;
    await pushChanges(commitMessage);
    console.log("Push test completed successfully.");
  } catch (err) {
    console.error("Push test failed:", err);
  }
}

testPush();
