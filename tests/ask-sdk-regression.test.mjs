import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { createRequire, stripTypeScriptTypes } from 'node:module';
const require = createRequire(new URL('../apps/site/package.json', import.meta.url));
const { generateText, stepCountIs, tool } = require('ai');
const mocks = require('ai/test');
const { z } = require('zod');
const MockModel = mocks.MockLanguageModelV4 ?? mocks.MockLanguageModelV3;
assert.equal(typeof MockModel,'function','Pinned AI SDK must supply a test model');
const source=stripTypeScriptTypes(await readFile(new URL('../apps/site/src/lib/ask-motive/request-evidence.ts',import.meta.url),'utf8'));
const {createRequestEvidence,finalAnswerStep}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const usage={inputTokens:{total:1,noCache:1,cacheRead:0,cacheWrite:0},outputTokens:{total:1,text:1,reasoning:0}};

test('installed AI SDK performs three evidence steps then a visible final answer, sharing reads',async()=>{
 let calls=0,reads=0;
 const choices=[];
 const memo=createRequestEvidence(new AbortController().signal);
 const model=new MockModel({doGenerate:async opts=>{
  calls++;choices.push(opts.toolChoice);
  if(opts.toolChoice?.type==='none')return {content:[{type:'text',text:'The ledger is unavailable; it is not empty.'}],finishReason:{unified:'stop',raw:'stop'},usage,warnings:[]};
  return {content:[{type:'tool-call',toolCallId:`call-${calls}`,toolName:'read_ledger',input:'{}'}],finishReason:{unified:'tool-calls',raw:'tool_calls'},usage,warnings:[]};
 }});
 const result=await generateText({model,prompt:'Review my recorded ledger.',maxRetries:0,
  stopWhen:stepCountIs(4),prepareStep:({stepNumber})=>finalAnswerStep(stepNumber),
  tools:{read_ledger:tool({inputSchema:z.object({}),execute:()=>memo.read('ledger',async()=>{reads++;return {unavailable:true,empty:false};})})},
 });
 assert.equal(calls,4);assert.equal(reads,1);assert.equal(choices.at(-1).type,'none');
 assert.equal(result.steps.length,4);assert.equal(result.text,'The ledger is unavailable; it is not empty.');
 assert.deepEqual(memo.stats(),{readsStarted:1,readsReused:2});
});
