const http = require('http');

const options = {
  hostname: 'localhost',
  port: 4000,
  path: '/api/order-limits',
  method: 'GET'
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    console.log('Order Limits:', JSON.stringify(JSON.parse(data), null, 2));
  });
});

req.on('error', (error) => {
  console.error(error);
});

req.end();

const req2 = http.request({ ...options, path: '/api/shipping-rules' }, (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    console.log('Shipping Rules:', JSON.stringify(JSON.parse(data), null, 2));
  });
});

req2.end();

const req3 = http.request({ ...options, path: '/api/net-terms-rules' }, (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    console.log('Net Term Rules:', JSON.stringify(JSON.parse(data), null, 2));
  });
});

req3.end();
