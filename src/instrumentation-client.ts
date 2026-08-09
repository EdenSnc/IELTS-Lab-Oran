import { initBotId } from 'botid/client/core';

initBotId({
  protect: [
    { path: '/api/grade', method: 'POST' },
    { path: '/api/grade/writing', method: 'POST' },
  ],
});
