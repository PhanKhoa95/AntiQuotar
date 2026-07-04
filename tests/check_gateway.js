// tests/check_gateway.js
import http from 'http';

const ENDPOINT = 'http://127.0.0.1:5189/v1/accounts';

console.log(`Checking LS Gateway connection to ${ENDPOINT}...`);

const req = http.get(ENDPOINT, (res) => {
  console.log(`Response Status: ${res.statusCode}`);
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      console.log('LS Gateway is ONLINE! Returned accounts:');
      console.log(JSON.stringify(json, null, 2));
    } catch (e) {
      console.log('LS Gateway is ONLINE but returned non-JSON data:');
      console.log(data);
    }
  });
});

req.on('error', (err) => {
  console.log(`LS Gateway is OFFLINE: ${err.message}`);
  console.log('You can start it by running: AntiQuotar.bat ls');
});
