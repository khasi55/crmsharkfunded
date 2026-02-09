import http from 'k6/http';
import { check, sleep } from 'k6';

// configuration
// export let options = {
//     stages: [
//         { duration: '30s', target: 2000 }, // Ramp up to 20 users
//         { duration: '1m', target: 20 },  // Stay at 20 users
//         { duration: '10s', target: 0 },  // Ramp down to 0
//     ],
// };

export default function () {
    // Replace with your target URL
    // const url = 'https:  // Replace with your target URL
    const url = 'https://fundedhive.com/'; // User requested Funded Hive URL

    let res = http.get(url);

    check(res, {
        'status is 200': (r) => r.status === 200,
    });

    sleep(1);
}
