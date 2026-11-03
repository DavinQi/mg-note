/* mg-node HTML 原型：公共交互（纯原生 JS，无外部依赖） */
(function(){
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const store={get:(k,d)=>{try{return localStorage.getItem('mg.'+k)||d}catch(e){return d}},set:(k,v)=>{try{localStorage.setItem('mg.'+k,v)}catch(e){}}};
/* ---------- 个性化设置（与 git-note-tool-design/settings.tsx 同构，localStorage: mg-note-settings） ---------- */
const AV_LIST=[['cat','橘猫'],['fox','小狐狸'],['bunny','兔兔'],['panda','熊猫'],['girl','动漫少女'],['boy','动漫少年'],['cactus','仙人掌'],['monstera','龟背竹'],['sunflower','向日葵'],['succulent','多肉']];
const AVATARS=AV_LIST.map(a=>a[0]);
const ACCENTS={indigo:['靛蓝',['#eef2ff','#e0e7ff','#c7d2fe','#a5b4fc','#818cf8','#6366f1','#4f46e5','#4338ca','#3730a3','#312e81']],emerald:['薄荷',['#ecfdf5','#d1fae5','#a7f3d0','#6ee7b7','#34d399','#10b981','#059669','#047857','#065f46','#064e3b']],rose:['樱粉',['#fff1f2','#ffe4e6','#fecdd3','#fda4af','#fb7185','#f43f5e','#e11d48','#be123c','#9f1239','#881337']],orange:['橘子',['#fff7ed','#ffedd5','#fed7aa','#fdba74','#fb923c','#f97316','#ea580c','#c2410c','#9a3412','#7c2d12']],sky:['天空',['#f0f9ff','#e0f2fe','#bae6fd','#7dd3fc','#38bdf8','#0ea5e9','#0284c7','#0369a1','#075985','#0c4a6e']],violet:['葡萄',['#f5f3ff','#ede9fe','#ddd6fe','#c4b5fd','#a78bfa','#8b5cf6','#7c3aed','#6d28d9','#5b21b6','#4c1d95']]};
const APPEARANCES={classic:['经典','冷灰白',['#f8fafc','#e2e8f0','#334155']],paper:['暖纸','手账纸张',['#fffdf7','#e7e5e4','#44403c']],mist:['薄雾','青灰清新',['#f3f8f7','#cfe0dd','#3b5551']]};
const SHAPES={circle:['圆形','50%'],squircle:['圆角','28%'],blob:['云朵','58% 42% 55% 45% / 48% 58% 42% 52%']};
const ARTS=[['anime','少女与植物','assets/login/login-anime.jpg','把每一个念头，种进你的笔记花园'],['cat','猫与龟背竹','assets/login/login-cat.jpg','写下今天，晒晒太阳，慢慢生长'],['plants','窗边花园','assets/login/login-plants.jpg','笔记像植物，需要时间和照料']];
const DEFAULTS={accent:'emerald',appearance:'paper',handFont:false,avatar:'cat',avatarShape:'circle',nickname:'Alex',loginArt:'anime',loginArts:null,carousel:'auto',interval:6,artOrder:'seq'};
const ART_MAX=8,ART_MB=5,ART_RATIO=0.92,ARTKEY='mg-note-login-art:';
function getArts(){const S=getS();const order=S.loginArts||ARTS.map(a=>({id:a[0]}));return order.map(o=>{const p=ARTS.find(a=>a[0]===o.id);if(p)return{id:o.id,name:p[1],src:p[2],slogan:o.slogan??p[3],custom:false};let src=null;try{src=localStorage.getItem(ARTKEY+o.id)}catch(e){}return src?{id:o.id,name:o.name||'自定义',src,slogan:o.slogan??'',custom:true}:null}).filter(Boolean)}
function setArts(list,extra={}){updateS(Object.assign({loginArts:list.map(a=>a.custom?{id:a.id,name:a.name,slogan:a.slogan}:{id:a.id,slogan:a.slogan})},extra))}
function uploadArt(file,done){if(!file)return;if(!/^image\/(jpeg|png|webp)$/.test(file.type))return toast('仅支持 JPG / PNG / WebP');if(file.size>ART_MB*1048576)return toast(`图片超过 ${ART_MB} MB，请压缩后再试`);
  const list=getArts();if(list.filter(a=>a.custom).length>=ART_MAX)return toast(`最多 ${ART_MAX} 张自定义插画`);
  const fr=new FileReader();fr.onload=()=>{const im=new Image();im.onload=()=>{const W=920,H=Math.round(W/ART_RATIO);let sw=im.width,sh=sw/ART_RATIO;if(sh>im.height){sh=im.height;sw=sh*ART_RATIO}
    const c=document.createElement('canvas');c.width=W;c.height=H;c.getContext('2d').drawImage(im,(im.width-sw)/2,(im.height-sh)/2,sw,sh,0,0,W,H);const url=c.toDataURL('image/jpeg',.82);
    const id='u'+Date.now().toString(36);try{localStorage.setItem(ARTKEY+id,url)}catch(e){return toast('本地存储空间不足，请删除几张自定义插画')}
    list.push({id,name:file.name.replace(/\.[^.]+$/,'').slice(0,12)||'自定义',slogan:'',custom:true});setArts(list,{loginArt:id});toast('已添加，裁剪为面板比例 0.92 : 1');done&&done()};im.onerror=()=>toast('图片无法读取');im.src=fr.result};fr.readAsDataURL(file)}
function delArt(id){const list=getArts();if(list.length<=1)return toast('至少保留一张插画');const n=list.filter(a=>a.id!==id);try{localStorage.removeItem(ARTKEY+id)}catch(e){}const S=getS();setArts(n,S.loginArt===id?{loginArt:n[0].id}:{})}
const SKEY='mg-note-settings';
function getS(){try{return Object.assign({},DEFAULTS,JSON.parse(localStorage.getItem(SKEY)||'{}'))}catch(e){return Object.assign({},DEFAULTS)}}
const listeners=[];
function updateS(p){const s=Object.assign(getS(),p);try{localStorage.setItem(SKEY,JSON.stringify(s))}catch(e){}applyTheme();listeners.forEach(f=>f(s))}
function applyTheme(){const s=getS(),r=document.documentElement;const c=(ACCENTS[s.accent]||ACCENTS.emerald)[1];
  ['50','100','200','300','400','500','600','700','800','900'].forEach((k,i)=>r.style.setProperty('--accent-'+k,c[i]));
  r.style.setProperty('--av-radius',(SHAPES[s.avatarShape]||SHAPES.circle)[1]);r.dataset.appearance=s.appearance;r.dataset.hand=s.handFont?'1':'';
  document.querySelectorAll('img.avatar,img[data-av]').forEach(x=>{if(!x.dataset.fixed)x.src=av()});document.querySelectorAll('[data-nick]').forEach(x=>x.textContent=s.nickname||x.dataset.nick)}
const av=id=>'assets/avatars-svg/'+(id||getS().avatar)+'.svg';
applyTheme();

/* ---------- 迷你 Markdown 解析器 ---------- */
function esc(s){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}
function inline(s){return esc(s).replace(/`([^`]+)`/g,'<code>$1</code>').replace(/\*\*([^*]+)\*\*/g,'<b>$1</b>').replace(/\*([^*]+)\*/g,'<i>$1</i>').replace(/~~([^~]+)~~/g,'<s>$1</s>').replace(/==([^=]+)==/g,'<mark>$1</mark>').replace(/!\[([^\]]*)\]\(([^)]+)\)/g,'<img alt="$1" src="$2" style="max-width:100%">').replace(/\[([^\]]+)\]\(([^)]+)\)/g,'<a href="$2">$1</a>')}
function md(src){
  const L=src.replace(/^---\n[\s\S]*?\n---\n/,'').split('\n');let o='',i=0;
  while(i<L.length){let l=L[i];
    if(/^```/.test(l)){let b=[];i++;while(i<L.length&&!/^```/.test(L[i]))b.push(L[i++]);i++;o+='<pre><code>'+esc(b.join('\n'))+'</code></pre>';continue}
    let h=l.match(/^(#{1,6})\s+(.*)/);if(h){o+=`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`;i++;continue}
    if(/^(-{3,}|\*{3,})$/.test(l.trim())){o+='<hr>';i++;continue}
    if(/^>\s?/.test(l)){let b=[];while(i<L.length&&/^>\s?/.test(L[i]))b.push(L[i++].replace(/^>\s?/,''));o+='<blockquote>'+inline(b.join(' '))+'</blockquote>';continue}
    if(/^\|/.test(l)){let rows=[];while(i<L.length&&/^\|/.test(L[i]))rows.push(L[i++]);const cells=r=>r.replace(/^\||\|$/g,'').split('|').map(c=>c.trim());
      o+='<table><tr>'+cells(rows[0]).map(c=>'<th>'+inline(c)+'</th>').join('')+'</tr>'+rows.slice(2).map(r=>'<tr>'+cells(r).map(c=>'<td>'+inline(c)+'</td>').join('')+'</tr>').join('')+'</table>';continue}
    if(/^\s*([-*]|\d+\.)\s/.test(l)){const ol=/^\s*\d+\./.test(l);let b=[];while(i<L.length&&/^\s*([-*]|\d+\.)\s/.test(L[i]))b.push(L[i++].replace(/^\s*([-*]|\d+\.)\s/,''));
      o+=(ol?'<ol>':'<ul>')+b.map(x=>'<li>'+inline(x).replace(/^\[ \]/,'☐').replace(/^\[x\]/,'☑')+'</li>').join('')+(ol?'</ol>':'</ul>');continue}
    if(!l.trim()){i++;continue}
    let b=[];while(i<L.length&&L[i].trim()&&!/^(#|```|>|\||\s*[-*]\s|\s*\d+\.\s)/.test(L[i]))b.push(L[i++]);o+='<p>'+inline(b.join(' '))+'</p>'}
  return o}

/* ---------- toast ---------- */
function toast(t){let el=$('.toast');if(!el){el=document.createElement('div');el.className='toast';document.body.appendChild(el)}el.textContent=t;el.classList.add('is-show');clearTimeout(el._t);el._t=setTimeout(()=>el.classList.remove('is-show'),1800)}

/* ---------- 窗口外壳（data-shell） ---------- */
const NOTES=[['Redis 缓存穿透的三种解法','今天 14:05 · MD',1],['Spring Boot 启动流程','昨天 · MD',0],['K8s HPA 压测记录','11-01 · PDF',0],['接口规范模板','10-30 · DOCX',0],['技术分享：缓存设计','10-28 · PPTX',0]];
function shell(){
  const host=$('[data-shell]');if(!host)return;const withList=host.dataset.shell!=='nolist';
  host.innerHTML=`<div class="win"><div class="titlebar"><div class="dots"><i></i><i></i><i></i></div><span class="titlebar__name">mg-node</span>
  <button class="btn btn--sm tip" data-tip="⌘N" data-act="new" id="newBtn">＋ 新建 ▾</button><button class="btn btn--sm tip" data-tip="导入文件或文件夹 ⌘I" data-act="import">📥 导入</button><span class="spacer"></span>
  <span class="muted" id="syncState" style="margin-right:4px">✓ 已同步 · 14:12</span><button class="btn btn--sm btn--warn">⚠ 1 个冲突</button>
  <button class="btn btn--sm tip" data-tip="AI 知识库助手 ⌘J" data-act="ai">✨ AI</button><button class="btn btn--sm btn--primary" data-act="sync">⟳ 同步</button></div>
  <div class="body"><aside class="side"><div class="side__h" style="display:flex;justify-content:space-between">📚 分类<span class="tip" data-tip="新建文件夹 ⌘⇧N" data-act="newFolder" style="cursor:pointer;color:var(--c-primary)">＋</span></div><div id="tree"></div>
  <div class="side__h">🏷️ 标签</div><div class="side__item"># redis</div><div class="side__item"># spring-boot</div>
  <div class="side__h">空间</div><div class="side__item">🌐 已公开<span class="muted">6</span></div><div class="side__item">🗄️ 归档<span class="muted">31</span></div>
  <div class="side__foot" id="profileBtn" style="cursor:pointer;border-radius:8px;padding:8px 6px"><img class="avatar" style="width:32px;height:32px" src="${av()}" alt=""><div style="flex:1;min-width:0;white-space:nowrap;font-size:11px"><b style="font-size:13px;color:var(--c-text)" data-nick="Alex">${esc(getS().nickname||"未命名")}</b><br>@davin-dev · GitHub</div><span title="个性化">🎨</span></div></aside>
  ${withList?`<div class="list"><input class="field" placeholder="🔍 搜索笔记 ⌘K" style="margin-bottom:10px">${NOTES.map(n=>`<div class="list__item ${n[2]?'is-active':''}"><b>${n[0]}</b><span class="muted">${n[1]}</span></div>`).join('')}</div>`:''}
  <section class="main" id="main"></section></div>
  <div class="statusbar"><span>notes/后端开发/redis-缓存穿透.md</span><span>已保存到本地</span><span id="pending">待推送 1 处修改</span><span class="spacer"></span><span><kbd>⌘⇧P</kbd> 命令面板</span></div></div>`;
  const slot=$('template#tpl');if(slot)$('#main').appendChild(slot.content.cloneNode(true));
  $$('.list__item').forEach(e=>e.onclick=()=>{$$('.list__item').forEach(x=>x.classList.remove('is-active'));e.classList.add('is-active');const t=$('.ed-head__title');if(t)t.textContent=e.querySelector('b').textContent});
  renderTree();$$('.side__item:not([data-t])').forEach(e=>e.onclick=()=>{$$('.side__item').forEach(x=>x.classList.remove('is-active'));e.classList.add('is-active')});
  host.addEventListener('click',e=>{const a=e.target.closest('[data-act]');if(!a)return;const k=a.dataset.act;
    if(k==='sync')doSync();if(k==='ai')MG.toggleAI();if(k==='import')location.href='import.html';if(k==='new'){e.stopPropagation();MG.newMenu()}if(k==='newFolder')MG.newFolder()});
  const pb=$('#profileBtn');if(pb)pb.onclick=e=>{e.stopPropagation();openCustomize(pb)}}
function doSync(){const s=$('#syncState');if(!s)return;s.textContent='⟳ 同步中…';setTimeout(()=>{s.textContent='✓ 已同步 · 刚刚';const p=$('#pending');if(p)p.textContent='无待推送';toast('已推送到 davin-dev/my-git-note')},900)}

/* ---------- 头像菜单 + 头像选择 ---------- */
function customizePanel(el,opt={}){if(!el)return;const showArt=!!opt.showArt,showNick=opt.showNickname!==false;
  const draw=()=>{const S=getS();el.innerHTML=`<div class="cz">
  ${showArt?(()=>{const L=getArts(),nc=L.filter(a=>a.custom).length,cur=L.find(a=>a.id===S.loginArt)||L[0];return `<section><div class="cz__t" style="display:flex">登录页插画<span class="spacer"></span><span class="muted" style="font-weight:400">${L.length} 张 · 自定义 ${nc}/${ART_MAX}</span></div>
   <div class="cz__artlist">${L.map(a=>`<div class="cz__ar ${a.id===cur.id?'is-active':''}" draggable="true" data-aid="${a.id}"><span class="cz__grip" title="拖动排序">⋮⋮</span><button class="cz__arth" data-art="${a.id}" title="设为当前"><img src="${a.src}" alt="">${a.id===cur.id?'<i class="cz__check">✓</i>':''}</button><div style="flex:1;min-width:0"><div class="cz__arn">${esc(a.name)}${a.custom?' <span class="tag">自定义</span>':''}${S.carousel==='pin'&&a.id===cur.id?' <span class="tag">📌 固定</span>':''}</div><input class="cz__slogan hand" data-slogan="${a.id}" maxlength="24" placeholder="写一句手写标语…" value="${esc(a.slogan)}"></div><button class="cz__del" data-artdel="${a.id}" title="删除">🗑</button></div>`).join('')}</div>
   <div style="display:flex;align-items:center;gap:8px;margin-top:8px"><button class="pill" data-artup ${nc>=ART_MAX?'disabled':''}>⤒ 上传自定义插画</button><span class="muted" style="font-size:11px;line-height:1.35">JPG/PNG/WebP ≤ ${ART_MB} MB<br>建议 1180×1280，自动裁成 0.92 : 1</span>${S.loginArts&&ARTS.some(p=>!L.find(a=>a.id===p[0]))?'<button class="pill" data-artrestore style="border:0">↺ 恢复预设</button>':''}</div>
   <input type="file" accept="image/jpeg,image/png,image/webp" data-artfile hidden>
   <div class="cz__car"><span class="muted">轮播</span>${[['auto','自动轮播'],['off','关闭'],['pin','固定当前']].map(x=>`<button class="pill ${S.carousel===x[0]?'is-active':''}" data-car="${x[0]}">${x[1]}</button>`).join('')}</div>
   ${S.carousel==='auto'?`<div class="cz__car"><span class="muted">间隔</span><input type="range" min="5" max="30" step="1" value="${S.interval}" data-interval style="flex:1"><b data-intlabel style="width:38px;text-align:right">${S.interval} 秒</b></div><div class="cz__car"><span class="muted">顺序</span>${[['seq','按顺序'],['random','随机']].map(x=>`<button class="pill ${S.artOrder===x[0]?'is-active':''}" data-ord="${x[0]}">${x[1]}</button>`).join('')}</div>`:''}
   </section>`})():''}
  <section><div class="cz__t">头像</div><div style="display:flex;align-items:center;gap:12px;margin-bottom:12px"><img class="avatar" data-av style="width:52px;height:52px" src="${av()}" alt="">${showNick?`<input class="field" id="czNick" maxlength="12" placeholder="昵称" value="${esc(S.nickname)}" style="flex:1">`:''}</div>
   <div class="cz__avs">${AV_LIST.map(a=>`<button class="cz__av ${S.avatar===a[0]?'is-active':''}" data-avid="${a[0]}" title="${a[1]}"><img src="${av(a[0])}" alt="${a[1]}">${a[1]}</button>`).join('')}</div>
   <div style="display:flex;align-items:center;gap:8px;margin-top:12px"><span class="muted">形状</span>${Object.entries(SHAPES).map(([k,v])=>`<button class="pill ${S.avatarShape===k?'is-active':''}" data-shape="${k}">${v[0]}</button>`).join('')}<span class="spacer"></span><button class="pill" data-upload style="border:0">⤒ 上传自己的</button></div></section>
  <section><div class="cz__t">主题色</div><div class="cz__accents">${Object.entries(ACCENTS).map(([k,v])=>`<button class="cz__acc" data-acc="${k}" title="${v[0]}"><i style="background:${v[1][6]};${S.accent===k?`box-shadow:0 0 0 3px #fff,0 0 0 5px ${v[1][6]}`:''}">${S.accent===k?'✓':''}</i>${v[0]}</button>`).join('')}</div></section>
  <section style="margin-bottom:0"><div class="cz__t">界面外观</div><div class="cz__apps">${Object.entries(APPEARANCES).map(([k,v])=>`<button class="cz__app ${S.appearance===k?'is-active':''}" data-app="${k}"><div>${v[2].map(c=>`<span class="cz__sw" style="background:${c}"></span>`).join('')}</div><b>${v[0]}</b><small>${v[1]}</small></button>`).join('')}</div>
   <label style="display:flex;align-items:center;gap:8px;margin-top:12px;cursor:pointer" data-hand><span class="switch ${S.handFont?'is-on':''}"></span>手写风字体 <span class="hand muted" style="font-size:14px">Aa 你好</span></label></section></div>`;
   const fi=$('[data-artfile]',el);if(fi)fi.onchange=()=>{uploadArt(fi.files[0],draw);fi.value=''};
   el.oninput=e=>{const t=e.target;if(t.dataset.slogan!==undefined){const L=getArts();const a=L.find(x=>x.id===t.dataset.slogan);if(a){a.slogan=t.value;setArts(L)}}
     if(t.hasAttribute('data-interval')){updateS({interval:+t.value});const l=$('[data-intlabel]',el);if(l)l.textContent=t.value+' 秒'}};
   let dragId=null;el.ondragstart=e=>{const r=e.target.closest&&e.target.closest('.cz__ar');if(!r)return;dragId=r.dataset.aid;r.classList.add('is-drag');e.dataTransfer.effectAllowed='move';try{e.dataTransfer.setData('text/plain',dragId)}catch(_){}};
   el.ondragover=e=>{const r=e.target.closest&&e.target.closest('.cz__ar');if(!r||!dragId)return;e.preventDefault();$$('.cz__ar',el).forEach(x=>x.classList.toggle('is-over',x===r&&x.dataset.aid!==dragId))};
   el.ondrop=e=>{const r=e.target.closest&&e.target.closest('.cz__ar');if(!r||!dragId)return;e.preventDefault();const L=getArts();const from=L.findIndex(a=>a.id===dragId),to=L.findIndex(a=>a.id===r.dataset.aid);const [m]=L.splice(from,1);L.splice(to,0,m);dragId=null;setArts(L);draw()};
   el.ondragend=()=>{dragId=null;$$('.cz__ar',el).forEach(x=>x.classList.remove('is-drag','is-over'))};
   const nk=$('#czNick',el);if(nk)nk.oninput=()=>{const v=nk.value;const p=nk.selectionStart;updateS({nickname:v})}};
  draw();
  el.onclick=e=>{if(e.target.closest('input'))return;const t=e.target.closest('[data-artdel],[data-artup],[data-artrestore],[data-car],[data-ord],[data-art],[data-avid],[data-shape],[data-acc],[data-app],[data-hand],[data-upload]');if(!t)return;e.preventDefault();
    if(t.dataset.art)updateS({loginArt:t.dataset.art});if(t.dataset.avid)updateS({avatar:t.dataset.avid});if(t.dataset.shape)updateS({avatarShape:t.dataset.shape});
    if(t.dataset.acc)updateS({accent:t.dataset.acc});if(t.dataset.app)updateS({appearance:t.dataset.app});if(t.hasAttribute('data-hand'))updateS({handFont:!getS().handFont});
    if(t.dataset.artdel){delArt(t.dataset.artdel)}if(t.hasAttribute('data-artup')){$('[data-artfile]',el).click();return}if(t.hasAttribute('data-artrestore')){const L=getArts();ARTS.forEach(p=>{if(!L.find(a=>a.id===p[0]))L.push({id:p[0],slogan:p[3],custom:false})});setArts(L)}
    if(t.dataset.car)updateS({carousel:t.dataset.car});if(t.dataset.ord)updateS({artOrder:t.dataset.ord});
    if(t.hasAttribute('data-upload'))toast('原型：上传自己的头像（会复制到 .mgnote/avatar.png）');draw()};
  return draw}
function openCustomize(anchor,opt={}){let p=$('#profilePop');if(p){p.remove();$('#czFly')?.remove();return}p=document.createElement('div');p.className='popover';p.id='profilePop';
  const r=(anchor||$('.side__foot')||document.body).getBoundingClientRect();const bottom=Math.max(12,innerHeight-r.top+8);
  p.style.cssText=`position:fixed;left:${Math.max(12,r.left)}px;bottom:${bottom}px;width:300px;max-height:${innerHeight-bottom-16}px;overflow:auto;padding:12px;outline:none`;
  const mi=(k,t,x='')=>`<div class="menu__item" tabindex="-1" data-m="${k}" style="padding:8px 10px;border-radius:8px;cursor:pointer;display:flex;align-items:center${x}">${t}</div>`;
  p.innerHTML=`<div style="display:flex;align-items:center;margin-bottom:8px"><img class="avatar" style="width:40px;height:40px" src="${av()}" alt=""><div style="margin-left:10px;min-width:0;line-height:1.45;white-space:nowrap"><b style="font-size:14px" data-nick="Alex">${esc(getS().nickname||'朋友')}</b><div class="muted" style="font-size:11px">GitHub · davin-dev</div><div class="muted" style="font-size:11px">📦 davin-dev/my-git-note · 🔒</div></div><span class="spacer"></span><button class="btn btn--ghost btn--sm" data-x>✕</button></div>
  <div style="border-top:1px solid var(--c-line);padding-top:4px">${mi('cz','🎨 个性化<span class="muted" style="font-size:11px;margin-left:4px">头像 · 主题 · 外观</span><span class="spacer"></span><b class="muted">›</b>')}${mi('repo','📦 切换笔记仓库')}${mi('ai','✨ AI 设置')}${mi('theme','🌓 切换暗色模式')}</div>
  <div style="border-top:1px solid var(--c-line);margin-top:4px;padding-top:4px">${mi('out','⎋ 退出登录',';color:#dc2626')}</div>`;document.body.appendChild(p);
  const items=()=>$$('[data-m]',p);let idx=-1;const focus=i=>{idx=(i+items().length)%items().length;items().forEach((e,j)=>e.style.background=j===idx?'var(--c-hover,rgba(0,0,0,.06))':'');items()[idx].focus()};
  const czItem=$('[data-m=cz]',p);
  const openFly=(sec)=>{let f=$('#czFly');if(!f){f=document.createElement('div');f.className='popover';f.id='czFly';document.body.appendChild(f);
      f.innerHTML=`<div style="display:flex;align-items:center;gap:6px;margin-bottom:10px"><button class="btn btn--ghost btn--sm" data-back title="返回 ←">‹</button><b style="font-size:14px">个性化</b><span class="muted" style="font-size:11px">头像 · 主题 · 外观</span><span class="spacer"></span></div>
      <div style="display:flex;gap:6px;margin-bottom:12px">${[['av','头像'],['acc','主题色'],['app','外观'],['font','字体']].map(x=>`<button class="pill" data-sec="${x[0]}">${x[1]}</button>`).join('')}</div><div id="czBody"></div>`;
      customizePanel($('#czBody',f),{showArt:opt.showArt!==false});
      f.addEventListener('click',e=>{e.stopPropagation();if(e.target.closest('[data-back]'))closeFly(true);const s=e.target.closest('[data-sec]');if(s)jump(s.dataset.sec)});
      f.tabIndex=-1}
    const pr=p.getBoundingClientRect(),w=Math.min(380,innerWidth-pr.right-24);const h=Math.min(opt.tall?900:680,innerHeight-24);
    const top=Math.max(12,Math.min(czItem.getBoundingClientRect().top-12,innerHeight-h-12));
    f.style.cssText=`position:fixed;left:${pr.right+8}px;top:${top}px;outline:none;width:${Math.max(320,w)}px;max-height:${h}px;overflow:auto`;czItem.style.background='var(--c-hover,rgba(0,0,0,.06))';
    if(sec)jump(sec);f.focus()};
  const jump=sec=>{const f=$('#czFly');if(!f)return;const map={av:'头像',acc:'主题色',app:'界面外观',font:'界面外观'};const t=[...$$('.cz__t',f)].find(x=>x.textContent.includes(map[sec]));if(t)f.scrollTop=t.parentElement.offsetTop-90};
  const closeFly=(back)=>{$('#czFly')?.remove();czItem.style.background='';if(back)focus(0)};
  czItem.addEventListener('mouseenter',()=>openFly());
  items().filter(e=>e!==czItem).forEach(e=>e.addEventListener('mouseenter',()=>closeFly()));
  p.tabIndex=-1;const onKey=e=>{if(!document.body.contains(p))return document.removeEventListener('keydown',onKey);if(/INPUT|TEXTAREA/.test(e.target.tagName)&&e.key!=='Escape')return;if($('#czFly')&&(e.key==='ArrowLeft'||e.key==='Escape')){e.preventDefault();return closeFly(true)}if($('#czFly')&&e.target.closest&&e.target.closest('#czFly'))return;if(e.key==='ArrowDown'){e.preventDefault();focus(idx+1)}if(e.key==='ArrowUp'){e.preventDefault();focus(idx-1)}
    if(e.key==='ArrowRight'&&items()[idx]===czItem){e.preventDefault();openFly()}if(e.key==='Enter'&&idx>=0)items()[idx].click();
    if(e.key==='Escape'){p.remove()}};document.addEventListener('keydown',onKey);
  p.addEventListener('click',e=>{e.stopPropagation();if(e.target.closest('[data-x]')){closeFly();return p.remove()}const k=e.target.closest('[data-m]')?.dataset.m;
    if(k==='cz')openFly();if(k==='repo')location.href='repo-select.html';if(k==='ai')location.href='ai-settings.html';if(k==='out')location.href='login.html';
    if(k==='theme'){const d=document.documentElement;d.dataset.theme=d.dataset.theme==='dark'?'':'dark';store.set('theme',d.dataset.theme)}});
  setTimeout(()=>p.focus());if(opt.sub)openFly(opt.sec);return p}
function openAvatar(){openCustomize()}
/* ---------- 分段控件通用 ---------- */
function segs(r=document){$$('.seg',r).forEach(s=>{if(s._b)return;s._b=1;s.addEventListener('click',e=>{const b=e.target.closest('.seg__item');if(!b)return;$$('.seg__item',s).forEach(x=>x.classList.toggle('is-active',x===b));s.dispatchEvent(new CustomEvent('seg',{detail:b.dataset.v||b.textContent}))})})}
function switches(r=document){$$('.switch',r).forEach(s=>{if(s._b)return;s._b=1;s.onclick=()=>{s.classList.toggle('is-on');s.dispatchEvent(new CustomEvent('toggle',{detail:s.classList.contains('is-on')}))}})}

/* ---------- 编辑器：模式 / 工具栏 / 斜杠菜单 ---------- */
const SAMPLE=`---\ntitle: Redis 缓存穿透的三种解法\ntags: [redis, cache]\npublic: false\n---\n# Redis 缓存穿透的三种解法\n\n> 缓存穿透：请求的数据**缓存和数据库都没有**，每次都打到 DB。\n\n## 1. 缓存空值\n\n查不到也写入空值并设置短 TTL：\n\n\`\`\`java\nredis.set(key, "", 60);\n\`\`\`\n\n## 2. 布隆过滤器\n\n- 启动时加载全部 key\n- 判断 ==一定不存在== 就直接返回\n\n## 3. 参数校验\n\n| 方案 | 成本 | 效果 |\n|---|---|---|\n| 空值 | 低 | 中 |\n| 布隆 | 中 | 高 |\n\n- [x] 写完对比\n- [ ] 补压测数据\n`;
const TB=[['开始',[['B','**','**'],['I','*','*'],['S','~~','~~'],['高亮','==','==']]],['段落',[['H1','# ',''],['H2','## ',''],['H3','### ','']]],['列表',[['• 列表','- ',''],['1. 编号','1. ',''],['☐ 任务','- [ ] ','']]],
  ['插入',[['🔗 链接','[','](https://)'],['🖼 图片','![','](assets/)'],['⊞ 表格','\n| 列1 | 列2 |\n|---|---|\n| | |\n',''],['— 分割线','\n---\n','']]],['代码',[['`行内`','`','`'],['{ } 代码块','\n```\n','\n```\n'],['❝ 引用','> ','']]]];
const SLASH=[['# 标题','## '],['• 无序列表','- '],['☐ 任务','- [ ] '],['⊞ 表格','| 列1 | 列2 |\n|---|---|\n| | |\n'],['{ } 代码块','```\n\n```\n'],['❝ 引用','> '],['🖼 图片','![](assets/)'],['✨ AI 续写','（AI 续写示例：建议补充互斥锁防击穿。）']];
function editor(root,opt={}){if(!root)return;const mode=opt.mode||store.get('mode','split');
  root.innerHTML=`<div class="ed-head"><span class="ed-head__title">Redis 缓存穿透的三种解法</span>
   <div class="seg" id="modeSeg"><button class="seg__item tip" data-v="preview" data-tip="⌘1">预览</button><button class="seg__item tip" data-v="edit" data-tip="⌘2">编辑</button><button class="seg__item tip" data-v="split" data-tip="⌘3">双栏</button></div>
   <span class="badge" id="pubBadge">🔒 私有</span><span class="switch" id="pubSw" title="公开到 GitHub Pages"></span></div>
   <div class="toolbar" id="tb">${TB.map(g=>`<div class="toolbar__group"><div class="toolbar__row">${g[1].map(b=>`<button class="toolbar__btn" data-b="${encodeURIComponent(b[1])}" data-a="${encodeURIComponent(b[2])}">${b[0]}</button>`).join('')}</div><div class="toolbar__label">${g[0]}</div></div>`).join('')}</div>
   <div class="ed-panes" id="panes"><textarea class="ed-src" id="src" spellcheck="false"></textarea><div class="ed-prev md" id="prev"></div></div>
   <div class="menu slash" id="slash"><div class="menu__hint">输入 / 插入块 · ↑↓ 选择 · ↵ 确认</div>${SLASH.map((s,i)=>`<div class="menu__item ${i?'':'is-active'}" data-i="${i}">${s[0]}</div>`).join('')}</div>`;
  const src=$('#src',root),prev=$('#prev',root),panes=$('#panes',root),seg=$('#modeSeg',root),tb=$('#tb',root);src.value=SAMPLE;
  const U=new URLSearchParams(location.search),nn=U.get('new'),ty=U.get('type')||'md';
  if(nn){const fm=`---\ntitle: ${nn}\nfolder: ${U.get('folder')||''}\ntags: []\npublic: ${U.get('pub')?'true':'false'}\ncreated: ${new Date().toISOString().slice(0,16)}\n---\n`;
    src.value=ty==='html'?`<!doctype html>\n<html lang="zh-CN">\n<head><meta charset="utf-8"><title>${nn}</title></head>\n<body>\n  <h1>${nn}</h1>\n  <p>在这里开始写…</p>\n</body>\n</html>\n`:ty==='txt'?`${nn}\n\n`:fm+NEWTPL[U.get('tpl')||''](nn);
    setTimeout(()=>{$('.ed-head__title',root).textContent=nn+({md:'.md',html:'.html',txt:'.txt'})[ty];const sb=$('.statusbar span');if(sb)sb.textContent=`notes/${U.get('folder')}/${nn.replace(/\s+/g,'-')}.${ty}`;if(U.get('pub'))togglePub($('#pubSw',root),$('#pubBadge',root),true)})}
  const render=()=>prev.innerHTML=ty==='html'&&nn?'<iframe style="border:0;width:100%;height:100%" srcdoc="'+src.value.replace(/&/g,'&amp;').replace(/"/g,'&quot;')+'"></iframe>':ty==='txt'&&nn?'<pre style="white-space:pre-wrap;background:none;color:inherit">'+esc(src.value)+'</pre>':md(src.value);render();src.addEventListener('input',render);
  const setMode=m=>{panes.dataset.mode=m;tb.style.display=m==='preview'?'none':'';$$('.seg__item',seg).forEach(b=>b.classList.toggle('is-active',b.dataset.v===m));store.set('mode',m)};setMode(mode);
  seg.onclick=e=>{const b=e.target.closest('[data-v]');if(b)setMode(b.dataset.v)};
  document.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&['1','2','3'].includes(e.key)){e.preventDefault();setMode(['preview','edit','split'][e.key-1])}});
  const insert=(b,a='')=>{const s=src.selectionStart,t=src.selectionEnd,sel=src.value.slice(s,t);src.value=src.value.slice(0,s)+b+sel+a+src.value.slice(t);src.focus();src.selectionStart=src.selectionEnd=s+b.length+sel.length;render()};
  tb.onclick=e=>{const b=e.target.closest('[data-b]');if(!b)return;if(panes.dataset.mode==='preview')setMode('split');insert(decodeURIComponent(b.dataset.b),decodeURIComponent(b.dataset.a))};
  const sl=$('#slash',root);let si=0;const items=()=>$$('.menu__item',sl);const hi=()=>items().forEach((x,j)=>x.classList.toggle('is-active',j===si));
  const pick=i=>{const p=src.selectionStart;if(src.value[p-1]==='/'){src.value=src.value.slice(0,p-1)+src.value.slice(p);src.selectionStart=src.selectionEnd=p-1}insert(SLASH[i][1]);sl.classList.remove('is-open')};
  src.addEventListener('keydown',e=>{if(sl.classList.contains('is-open')){if(e.key==='ArrowDown'){si=(si+1)%SLASH.length;hi();e.preventDefault()}else if(e.key==='ArrowUp'){si=(si+SLASH.length-1)%SLASH.length;hi();e.preventDefault()}else if(e.key==='Enter'){pick(si);e.preventDefault()}else if(e.key==='Escape')sl.classList.remove('is-open')}});
  src.addEventListener('keyup',e=>{if(e.key==='/'){const r=src.getBoundingClientRect(),rr=root.getBoundingClientRect(),lines=src.value.slice(0,src.selectionStart).split('\n').length;
    sl.style.left=(r.left-rr.left+60)+'px';sl.style.top=Math.min(r.top-rr.top+20+lines*23.6-src.scrollTop,rr.height-320)+'px';si=0;hi();sl.classList.add('is-open')}});
  sl.onclick=e=>{const it=e.target.closest('[data-i]');if(it)pick(+it.dataset.i)};src.addEventListener('blur',()=>setTimeout(()=>sl.classList.remove('is-open'),150));
  const sw=$('#pubSw',root),bd=$('#pubBadge',root);sw.onclick=()=>{if(opt.onPublish)return opt.onPublish(sw,bd);togglePub(sw,bd)};
  root._api={setMode,insert,src,openSlash:()=>{src.focus();src.selectionStart=src.selectionEnd=src.value.indexOf('## 2.');src.dispatchEvent(new KeyboardEvent('keyup',{key:'/'}))}};return root._api}
function togglePub(sw,bd,on){on=on??!sw.classList.contains('is-on');sw.classList.toggle('is-on',on);bd.className='badge'+(on?' badge--public':'');bd.textContent=on?'🌐 已公开':'🔒 私有';toast(on?'已发布：davin-dev.github.io/notes/redis-cache':'已取消公开，Pages 页面会在下次部署时移除')}

/* ---------- 命令面板 ⌘⇧P ---------- */
const CMDS=[['新建文件夹','⌘⇧N',()=>newFolder()],['新建文件…','⌘N',()=>newFile()],['同步到远端','⌘S',()=>doSync()],['切换到预览模式','⌘1',()=>key('1')],['切换到编辑模式','⌘2',()=>key('2')],['切换到双栏模式','⌘3',()=>key('3')],['导入文件或文件夹…','⌘I',()=>location.href='import.html'],['打开 AI 知识库助手','⌘J',()=>MG.toggleAI()],['发布当前笔记','',()=>location.href='publish.html'],['个性化设置（头像 · 主题 · 外观）','',()=>openCustomize()],['切换暗色模式','',()=>{const d=document.documentElement;d.dataset.theme=d.dataset.theme==='dark'?'':'dark';store.set('theme',d.dataset.theme)}],['退出 mg-node（演示退出同步）','⌘Q',()=>location.href='quit-sync.html']];
function key(k){document.dispatchEvent(new KeyboardEvent('keydown',{key:k,metaKey:true}))}
function palette(){const p=document.createElement('div');p.className='menu palette';p.innerHTML=`<input class="field" placeholder="输入命令…（支持拼音首字母，如 tb = 同步）"><div id="pl"></div>`;document.body.appendChild(p);
  const inp=$('input',p),pl=$('#pl',p);let sel=0,list=CMDS;
  const draw=()=>{const q=inp.value.trim();list=CMDS.filter(c=>!q||c[0].includes(q)||(q==='tb'&&c[0].includes('同步')));sel=Math.min(sel,Math.max(list.length-1,0));
    pl.innerHTML=list.map((c,i)=>`<div class="menu__item ${i===sel?'is-active':''}" data-i="${i}"><span>${c[0]}</span><kbd>${c[1]||'↵'}</kbd></div>`).join('')||'<div class="menu__hint">没有匹配的命令</div>'};
  const run=i=>{p.classList.remove('is-open');list[i]&&list[i][2]()};
  inp.oninput=()=>{sel=0;draw()};inp.onkeydown=e=>{if(e.key==='ArrowDown'){sel=(sel+1)%list.length;draw()}if(e.key==='ArrowUp'){sel=(sel-1+list.length)%list.length;draw()}if(e.key==='Enter')run(sel);if(e.key==='Escape')p.classList.remove('is-open')};
  pl.onclick=e=>{const i=e.target.closest('[data-i]');if(i)run(+i.dataset.i)};
  document.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.shiftKey&&e.key.toLowerCase()==='p'){e.preventDefault();p.classList.add('is-open');inp.value='';sel=0;draw();inp.focus()}
    if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='n'){e.preventDefault();e.shiftKey?newFolder():newMenu()}
    if((e.metaKey||e.ctrlKey)&&!e.shiftKey&&e.key.toLowerCase()==='j'){e.preventDefault();MG.toggleAI()}
    if((e.metaKey||e.ctrlKey)&&!e.shiftKey&&e.key.toLowerCase()==='i'&&!/import/.test(location.pathname)){e.preventDefault();location.href='import.html'}});
  return ()=>{p.classList.add('is-open');inp.value='';draw();inp.focus()}}

/* ---------- AI 面板（假回答） ---------- */
const ANS=[['缓存穿透','根据你的笔记，缓存穿透有三种常用解法：<b>缓存空值</b>（短 TTL）<span class="cite">[1]</span>、<b>布隆过滤器</b> 预判 key 不存在 <span class="cite">[1]</span>，以及接口层 <b>参数校验</b> <span class="cite">[2]</span>。压测记录显示布隆方案让 DB QPS 下降约 92% <span class="cite">[3]</span>。'],
 ['总结','本周你新增 7 篇笔记，主要集中在 <b>Redis</b> 和 <b>K8s 弹性伸缩</b>：<br>• 缓存三大问题已经整理完 <span class="cite">[1]</span><br>• HPA 压测还缺数据 <span class="cite">[3]</span><br>建议：把「接口规范模板」补上鉴权一节 <span class="cite">[2]</span>。'],
 ['','在你的知识库里没有找到足够相关的内容（相似度 &lt; 0.35）。可以换个问法，或者把相关文档导入后再问。']];
function aiPanel(){const host=$('#main');if(!host)return;const p=document.createElement('div');p.className='ai-panel';p.id='aiPanel';
  p.innerHTML=`<div class="ed-head"><b style="flex:1">✨ 知识库助手</b><span class="badge">后端开发 · 104 篇</span><button class="btn btn--ghost btn--sm" data-close>✕</button></div>
  <div class="ai-msgs" id="aiMsgs"><div class="msg msg--ai">你好，我只会基于你仓库里的笔记回答，并标出来源。试试：<br><span class="chip" data-q="缓存穿透怎么解决？">缓存穿透怎么解决？</span><span class="chip" data-q="总结我本周的笔记">总结我本周的笔记</span></div></div>
  <div style="padding:10px;border-top:1px solid var(--c-line)"><div class="muted" style="margin-bottom:6px">来源：[1] redis-缓存穿透.md · [2] 接口规范模板.docx · [3] K8s HPA 压测记录.pdf</div>
  <div style="display:flex;gap:6px"><input class="field" id="aiQ" placeholder="问问你的笔记… ↵ 发送"><button class="btn btn--primary" id="aiSend">发送</button></div></div>`;
  host.appendChild(p);const msgs=$('#aiMsgs',p),q=$('#aiQ',p);
  const ask=t=>{if(!t.trim())return;msgs.insertAdjacentHTML('beforeend',`<div class="msg msg--me">${esc(t)}</div><div class="msg msg--ai" data-wait>🔎 正在检索 8 个片段…</div>`);q.value='';msgs.scrollTop=1e5;
    setTimeout(()=>{const a=ANS.find(x=>x[0]&&t.includes(x[0]))||ANS[2];const w=$('[data-wait]',msgs);w.removeAttribute('data-wait');w.innerHTML=a[1];msgs.scrollTop=1e5},700)};
  $('#aiSend',p).onclick=()=>ask(q.value);q.onkeydown=e=>{if(e.key==='Enter')ask(q.value)};
  p.onclick=e=>{if(e.target.matches('[data-close]'))p.classList.remove('is-open');const c=e.target.closest('[data-q]');if(c)ask(c.dataset.q);if(e.target.matches('.cite'))toast('跳转到来源笔记（原型演示）')};
  return ask}

/* ---------- 退出同步面板 ---------- */
function quitSheet(){const s=document.createElement('div');s.className='sheet';s.id='quitSheet';
  s.innerHTML=`<b style="font-size:16px">⟳ 退出前正在同步…</b><p class="muted" style="margin:6px 0 12px">1 处本地修改 → davin-dev/my-git-note</p>
  <div class="progress"><div class="progress__bar" id="qBar"></div></div><div id="qStep" class="muted" style="margin-top:10px">提交本地修改…</div>
  <div class="modal__foot"><button class="btn" id="qSkip">仅保存在本地并退出</button><button class="btn" id="qCancel">取消退出</button></div>`;document.body.appendChild(s);
  let t;const steps=[[30,'git commit「mg-node: auto-sync on quit」'],[60,'git pull --rebase（无冲突）'],[90,'git push origin main'],[100,'✓ 同步完成，正在退出…']];
  const stop=()=>{clearInterval(t);s.classList.remove('is-open')};
  $('#qCancel',s).onclick=()=>{stop();toast('已取消退出')};$('#qSkip',s).onclick=()=>{stop();toast('已在本地提交，下次启动时推送')};
  return ()=>{let i=0;$('#qBar',s).style.width='0';$('#qStep',s).textContent='提交本地修改…';s.classList.add('is-open');clearInterval(t);
    t=setInterval(()=>{const st=steps[i++];if(!st){stop();toast('mg-node 已退出（演示）');return}$('#qBar',s).style.width=st[0]+'%';$('#qStep',s).textContent=st[1]},650)}}

/* ---------- 两级分类树（localStorage: mg.tree） ---------- */
const DEF_TREE=[{n:'技术',i:'💻',c:'#5b6cff',open:1,k:[['后端开发',42],['前端工程',27],['DevOps',18]]},{n:'工作',i:'📒',c:'#e08a00',open:0,k:[['日报',12],['会议纪要',11]]},{n:'生活',i:'🌱',c:'#1a9a5b',open:1,k:[]},{n:'收集笔记',i:'📥',c:'#8a90a2',open:0,k:[]}];
const getTree=()=>{try{return JSON.parse(store.get('tree',''))||DEF_TREE}catch(e){return JSON.parse(JSON.stringify(DEF_TREE))}};const saveTree=t=>store.set('tree',JSON.stringify(t));
let curFolder=['技术','后端开发'],hiNode='';
function renderTree(){const el=$('#tree');if(!el)return;const T=getTree();
  el.innerHTML=T.map((f,a)=>{const cnt=f.k.reduce((x,y)=>x+y[1],0);
    return `<div class="side__item ${curFolder.join('/')===f.n?'is-active':''}" draggable="true" data-t="${a}" style="${hiNode===f.n?'outline:1.5px dashed var(--c-primary)':''}"><span><span data-tog="${a}" style="display:inline-block;width:14px;color:var(--c-muted)">${f.k.length?(f.open?'▾':'▸'):''}</span>${f.i} ${esc(f.n)}</span><span class="muted">${cnt||''}</span></div>`+
    (f.open?f.k.map((c,b)=>`<div class="side__item ${curFolder.join('/')===f.n+'/'+c[0]?'is-active':''}" draggable="true" data-t="${a}.${b}" style="padding-left:30px;${hiNode===f.n+'/'+c[0]?'outline:1.5px dashed var(--c-primary);background:var(--c-primary-soft)':''}"><span><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${f.c};margin-right:6px"></span>${esc(c[0])}</span><span class="muted">${c[1]||'新'}</span></div>`).join(''):'')}).join('');
  let drag=null;
  el.onclick=e=>{const tg=e.target.closest('[data-tog]');const it=e.target.closest('[data-t]');if(!it)return;const [a,b]=it.dataset.t.split('.').map(Number);const T=getTree();
    if(tg||b===undefined&&!T[a].open){T[a].open=T[a].open?0:1;saveTree(T)}curFolder=b===undefined?[T[a].n]:[T[a].n,T[a].k[b][0]];renderTree()};
  el.ondragstart=e=>{drag=e.target.closest('[data-t]')?.dataset.t;e.dataTransfer.setData('text/plain',drag||'')};
  el.ondragover=e=>{if(e.target.closest('[data-t]'))e.preventDefault()};
  el.ondrop=e=>{e.preventDefault();const to=e.target.closest('[data-t]')?.dataset.t;if(drag==null||!to||to===drag)return;moveNode(drag,to)}}
function moveNode(from,to){const T=getTree();const [fa,fb]=from.split('.').map(Number),[ta,tb]=to.split('.').map(Number);
  if(fb===undefined){ // 拖动一级分类
    if(tb===undefined&&T[fa].k.length===0&&false){}
    if(tb===undefined){const [n]=T.splice(fa,1);T.splice(ta,0,n);saveTree(T);renderTree();return toast('已调整分类顺序')}
    return toast('⚠ 最多两级：一级分类不能放进二级文件夹')}
  const [n]=T[fa].k.splice(fb,1);const dst=T[ta];
  if(tb===undefined){dst.k.push(n);dst.open=1;toast(fa===ta?'已调整顺序':`已移动：${T[fa].n}/${n[0]} → ${dst.n}/${n[0]}（git mv）`)}
  else{dst.k.splice(tb,0,n);toast(fa===ta?'已调整顺序':`已移动到 ${dst.n}（git mv）`)}saveTree(T);renderTree()}

/* ---------- 新建菜单 / 新建文件夹 / 新建文件 ---------- */
function newMenu(){let m=$('#newMenu');if(!m){m=document.createElement('div');m.className='menu';m.id='newMenu';
  m.innerHTML=`<div class="menu__item" data-n="folder">📁 新建文件夹<kbd>⌘⇧N</kbd></div><div class="menu__item" data-n="file">📄 新建文件<kbd>↵</kbd></div><hr style="border:0;border-top:1px solid var(--c-line);margin:4px 0"><div class="menu__item" data-n="import">📥 导入…<kbd>⌘I</kbd></div>`;
  document.body.appendChild(m);m.onclick=e=>{const k=e.target.closest('[data-n]')?.dataset.n;if(!k)return;m.classList.remove('is-open');if(k==='folder')newFolder();if(k==='file')newFile();if(k==='import')location.href='import.html'};
  document.addEventListener('click',e=>{if(!e.target.closest('#newMenu'))m.classList.remove('is-open')})}
  const b=$('#newBtn');if(b){const r=b.getBoundingClientRect();m.style.cssText=`position:fixed;left:${r.left}px;top:${r.bottom+6}px`}m.classList.add('is-open')}
function dlg(id,html){let mk=$('#'+id);if(mk)mk.remove();mk=document.createElement('div');mk.className='modal-mask is-open';mk.id=id;mk.innerHTML=html;document.body.appendChild(mk);
  mk.addEventListener('click',e=>{if(e.target===mk||e.target.matches('[data-x]'))mk.remove()});return mk}
const ICONS=['📚','📖','🎯','💡','🧪','🗂️'],COLORS=['#5b6cff','#1a9a5b','#e08a00','#d33','#8a5cf6','#0aa'];
function newFolder(){const T=getTree();let icon='📚',color=COLORS[0];const pre=curFolder[0]&&T.find(f=>f.n===curFolder[0])?curFolder[0]:'';
  const mk=dlg('folderDlg',`<div class="modal" style="width:520px"><div class="modal__title">📁 新建文件夹</div><div class="muted" style="margin-top:4px">最多两级：一级分类 / 二级文件夹</div>
  <span class="label">名称</span><input class="field" id="fName" placeholder="例如：读书笔记" maxlength="40">
  <span class="label">上级分类</span><select class="field" id="fParent"><option value="">无（作为一级分类）</option>${T.map(f=>`<option ${f.n===pre?'selected':''}>${esc(f.n)}</option>`).join('')}</select>
  <span class="label">图标与颜色（可选）</span><div style="display:flex;gap:6px;align-items:center" id="fIco">${ICONS.map((x,i)=>`<span class="chip ${i?'chip--off':''}" data-i="${x}" style="font-size:16px">${x}</span>`).join('')}<span style="width:12px"></span>${COLORS.map((c,i)=>`<span data-c="${c}" style="width:20px;height:20px;border-radius:50%;background:${c};cursor:pointer;outline-offset:2px;${i?'':'outline:2px solid '+c}"></span>`).join('')}</div>
  <span class="label">描述（可选）</span><input class="field" id="fDesc" placeholder="会显示在悬停提示和 AI 索引范围里">
  <div class="muted" id="fPath" style="margin-top:12px"></div><div class="muted" id="fErr" style="color:var(--c-danger)"></div>
  <div class="modal__foot"><button class="btn" data-x>取消</button><button class="btn btn--primary" id="fOk">创建</button></div></div>`);
  const nm=$('#fName',mk),pa=$('#fParent',mk);
  const upd=()=>{const n=nm.value.trim()||'未命名';$('#fPath',mk).innerHTML=`将创建目录 <code>notes/${pa.value?esc(pa.value)+'/':''}${esc(n)}/</code> 并写入 <code>_folder.json</code>${pa.value?'':'<br>一级分类下可以再建二级文件夹，最多两级'}`};upd();nm.oninput=upd;pa.onchange=upd;
  $('#fIco',mk).onclick=e=>{const i=e.target.closest('[data-i]'),c=e.target.closest('[data-c]');if(i){icon=i.dataset.i;$$('[data-i]',mk).forEach(x=>x.classList.toggle('chip--off',x!==i))}if(c){color=c.dataset.c;$$('[data-c]',mk).forEach(x=>x.style.outline=x===c?'2px solid '+color:'')}};
  const ok=()=>{const n=nm.value.trim(),p=pa.value,T=getTree();if(!n)return $('#fErr',mk).textContent='请输入名称';if(/[\/\\:*?"<>|]/.test(n))return $('#fErr',mk).textContent='名称不能包含 / \\ : * ? " < > |';
    const sib=p?T.find(f=>f.n===p).k.map(x=>x[0]):T.map(f=>f.n);if(sib.some(x=>x.toLowerCase()===n.toLowerCase()))return $('#fErr',mk).textContent='同一级下已存在同名文件夹';
    if(p){const f=T.find(f=>f.n===p);f.k.push([n,0]);f.open=1;hiNode=p+'/'+n;curFolder=[p,n]}else{T.push({n,i:icon,c:color,open:1,k:[]});hiNode=n;curFolder=[n]}
    saveTree(T);renderTree();mk.remove();toast(`已创建 ${p?p+' / ':''}${n}，并生成提交`)};
  $('#fOk',mk).onclick=ok;nm.onkeydown=e=>{if(e.key==='Enter')ok()};nm.focus()}
const TYPES=[['md','📝','Markdown','.md'],['html','🌐','HTML','.html'],['docx','📘','Word','.docx'],['pptx','📙','PPT','.pptx'],['txt','📃','纯文本','.txt']];
const TPLS=[['','空白'],['daily','🗓 日报'],['meeting','🧑‍🤝‍🧑 会议纪要'],['design','🛠 技术方案']];
function newFile(){const T=getTree();let type='md',tpl='';const today=new Date().toISOString().slice(0,10);
  const mk=dlg('fileDlg',`<div class="modal" style="width:640px"><div class="modal__title">📄 新建文件</div>
  <span class="label">类型</span><div style="display:grid;grid-template-columns:repeat(5,1fr);gap:10px" id="nTypes">${TYPES.map((t,i)=>`<div class="card card--select ${i?'':'is-active'}" data-ty="${t[0]}" style="text-align:center;padding:12px"><div style="font-size:24px">${t[1]}</div>${t[2]}<div class="muted">${t[3]}</div></div>`).join('')}</div>
  <span class="label">从模板创建（可选）</span><div id="nTpl">${TPLS.map((t,i)=>`<span class="chip ${i?'chip--off':'is-active'}" data-tp="${t[0]}">${t[1]}</span>`).join('')}</div>
  <span class="label">文件名</span><div style="display:flex;align-items:center;gap:6px"><input class="field" id="nName" value="未命名"><span class="muted" id="nExt">.md</span></div>
  <span class="label">存放位置</span><div style="display:flex;gap:10px"><select class="field" id="nL1">${T.map(f=>`<option ${f.n===curFolder[0]?'selected':''}>${esc(f.n)}</option>`).join('')}</select><select class="field" id="nL2"></select></div>
  <div class="muted" id="nPath" style="margin-top:6px"></div>
  <div style="display:flex;align-items:center;gap:10px;margin-top:14px;font-size:13px"><span class="switch" id="nPub"></span> 公开到 GitHub Pages <span class="muted">（默认私有）</span></div>
  <div id="nNote" style="display:none;background:var(--c-warn-soft);color:var(--c-warn);border-radius:8px;padding:8px 12px;margin-top:12px;font-size:12px">DOCX / PPTX 会从内置的空白模板复制，创建后以只读预览打开，点「用 WPS 打开」编辑。</div>
  <div class="modal__foot"><button class="btn" data-x>取消</button><button class="btn btn--primary" id="nOk">创建并打开 ↵</button></div></div>`);
  switches(mk);const l1=$('#nL1',mk),l2=$('#nL2',mk),nm=$('#nName',mk);
  const fillL2=()=>{const f=getTree().find(f=>f.n===l1.value);l2.innerHTML='<option value="">（一级根目录）</option>'+f.k.map(c=>`<option ${c[0]===curFolder[1]?'selected':''}>${esc(c[0])}</option>`).join('');path()};
  const ext=()=>TYPES.find(t=>t[0]===type)[3];
  const path=()=>{$('#nExt',mk).textContent=ext();$('#nPath',mk).textContent=`→ notes/${l1.value}/${l2.value?l2.value+'/':''}${(nm.value.trim()||'未命名').replace(/\s+/g,'-')}${ext()}`;$('#nNote',mk).style.display=/docx|pptx/.test(type)?'':'none'};
  l1.onchange=fillL2;l2.onchange=path;nm.oninput=path;fillL2();
  $('#nTypes',mk).onclick=e=>{const c=e.target.closest('[data-ty]');if(!c)return;type=c.dataset.ty;$$('[data-ty]',mk).forEach(x=>x.classList.toggle('is-active',x===c));path()};
  $('#nTpl',mk).onclick=e=>{const c=e.target.closest('[data-tp]');if(!c)return;tpl=c.dataset.tp;$$('[data-tp]',mk).forEach(x=>{x.classList.toggle('is-active',x===c);x.classList.toggle('chip--off',x!==c)});
    nm.value=tpl==='daily'?today+' 日报':tpl==='meeting'?today+' 会议纪要':tpl==='design'?'技术方案-未命名':'未命名';
    if(tpl==='daily'||tpl==='meeting'){const w=getTree().find(f=>f.n==='工作');if(w){l1.value='工作';fillL2();l2.value=tpl==='daily'?'日报':'会议纪要';path()}}path()};
  const ok=()=>{const q=new URLSearchParams({new:nm.value.trim()||'未命名',type,tpl,folder:l1.value+(l2.value?'/'+l2.value:''),pub:$('#nPub',mk).classList.contains('is-on')?1:''});
    toast('已创建并提交，正在打开…');setTimeout(()=>location.href=(/docx|pptx/.test(type)?'doc-viewer.html?kind='+type+'&':'md-editor.html?')+q,500)};
  $('#nOk',mk).onclick=ok;nm.onkeydown=e=>{if(e.key==='Enter')ok()};nm.select()}
const NEWTPL={'':t=>`# ${t}\n\n`,daily:t=>`# ${t}\n\n## 今天完成\n- \n\n## 遇到的问题\n- \n\n## 明天计划\n- [ ] \n`,meeting:t=>`# ${t}\n\n> 时间：\n> 参会：\n\n## 议题\n1. \n\n## 结论\n- \n\n## 待办\n| 事项 | 负责人 | 截止 |\n|---|---|---|\n| | | |\n`,design:t=>`# ${t}\n\n## 背景\n\n## 目标 / 非目标\n\n## 方案\n\n\`\`\`\n架构草图\n\`\`\`\n\n## 风险\n\n## 里程碑\n`};

window.MG={getS,updateS,getArts,setArts,uploadArt,delArt,ART_MAX,applyTheme,customizePanel,openCustomize,ARTS,AV_LIST,ACCENTS,APPEARANCES,newMenu,newFolder,newFile,renderTree,NEWTPL,$,$$,md,toast,editor,segs,switches,openAvatar,togglePub,store,AVATARS,av,doSync,
  toggleAI(force){const p=$('#aiPanel');if(!p)return toast('当前页面没有 AI 面板');p.classList.toggle('is-open',force)}};
document.addEventListener('DOMContentLoaded',()=>{if(store.get('theme',''))document.documentElement.dataset.theme=store.get('theme');applyTheme();shell();
  MG.palette=palette();MG.ask=aiPanel();MG.quit=quitSheet();segs();switches();
  document.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='q'){e.preventDefault();MG.quit()}});
  if(window.page)window.page(MG)});
})();
