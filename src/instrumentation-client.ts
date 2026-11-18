import { initBotId } from 'botid/client/core';

initBotId({
  protect: [
    { path: '/api/grade', method: 'POST' },
    { path: '/api/grade/writing', method: 'POST' },
    { path: '/api/leads', method: 'POST' },
    { path: '/api/auth/oauth', method: 'POST' },
    { path: '/api/auth/password', method: 'POST' },
    { path: '/api/account/redeem', method: 'POST' },
    { path: '/api/devices', method: 'POST' },
    { path: '/api/devices', method: 'PATCH' },
    { path: '/api/devices/step-up', method: 'POST' },
    { path: '/api/payments/checkout', method: 'POST' },
  ],
});
