#!/usr/bin/env node
/* eslint-disable no-await-in-loop,no-console */

'use strict';

const meow = require('meow');
const { waitForNodes } = require('../selenium');

const cli = meow(`
  Usage
    $ wait-for-nodes <nodes>
    
  Options
    --host [0.0.0.0] The host where the Selenium hub is listening.
    --port [4444]    The port where the Selenium hub is listening.
    --retries [15]   Number of times to retry waiting for all nodes to connect.
                     There's a 1 second wait between retries.
`, {
  flags: {
    host: {
      type: 'string',
      default: '0.0.0.0'
    },
    port: {
      type: 'number',
      default: 4444
    },
    retries: {
      type: 'number',
      default: 15
    }
  }
});


const expectedNodes = parseInt(cli.input[0], 10);
const { retries, host, port } = cli.flags;

(async () => {
  await waitForNodes(expectedNodes, retries, host, port);

  console.log('Hub is ready');
})();
