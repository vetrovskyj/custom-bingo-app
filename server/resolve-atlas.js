// Resolve MongoDB Atlas SRV records using DNS-over-HTTPS (bypasses network DNS blocks)
const https = require('https');

const hostname = 'cluster0.4mytjxl.mongodb.net';

function dohQuery(name, type) {
  return new Promise((resolve, reject) => {
    const url = `https://dns.google/resolve?name=${encodeURIComponent(name)}&type=${type}`;
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

async function main() {
  console.log('Using DNS-over-HTTPS (Google) to resolve Atlas cluster...\n');

  // 1. Resolve SRV records
  console.log(`Looking up SRV: _mongodb._tcp.${hostname}`);
  const srvResult = await dohQuery(`_mongodb._tcp.${hostname}`, 'SRV');
  
  if (!srvResult.Answer || srvResult.Answer.length === 0) {
    console.log('No SRV records found! Response:', JSON.stringify(srvResult, null, 2));
    return;
  }

  const srvHosts = srvResult.Answer.map(a => {
    const parts = a.data.split(' ');
    return { priority: parts[0], weight: parts[1], port: parts[2], target: parts[3].replace(/\.$/, '') };
  });
  console.log('SRV records:', JSON.stringify(srvHosts, null, 2));

  // 2. Resolve TXT record
  console.log(`\nLooking up TXT: ${hostname}`);
  const txtResult = await dohQuery(hostname, 'TXT');
  const txtOptions = txtResult.Answer?.map(a => a.data.replace(/"/g, '')).join('') || '';
  console.log('TXT options:', txtOptions);

  // 3. Resolve A records for each host
  for (const srv of srvHosts) {
    console.log(`\nLooking up A: ${srv.target}`);
    const aResult = await dohQuery(srv.target, 'A');
    if (aResult.Answer) {
      const ips = aResult.Answer.map(a => a.data);
      console.log(`  IPs: ${ips.join(', ')}`);
    } else {
      console.log('  No A records found');
    }
  }

  // 4. Build standard mongodb:// connection string
  const replicaSet = txtOptions.match(/replicaSet=([^&]+)/)?.[1] || '';
  const authSource = txtOptions.match(/authSource=([^&]+)/)?.[1] || 'admin';
  const hostList = srvHosts.map(s => `${s.target}:${s.port}`).join(',');
  
  console.log('\n========================================');
  console.log('STANDARD CONNECTION STRING (use this in .env):');
  console.log(`mongodb://${hostList}/custom-bingo?ssl=true&replicaSet=${replicaSet}&authSource=${authSource}&retryWrites=true&w=majority`);
  console.log('========================================');
}

main().catch(err => console.error('Error:', err.message));
