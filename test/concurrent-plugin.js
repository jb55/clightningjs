#!/usr/bin/env node
// A plugin whose one method answers after a delay, so calls overlap.
const Plugin = require(process.env.CLIGHTNINGJS || '../src/plugin.js');

const plugin = new Plugin();
plugin.addMethod('echo', async (params) => {
  await new Promise((resolve) => setTimeout(resolve, params[1]));
  return params[0];
}, '<value> <delay ms>', 'answer with value after delay');
plugin.addMethod('fail', async (params) => {
  const error = new Error('Block height out of range');
  if (params[0]) error.code = -8;
  throw error;
}, '[with code]', 'fail, with code -8 or none');
plugin.start();
