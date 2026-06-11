const https = require('https');

const SUPABASE_URL = 'https://vetsoqafwwdkzrwqwcqa.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZldHNvcWFmd3dka3pyd3F3Y3FhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4MjE0NDMsImV4cCI6MjA5NjM5NzQ0M30.3scevUPIQg4bYpHCwxbhvCKl4qlc0R4vtR1EbwZzvQg';

function supabaseRequest(path, method = 'GET') {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'vetsoqafwwdkzrwqwcqa.supabase.co',
      path,
      method,
      headers: {
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${ANON_KEY}`,
        'Accept': 'application/json',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });

    req.on('error', (e) => reject(e));
    req.end();
  });
}

(async () => {
  try {
    const res = await supabaseRequest('/rest/v1/profiles?limit=1');
    console.log('Status:', res.status);
    console.log('Body:', res.body.substring(0, 500));
  } catch (err) {
    console.error('Error:', err.message);
  }
})();
