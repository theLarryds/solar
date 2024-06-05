const axios = require("axios");
const crypto = require("crypto");
const fs = require("fs");
const authData = require("./auth/auth.json");
const inverterAuth = require("./auth/auth_dessmonitor.json");
var cp = require('child_process');

const tokenAge = authData.dat.expire; // 604800

// Specify the path to your target file
const filePath = "./auth/auth.json";
// Get the file's last modified time
const stats = fs.statSync(filePath);
const fileLastModified = stats.mtime.getTime(); // in milliseconds

// Calculate the current time in seconds
const currentTime = Math.floor(Date.now() / 1000);

// Calculate the sum of token age and file last modified time
const sumTime = tokenAge + Math.floor(fileLastModified / 1000);

//https://api.dessmonitor.com/chapter1/apiHelp.html
// Define your parameters here
// "usr": your DESS Monitor username - used to sign into the app,
// "pwd": password from the Dess site,
// "companyKey": This I derived from the network inspector tool in the browser to find the "companyKey" attribute,
// "source": "1" - App per the API Docs example,
// "appClient": "android" - App per the API Docs example,
// "appId": "com.demo.test" - App per the API Docs example,
// "appVersion": "3.6.2.1" - App per the API Docs example,
let usr = inverterAuth.usr;
let pwd = inverterAuth.pwd; // replace with your password
let companyKey = inverterAuth.companyKey;
let source = inverterAuth.source;
let appClient = inverterAuth.appClient;
let appId = inverterAuth.appId;
let appVersion = inverterAuth.appVersion;
// Generate the salt
let salt = new Date().getTime().toString();
// Generate the SHA-1 hash of the password
let shaPwd = crypto.createHash("sha1").update(pwd).digest("hex");
// Generate the signature
let sign = crypto
  .createHash("sha1")
  .update(
    salt +
      shaPwd +
      "&action=authSource&usr=" +
      usr +
      "&company-key=" +
      companyKey +
      "&source=" +
      source +
      "&_app_client_=" +
      appClient +
      "&_app_id_=" +
      appId +
      "&_app_version_=" +
      appVersion
  )
  .digest("hex");
// Define the API endpoint
let url = `http://api.dessmonitor.com/public/?sign=${sign}&salt=${salt}&action=authSource&usr=${usr}&company-key=${companyKey}&source=${source}&_app_client_=${appClient}&_app_id_=${appId}&_app_version_=${appVersion}`;

if (currentTime > sumTime) {
  // Calculate remaining time in seconds

  // Make the GET request
  axios
    .get(url)
    .then((response) => {
      // Write the response data to auth.json
      fs.writeFile(
        "auth.json",
        JSON.stringify(response.data, null, 2),
        (err) => {
          if (err) throw err;
          console.log("The file has been saved!");
        }
      );
    })
    .catch((error) => {
      console.error(`Error: ${error}`);
    });
} else {
  const currentTime = Math.floor(Date.now() / 1000);
  const remainingTime = tokenAge - (currentTime - sumTime);
  // Convert remaining time to hours
  const remainingHours = Math.floor(remainingTime / 3600);
  console.log(`Remaining token age: ${remainingHours} hours`);
  console.log("No action needed");
}

cp.fork(__dirname + '/harvestSolar.js');