const autocannon = require('autocannon');

const baseUrl = process.env.PERF_BASE_URL || 'http://127.0.0.1:5000';
const endpoint = process.env.PERF_ENDPOINT || '/api/health';
const duration = Number(process.env.PERF_DURATION_SECONDS || 20);
const connections = Number(process.env.PERF_CONNECTIONS || 20);
const p95Threshold = Number(process.env.PERF_P95_MS || 800);

const targetUrl = `${baseUrl}${endpoint}`;

console.log(`Performance smoke test target: ${targetUrl}`);
console.log(`Duration: ${duration}s, Connections: ${connections}, p95 threshold: ${p95Threshold}ms`);

const run = autocannon(
  {
    url: targetUrl,
    method: 'GET',
    duration,
    connections,
    timeout: 10,
  },
  (err, result) => {
    if (err) {
      console.error('Performance smoke failed to run:', err.message);
      process.exit(1);
    }

    const p95 = Number(result.latency?.p95 || 0);
    const requestsPerSecond = Number(result.requests?.average || 0);
    const errors = result.errors + result.timeouts + result.non2xx;

    console.log('\nSummary:');
    console.log(`- Avg req/sec: ${requestsPerSecond.toFixed(2)}`);
    console.log(`- p95 latency: ${p95} ms`);
    console.log(`- errors + timeouts + non2xx: ${errors}`);

    if (requestsPerSecond === 0 && errors > 0) {
      console.error('\nNo successful responses were recorded. Ensure the API server is running and reachable.');
    }

    if (errors > 0) {
      console.error('\nFail: performance smoke saw errors/timeouts/non2xx responses.');
      process.exit(1);
    }

    if (p95 > p95Threshold) {
      console.error(`\nFail: p95 latency ${p95}ms exceeded threshold ${p95Threshold}ms.`);
      process.exit(1);
    }

    console.log('\nPass: performance smoke thresholds met.');
    process.exit(0);
  }
);

autocannon.track(run, { renderProgressBar: true });