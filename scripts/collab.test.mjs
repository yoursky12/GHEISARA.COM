import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
const require = createRequire(import.meta.url);
const model = { exports: {} };
new Function('module','exports',ts.transpileModule(readFileSync('src/lib/community-model.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(model,model.exports);
const domain = { exports: {} };
new Function('require','module','exports',ts.transpileModule(readFileSync('src/lib/project-domain.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(() => model.exports,domain,domain.exports);
let user;
let data;
const mockRequire = id => ({
  '@/lib/project-domain': domain.exports,
  '@/lib/auth': { currentUser: async () => user },
  '@/lib/collab-store': { store: fn => fn(data) },
  'next/navigation': { redirect: location => { throw new Error(`redirect:${location}`); } },
  'next/cache': { revalidatePath() {} },
}[id] ?? require(id));
const compiled = { exports: {} };
new Function('require', 'module', 'exports', ts.transpileModule(readFileSync('src/app/collab/actions.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText)(mockRequire, compiled, compiled.exports);
const mutate = fields => compiled.exports.mutate(new Map(Object.entries(fields)));
const a = { id: 'a', name: 'A', open: true };
const b = { id: 'b', name: 'B', open: true };
const c = { id: 'c', name: 'C', open: true };
const reset = () => { user = a; data = { users: [a,b,c], invitations: [], projects: [] }; };
const invite = { operation: 'invite', recipient: 'b', type: 'Art Trade', deadline: '2099-01-01', license: 'All rights reserved', idea: 'A shared artwork' };
reset();
user = null;
await assert.rejects(mutate(invite), /redirect:\/auth\/login/);
user = a;
await assert.rejects(mutate({ ...invite, recipient: 'a' }), /Pengajuan/);
await assert.rejects(mutate({ ...invite, deadline: '2020-01-01' }), /Pengajuan/);
await assert.rejects(mutate({ ...invite, deadline: '2099-02-31' }), /Pengajuan/);
await mutate(invite);
assert.equal(data.invitations.length, 1);
const id = data.invitations[0].id;
await assert.rejects(mutate(invite), /tertunda/);
await assert.rejects(mutate({ operation: 'accepted', id }), /tidak%20ditemukan/);
user = c;
await assert.rejects(mutate({ operation: 'accepted', id }), /tidak%20ditemukan/);
user = b;
await mutate({ operation: 'accepted', id });
await mutate({ operation: 'accepted', id });
assert.equal(data.projects.length, 1);
const project = data.projects[0];
user = c;
await assert.rejects(mutate({ operation: 'message', id: project.id, text: 'Intrusion' }), /tidak%20valid/);
assert.equal(project.messages.length, 0);
user = a;
await mutate({ operation: 'message', id: project.id, text: 'Hello partner' });
assert.equal(project.messages.length, 1);
reset();
await mutate(invite);
user = b;
await mutate({ operation: 'rejected', id: data.invitations[0].id });
assert.equal(data.projects.length, 0);
console.log('Collab checks passed: login, validation, ownership, duplicate requests, idempotent acceptance, private chat, rejection.');
