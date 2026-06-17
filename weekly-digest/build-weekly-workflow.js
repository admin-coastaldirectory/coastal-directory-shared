// Builds the n8n workflow JSON from the individual node code files.
// Run: node build-weekly-workflow.js   ->   ../csnm-comics-weekly-digest.json
const fs = require('fs');
const path = require('path');
const here = __dirname;
const read = (f) => fs.readFileSync(path.join(here, f), 'utf8');

const getCode = read('node-get.js');
const assembleCode = read('node-assemble.js');
const publishCode = read('node-publish.js');
const prompt = read('prompt.txt');

const fbCode = [
"const GHL_TOKEN='PASTE_GHL_SOCIAL_TOKEN';",
"const LOCATION_ID='MHmcNUWmcWAPevl1QVXm';",
"const BASE='https://services.leadconnectorhq.com/social-media-posting/'+LOCATION_ID;",
"let postText=''; try{ const _c=$input.first().json; if(_c&&_c.social_fb&&String(_c.social_fb).trim()) postText=String(_c.social_fb).trim(); }catch(e){}",
"postText=postText||'Comics weekly roundup.';",
"const aResp=await this.helpers.request({method:'GET',uri:BASE+'/accounts',headers:{Authorization:'Bearer '+GHL_TOKEN,Version:'2021-07-28',Accept:'application/json'},json:true,simple:false,resolveWithFullResponse:true});",
"const accounts=(aResp.body&&aResp.body.results&&aResp.body.results.accounts)||[];",
"const fb=accounts.find(function(a){return String(a.platform||'').toLowerCase()==='facebook'&&/comic/i.test(String(a.name||''));});",
"if(!fb){return [{json:{ok:false,step:'find-fb',available:accounts.map(function(a){return a.platform+':'+a.name;})}}];}",
"const schedule=new Date(Date.now()+600000).toISOString();",
"const body={accountIds:[fb.id],summary:postText,type:'post',userId:'BYgvvyzKS8fphtrTH6ac',media:[],status:'scheduled',scheduleDate:schedule};",
"const pResp=await this.helpers.request({method:'POST',uri:BASE+'/posts',headers:{Authorization:'Bearer '+GHL_TOKEN,Version:'2023-02-21','Content-Type':'application/json',Accept:'application/json'},body:body,json:true,simple:false,resolveWithFullResponse:true});",
"return [{json:{postStatus:pResp.statusCode,fbAccount:fb.name}}];"
].join('\n');

function node(id, name, type, typeVersion, position, parameters, extra) {
  return Object.assign({ parameters, type, typeVersion, position, id, name }, extra || {});
}

const nodes = [
  node('w-0001','Weekly Sunday 7 AM','n8n-nodes-base.scheduleTrigger',1.3,[0,0],
    { rule: { interval: [ { field:'weeks', weeksInterval:1, triggerAtDay:[0], triggerAtHour:7 } ] } }),
  node('w-0002',"Get Week's Comics",'n8n-nodes-base.code',2,[220,0],
    { jsCode: getCode }, { executeOnce:true, alwaysOutputData:true }),
  node('w-0003','Write Digest','@n8n/n8n-nodes-langchain.anthropic',1,[440,0],
    { modelId:{ __rl:true, value:'=claude-haiku-4-5-20251001', mode:'id' },
      messages:{ values:[ { content: '=' + prompt } ] }, options:{ maxTokens: 4096 } },
    { credentials:{ anthropicApi:{ id:'Au45moGPi4Tnsu2q', name:'Anthropic account' } } }),
  node('w-0004','Assemble Pages','n8n-nodes-base.code',2,[660,0],
    { jsCode: assembleCode }),
  node('w-0005','Publish to GitHub','n8n-nodes-base.code',2,[880,0],
    { jsCode: publishCode }),
  node('w-0006','Post to Facebook','n8n-nodes-base.code',2,[1100,-120],
    { jsCode: fbCode }),
  node('w-0007','Email me the digest','n8n-nodes-base.gmail',2.2,[1100,120],
    { resource:'message', operation:'send',
      sendTo:'marketing@coastaldirectoryllc.com',
      subject:'=Weekly digest published: {{ $json.subject }}',
      emailType:'html',
      message:'=<p>Published: <a href="{{ $json.postUrl }}">{{ $json.postUrl }}</a> (index: {{ $json.index }}, post: {{ $json.post }})</p><p><b>X post to paste:</b><br>{{ $json.social_x }}</p><hr><p><b>Newsletter preview (this is what subscribers will get once GHL sync is live):</b></p>{{ $json.emailHtml }}',
      options:{ appendAttribution:false } },
    { credentials:{ gmailOAuth2:{ id:'Ojj89vg1yw4q6fdk', name:'Gmail – claude@' } } })
];

const connections = {
  'Weekly Sunday 7 AM': { main: [[ { node:"Get Week's Comics", type:'main', index:0 } ]] },
  "Get Week's Comics": { main: [[ { node:'Write Digest', type:'main', index:0 } ]] },
  'Write Digest': { main: [[ { node:'Assemble Pages', type:'main', index:0 } ]] },
  'Assemble Pages': { main: [[ { node:'Publish to GitHub', type:'main', index:0 } ]] },
  'Publish to GitHub': { main: [[ { node:'Post to Facebook', type:'main', index:0 }, { node:'Email me the digest', type:'main', index:0 } ]] }
};

const wf = { name:'CSNM Comics Weekly Digest', nodes, connections, pinData:{}, settings:{ executionOrder:'v1' } };
const outPath = path.join(here, '..', 'csnm-comics-weekly-digest.json');
fs.writeFileSync(outPath, JSON.stringify(wf, null, 2), 'utf8');
console.log('Wrote', outPath, '-', nodes.length, 'nodes');
