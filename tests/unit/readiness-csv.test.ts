import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readinessCsv} from '../../src/lib/diagnostic/readiness-csv';
test('teacher CSV escapes formula cells, quotes, newlines and international phone numbers',()=>{
 const csv=readinessCsv([{id:'1',name:'=HYPERLINK("bad")',phone:'+213780000001',cohort:'CEIL_AUTUMN_2026',pathway:'GENERAL_TRAINING',state:'SUBMITTED'}]);
 assert.ok(csv.includes('"\'=HYPERLINK(""bad"")"'));assert.ok(csv.includes('"\'+213780000001"'));assert.ok(csv.includes('"CEIL_AUTUMN_2026"'));
});
