// Builds the n8n "Daily Teaser - Comics" workflow JSON from the node code files.
// Run: node build-daily-workflow.js   ->   daily-teaser.workflow.json
// Clone to other sites by changing: SITE / SOURCE_SITE / SITE_DOMAIN consts + workflow name.
const fs = require('fs');
const path = require('path');
const here = __dirname;
const read = (f) => fs.readFileSync(path.join(here, f), 'utf8');

function node(id, name, type, typeVersion, position, parameters, extra) {
  return Object.assign({ parameters, type, typeVersion, position, id, name }, extra || {});
}

const nodes = [
  node('d-0001', 'Daily 7 AM', 'n8n-nodes-base.scheduleTrigger', 1.3, [0, 0],
    { rule: { interval: [{ field: 'days', daysInterval: 1, triggerAtHour: 7, triggerAtMinute: 0 }] } }),
  node('d-0002', 'Get Daily Items', 'n8n-nodes-base.code', 2, [220, 0],
    { jsCode: read('node-get-daily.js') }, { alwaysOutputData: true }),
  node('d-0003', 'Build Daily Email', 'n8n-nodes-base.code', 2, [440, 0],
    { jsCode: read('node-build-daily.js') }),
  node('d-0004', 'Fetch Audience', 'n8n-nodes-base.code', 2, [660, 0],
    { jsCode: read('node-fetch-audience.js') }),
  node('d-0005', 'Send via GHL', 'n8n-nodes-base.code', 2, [880, 0],
    { jsCode: read('node-send-ghl.js') }),
  node('d-0006', 'Report to Joe', 'n8n-nodes-base.gmail', 2.2, [1100, 0],
    { resource: 'message', operation: 'send',
      sendTo: 'marketing@coastaldirectoryllc.com',
      subject: '={{ $json.reportSubject }}',
      emailType: 'html',
      message: '={{ $json.reportHtml }}',
      options: { appendAttribution: false } },
    { credentials: { gmailOAuth2: { id: 'Ojj89vg1yw4q6fdk', name: 'Gmail – claude@' } } })
];

const connections = {
  'Daily 7 AM': { main: [[{ node: 'Get Daily Items', type: 'main', index: 0 }]] },
  'Get Daily Items': { main: [[{ node: 'Build Daily Email', type: 'main', index: 0 }]] },
  'Build Daily Email': { main: [[{ node: 'Fetch Audience', type: 'main', index: 0 }]] },
  'Fetch Audience': { main: [[{ node: 'Send via GHL', type: 'main', index: 0 }]] },
  'Send via GHL': { main: [[{ node: 'Report to Joe', type: 'main', index: 0 }]] }
};

const wf = { name: 'Daily Teaser - Comics', nodes, connections, pinData: {}, settings: { executionOrder: 'v1', timezone: 'America/New_York' } };
fs.writeFileSync(path.join(here, 'daily-teaser.workflow.json'), JSON.stringify(wf, null, 2), 'utf8');
console.log('Wrote daily-teaser.workflow.json -', nodes.length, 'nodes');
