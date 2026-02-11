import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
    vus: 300,
    duration: '1m',
};

function getRandomIP() {
    return `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
}

export default function () {
    const url = 'https://app.sharkfunded.com';
    const params = {
        headers: {
            'X-Forwarded-For': getRandomIP(),
            'User-Agent': 'k6-stress-test',
        },
    };

    const res = http.get(url, params);

    check(res, {
        'status is 200': (r) => r.status === 200,
    });

    sleep(1);
}
