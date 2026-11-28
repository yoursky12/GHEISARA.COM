import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
const require = createRequire(import.meta.url);
const model = { exports: {} };
new Function('module','exports',ts.transpileModule(readFileSync('src/lib/community-model.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(model,model.exports);
const domain = { exports: {} };
const sharedCanvas = { exports: {} };
const drawingDocument = { exports: {} };
new Function('module','exports',ts.transpileModule(readFileSync('src/lib/drawing-document.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(drawingDocument,drawingDocument.exports);
new Function('require','module','exports',ts.transpileModule(readFileSync('src/lib/shared-canvas.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(() => drawingDocument.exports,sharedCanvas,sharedCanvas.exports);
new Function('require','module','exports',ts.transpileModule(readFileSync('src/lib/project-domain.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(name => name === './shared-canvas' ? sharedCanvas.exports : model.exports,domain,domain.exports);
let user;
let data;
const mockRequire = id => ({
  '@/lib/project-domain': domain.exports,
  '@/lib/community-model': model.exports,
  '@/lib/auth': { currentUser: async () => user },
  '@/lib/collab-store': { store: fn => fn(data) },
  'next/navigation': { redirect: location => { throw new Error(`redirect:${location}`); } },
  'next/cache': { revalidatePath() {} },
}[id] ?? require(id));
const compiled = { exports: {} };
new Function('require', 'module', 'exports', ts.transpileModule(readFileSync('src/app/collab/actions.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText)(mockRequire, compiled, compiled.exports);
const mutate = fields => compiled.exports.mutate(new Map(Object.entries(fields)));
const a = { id: 'a', name: 'A', open: true };
const b = { id: 'b', name: 'B', open: false };
const c = { id: 'c', name: 'C', open: true };
const mutual = [{ user: 'a', creator: 'b' }, { user: 'b', creator: 'a' }];
const reset = () => { user = a; data = { users: [a,b,c], invitations: [], projects: [], follows: [...mutual] }; };
const invite = { operation: 'invite', recipient: 'b', type: 'Art Trade', deadline: '2099-01-01', license: 'All rights reserved', idea: 'A shared artwork' };
reset();
user = null;
await assert.rejects(mutate(invite), /redirect:\/auth\/login/);
user = a;
await assert.rejects(mutate({ ...invite, recipient: 'a' }), /Pengajuan/);
await assert.rejects(mutate({ ...invite, deadline: '2020-01-01' }), /Pengajuan/);
await assert.rejects(mutate({ ...invite, deadline: '2099-02-31' }), /Pengajuan/);
data.follows = [];
await assert.rejects(mutate(invite), /saling%20mengikuti/);
data.follows = [mutual[0]];
await assert.rejects(mutate(invite), /saling%20mengikuti/);
data.follows = [...mutual];
await mutate(invite);
assert.equal(data.invitations.length, 1);
const id = data.invitations[0].id;
await assert.rejects(mutate(invite), /tertunda/);
await assert.rejects(mutate({ operation: 'accepted', id }), /tidak%20ditemukan/);
user = c;
await assert.rejects(mutate({ operation: 'accepted', id }), /tidak%20ditemukan/);
user = b;
data.follows = [mutual[1]];
await assert.rejects(mutate({ operation: 'accepted', id }), /saling%20mengikuti/);
assert.equal(data.projects.length, 0);
assert.equal(data.invitations[0].status, 'pending');
data.follows = [...mutual];
await mutate({ operation: 'accepted', id });
await mutate({ operation: 'accepted', id });
assert.equal(data.projects.length, 1);
const project = data.projects[0];
data.follows = [];
await assert.rejects(mutate({ operation: 'candidate', id: project.id }), /saling%20mengikuti/);
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
console.log('Collab checks passed: mutual-follow invite, acceptance and artwork rules, login, validation, ownership, duplicate requests, idempotent acceptance, private chat, rejection.');
