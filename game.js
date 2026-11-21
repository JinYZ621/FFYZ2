(() => {
"use strict";
const $ = id => document.getElementById(id);
const startScreen=$("start-screen"), createScreen=$("create-screen"), gameScreen=$("game-screen");
let profile={name:"新同学",grade:"高一",appearance:"boy",hair:"#26334a",uniform:"#e8edf2"};
let game=null;
function show(screen){[startScreen,createScreen,gameScreen].forEach(s=>s.classList.add("hidden"));screen.classList.remove("hidden");}
function drawAvatar(canvas,p){
 const c=canvas.getContext("2d");c.clearRect(0,0,canvas.width,canvas.height);c.fillStyle="#d4e6dc";c.fillRect(0,0,canvas.width,canvas.height);
 c.fillStyle="#bdd7cb";c.beginPath();c.ellipse(90,190,55,12,0,0,Math.PI*2);c.fill();
 c.fillStyle="#24364a";c.fillRect(54,145,72,40);c.fillStyle=p.uniform;c.fillRect(50,105,80,52);
 c.fillStyle="#f0c7a5";c.fillRect(65,48,50,58);c.fillStyle=p.hair;c.fillRect(62,38,56,22);c.fillRect(58,48,12,28);c.fillRect(110,48,12,24);
 if(p.appearance==="girl"){c.fillRect(56,60,10,70);c.fillRect(112,60,10,70);}
 c.fillStyle="#25354a";c.fillRect(76,70,6,5);c.fillRect(99,70,6,5);c.fillStyle="#c77d70";c.fillRect(85,89,12,3);
 c.fillStyle="#dce7ee";c.fillRect(83,108,14,24);c.fillStyle="#597b9a";c.fillRect(86,108,8,23);
}
function updatePreview(){
 profile.name=$("nickname").value.trim()||"新同学";profile.grade=$("grade").value;profile.appearance=$("appearance").value;profile.hair=$("hair").value;profile.uniform=$("uniform").value;
 $("preview-name").textContent=profile.name;drawAvatar($("avatar-preview"),profile);
}
$("start-btn").addEventListener("click",()=>{show(createScreen);updatePreview();});
$("back-start").addEventListener("click",()=>show(startScreen));
["nickname","grade","appearance","hair","uniform"].forEach(id=>$(id).addEventListener("input",updatePreview));
$("create-form").addEventListener("submit",e=>{e.preventDefault();updatePreview();try{localStorage.setItem("kmd-youth-profile",JSON.stringify(profile));}catch(_){}launchGame();});

class TopDownCampus{
 constructor(canvas,p){
  this.canvas=canvas;this.ctx=canvas.getContext("2d");this.profile=p;this.tileW=42;this.tileH=42;this.mapW=100;this.mapH=56;
  this.player={x:50,y:43.8,walk:0,energy:100};this.camera={x:0,y:0};this.keys={};this.joy={x:0,y:0};this.running=false;
  this.last=performance.now();this.elapsed=0;this.dayMinutes=8*60;this.near=null;this.mode="campus";this.currentBuilding=null;this.npcs=[];this.toastTimer=null;
  this.buildWorld();this.installPhase2UI();this.bindControls();this.resize();window.addEventListener("resize",()=>this.resize());
  this.loop=this.loop.bind(this);requestAnimationFrame(this.loop);
 }
 buildWorld(){
  // 坐标直接按用户手绘图 1657×927 等比例映射到 100×56 世界坐标；北在上，西在左。
  const X=v=>v*100/1657, Y=v=>v*56/927, R=(x,y,w,h)=>({x:X(x),y:Y(y),w:X(w),h:Y(h)});
  const B=(box,name,kind,room,desc,extra={})=>({...R(...box),name,kind,room,desc,color:"#e8dfd0",roof:kind==="dorm"?"#788984":kind==="class"?"#7b8882":"#788984",...extra});
  this.buildings=[
   B([55,76,155,434],"操场","field","运动场地","操场 · 田径跑道与足球场",{color:"#c65e52",roof:"#397b4e",noDoor:true}),
   B([201,579,190,192],"艺体中心","arts","体育与艺术活动","艺体中心 · 体育训练与艺术活动"),
   B([278,93,214,74],"弘毅楼B","dorm","男生宿舍","弘毅楼B · 男生宿舍",{entrance:{x:X(269),y:Y(202)},entranceSide:"west",pair:"弘毅楼A/B"}),
   B([283,236,215,73],"弘毅楼A","dorm","男生宿舍","弘毅楼A · 男生宿舍",{entrance:{x:X(269),y:Y(202)},entranceSide:"west",pair:"弘毅楼A/B"}),
   B([629,20,365,198],"思源餐厅","food","学生餐厅","思源餐厅 · 学生餐厅"),
   B([1142,85,222,69],"弘德楼B","dorm","女生宿舍","弘德楼B · 女生宿舍",{entrance:{x:X(1373),y:Y(188)},entranceSide:"east",pair:"弘德楼A/B"}),
   B([1147,225,220,72],"弘德楼A","dorm","女生宿舍","弘德楼A · 女生宿舍",{entrance:{x:X(1373),y:Y(188)},entranceSide:"east",pair:"弘德楼A/B"}),
   B([1470,48,171,63],"弘远楼","dorm","宿舍","弘远楼 · 宿舍"),
   B([1470,157,165,94],"求实楼","bath","澡堂","求实楼 · 澡堂"),
   B([669,357,308,167],"格物楼","lab","实验楼","格物楼 · 实验楼"),
   B([433,436,213,73],"行知楼B","class","高一教学楼","行知楼B · 高一教学楼"),
   B([439,579,213,72],"行知楼A","class","高一教学楼","行知楼A · 高一教学楼"),
   B([997,424,222,70],"省身楼B","class","高二教学楼","省身楼B · 高二教学楼"),
   B([1001,565,220,72],"省身楼A","class","高二教学楼","省身楼A · 高二教学楼"),
   B([1338,369,268,71],"海粟楼A","class","高三教学楼","海粟楼A · 高三教学楼"),
   B([1343,510,267,73],"海粟楼B","class","高三教学楼","海粟楼B · 高三教学楼"),
   B([452,697,186,124],"文渊馆","library","图书馆","文渊馆 · 图书馆"),
   B([1049,697,161,100],"树人楼","office","政教处","树人楼 · 政教处"),
   B([1375,694,233,116],"杏坛报告厅","auditorium","报告厅","杏坛报告厅 · 报告厅",{facing:"west"})
  ];
  this.areas=[
   {...R(742,741,188,25),name:"校园大门",kind:"gate"},
   {...R(0,0,0,0),name:"校园道路",kind:"road"},
   {...R(740,545,190,105),name:"青春广场",kind:"plaza"},
   {...R(808,618,25,28),name:"广场景观",kind:"statue"},
   // 看台按用户后续明确要求，放在操场左侧（西侧）。
   {...R(0,76,48,434),name:"操场西侧看台",kind:"stands"},
   {...R(550,270,174,13),name:"西侧电话亭一排",kind:"booths"},
   {...R(894,268,177,13),name:"东侧电话亭一排",kind:"booths"},
   // 宿舍连接廊：男生宿舍在西侧，女生宿舍在东侧；入口均开在相连部位。
   {...R(287,117,39,180),name:"弘毅楼A/B连接廊",kind:"walkway",dormPair:"boys"},
   {...R(1322,96,35,179),name:"弘德楼A/B连接廊",kind:"walkway",dormPair:"girls"},
   {...R(442,460,35,182),name:"行知楼A/B连接廊",kind:"walkway"},
   {...R(1177,436,36,178),name:"省身楼A/B连接廊",kind:"walkway"},
   {...R(1555,381,37,179),name:"海粟楼A/B连接廊",kind:"walkway"}
  ];
  // 报告厅入口朝西；室内舞台也在西侧，观众席朝西。
  this.npcs=[
   {x:X(850),y:Y(590),name:"校园向导",role:"guide",text:"欢迎来到峰峰一中！地图上方为北方，你可以按建筑标注探索校园。",homeX:X(850),homeY:Y(590),phase:0},
   {x:X(545),y:Y(760),name:"图书管理员",role:"student",text:"文渊馆是图书馆，欢迎来这里阅读和自习。",homeX:X(545),homeY:Y(760),phase:1},
   {x:X(1120),y:Y(590),name:"值日生",role:"student",text:"青春广场是校园中心活动区域。",homeX:X(1120),homeY:Y(590),phase:2}
  ];
  this.blockers=[];this.rebuildBlockers();
  this.tasks=[
   {title:"熟悉新校园",desc:"找到校园向导并与其交谈。",done:false},
   {title:"探索教学区",desc:"进入一栋教学楼或实验楼。",done:false},
   {title:"校园生活体验",desc:"前往思源餐厅用餐或回宿舍休息。",done:false},
   {title:"操场打卡",desc:"前往校园西侧操场。",done:false}
  ];
  this.visited=new Set();
 }
 rebuildBlockers(){
  this.blockers=[];
  if(this.mode==="campus"){
   this.buildings.filter(b=>b.kind!=="field").forEach(b=>this.blockers.push({x:b.x,y:b.y,w:b.w,h:b.h}));
   this.areas.filter(a=>["trees","stands","booths"].includes(a.kind)).forEach(a=>this.blockers.push({x:a.x,y:a.y,w:a.w,h:a.h}));
  }else{
   this.blockers=[{x:0,y:0,w:18,h:1},{x:0,y:0,w:1,h:14},{x:17,y:0,w:1,h:14},{x:0,y:13,w:7,h:1},{x:11,y:13,w:7,h:1}];
  }
 }
 installPhase2UI(){
  const tag=document.querySelector(".build-tag");if(tag)tag.textContent="PHASE 02 · CAMPUS EXPANSION";
  const mapText=document.querySelector(".modal p");if(mapText)mapText.textContent="校园地图已扩建。靠近建筑入口按 E 进入室内，按 ESC 返回校园。";
  const mini=$("mini-map");if(mini){mini.innerHTML='<canvas id="mini-map-canvas" width="1000" height="560" aria-label="校园小地图，北方朝上"></canvas>';mini.style.background="#8aa982";mini.style.display="block";mini.style.padding="0";mini.style.aspectRatio="1000 / 560";mini.style.height="auto";mini.style.minHeight="0";this.renderMiniMap();}
  const hud=document.querySelector(".hud-left");if(hud&&!$("phase2-task")){const box=document.createElement("div");box.id="phase2-task";box.className="hud-panel";box.innerHTML='<small>校园日常</small><strong style="font-size:13px">新生探索任务</strong><div id="phase2-task-text" style="font-size:10px;color:#d4e2d8;margin-top:6px;line-height:1.5">熟悉新校园</div>';hud.appendChild(box);}
  const controls=document.querySelector(".action-buttons");if(controls&&!$("phase2-task-btn")){const b=document.createElement("button");b.id="phase2-task-btn";b.className="action-btn";b.textContent="任务";b.addEventListener("click",()=>this.showTasks());controls.insertBefore(b,controls.firstChild);}
  const dlg=$("dialog-panel");if(dlg&&!$("dialog-extra")){const x=document.createElement("div");x.id="dialog-extra";x.style.cssText="font-size:11px;color:#9dcbb7;margin-top:7px";dlg.appendChild(x);}
 }
 renderMiniMap(){
  const el=$("mini-map-canvas");if(!el)return;const c=el.getContext("2d"),sx=el.width/this.mapW,sy=el.height/this.mapH;
  c.fillStyle="#91b187";c.fillRect(0,0,el.width,el.height);
  this.areas.filter(a=>a.kind==="plaza").forEach(a=>{c.fillStyle="#d9cfb9";c.fillRect(a.x*sx,a.y*sy,a.w*sx,a.h*sy);});
  this.buildings.forEach(b=>{c.fillStyle=b.kind==="field"?"#b94f48":b.kind==="arts"?"#6d9da0":b.kind==="dorm"?"#788b85":b.kind==="class"?"#b7a58a":b.kind==="library"?"#8c9e83":b.kind==="auditorium"?"#9b6668":"#81918a";c.fillRect(b.x*sx,b.y*sy,b.w*sx,b.h*sy);c.strokeStyle="#f5f0df";c.lineWidth=2;c.strokeRect(b.x*sx,b.y*sy,b.w*sx,b.h*sy);});
  this.areas.filter(a=>a.kind==="walkway").forEach(a=>{c.fillStyle="#c7c0ad";c.fillRect(a.x*sx,a.y*sy,a.w*sx,a.h*sy);});
  c.textAlign="center";c.textBaseline="middle";this.buildings.forEach(b=>{c.font="bold 11px sans-serif";c.lineWidth=2;c.strokeStyle="#26382d";c.strokeText(b.name,(b.x+b.w/2)*sx,(b.y+b.h/2)*sy);c.fillStyle="#fff";c.fillText(b.name,(b.x+b.w/2)*sx,(b.y+b.h/2)*sy);c.font="8px sans-serif";c.fillText(b.room||b.desc,(b.x+b.w/2)*sx,(b.y+b.h/2)*sy+11);});
  c.fillStyle="#e6d6a0";this.areas.filter(a=>a.kind==="gate").forEach(a=>{c.fillRect(a.x*sx,a.y*sy,a.w*sx,a.h*sy);c.fillStyle="#26382d";c.font="bold 10px sans-serif";c.fillText("大门",(a.x+a.w/2)*sx,(a.y+a.h/2)*sy-7);});
  c.fillStyle="#fff";c.font="bold 22px sans-serif";c.textAlign="left";c.fillText("北 ↑",12,28);
  const p=this.iso(this.player.x,this.player.y);c.fillStyle="#f6e36a";c.beginPath();c.arc(p.x/this.mapW*el.width,p.y/this.mapH*el.height,9,0,Math.PI*2);c.fill();c.strokeStyle="#253a31";c.lineWidth=3;c.stroke();
 }
 resize(){const dpr=Math.min(devicePixelRatio||1,2),r=this.canvas.getBoundingClientRect();this.canvas.width=Math.max(1,Math.floor(r.width*dpr));this.canvas.height=Math.max(1,Math.floor(r.height*dpr));this.ctx.setTransform(dpr,0,0,dpr,0,0);this.viewW=r.width;this.viewH=r.height;}
 bindControls(){
  window.addEventListener("keydown",e=>{const k=e.key.toLowerCase();if(["w","a","s","d","arrowup","arrowdown","arrowleft","arrowright"," "].includes(k))e.preventDefault();this.keys[k]=true;if(k==="e"||k==="enter")this.interact();if(k==="shift")this.running=true;if(k==="escape"&&this.mode==="interior")this.exitInterior();if(k==="m")$("map-btn").click();},{passive:false});
  window.addEventListener("keyup",e=>{this.keys[e.key.toLowerCase()]=false;if(e.key.toLowerCase()==="shift")this.running=false;});
  $("run-btn").addEventListener("pointerdown",()=>this.running=true);["pointerup","pointercancel","pointerleave"].forEach(ev=>$("run-btn").addEventListener(ev,()=>this.running=false));
  $("interact-btn").addEventListener("click",()=>this.interact());
  const joy=$("joystick"),knob=$("joystick-knob");let active=false;
  const move=e=>{if(!active)return;const r=joy.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;let dx=e.clientX-cx,dy=e.clientY-cy,len=Math.hypot(dx,dy),max=35;if(len>max){dx=dx/len*max;dy=dy/len*max;}knob.style.transform=`translate(${dx}px,${dy}px)`;this.joy={x:dx/max,y:dy/max};};
  joy.addEventListener("pointerdown",e=>{active=true;joy.setPointerCapture(e.pointerId);move(e);});joy.addEventListener("pointermove",move);
  const end=()=>{active=false;this.joy={x:0,y:0};knob.style.transform="translate(0,0)";};joy.addEventListener("pointerup",end);joy.addEventListener("pointercancel",end);
 }
 iso(x,y){return{x:x*this.tileW,y:y*this.tileH};}
 screenToWorld(dx,dy){return{x:dx,y:dy};}
 blocked(x,y){
  if(this.mode==="campus"&&(x<1||y<1||x>this.mapW-1||y>this.mapH-1))return true;
  if(this.mode==="interior"&&(x<1||y<1||x>17||y>13))return true;
  return this.blockers.some(b=>x>b.x-.18&&x<b.x+b.w+.18&&y>b.y-.18&&y<b.y+b.h+.18);
 }
 update(dt){
  let sx=0,sy=0;if(this.keys.w||this.keys.arrowup)sy-=1;if(this.keys.s||this.keys.arrowdown)sy+=1;if(this.keys.a||this.keys.arrowleft)sx-=1;if(this.keys.d||this.keys.arrowright)sx+=1;
  if(Math.hypot(this.joy.x,this.joy.y)>.12){const v=this.screenToWorld(this.joy.x,this.joy.y);sx=v.x;sy=v.y;}
  const len=Math.hypot(sx,sy);if(len>.01){sx/=len;sy/=len;const speed=(this.running?5.1:3.1)*dt,nx=this.player.x+sx*speed,ny=this.player.y+sy*speed;if(!this.blocked(nx,this.player.y))this.player.x=nx;if(!this.blocked(this.player.x,ny))this.player.y=ny;this.player.walk+=dt*10;if(this.running)this.player.energy=Math.max(0,this.player.energy-dt*1.6);}else this.player.energy=Math.min(100,this.player.energy+dt*.45);
  this.elapsed+=dt;this.dayMinutes=(8*60+Math.floor(this.elapsed*3))%(24*60);
  if(this.mode==="campus")this.npcs.forEach((n,i)=>{n.phase+=dt*.45;n.x=n.homeX+Math.sin(n.phase+i)*.65;n.y=n.homeY+Math.cos(n.phase*.8+i)*.5;});
  const pos=this.iso(this.player.x,this.player.y);this.camera.x=pos.x-this.viewW/2;this.camera.y=pos.y-this.viewH/2+30;
  this.near=this.findNearby();if(this.mode==="campus"&&$("map-panel")&&!$("map-panel").classList.contains("hidden"))this.renderMiniMap();if(this.mode==="campus"&&this.player.x<14&&this.player.y>3&&this.player.y<31)this.tasks[3].done=true;$("energy-meter").style.width=this.player.energy+"%";$("energy-label").textContent=Math.round(this.player.energy);
  $("clock-label").textContent=String(Math.floor(this.dayMinutes/60)).padStart(2,"0")+":"+String(this.dayMinutes%60).padStart(2,"0");
  $("location-label").textContent=this.mode==="interior"?this.currentBuilding.room:(this.near?this.near.name:this.areaName());
  $("hint-label").textContent=this.mode==="interior"?"室内探索 · E 与室内角色/设施互动 · ESC 返回校园":(this.near?`靠近了${this.near.name} · 按 E 或点击互动`:"WASD / 方向键移动，靠近建筑入口按 E 进入");
  this.updateTaskText();
 }
 areaName(){
  if(this.player.y>45)return"校园南门";
  if(this.player.x<15&&this.player.y<33)return"操场";
  if(this.player.y>39)return"校园南区";
  if(this.player.y>20&&this.player.y<40)return"青春广场及教学区";
  if(this.player.y<20)return"校园北区";
  return"校园中轴";
 }
 findNearby(){
  if(this.mode==="interior"){const objs=this.roomObjects();let best=null,dist=1.8;objs.forEach(o=>{const d=Math.hypot(this.player.x-o.x,this.player.y-o.y);if(d<dist){dist=d;best=o;}});return best;}
  let best=null,dist=2.6;
  this.buildings.filter(b=>b.kind!=="field").forEach(b=>{const door=b.entrance||{x:b.x+b.w/2,y:b.y+b.h+.7};const d=Math.hypot(this.player.x-door.x,this.player.y-door.y);if(d<dist){dist=d;best={...b,doorX:door.x,doorY:door.y};}});
  this.npcs.forEach(n=>{const d=Math.hypot(this.player.x-n.x,this.player.y-n.y);if(d<1.45&&d<dist){dist=d;best={name:n.name,kind:"npc",desc:n.text,npc:n};}});
  return best;
 }
 roomObjects(){
  const k=this.currentBuilding.kind;
  const common=[{x:9,y:3,name:"室内公告板",kind:"notice",desc:"校园公告：请同学们遵守作息安排，保持公共区域整洁。"}];
  if(k==="class")return [...common,{x:5,y:5,name:"课桌",kind:"desk",desc:"课桌上放着课本和笔记。今天也要认真学习。"} ,{x:13,y:5,name:"黑板",kind:"board",desc:"黑板上写着：认真生活，勇敢追梦。"}];
  if(k==="library")return [...common,{x:5,y:6,name:"书架",kind:"book",desc:"你翻阅了一本校园文学选集，心情平静了下来。"} ,{x:13,y:6,name:"阅览桌",kind:"desk",desc:"找个位置坐下，安静阅读一会儿。"}];
  if(k==="food")return [...common,{x:5,y:6,name:"取餐窗口",kind:"meal",desc:"你吃了一顿热乎的校园餐，精力恢复了。"} ,{x:13,y:6,name:"饮水处",kind:"water",desc:"喝点水，继续校园探索。"}];
  if(k==="dorm")return [...common,{x:5,y:6,name:"宿舍床铺",kind:"rest",desc:"你休息了一会儿，疲惫一扫而空。"} ,{x:13,y:6,name:"个人书桌",kind:"desk",desc:"书桌上摆着课本、台灯和几张照片。"}];
  if(k==="lab")return [...common,{x:5,y:6,name:"实验台",kind:"labwork",desc:"你观察了实验器材，收获了一点新知识。"} ,{x:13,y:6,name:"社团展示墙",kind:"notice",desc:"这里展示着校园科技社团的活动海报。"}];
  return [...common,{x:5,y:6,name:"事务窗口",kind:"notice",desc:"校园事务办理时间：工作日 08:00—17:00。"} ,{x:13,y:6,name:"公告栏",kind:"notice",desc:"本周校园活动：社团招新、运动会筹备。"}];
 }
 interact(){
  if(!this.near){this.showDialog("校园提示","附近没有可互动的目标。请靠近建筑入口、校园人物或室内设施。");return;}
  if(this.mode==="campus"){
   if(this.near.kind==="npc"){this.showDialog(this.near.name,this.near.desc);this.tasks[0].done=true;return;}
   this.enterInterior(this.near);return;
  }
  const o=this.near;let extra="";
  if(o.kind==="meal"||o.kind==="water"){this.player.energy=Math.min(100,this.player.energy+35);this.tasks[2].done=true;extra="精力 +35";}
  if(o.kind==="rest"){this.player.energy=100;this.tasks[2].done=true;extra="精力已恢复至 100";}
  if(o.kind==="book"||o.kind==="desk"||o.kind==="board"||o.kind==="labwork"||o.kind==="notice"){this.player.energy=Math.min(100,this.player.energy+5);}
  this.showDialog(o.name,o.desc,extra);
 }
 enterInterior(b){
  this.currentBuilding=b;this.mode="interior";this.player.x=9;this.player.y=11;this.blockers=[];this.rebuildBlockers();this.tasks[1].done=true;
  this.showDialog(b.room,`你进入了${b.name}。可以在室内自由走动，并与设施互动。按 ESC 返回校园。`);
 }
 exitInterior(){this.mode="campus";const b=this.currentBuilding;const door=b.entrance||{x:b.x+b.w/2,y:b.y+b.h+1.8};this.player.x=door.x;this.player.y=door.y;this.currentBuilding=null;this.rebuildBlockers();}
 showDialog(title,text,extra=""){ $("dialog-title").textContent=title;$("dialog-text").textContent=text;const ex=$("dialog-extra");if(ex)ex.textContent=extra;$("dialog-panel").classList.remove("hidden");}
 showTasks(){
  const lines=this.tasks.map((t,i)=>`${t.done?"✓":"○"} ${i+1}. ${t.title}：${t.desc}`).join("\n");
  this.showDialog("新生校园任务",lines,"完成探索、拜访角色、体验生活设施即可推进任务。");
 }
 updateTaskText(){const el=$("phase2-task-text");if(el){const t=this.tasks.find(x=>!x.done);el.textContent=t?t.title:"全部基础任务已完成！";}}
 drawDiamond(x,y,color,stroke=null){const c=this.ctx;c.fillStyle=color;c.fillRect(x-this.tileW/2,y-this.tileH/2,this.tileW,this.tileH);if(stroke){c.strokeStyle=stroke;c.strokeRect(x-this.tileW/2,y-this.tileH/2,this.tileW,this.tileH);}}

 draw(){
  const c=this.ctx,w=this.viewW,h=this.viewH;c.clearRect(0,0,w,h);c.save();c.translate(-this.camera.x,-this.camera.y);
  c.fillStyle=this.mode==="interior"?"#c4aa82":"#789d83";c.fillRect(this.camera.x-100,this.camera.y-100,w+200,h+200);
  if(this.mode==="campus")this.drawCampus();else this.drawInterior();
  c.restore();
 }
 drawCampus(){
  const c=this.ctx;
  c.fillStyle="#82a982";c.fillRect(0,0,this.mapW*this.tileW,this.mapH*this.tileH);
  // Ultra pixel-ground: deterministic grass clusters, subtle tile seams and tiny highlights.
  for(let y=0;y<this.mapH;y+=2)for(let x=0;x<this.mapW;x+=2){
   const seed=(x*73+y*151+x*y*7)%19;
   c.fillStyle=seed<3?"#91b88a":seed<7?"#86ad80":seed<11?"#7fa579":"#83a97d";
   c.fillRect(x*this.tileW,y*this.tileH,this.tileW*2,this.tileH*2);
   c.fillStyle=seed%2?"#a4c28e":"#71966f";
   c.fillRect((x*2+seed%5)*this.tileW/2,(y*2+(seed*3)%5)*this.tileH/2,4,3);
  }
  // Small landscaped islands are decorative only and never alter the approved building coordinates.
  for(let i=0;i<42;i++){
   const gx=((i*37+19)%96+2)*this.tileW,gy=((i*61+11)%51+2)*this.tileH;
   if(this.buildings.some(b=>gx>b.x*this.tileW-18&&gx<(b.x+b.w)*this.tileW+18&&gy>b.y*this.tileH-18&&gy<(b.y+b.h)*this.tileH+18))continue;
   c.fillStyle="#6f986e";c.fillRect(gx,gy,22,9);c.fillStyle="#a8c58c";c.fillRect(gx+4,gy-3,12,5);
  }
  this.areas.filter(a=>["road","plaza"].includes(a.kind)).forEach(a=>{
   c.fillStyle=a.kind==="road"?"#c9c1a9":"#d6cfb8";
   c.fillRect(a.x*this.tileW,a.y*this.tileH,a.w*this.tileW,a.h*this.tileH);
   c.strokeStyle="#eee8d5";c.lineWidth=3;c.strokeRect(a.x*this.tileW+3,a.y*this.tileH+3,a.w*this.tileW-6,a.h*this.tileH-6);
   this.label(a.name,(a.x+a.w/2)*this.tileW,(a.y+a.h/2)*this.tileH,"#514e40",15);
  });
  this.areas.filter(a=>a.kind==="walkway").forEach(a=>{c.fillStyle="#c7c0ad";c.fillRect(a.x*this.tileW,a.y*this.tileH,a.w*this.tileW,a.h*this.tileH);c.strokeStyle="#eee6d4";c.lineWidth=2;c.strokeRect(a.x*this.tileW,a.y*this.tileH,a.w*this.tileW,a.h*this.tileH);});
  const field=this.buildings.find(a=>a.kind==="field");
  if(field){
   const x=field.x*this.tileW,y=field.y*this.tileH,w=field.w*this.tileW,h=field.h*this.tileH;
   c.fillStyle="#b84f48";c.beginPath();c.roundRect(x,y,w,h,Math.min(42,w*.12));c.fill();
   c.strokeStyle="#f5dfc8";c.lineWidth=4;c.stroke();
   for(let i=1;i<5;i++){c.strokeStyle="#f2d8c4";c.lineWidth=2;c.beginPath();c.roundRect(x+i*8,y+i*8,w-i*16,h-i*16,Math.max(10,30-i*3));c.stroke();}
   c.fillStyle="#438650";c.fillRect(x+36,y+36,w-72,h-72);
   for(let i=0;i<10;i++){c.fillStyle=i%2?"#4c9657":"#397c48";c.fillRect(x+36+i*(w-72)/10,y+36,(w-72)/10,h-72);}
   c.strokeStyle="#eaf0d9";c.lineWidth=3;c.strokeRect(x+36,y+36,w-72,h-72);
   c.beginPath();c.moveTo(x+w/2,y+36);c.lineTo(x+w/2,y+h-36);c.stroke();c.beginPath();c.arc(x+w/2,y+h/2,Math.min(w,h)*.14,0,Math.PI*2);c.stroke();
   this.label("操场",x+w/2,y+h/2,"#fff",18);
  }
  const stands=this.areas.find(a=>a.kind==="stands");
  if(stands){
   const x=stands.x*this.tileW,y=stands.y*this.tileH,w=stands.w*this.tileW,h=stands.h*this.tileH;
   c.fillStyle="#aaa493";c.fillRect(x,y,w,h);
   c.strokeStyle="#eee5d3";c.lineWidth=3;c.strokeRect(x+2,y+2,w-4,h-4);
   // 看台沿南北方向延伸，座席朝向东侧操场；用竖向分层表现看台排座。
   for(let i=0;i<6;i++){
    c.fillStyle=["#e2d4b4","#d9bd68","#6d9fc0","#b85b4f"][i%4];
    c.fillRect(x+5+i*(w-10)/6,y+5,(w-14)/6,h-10);
    c.strokeStyle="#887f70";c.lineWidth=1;c.strokeRect(x+5+i*(w-10)/6,y+5,(w-14)/6,h-10);
   }
   this.label("看台",x+w/2,y+h/2,"#fff",14);
  }
  const gate=this.areas.find(a=>a.kind==="gate");
  if(gate){const x=gate.x*this.tileW,y=gate.y*this.tileH,w=gate.w*this.tileW;c.fillStyle="#d8d1bd";c.fillRect(x-55,y+18,w+110,18);c.fillStyle="#596b60";c.fillRect(x-45,y-18,18,65);c.fillRect(x+w+27,y-18,18,65);c.fillStyle="#e8dfc8";c.fillRect(x-27,y-14,w+54,15);this.label("峰峰一中",x+w/2,y-25,"#fff",18);}
  this.areas.filter(a=>a.kind==="booths").forEach(a=>{for(let i=0;i<5;i++){const x=(a.x+i*a.w/5)*this.tileW,y=a.y*this.tileH;c.fillStyle="#d7e2d7";c.fillRect(x,y,Math.max(20,a.w*this.tileW/6),this.tileH*.55);c.fillStyle="#668b83";c.fillRect(x+4,y+4,Math.max(12,a.w*this.tileW/7),this.tileH*.34);}});
  // 校园绿化以外围树带为主，不随机遮挡手绘图中的建筑位置。
  for(let x=2;x<99;x+=3){this.drawTree(x*this.tileW,2.0*this.tileH);this.drawTree(x*this.tileW,53.0*this.tileH);}
  for(let y=5;y<52;y+=3){this.drawTree(1.8*this.tileW,y*this.tileH);this.drawTree(98.0*this.tileW,y*this.tileH);}
  const items=[];
  this.buildings.filter(b=>b.kind!=="field").forEach(b=>items.push({d:b.y+b.h,fn:()=>this.drawBuilding(b)}));
  this.npcs.forEach(n=>items.push({d:n.y,fn:()=>this.drawPerson(n.x,n.y,n.role==="teacher"?"#d5dbe4":"#d8c18c","#34445a",n.name,false)}));
  items.push({d:this.player.y,fn:()=>this.drawPerson(this.player.x,this.player.y,this.profile.uniform,this.profile.hair,this.profile.name,true)});
  items.sort((a,b)=>a.d-b.d).forEach(i=>i.fn());
 }
 label(text,x,y,color="#fff",size=14){const c=this.ctx;c.save();c.font=`800 ${size}px sans-serif`;c.textAlign="center";c.lineWidth=4;c.strokeStyle="#26382dcc";c.strokeText(text,x,y);c.fillStyle=color;c.fillText(text,x,y);c.restore();}
 drawInterior(){
  const c=this.ctx,w=18*this.tileW,h=14*this.tileH;
  c.fillStyle="#e9dfcc";c.fillRect(0,0,w,h);
  for(let y=0;y<14;y++)for(let x=0;x<18;x++){
   c.fillStyle=(x+y)%2?"#d9c9ae":"#e3d5bd";c.fillRect(x*this.tileW,y*this.tileH,this.tileW,this.tileH);
   c.fillStyle="#fff3";c.fillRect(x*this.tileW+3,y*this.tileH+3,this.tileW-6,2);
   c.fillStyle="#8c795e22";c.fillRect(x*this.tileW+this.tileW-2,y*this.tileH,2,this.tileH);
  }
  // 俯视室内墙体与门口
  c.fillStyle="#eee7d9";c.fillRect(0,0,w,22);c.fillRect(0,0,22,h);c.fillRect(w-22,0,22,h);c.fillRect(0,h-22,7*this.tileW,22);c.fillRect(11*this.tileW,h-22,7*this.tileW,22);
  c.fillStyle="#71513e";c.fillRect(7*this.tileW,h-25,4*this.tileW,9);
  c.fillStyle="#493b30";c.font="bold 22px sans-serif";c.textAlign="center";c.fillText(this.currentBuilding.name+" · "+this.currentBuilding.room,w/2,54);
  const k=this.currentBuilding.kind;
  const furniture=(x,y,ww,hh,label,color)=>{c.fillStyle="#0002";c.fillRect(x*this.tileW+4,y*this.tileH+6,ww*this.tileW,hh*this.tileH);c.fillStyle=color;c.fillRect(x*this.tileW,y*this.tileH,ww*this.tileW,hh*this.tileH);c.strokeStyle="#705d49";c.lineWidth=2;c.strokeRect(x*this.tileW,y*this.tileH,ww*this.tileW,hh*this.tileH);c.fillStyle="#fff";c.font="12px sans-serif";c.fillText(label,(x+ww/2)*this.tileW,(y+hh/2)*this.tileH+4);};
  if(k==="class"){furniture(2,2,4,1,"讲台 / 黑板","#526b73");for(let y=5;y<11;y+=2)for(let x of [2,6,10,14])furniture(x,y,2,1,"课桌","#a7835e");}
  else if(k==="library"){for(let y of [2,5,8])furniture(2,y,3,1,"书架","#805d3e");furniture(8,3,6,2,"阅览桌","#a7835e");furniture(8,8,6,2,"阅读区","#66877b");}
  else if(k==="lab"){for(let y of [3,7])for(let x of [2,8,13])furniture(x,y,3,2,"实验台","#668b88");}
  else if(k==="food"){furniture(2,2,14,1,"取餐窗口","#a86d50");for(let y of [5,8])for(let x of [2,7,12])furniture(x,y,3,2,"餐桌","#a7835e");}
  else if(k==="dorm"){for(let y of [2,6,10]){furniture(2,y,3,2,"床铺","#8d83a8");furniture(8,y,3,2,"床铺","#8d83a8");furniture(14,y,2,2,"衣柜","#826d59");}}
  else if(k==="auditorium"){
   // 报告厅朝西：舞台位于室内西侧，观众席在东侧并朝西面向舞台。
   furniture(1,2,2,10,"西侧舞台","#8d4852");
   for(let y of [2,4,6,8,10,12])for(let x of [5,8,11,14])furniture(x,y,1.5,1,"座席","#826d68");
  }
  else if(k==="bath"){for(let y of [2,6,10])for(let x of [2,6,10,14])furniture(x,y,2,2,"淋浴间","#76a9ad");}
  else {furniture(2,3,5,3,"活动区","#6c9189");furniture(10,3,5,3,"器材区","#8b9b78");furniture(5,8,8,2,"公共区域","#a7835e");}
  this.drawPerson(this.player.x,this.player.y,this.profile.uniform,this.profile.hair,this.profile.name,true);
 }

 drawTree(x,y){
  const c=this.ctx;
  // Pixel-cluster canopy with a readable trunk, layered foliage and soft shadow.
  c.fillStyle="#243d3155";c.fillRect(x-12,y+10,30,9);c.fillStyle="#76543a";c.fillRect(x-3,y+2,8,13);
  c.fillStyle="#28553f";c.fillRect(x-15,y-12,30,25);c.fillRect(x-10,y-18,20,8);
  c.fillStyle="#39724d";c.fillRect(x-18,y-8,12,18);c.fillRect(x+7,y-10,12,17);
  c.fillStyle="#5b9360";c.fillRect(x-10,y-16,12,9);c.fillRect(x+1,y-12,10,8);c.fillRect(x-15,y-3,8,8);
  c.fillStyle="#8ab66e";c.fillRect(x-7,y-14,5,4);c.fillRect(x+4,y-9,4,4);
 }
 drawBuilding(b){
  const c=this.ctx,x=Math.round(b.x*this.tileW),y=Math.round(b.y*this.tileH),w=Math.round(b.w*this.tileW),h=Math.round(b.h*this.tileH);
  const palette={dorm:["#d9d1bf","#647e78","#8ba59a"],class:["#e4d7c2","#78877e","#a9b7a8"],library:["#d9d0b8","#667d6d","#a6b49a"],lab:["#d9d7c9","#657d83","#a4c1bd"],food:["#e7d4b7","#8b765e","#c6a67b"],arts:["#d9d2c3","#638d91","#a1c1bb"],auditorium:["#d8c5b7","#805d62","#bd8d84"],office:["#e3d9c7","#788b7b","#b5c0a8"],bath:["#d8d5c8","#718c91","#a7c1c1"]};
  const q=palette[b.kind]||["#ddd4c4",b.roof||"#77847d","#a8b6a7"];
  // Cast shadow, plinth, outer walls and roof rim.
  c.fillStyle="#20382c55";c.fillRect(x+13,y+16,w,h);
  c.fillStyle="#b5aa96";c.fillRect(x-3,y-3,w+6,h+6);
  c.fillStyle=q[0];c.fillRect(x,y,w,h);
  c.fillStyle="#f4ead7";c.fillRect(x+5,y+5,w-10,h-10);
  c.fillStyle=q[1];c.fillRect(x+10,y+10,w-20,h-20);
  c.fillStyle=q[2];c.fillRect(x+14,y+14,w-28,Math.max(7,h*.12));
  // Roof panel seams and small rooftop equipment.
  c.strokeStyle="#ffffff38";c.lineWidth=2;
  for(let xx=x+22;xx<x+w-14;xx+=34){c.beginPath();c.moveTo(xx,y+20);c.lineTo(xx,y+h-20);c.stroke();}
  for(let yy=y+34;yy<y+h-18;yy+=31){c.beginPath();c.moveTo(x+17,yy);c.lineTo(x+w-17,yy);c.stroke();}
  c.fillStyle="#d7d0bf";c.fillRect(x+w*.18,y+h*.34,w*.18,Math.max(8,h*.13));
  c.fillStyle="#eef2df";c.fillRect(x+w*.2,y+h*.36,w*.14,Math.max(4,h*.06));
  c.fillStyle="#526c67";c.fillRect(x+w*.66,y+h*.35,w*.12,Math.max(7,h*.11));
  // Perimeter window rhythm on the south-facing facade.
  const cols=Math.max(3,Math.floor(w/42));
  for(let i=0;i<cols;i++){
   const wx=x+14+i*((w-28)/cols),ww=Math.max(7,(w-30)/cols-6);
   c.fillStyle="#526f70";c.fillRect(wx,y+h-15,ww,9);c.fillStyle="#c6e0d9";c.fillRect(wx+2,y+h-13,Math.max(3,ww-4),4);
  }
  // Roof signboard and clear nameplate.
  c.fillStyle="#f2ead9";c.fillRect(x+12,y+11,w-24,Math.max(20,Math.min(35,h*.23)));
  c.fillStyle="#35473f";c.textAlign="center";c.font=`900 ${Math.min(19,Math.max(11,w/10))}px sans-serif`;c.fillText(b.name,x+w/2,y+Math.min(30,h*.23));
  c.fillStyle="#637268";c.font=`bold ${Math.min(12,Math.max(9,w/14))}px sans-serif`;c.fillText(b.room||b.desc,x+w/2,y+Math.min(44,h*.23+13));
  // Entrance remains attached to the approved connector side; campus main gate is a separate feature.
  if(!b.noDoor){
   let dx=x+w/2-11,dy=y+h-14;
   if(b.entranceSide==="west"){dx=x-2;dy=y+h/2-15;}
   else if(b.entranceSide==="east"){dx=x+w-12;dy=y+h/2-15;}
   else if(b.facing==="west"){dx=x-2;dy=y+h/2-13;}
   c.fillStyle="#49382e";c.fillRect(dx,dy,14,28);c.fillStyle="#e9d5a8";c.fillRect(dx+3,dy+4,7,19);c.fillStyle="#b7d8d0";c.fillRect(dx+4,dy+6,5,7);
   c.fillStyle="#d8c49a";c.fillRect(dx-4,dy+25,22,5);
   if(b.entranceSide==="west"||b.facing==="west") {c.fillStyle="#d6c7a8";c.fillRect(dx-17,dy+8,17,12);}
   if(b.entranceSide==="east"){c.fillStyle="#d6c7a8";c.fillRect(dx+14,dy+8,17,12);}
  }
 }

 darken(hex){const n=parseInt(hex.slice(1),16),r=Math.max(0,((n>>16)&255)-28),g=Math.max(0,((n>>8)&255)-28),b=Math.max(0,(n&255)-28);return`rgb(${r},${g},${b})`;}
 drawPerson(x,y,shirt,hair,name,isPlayer){const c=this.ctx,p=this.iso(x,y),bob=isPlayer&&Math.sin(this.player.walk*2)>0?1:0;c.fillStyle="#0004";c.beginPath();c.ellipse(p.x,p.y+10,12,7,0,0,Math.PI*2);c.fill();c.fillStyle=shirt;c.beginPath();c.arc(p.x,p.y+2+bob,10,0,Math.PI*2);c.fill();c.fillStyle="#f0c8a5";c.beginPath();c.arc(p.x,p.y-5+bob,7,0,Math.PI*2);c.fill();c.fillStyle=hair;c.beginPath();c.arc(p.x,p.y-7+bob,7,Math.PI,Math.PI*2);c.fill();c.fillStyle="#fff";c.font="11px sans-serif";c.textAlign="center";c.lineWidth=3;c.strokeStyle="#24352c";c.strokeText(name.length>7?name.slice(0,7):name,p.x,p.y-19+bob);c.fillText(name.length>7?name.slice(0,7):name,p.x,p.y-19+bob);if(isPlayer){c.strokeStyle="#f5e6a7";c.lineWidth=2;c.beginPath();c.arc(p.x,p.y,16,0,Math.PI*2);c.stroke();}}

 loop(now){const dt=Math.min((now-this.last)/1000,.05);this.last=now;this.update(dt);this.draw();requestAnimationFrame(this.loop);}
 save(){const data={profile:this.profile,player:this.player,elapsed:this.elapsed,mode:this.mode};try{localStorage.setItem("kmd-youth-save",JSON.stringify(data));this.showDialog("保存成功","角色、精力和探索位置已保存在当前设备。");}catch(e){this.showDialog("保存失败","浏览器存储不可用，请检查存储权限。");}}
}
function launchGame(){show(gameScreen);$("hud-name").textContent=profile.name;$("hud-grade").textContent=profile.grade;if(game){game=null;}game=new TopDownCampus($("game-canvas"),profile);}
$("dialog-ok").addEventListener("click",()=>$("dialog-panel").classList.add("hidden"));
document.querySelectorAll("[data-close]").forEach(btn=>btn.addEventListener("click",()=>$(btn.dataset.close).classList.add("hidden")));
$("map-btn").addEventListener("click",()=>$("map-panel").classList.remove("hidden"));
$("settings-btn").addEventListener("click",()=>$("settings-panel").classList.remove("hidden"));
$("save-btn").addEventListener("click",()=>game&&game.save());
$("exit-btn").addEventListener("click",()=>{if(game)game.save();show(startScreen);});
try{const saved=JSON.parse(localStorage.getItem("kmd-youth-profile")||"null");if(saved&&saved.name)profile=saved;}catch(_){}
drawAvatar($("avatar-preview"),profile);
})();