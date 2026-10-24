(()=>{'use strict';
const cfg=window.HANAM_V06_CONFIG||{};
const $=id=>document.getElementById(id);
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const validConfig=/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(cfg.supabaseUrl||'')&&/^sb_publishable_[\w-]+$/.test(cfg.publishableKey||'');
const client=validConfig&&window.supabase?.createClient?window.supabase.createClient(cfg.supabaseUrl,cfg.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}}):null;
let allowed=false,person=null,tab='posts',posts=[],comments=[],reports=[],photos=[];
const feedback=(message,error=false)=>{$('feedback').textContent=message;$('feedback').className='status'+(error?' danger':'');};
function visible(id,show){$(id).classList.toggle('hidden',!show)}
function reset(message){allowed=false;person=null;posts=[];comments=[];reports=[];photos=[];visible('board',false);visible('signout',false);visible('loginBox',!!client);feedback(message,!client)}
function when(t){tab=t;document.querySelectorAll('[data-filter]').forEach(b=>b.classList.toggle('active',b.dataset.filter===t));render()}
function time(v){try{return new Date(v).toLocaleString('ko-KR')}catch{return ''}}
function toItem(item,kind){if(kind==='reports')return `<article class="item"><div class="line"><strong>신고 · ${esc(item.reason)}</strong><small>${esc(time(item.created_at))}</small></div><p>${esc(item.detail||'(추가 설명 없음)')}</p><div class="id">게시물: ${esc(item.post_id)} · 신고자: ${esc(item.reporter_id)}</div><div class="actions"><button class="reject" data-kind="posts" data-id="${esc(item.post_id)}" data-next="removed">신고된 글 숨기기</button></div></article>`;
const isPost=kind==='posts',associated=isPost?photos.filter(f=>f.post_id===item.id):[];
const img=associated.map(f=>f.signedUrl?`<a href="${esc(f.signedUrl)}" target="_blank" rel="noopener noreferrer"><img alt="검토용 사진" src="${esc(f.signedUrl)}" loading="lazy"></a>`:'<span class="muted">사진 접근 불가</span>').join('');
const photoIssue=isPost&&item.kind==='photo'&&(associated.length<1||associated.length>10);
return `<article class="item"><div class="line"><strong>${esc(isPost?(item.kind==='photo'?`${item.zone||'?'}구역 · 사진`:'이웃 이야기'):'댓글')}</strong><small>${esc(time(item.created_at))}</small></div><h3>${esc(isPost?item.title:'댓글 검토')}</h3><p>${esc(item.body||'(설명 없음)')}</p><div class="muted">작성자 ${esc(item.nickname||'미확인')}${isPost?` · ${esc(item.spot||'')}`:''}</div>${img?`<div class="photos">${img}</div>`:''}${photoIssue?'<p class="status danger">사진이 1~10장인지 확인되지 않아 게시 승인을 막았습니다.</p>':''}<div class="id">${esc(item.id)}</div><div class="actions"><button type="button" ${photoIssue?'disabled':''} data-kind="${kind}" data-id="${esc(item.id)}" data-next="published">승인</button><button type="button" class="reject" data-kind="${kind}" data-id="${esc(item.id)}" data-next="removed">반려</button></div></article>`;
}
function render(){if(!allowed)return;$('countPosts').textContent=String(posts.length);$('countComments').textContent=String(comments.length);$('countReports').textContent=String(reports.length);const list=tab==='posts'?posts:tab==='comments'?comments:reports;$('content').innerHTML=list.length?list.map(p=>toItem(p,tab)).join(''):'<p class="muted">현재 처리할 항목이 없습니다.</p>';}
async function authorize(){if(!client){reset('Supabase 연결 설정이 올바르지 않습니다.');return}
const u=await client.auth.getUser();if(u.error||!u.data?.user){reset('관리자 로그인이 필요합니다.');return}
const user=u.data.user;if(user.is_anonymous===true){reset('익명 참여 계정은 관리자 권한을 사용할 수 없습니다.');return}
const {data,error}=await client.from('hanam_moderators').select('user_id').eq('user_id',user.id).maybeSingle();
if(error||!data){reset('이 계정에는 관리자 권한이 없습니다. Supabase에서 운영자 UID 등록이 필요합니다.');return}
allowed=true;person=user;visible('board',true);visible('loginBox',false);visible('signout',true);$('operatorLabel').textContent=user.email||user.id;feedback('관리자 권한이 확인됐습니다.');await refresh();
}
async function refresh(){if(!allowed)return;feedback('승인 대기 목록을 불러오는 중입니다.');
try{
const [a,b,c]=await Promise.all([
client.from('hanam_posts').select('id,kind,title,body,nickname,zone,spot,status,created_at').eq('status','pending').order('created_at',{ascending:true}).limit(120),
client.from('hanam_comments').select('id,post_id,body,nickname,status,created_at').eq('status','pending').order('created_at',{ascending:true}).limit(120),
client.from('hanam_reports').select('id,post_id,reason,detail,reporter_id,created_at').order('created_at',{ascending:false}).limit(80)
]);for(const r of [a,b,c])if(r.error)throw r.error;
posts=a.data||[];comments=b.data||[];reports=c.data||[];photos=[];
const ids=posts.filter(p=>p.kind==='photo').map(p=>p.id);
if(ids.length){const f=await client.from('hanam_photos').select('post_id,ordinal,object_path').in('post_id',ids).order('ordinal');if(f.error)throw f.error;photos=f.data||[];
for(const photo of photos.slice(0,120)){const signed=await client.storage.from('hanam-photos').createSignedUrl(photo.object_path,600);photo.signedUrl=signed.error?'':signed.data.signedUrl;}
}
render();feedback('조회 완료 · 게시물 '+posts.length+'건 / 댓글 '+comments.length+'건 / 신고 '+reports.length+'건');
}catch(err){feedback('조회 실패: '+(err.message||'권한과 연결 상태를 확인하세요.'),true)}
}
async function act(kind,id,next){if(!allowed)throw Error('관리자 권한이 필요합니다.');if(!['posts','comments'].includes(kind)||!['published','removed'].includes(next))throw Error('잘못된 요청입니다.');
if(kind==='posts'&&next==='published'){const p=posts.find(p=>p.id===id);if(p?.kind==='photo'){const num=photos.filter(x=>x.post_id===id).length;if(num<1||num>10)throw Error('사진 1~10장을 확인한 뒤 승인해 주세요.');}}
const verb=next==='published'?'승인':'반려';if(!window.confirm(verb+'하시겠습니까? 사진에 얼굴·개인정보·저작권 문제가 없는지도 확인해 주세요.'))return;
const table=kind==='posts'?'hanam_posts':'hanam_comments';const result=await client.from(table).update({status:next}).eq('id',id).eq('status',tab==='reports'?'published':'pending').select('id');
if(result.error)throw result.error;if(!result.data?.length)throw Error('대상이 이미 처리되었거나 수정 권한이 없습니다.');await refresh();feedback(verb+' 처리했습니다.');
}
$('loginForm').addEventListener('submit',async e=>{e.preventDefault();const btn=e.target.querySelector('button');btn.disabled=true;feedback('로그인 중입니다.');try{const email=$('email').value.trim(),pwd=$('password').value;const res=await client.auth.signInWithPassword({email,password:pwd});if(res.error)throw res.error;$('password').value='';await authorize()}catch(err){feedback('로그인 실패: '+(err.message||'이메일·비밀번호를 확인하세요.'),true)}finally{btn.disabled=false}});
$('signout').addEventListener('click',async()=>{await client?.auth.signOut();reset('로그아웃했습니다.')});
$('refresh').addEventListener('click',refresh);
document.querySelectorAll('[data-filter]').forEach(b=>b.addEventListener('click',()=>when(b.dataset.filter)));
$('content').addEventListener('click',async e=>{const b=e.target.closest('button[data-kind]');if(!b)return;b.disabled=true;try{await act(b.dataset.kind,b.dataset.id,b.dataset.next)}catch(err){feedback(err.message||'승인 처리 실패',true)}finally{if(b.isConnected)b.disabled=false}});
authorize().catch(e=>reset('인증 상태 확인 실패: '+e.message));
})();