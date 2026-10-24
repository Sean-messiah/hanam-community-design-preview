(()=>{'use strict';
const config=window.HANAM_V06_CONFIG||{}, output=document.getElementById('log'),checks=document.getElementById('checks');
const buttons=['connection','anon','photo'].map(id=>document.getElementById(id));
let client=null;const lines=[];
function log(msg){lines.push(new Date().toLocaleTimeString('ko-KR')+'  '+msg);output.textContent=lines.join('\n').slice(-15000);}
function status(rows){checks.innerHTML='';for(const [icon,text] of rows){const d=document.createElement('div');d.className='status';const a=document.createElement('span');a.className='dot';a.textContent=icon;const b=document.createElement('span');b.textContent=text;d.append(a,b);checks.appendChild(d)}}
function err(e){log('❌ '+String(e?.message||e));status([['❌',String(e?.message||e)]]);}
async function perform(fn){buttons.forEach(b=>b.disabled=true);try{await fn()}catch(e){err(e)}finally{buttons.forEach(b=>b.disabled=false)}}
function getClient(){if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(config.supabaseUrl||'')||!/^sb_publishable_[\w-]+$/.test(config.publishableKey||'')||!window.supabase?.createClient)throw Error('연결 설정이나 Supabase 라이브러리를 확인해 주세요.');if(!client)client=window.supabase.createClient(config.supabaseUrl,config.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});return client;}
async function server(){
 const s=getClient(),[gate,read,session]=await Promise.all([
 s.from('hanam_site_settings').select('submissions_enabled').eq('id',true).maybeSingle(),
 s.from('hanam_posts').select('id',{count:'exact',head:true}).eq('status','published'),
 s.auth.getSession()]);
 if(gate.error)throw gate.error;if(read.error)throw read.error;if(session.error)throw session.error;
 const on=gate.data?.submissions_enabled===true, existing=Boolean(session.data?.session?.user);
 status([['✅','독립 Supabase 연결 정상'],[on?'✅':'⛔','서버 글쓰기 '+(on?'허용':'차단')],['✅','공개 게시글 조회 가능'],[existing?'✅':'ℹ️',existing?'이 브라우저에 익명/사용자 세션 있음':'로그인 없이 열람 가능']]);
 log('Supabase: '+config.supabaseUrl);
 log('서버 쓰기: '+(on?'ON':'OFF')+', 앱 설정: '+(config.enableSubmissions===true?'ON':'OFF'));
 if(!on)log('⛔ 서버 쓰기가 꺼져 있으므로 글을 등록할 수 없습니다.');
 return {s,on};
}
async function anon(){
 const {s,on}=await server();
 if(!on)throw Error('서버 글쓰기가 잠겨 있습니다.');
 const old=await s.auth.getSession();if(old.error)throw old.error;
 if(old.data?.session?.user){log('✅ 기존 인증 세션 확인. 새 계정을 생성하지 않습니다.');return old.data.session.user;}
 const result=await s.auth.signInAnonymously();
 if(result.error)throw Error('익명 로그인 실패: '+result.error.message+'. 하남점 Supabase Authentication → Providers → Allow anonymous sign-ins 설정을 확인해 주세요.');
 if(!result.data?.user?.id)throw Error('익명 계정 생성 결과가 없습니다.');
 log('✅ 익명 계정 생성 성공 (식별자 끝 6자리 '+result.data.user.id.slice(-6)+')');
 return result.data.user;
}
async function testPhoto(){
 const s=getClient(),user=await anon();let post=null, uploaded=[],published=false,cleanupOk=true;
 try{
 const c=document.createElement('canvas');c.width=32;c.height=32;const cx=c.getContext('2d');cx.fillStyle='#005DAA';cx.fillRect(0,0,32,32);cx.fillStyle='#fff';cx.fillRect(8,8,16,16);
 const blob=await new Promise(resolve=>c.toBlob(resolve,'image/webp',.85));if(!blob||!blob.size)throw Error('WebP 테스트 사진 생성 실패');
 const name='연결 점검 '+Date.now();
 const create=await s.from('hanam_posts').insert({author_id:user.id,nickname:'연결점검',kind:'photo',title:name,body:'자동 생성된 점검용 이미지. 검사 완료 뒤 삭제됩니다.',zone:'B',spot:'B-01',status:'pending'}).select('id').single();if(create.error)throw create.error;post=create.data.id;log('✅ 임시 글 생성');
 const path=user.id+'/'+post+'/0.webp';
 const upload=await s.storage.from('hanam-photos').upload(path,blob,{contentType:'image/webp',upsert:false});if(upload.error)throw upload.error;uploaded.push(path);log('✅ 비공개 버킷 WebP 업로드');
 const meta=await s.from('hanam_photos').insert({post_id:post,author_id:user.id,object_path:path,ordinal:0});if(meta.error)throw meta.error;log('✅ 사진 메타데이터 저장');
 const pub=await s.from('hanam_posts').update({status:'published'}).eq('id',post).eq('author_id',user.id).select('id').single();if(pub.error)throw pub.error;published=true;log('✅ 즉시 공개');
 const found=await s.from('hanam_posts').select('status').eq('id',post).single();if(found.error||found.data?.status!=='published')throw Error('공개 게시글 조회에 실패했습니다.');
 const image=await s.storage.from('hanam-photos').createSignedUrl(path,120);if(image.error||!image.data?.signedUrl)throw Error('사진 공개 링크 생성에 실패했습니다: '+(image.error?.message||'unknown'));
 log('✅ 공개 게시글 및 비공개 사진의 서명 링크 조회');
 }finally{
 if(uploaded.length){const clean=await s.storage.from('hanam-photos').remove(uploaded);if(clean.error){cleanupOk=false;log('⚠️ 사진 정리 실패: '+clean.error.message)}else log('✅ 임시 사진 제거');}
 if(post){const clean=await s.from('hanam_posts').delete().eq('id',post).eq('author_id',user.id);if(clean.error){cleanupOk=false;log('⚠️ 게시글 정리 실패: '+clean.error.message)}else log('✅ 임시 게시글 제거');}
 }
 if(published&&cleanupOk){status([['✅','사진 등록부터 공개·정리까지 성공'],['✅','실제 Supabase 저장소 연결 확인']]);log('🎉 사진 전체흐름 점검 완료');}else if(published){status([['⚠️','게시 성공, 테스트 데이터 정리를 확인해 주세요']]);log('⚠️ 테스트 게시물을 관리자 콘솔에서 점검해 주세요.');}
}
document.getElementById('connection').addEventListener('click',()=>perform(server));
document.getElementById('anon').addEventListener('click',()=>perform(anon));
document.getElementById('photo').addEventListener('click',()=>perform(testPhoto));
document.getElementById('copy').addEventListener('click',()=>{const text=output.textContent||'';if(navigator.clipboard?.writeText)navigator.clipboard.writeText(text).then(()=>log('진단 내용 복사됨')).catch(()=>log('복사에 실패했습니다.'));else log('이 브라우저에서 클립보드를 지원하지 않습니다.');});
})();