import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 100 }, // Ramp-up to 100 VUs in 30s
    { duration: '2m', target: 100 },  // Stay at 100 VUs for 2 minutes
    { duration: '30s', target: 0 },   // Ramp-down to 0 VUs in 30s
  ],
  thresholds: {
    http_req_failed: ['rate<0.001'], // error rate < 0.1%
    http_req_duration: ['p(95)<500'], // p95 latency < 500ms
  },
};

export default function () {
  const apiBaseUrl = __ENV.API_BASE_URL || 'http://localhost:8081';
  const url = `${apiBaseUrl}/api/v1/sightings`;
  
  const payload = JSON.stringify({
    speciesId: '550e8400-e29b-41d4-a716-446655440000',
    location: '10.762622, 106.660172',
    date: new Date().toISOString(),
    notes: 'K6 Stress Test Sighting'
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const res = http.post(url, payload, params);

  check(res, {
    'is status 201': (r) => r.status === 201,
  });

  sleep(1);
}
