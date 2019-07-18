'use strict';

/* eslint-disable no-console, no-await-in-loop */
const got = require('got');
const execa = require('execa');
const ProgressBar = require('progress');

const TIMEOUT = 1000;
const waitTimeout = resolve => setTimeout(resolve, TIMEOUT);

async function getCurrentlyConnectedNodes(hostname, port) {
  const url = `http://${hostname}:${port}/grid/api/hub`;

  const response = await got(url);

  return JSON.parse(response.body).slotCounts.free;
}

async function waitForNodes(expectedNodes, retries, host, port) {
  let pings = 0;

  const bar = new ProgressBar(':bar Nodes: :actual/:expected Retries: :pings/:retries', {
    total: retries,
    width: 60,
    clear: true
  });

  // Show the initial empty bar.
  bar.tick(0, {
    actual: 0,
    expected: expectedNodes,
    pings: 0,
    retries
  });

  while (pings++ <= retries) {
    let actualNodes = 0;

    try {
      actualNodes = await getCurrentlyConnectedNodes(host, port);
    } catch (e) {
      bar.interrupt(e.message);
    }

    bar.tick(1, {
      actual: actualNodes,
      expected: expectedNodes,
      pings: pings - 1,
      retries
    });

    if (actualNodes < expectedNodes) {
      await new Promise(waitTimeout);
    } else {
      bar.terminate();
      return;
    }
  }

  bar.terminate();

  throw new Error('Hub was not ready in time');
}

async function down(config, composeProjectName) {
  await execa.command(`docker-compose -f ${config} down`, {
    cwd: __dirname,
    env: {
      COMPOSE_PROJECT_NAME: composeProjectName
    },
    stdio: 'inherit'
  });
}

module.exports.start = async function start(nodes, retries, host, port) {
  await execa.command(`docker-compose -f ./docker-compose.yml up -d --scale chrome=${nodes} --scale firefox=${nodes} selenium`, {
    cwd: __dirname,
    env: {
      COMPOSE_PROJECT_NAME: 'tdd-buffet'
    },
    stdio: 'inherit'
  });

  console.log(`Waiting for ${nodes * 2} nodes to connect`);
  await waitForNodes(nodes * 2, retries, host, port);
  console.log('Hub is ready');
};

module.exports.debug = async function debug(retries, host, port) {
  try {
    console.log('Checking to see if hub is already ready');
    // TODO: this actually tries 2 times
    await waitForNodes(2, 1, host, port);

    console.log('Hub was already ready');
    process.exit(0);
  } catch (e) {
    await execa.command('docker-compose -f ./docker-compose.debug.yml up -d selenium', {
      cwd: __dirname,
      env: {
        COMPOSE_PROJECT_NAME: 'tdd-buffet:debug'
      },
      stdio: 'inherit'
    });

    console.log('Waiting for 2 debug nodes to connect');
    await waitForNodes(2, retries, host, port);
    console.log('Hub is ready');
  }
};

module.exports.stop = async function stop() {
  await down('./docker-compose.yml', 'tdd-buffet');
  await down('./docker-compose.debug.yml', 'tdd-buffet:debug');
};
