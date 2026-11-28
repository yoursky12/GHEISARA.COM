import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import ts from 'typescript';
import sharp from 'sharp';
const require = createRequire(import.meta.url);
const root = process.cwd();
let user = { id: 'a', name: 'Artist A', open: true };
const b = { id: 'b', name: 'Artist B', open: true };
const outsider = { id: 'c', name: 'Outsider', open: true };
const data = { users: [user,b,outsider], sessions: [], artworks: [], projects: [], invitations: [], follows: [], appreciations: [], comments: [], collections: [], notifications: [] };
const mocks = {
  'server-only': {},
  '@/lib/auth': { currentUser: async () => user, readAsCurrentUser: async fn => user ? fn(user, data) : null },
  '@/lib/collab-store': { store: fn => fn(data) },
  'next/cache': { revalidatePath() {} },
  'next/navigation': { redirect: location => { throw new Error(`redirect:${location}`); } },
};
function load(path) {
  const compiled = { exports: {} };
  const source = ts.transpileModule(readFileSync(join(root,path),'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  new Function('require','module','exports',source)(id => mocks[id] ?? require(id),compiled,compiled.exports);
  return compiled.exports;
}
const model = load('src/lib/community-model.ts'); mocks['@/lib/community-model'] = model; mocks['./community-model'] = model;
mocks['./catalog'] = load('src/lib/catalog.ts');
mocks['./collab-store'] = mocks['@/lib/collab-store'];
const community = load('src/lib/community.ts'); mocks['@/lib/community'] = community;
mocks['./drawing-document'] = mocks['@/lib/drawing-document'] = load('src/lib/drawing-document.ts');
mocks['./shared-canvas'] = mocks['@/lib/shared-canvas'] = load('src/lib/shared-canvas.ts');
const domain = load('src/lib/project-domain.ts'); mocks['@/lib/project-domain'] = domain;
mocks['@/lib/http'] = load('src/lib/http.ts');
const draft = load('src/app/api/studio/[id]/route.ts');
const deleteDraft = load('src/app/studio/artworks/new/actions.ts').deletePersonalDraft;
const renameDraft = load('src/app/studio/title-actions.ts').renameStudioDraft;
const publish = load('src/app/api/studio/[id]/publish/route.ts').POST;
const media = load('src/app/api/media/[id]/route.ts').GET;
const profilePhoto = load('src/app/api/profile-photo/[asset]/route.ts').GET;
const action = load('src/app/community-actions.ts').communityAction;
const collab = load('src/app/collab/actions.ts').mutate;
const mutateCollabInbox = load('src/app/collab/actions.ts').mutateCollabInbox;
const studioInbox = load('src/app/api/studio/collab/route.ts').GET;
const shared = load('src/app/api/studio/collab/projects/[projectId]/strokes/route.ts');
const notificationSummary = load('src/app/api/notifications/route.ts').GET;
const origin = 'http://localhost:3100';
const id = 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';
const ctx = { params: Promise.resolve({id}) };
const request = (method,body,endpoint=`/api/studio/${id}`) => new Request(origin+endpoint,{method,headers:{origin,'Content-Type':'application/json'},body:JSON.stringify(body)});
const fields = { title:'First artwork', description:'A real artwork', medium:'Digital', styles:['Abstrak','Ilustrasi'], license:'CC BY 4.0', era:'', revision:0 };
const redirectAction = async fields => assert.rejects(action(new Map(Object.entries(fields))), /^Error: redirect:/);
const temporary = mkdtempSync(join(tmpdir(),'geishara-test-'));
try {
  process.chdir(temporary);
  const account = user;
  user = null; assert.equal((await draft.PUT(request('PUT',fields),ctx)).status,401); user = account;
  assert.equal((await draft.PUT(new Request(origin,{method:'PUT',body:'{}'}),ctx)).status,403);
  assert.equal((await draft.PUT(request('PUT',fields),ctx)).status,200);
  assert.equal(data.artworks.length,1);
  assert.equal((await draft.PUT(request('PUT',fields),ctx)).status,409);
  user = outsider;
  assert.equal((await draft.PUT(request('PUT',{...fields,revision:1}),ctx)).status,404);
  assert.equal((await media(new Request(origin),ctx)).status,404);
  user = data.users[0];
  assert.equal((await publish(request('POST',{revision:1}),ctx)).status,422);
  const png = await sharp({create:{width:20,height:12,channels:4,background:'#336699'}}).png().toBuffer();
  const upload = (bytes,type='image/png',revision=1,endpoint=`/api/studio/${id}`) => { const form = new FormData(); form.set('file',new File([bytes],'art.png',{type})); form.set('revision',String(revision)); return new Request(origin+endpoint,{method:'POST',headers:{origin},body:form}); };
  assert.equal((await draft.POST(upload(new TextEncoder().encode('<svg/>')) ,ctx)).status,415);
  assert.equal((await draft.POST(upload(png,'image/jpeg'),ctx)).status,415);
  assert.equal((await draft.POST(upload(new Uint8Array(20*1024*1024+1)),ctx)).status,413);
  assert.equal((await draft.POST(upload(png),ctx)).status,200);
  assert.deepEqual(data.artworks[0].colors,['#336699']);
  assert.equal((await media(new Request(origin),ctx)).status,200);
  user = b; assert.equal((await media(new Request(origin),ctx)).status,404);
  user = data.users[0];
  assert.equal(community.publicArtworks().some(a=>a.id===id),false);
  assert.equal((await publish(request('POST',{revision:1}),ctx)).status,409);
  assert.equal(data.notifications.length,0);
  data.follows.push({user:'a',creator:'b'},{user:'b',creator:'a'},{user:'c',creator:'a'});
  assert.equal((await publish(request('POST',{revision:2}),ctx)).status,200);
  assert.equal((await publish(request('POST',{revision:2}),ctx)).status,200);
  const publicationNotices = data.notifications.filter(notice => notice.kind === 'publication');
  assert.deepEqual(publicationNotices.map(notice => notice.user),['a','b']);
  assert.equal(publicationNotices[0].text,'Karyamu “First artwork” sudah terbit.');
  user = b;
  assert.equal((await (await notificationSummary()).json()).publication.href,`/artworks/${id}`);
  user = account;
  data.follows.length = 0;
  assert.equal(community.publicArtworks().filter(a=>a.id===id).length,1);
  const canvasId = 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb';
  const canvasCtx = { params: Promise.resolve({ id: canvasId }) };
  const canvasEndpoint = `/api/studio/${canvasId}?create=1`;
  assert.equal((await draft.POST(upload(new Uint8Array([1, 2]),'image/png',0,canvasEndpoint),canvasCtx)).status,415);
  assert.equal(data.artworks.some(art => art.id === canvasId),false);
  const created = await draft.POST(upload(png,'image/png',0,canvasEndpoint),canvasCtx);
  assert.equal(created.status,200);
  assert.equal((await created.json()).artwork.revision,1);
  assert.equal((await draft.POST(upload(png,'image/png',0,canvasEndpoint),canvasCtx)).status,409);
  const elements = [
    {tool:'rectangle',points:[{x:1,y:2},{x:10,y:11}],color:'#663300',size:2,opacity:100,fill:false},
    {tool:'pen',points:[{x:1,y:2},{x:5,y:9},{x:9,y:3}],color:'#663300',size:2,opacity:100,fill:true,curvature:83},
    {tool:'brush',points:[{x:1,y:2},{x:4,y:6},{x:12,y:8}],color:'#663300',size:4,opacity:100,fill:false,texture:'solid',smooth:true},
    {tool:'brush',points:[{x:8,y:3}],color:'#663300',size:3,opacity:75,fill:false,texture:'pencil',smooth:false},
  ];
  const layers = [
    {name:'Sketsa',visible:true,opacity:65,elements},
    ...Array.from({length:8},(_,index)=>({name:`Warna ${index+1}`,visible:false,opacity:100})),
  ];
  const layerSheet = await sharp({create:{width:20,height:12*layers.length,channels:4,background:'#33669980'}}).png().toBuffer();
  const layeredUpload = async sheet => {
    const original = upload(png,'image/png',1,`/api/studio/${canvasId}`);
    const form = await original.formData();
    form.set('drawing',JSON.stringify({width:20,height:12,layers}));
    form.set('layers',new File([sheet],'layers.png',{type:'image/png'}));
    return draft.POST(new Request(original.url,{method:'POST',headers:{origin},body:form}),canvasCtx);
  };
  assert.equal((await layeredUpload(png)).status,422);
  const savedLayers = await layeredUpload(layerSheet);
  assert.equal(savedLayers.status,200);
  const layerDocument = (await savedLayers.json()).artwork.drawing;
  assert.deepEqual(layerDocument.layers,layers);
  const layerRequest = new Request(origin+`/api/studio/${canvasId}?v=${layerDocument.asset}`);
  const storedLayers = await draft.GET(layerRequest,canvasCtx);
  assert.equal(storedLayers.status,200);
  assert.equal(storedLayers.headers.get('cache-control'),'private, no-store');
  const decoded = await sharp(Buffer.from(await storedLayers.arrayBuffer())).raw().toBuffer();
  assert.deepEqual(decoded,await sharp(layerSheet).raw().toBuffer());
  user = b; assert.equal((await media(new Request(origin),ctx)).status,200);
  assert.equal((await media(new Request(origin),canvasCtx)).status,404);
  assert.equal((await draft.GET(layerRequest,canvasCtx)).status,404);
  user = data.users[0];
  assert.equal((await draft.POST(upload(png,'image/png',2,`/api/studio/${canvasId}`),canvasCtx)).status,200);
  assert.equal((await draft.GET(layerRequest,canvasCtx)).status,404);
  user = b;
  await redirectAction({operation:'like',id,enabled:'yes'});
  await redirectAction({operation:'like',id,enabled:'yes'});
  assert.equal(data.appreciations.length,1);
  await redirectAction({operation:'like',id,enabled:'no'}); assert.equal(data.appreciations.length,0);
  await redirectAction({operation:'follow',id:'a',username:community.usernameOf(data.users[0]),enabled:'yes'});
  await redirectAction({operation:'follow',id:'a',username:community.usernameOf(data.users[0]),enabled:'yes'});
  assert.equal(data.follows.length,1); assert.equal(community.feedArtworks('following','b').length,1);
  const followNotices = data.notifications.filter(notice => notice.kind === 'follow');
  assert.equal(followNotices.length,1);
  assert.equal(followNotices[0].user,'a');
  assert.deepEqual((await (await studioInbox()).json()).friends,[]);
  await redirectAction({operation:'collection',name:'Private inspiration'});
  const collection = data.collections[0];
  user=outsider;
  await redirectAction({operation:'save',id,collection:collection.id,enabled:'yes'});
  assert.equal(collection.artworks.length,0);
  user=b;
  await redirectAction({operation:'save',id,collection:collection.id,enabled:'yes'});
  await redirectAction({operation:'save',id,collection:collection.id,enabled:'yes'});
  assert.deepEqual(collection.artworks,[id]);
  await redirectAction({operation:'comment',id,text:'<script>safe as text</script>'});
  assert.equal(data.comments.length,1);
  user=outsider; await redirectAction({operation:'delete-comment',id,comment:data.comments[0].id}); assert.equal(data.comments.length,1);
  user=b; await redirectAction({operation:'delete-comment',id,comment:data.comments[0].id}); assert.equal(data.comments.length,0);
  const dna = model.artDNA([{status:'published',styles:['A','B','C'],colors:['#ffffff']},{status:'draft',styles:['X'],colors:[]}]);
  assert.equal(dna.count,1); assert.equal(dna.styles.reduce((sum,s)=>sum+s.percent,0),100); assert.equal(dna.styles.some(s=>s.style==='X'),false);
  assert.deepEqual(model.artDNA([]).styles,[]);
  assert.equal(new Date(model.periodStart('today',new Date('2026-11-10T17:01:00Z'))).toISOString(),'2026-11-10T17:00:00.000Z');
  assert.equal(new Date(model.periodStart('week',new Date('2026-11-08T18:01:00Z'))).toISOString(),'2026-11-08T17:00:00.000Z');
  const project = {id:'project',invitation:'invitation',members:['a','b'],messages:[],candidateId:'candidate',approvals:[]};
  const candidate = {...data.artworks[0],id:'candidate',projectId:'project',coauthors:['a','b'],status:'draft',revision:1};
  data.projects.push(project); data.artworks.push(candidate);
  user = data.users[0];
  const sharedCtx = {params:Promise.resolve({id:'candidate'})};
  assert.equal((await publish(request('POST',{revision:1}),sharedCtx)).status,403);
  assert.equal((await draft.POST(upload(png,'image/png',1,'/api/studio/candidate'),sharedCtx)).status,403);
  user = outsider; assert.equal((await media(new Request(origin),sharedCtx)).status,404);
  assert.equal(domain.canPublishTogether(project,candidate),false);
  assert.notEqual(domain.approveCandidate(project,candidate,'c',1),'');
  assert.equal(domain.approveCandidate(project,candidate,'a',1),'');
  assert.equal(domain.canPublishTogether(project,candidate),false);
  assert.equal(domain.approveCandidate(project,candidate,'b',1),'');
  assert.equal(domain.canPublishTogether(project,candidate),true);
  candidate.revision++; assert.equal(domain.canPublishTogether(project,candidate),false);
  assert.notEqual(domain.approveCandidate(project,candidate,'a',1),'');
  domain.approveCandidate(project,candidate,'a',2); domain.approveCandidate(project,candidate,'b',2);
  user = outsider;
  await assert.rejects(collab(new Map(Object.entries({operation:'publish',id:'project'}))),/redirect:\/studio\/collab\?error=/);
  assert.equal(candidate.status,'draft');
  user=b;
  await assert.rejects(collab(new Map(Object.entries({operation:'publish',id:'project'}))),/saling%20mengikuti/);
  data.follows.push({user:'a',creator:'b'});
  data.follows.push({user:'b',creator:'c'},{user:'c',creator:'b'});
  await assert.rejects(collab(new Map(Object.entries({operation:'publish',id:'project'}))),/redirect:\/artworks\/candidate/);
  await assert.rejects(collab(new Map(Object.entries({operation:'publish',id:'project'}))),/redirect:\/artworks\/candidate/);
  assert.equal(data.artworks.filter(a=>a.id==='candidate').length,1);
  assert.equal(candidate.status,'published');
  assert.deepEqual(data.notifications.filter(notice => notice.kind === 'publication' && notice.href === '/artworks/candidate')
    .map(notice => notice.user),['a','b','c']);
  data.follows.splice(-2);
  assert.equal(community.feedArtworks('collaborations').length,1);
  assert.equal(community.publicArtworks().find(a=>a.id==='candidate').creators.length,2);
  user = data.users[0];
  const activeDraft = data.artworks.find(art => art.id === canvasId);
  const base = activeDraft.asset;
  assert.ok((await mutateCollabInbox(new Map(Object.entries({
    operation:'invite', recipient:'b', draftId:canvasId, draftRevision:String(activeDraft.revision - 1),
  })))).error);
  const sent = await mutateCollabInbox(new Map(Object.entries({
    operation:'invite', recipient:'b', draftId:canvasId, draftRevision:String(activeDraft.revision),
  })));
  assert.equal(sent.error,'');
  const invitation = data.invitations.at(-1);
  const senderNotices = await (await notificationSummary()).json();
  assert.equal(senderNotices.invite,null);
  assert.equal(senderNotices.follow.href,`/creators/${community.usernameOf(b)}`);
  const sentInbox = await (await studioInbox()).json();
  assert.deepEqual(sentInbox.friends,[{id:'b',name:b.name}]);
  assert.equal(sentInbox.invitations.find(item => item.id === invitation.id).incoming,false);
  user = outsider;
  assert.deepEqual(await (await studioInbox()).json(),{friends:[],invitations:[]});
  user = b;
  const incoming = (await (await studioInbox()).json()).invitations.find(item => item.id === invitation.id);
  assert.equal(incoming.incoming,true);
  assert.equal(incoming.canAccept,true);
  const summary = await notificationSummary();
  assert.equal(summary.headers.get('cache-control'),'private, no-store');
  const notification = await summary.json();
  assert.equal(notification.invite.href,`/studio/collab/requests?invitation=${invitation.id}`);
  assert.ok(notification.unread > 0);
  await redirectAction({operation:'read'});
  assert.deepEqual(await (await notificationSummary()).json(),{unread:0,invite:null,follow:null,publication:null});
  assert.equal((await mutateCollabInbox(new Map([['operation','accepted'],['id',invitation.id]]))).error,'');
  const accepted = (await (await studioInbox()).json()).invitations.find(item => item.id === invitation.id);
  assert.equal(accepted.status,'accepted');
  assert.ok(accepted.projectId);
  user = data.users[0];
  const responseNotice = (await (await notificationSummary()).json()).invite;
  assert.equal(responseNotice.href,`/studio/collab/requests?invitation=${invitation.id}`);
  assert.equal(model.notificationHref(`/studio/collab#ajakan-${invitation.id}`),responseNotice.href);
  assert.equal(model.notificationHref('/studio/collab'),'/studio/collab/requests');
  user = b;
  assert.equal(invitation.deadline,'');
  const sharedProject = data.projects.find(item => item.id === accepted.projectId);
  const sharedDraft = data.artworks.find(art => art.id === sharedProject.candidateId);
  assert.equal(sharedDraft.asset,base);
  assert.notEqual(sharedDraft.id,activeDraft.id);
  const baseRequest = new Request(origin+`/api/media/${sharedDraft.id}?canvasBase=${base}`);
  const baseContext = {params:Promise.resolve({id:sharedDraft.id})};
  assert.equal((await media(baseRequest,baseContext)).status,200);
  const canvasContext = { params: Promise.resolve({projectId:accepted.projectId}) };
  const canvasPath = `/api/studio/collab/projects/${accepted.projectId}/strokes`;
  const firstStroke = {id:'10000000-0000-4000-8000-000000000001',tool:'brush',color:'#663300',size:12,points:[{x:11,y:12}]};
  const secondStroke = {...firstStroke,id:'10000000-0000-4000-8000-000000000002',smooth:'strong',points:[{x:20,y:25},{x:25,y:30},{x:30,y:25}]};
  const getCanvas = () => shared.GET(new Request(origin+canvasPath),canvasContext);
  const postCanvas = body => shared.POST(request('POST',body,canvasPath),canvasContext);
  user = data.users[0];
  const eventStream = await shared.GET(new Request(origin+canvasPath+'?stream=1'),canvasContext);
  assert.equal(eventStream.headers.get('content-type'),'text/event-stream');
  const events = eventStream.body.getReader();
  const readEvent = async () => new TextDecoder().decode((await events.read()).value);
  assert.match(await readEvent(),/^retry:/);
  assert.match(await readEvent(),/"version":0/);
  user = b;
  assert.equal((await postCanvas({kind:'preview',base,stroke:firstStroke,sequence:2})).status,204);
  assert.match(await readEvent(),new RegExp(firstStroke.id));
  assert.equal((await postCanvas({kind:'preview',base,stroke:{...firstStroke,points:[{x:1,y:1}]},sequence:1})).status,204);
  user = data.users[0];
  assert.deepEqual((await (await getCanvas()).json()).previews[0],firstStroke);
  assert.equal((await postCanvas({kind:'stroke',base,stroke:secondStroke})).status,204);
  user = b;
  assert.equal((await postCanvas({kind:'stroke',base,stroke:firstStroke})).status,204);
  assert.equal((await postCanvas({kind:'stroke',base,stroke:firstStroke})).status,204);
  assert.match(await readEvent(),/"version":1/);
  assert.match(await readEvent(),/"version":2/);
  await events.cancel();
  const combined = await (await getCanvas()).json();
  assert.equal(combined.version,2);
  assert.deepEqual(combined.strokes.map(stroke=>stroke.id),[secondStroke.id,firstStroke.id]);
  assert.equal(combined.strokes[0].smooth,'strong');
  assert.equal(combined.strokes[1].smooth,undefined);
  assert.equal((await postCanvas({kind:'visibility',id:secondStroke.id,hidden:true})).status,404);
  assert.equal((await postCanvas({kind:'visibility',id:firstStroke.id,hidden:true})).status,204);
  assert.ok(mocks['@/lib/shared-canvas'].canvasNeedsSave(sharedProject.canvas));
  const finalCtx = {params:Promise.resolve({id:sharedProject.candidateId})};
  const finalPath = `/api/studio/${sharedProject.candidateId}`;
  async function saveFinal(version) {
    const original = upload(png,'image/png',1,finalPath);
    const form = await original.formData();
    form.set('canvasVersion',String(version));
    return draft.POST(new Request(original.url,{method:'POST',headers:{origin},body:form}),finalCtx);
  }
  assert.equal((await saveFinal(2)).status,409);
  assert.equal((await saveFinal(3)).status,200);
  assert.equal(sharedProject.canvas.finalVersion,3);
  const layerId = '20000000-0000-4000-8000-000000000001';
  assert.equal((await postCanvas({kind:'layer',edit:{action:'add',id:layerId}})).status,204);
  const coloredShape = {...firstStroke,id:'20000000-0000-4000-8000-000000000002',tool:'star',
    layer:layerId,color:'#aa33bb',opacity:60,filled:true,points:[{x:10,y:10},{x:35,y:50}]};
  assert.equal((await postCanvas({kind:'stroke',base,stroke:coloredShape})).status,204);
  user = data.users[0];
  assert.equal((await postCanvas({kind:'layer',edit:{action:'update',id:layerId,changes:{name:'Warna',opacity:70}}})).status,204);
  const layeredCanvas = await (await getCanvas()).json();
  assert.deepEqual(layeredCanvas.layers.find(layer=>layer.id===layerId),{id:layerId,name:'Warna',visible:true,opacity:70});
  const syncedShape = layeredCanvas.strokes.find(stroke=>stroke.id===coloredShape.id);
  assert.deepEqual(syncedShape,{...coloredShape,author:'b',hidden:false});
  user = outsider;
  assert.equal((await getCanvas()).status,404);
  assert.equal((await postCanvas({kind:'stroke',base,stroke:firstStroke})).status,404);
  assert.equal((await media(baseRequest,baseContext)).status,404);
  user = null;
  assert.equal((await notificationSummary()).status,401);
  assert.equal((await studioInbox()).status,401);
  const personal = data.artworks.find(art => art.id === canvasId);
  await assert.rejects(deleteDraft(canvasId, personal.revision), /redirect:\/auth\/login/);
  user = outsider;
  assert.ok(await deleteDraft(canvasId, personal.revision));
  user = data.users[0];
  assert.ok(await deleteDraft(canvasId, personal.revision - 1));
  const published = data.artworks.find(art => art.id === id);
  assert.ok(await deleteDraft(id, published.revision));
  assert.equal(await deleteDraft(canvasId, personal.revision), undefined);
  assert.equal(community.personalDrafts(user.id).some(art => art.id === canvasId), false);
  assert.equal((await media(baseRequest,baseContext)).status,200);
  assert.equal((await media(new Request(origin),canvasCtx)).status,404);
  await assert.rejects(action(new Map(Object.entries({
    operation: 'profile', name: 'Nama Kreator', username: 'nama_kreator',
    bio: 'Bio baru', location: 'Jakarta', website: 'https://example.com', open: 'yes',
    photo: new File([png], 'avatar.png', { type: 'image/png' }),
  }))), /redirect:\/creators\/nama_kreator$/);
  assert.equal(community.usernameOf(user), 'nama_kreator');
  assert.equal(user.name, 'Nama Kreator');
  assert.equal(user.bio, 'Bio baru');
  assert.equal(user.location, 'Jakarta');
  assert.equal(user.website, 'https://example.com');
  assert.equal(user.open, true);
  const avatar = user.photo;
  const photoResponse = await profilePhoto(new Request(origin), { params: Promise.resolve({ asset: avatar }) });
  assert.equal(photoResponse.status, 200);
  const avatarImage = await sharp(Buffer.from(await photoResponse.arrayBuffer())).metadata();
  assert.deepEqual([avatarImage.format, avatarImage.width, avatarImage.height], ['webp',384,384]);
  await assert.rejects(action(new Map(Object.entries({
    operation:'profile', name:user.name, username:user.username, photo:new File(['invalid'], 'avatar.png', {type:'image/png'}),
  }))), /redirect:\/studio\/profile\?error=/);
  assert.equal(user.photo, avatar);
  const namedId = 'cccccccc-cccc-4ccc-bccc-cccccccccccc';
  assert.equal((await renameDraft(namedId, 0, '  Sketsa baru  ')).error, '');
  assert.equal(community.personalDrafts(user.id).find(art => art.id === namedId).title, 'Sketsa baru');
  assert.equal((await draft.POST(upload(png, 'image/png', 1, `/api/studio/${namedId}`), {
    params: Promise.resolve({ id: namedId }),
  })).status, 200);
  assert.ok((await renameDraft(namedId, 1, 'Judul kadaluarsa')).error);
  assert.equal((await renameDraft(namedId, 2, 'Judul akhir')).error, '');
  user = b;
  assert.ok((await renameDraft(namedId, 3, 'Akses ditolak')).error);
  assert.equal(data.artworks.find(art => art.id === namedId).title, 'Judul akhir');
  console.log('Community checks passed: draft ACL/revisions, real image validation/palette, private media, idempotent publishing/likes/follows/saves, comment ownership, DNA, WIB ranking periods, version-bound dual approval and single collaboration publication.');
} finally {
  process.chdir(root);
  assert.ok(temporary.startsWith(join(tmpdir(),'geishara-test-')));
  rmSync(temporary,{recursive:true,force:true});
}
