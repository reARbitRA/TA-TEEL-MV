#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""سازندهٔ «انیماتیکِ سکانس‌ها» — barq-mv/animatic.html
منبعِ بصریِ ریپو: ۳۶ گام روی پلیت‌های نقاشی‌شدهٔ واقعی (refs) + لایه‌های متحرکِ دقیق:
پردهٔ استودیو، شمعِ زاده‌شونده، موجِ گرما، مدالیون‌های شخصیت‌ها، چراغ‌خطرها،
ساعتِ دیوانه، رودِ شمع‌ها، برگشتِ نور، آتشِ ابدی، مُهرِ «تعطیل» — با قابِ تذهیب،
دانهٔ فیلم، رانشِ دوربین. فونت: لاله‌زار (جاسازی). گام‌ها: از build_story_machine.py.
"""
import base64, io, json, re, os
from PIL import Image

ROOT = os.path.dirname(os.path.abspath(__file__))
BM = os.path.join(ROOT, 'barq-mv')

# ---------- تصاویر ----------
BIG = {  # پلیت‌های تمام‌صفحه
 'majles': 'refs/scenes/v7-majles.png',
 'room':   'refs/gta/taatil-gta-raavi-base.png',
 'city':   'refs/gta/taatil-gta-round.png',
 'turbine':'refs/scenes/taatil-mv-turbine-akhund2.png',
 'haj':    'refs/scenes/v7-haj-khanom.png',
 'built':  'refs/scenes/v7-built-paid.png',
 'fasad':  'refs/scenes/taatil-mv-s4b-fasad-engine.png',
 'riot':   'refs/scenes/v7-riot.png',
 'threephase': 'refs/scenes/v7-threephase.png',
}
SMALL = {  # اسپرایت‌ها و مدالیون‌ها
 'candle': 'refs/characters/candle-hero.jpg',
 'calf':   'refs/characters/golden-calf-pro.jpg',
 'saddam': 'refs/characters/saddam-pro.jpg',
 'angel':  'refs/characters/robot-angel-pro.jpg',
 'basiji': 'refs/characters/basiji-pro.jpg',
 'divche': 'refs/characters/divche-pro.jpg',
 'queen':  'refs/characters/zan-vazir-pro.jpg',
}

def b64_jpg(path, maxw, q):
    im = Image.open(os.path.join(BM, path)).convert('RGB')
    if im.width > maxw:
        im = im.resize((maxw, round(im.height * maxw / im.width)), Image.LANCZOS)
    buf = io.BytesIO(); im.save(buf, 'JPEG', quality=q, optimize=True)
    return base64.b64encode(buf.getvalue()).decode()

RAW = {}
for k, p in BIG.items():
    RAW[k] = 'data:image/jpeg;base64,' + b64_jpg(p, 1100, 80)
for k, p in SMALL.items():
    RAW[k] = 'data:image/jpeg;base64,' + b64_jpg(p, 560, 82)

FONT_B64 = base64.b64encode(open(os.path.join(ROOT, 'assets/fonts/Lalezar-Regular.ttf'), 'rb').read()).decode()

# ---------- گام‌ها از ماشینِ داستان ----------
src = open(os.path.join(ROOT, 'build_story_machine.py'), encoding='utf-8').read()
STEPS = re.search(r'const STEPS=\[.*?\n\];', src, re.S).group(0)
N = len(re.findall(r"\{tc:'", STEPS))

HTML = r"""<!DOCTYPE html><html lang="fa" dir="rtl"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>«تعطیل» — انیماتیکِ سکانس‌ها (منبعِ بصریِ ریپو)</title>
<style>
@font-face{font-family:Lalezar;src:url(data:font/ttf;base64,__FONT__) format('truetype');font-weight:normal}
:root{--gold:#d9b23c;--ink:#efe6cd;--bg:#070b16}
*{box-sizing:border-box}
body{margin:0;background:radial-gradient(1000px 500px at 50% -100px,#101a36,var(--bg) 70%) fixed,var(--bg);color:var(--ink);font-family:Lalezar,Tahoma,'Segoe UI',sans-serif;display:flex;flex-direction:column;align-items:center}
h1{color:var(--gold);font-size:21px;margin:12px 0 2px;font-weight:normal}
.sub{color:#8b93a8;font-size:12.5px;margin:0 0 10px;text-align:center;padding:0 12px}
#stage{position:relative;width:min(96vw,1080px)}
#cv{width:100%;display:block;border:2px solid #8a6d1d;border-radius:8px;outline:1px solid #3a3252;outline-offset:5px;background:#070b16}
#scenetag{position:absolute;top:10px;right:12px;background:rgba(10,15,30,.8);border:1px solid #8a6d1d;border-radius:8px;padding:3px 12px;font-size:14px;color:var(--gold)}
#stepchip{position:absolute;top:10px;left:12px;background:rgba(10,15,30,.8);border:1px solid #3a3252;border-radius:8px;padding:3px 12px;font-size:13px;color:#c9c4b8}
#lyrbox{text-align:center;padding:10px 8px 2px;max-width:1000px}
#sec{color:var(--gold);font-size:17px}
#line{color:#c9c4b8;font-size:14.5px;line-height:1.9;min-height:28px}
#chips{display:flex;flex-wrap:wrap;gap:5px;justify-content:center;margin:10px 0 8px;max-width:1080px}
#chips a{color:var(--ink);text-decoration:none;font-size:12px;border:1px solid #3a3252;border-radius:20px;padding:3px 10px;cursor:pointer}
#chips a.on{border-color:var(--gold);color:var(--gold)}
#bar{display:flex;gap:10px;align-items:center;padding:8px;font-size:14px;position:sticky;bottom:0;z-index:50;background:rgba(9,13,26,.94);border-top:1px solid #8a6d1d;border-radius:12px 12px 0 0;margin-top:6px}
button{background:#141a2e;color:var(--ink);border:1px solid #8a6d1d;border-radius:8px;padding:6px 18px;font-family:inherit;font-size:14px;cursor:pointer}
button:hover{border-color:var(--gold);color:var(--gold)}
.lbl{color:#8b93a8;font-size:12.5px}
#flash{position:fixed;inset:0;background:#fff;opacity:0;pointer-events:none;z-index:90}
#stamp{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%) rotate(-11deg);opacity:0;pointer-events:none;z-index:95;
 border:6px solid #a3282a;border-radius:22px;padding:4px 26px;color:#a3282a;font-size:64px;background:rgba(10,8,10,.15);transition:opacity .18s}
footer{color:#5a6172;font-size:11px;margin:14px 0 26px;text-align:center;line-height:1.9}
</style></head><body>
<h1>«تعطیل (برقِ من)» — انیماتیکِ سکانس‌ها</h1>
<div class="sub">منبعِ بصریِ تولید · ۳۶ گام روی پلیت‌های نقاشی‌شدهٔ واقعی + لایه‌های متحرک · مینیاتورِ صفوی از بالا · ۱۰۵ BPM · قابِ تذهیب و دانهٔ فیلم زنده</div>
<div id="stage"><canvas id="cv" width="1280" height="720"></canvas>
 <div id="scenetag">—</div><div id="stepchip">—</div></div>
<div id="lyrbox"><div id="sec">—</div><div id="line">▶ را بزنید (یا Space)</div></div>
<div id="chips"></div>
<div id="bar">
<button id="pp">▶ پخش</button><button id="prev">‹ قبلی</button><button id="next">بعدی ›</button>
<span class="lbl">Space = پخش/توقف · فلش‌ها = گام</span>
</div>
<div id="flash"></div><div id="stamp"><div>تعطیل</div></div>
<footer>«تعطیل» · انیماتیکِ ریپوی barq-mv · پلیت‌ها: refs/scenes + refs/gta · گام‌ها: docs/timing-map.md · پرومپت‌های لنگر: prompts/anchors.md · امضا: کیرتو‌ناری</footer>
<script>
const RAW=__RAW__;
const cv=document.getElementById('cv'),ctx=cv.getContext('2d');
const W=1280,H=720;
const IMGS={};for(const k in RAW){const im=new Image();im.ok=0;im.onload=()=>{im.ok=1};im.src=RAW[k];IMGS[k]=im}
__STEPS__
const fa=n=>String(n).replace(/\d/g,d=>'۰۱۲۳۴۵۶۷۸۹'[d]);
// ---------- ابزارهای نقاشی ----------
function bg(col){ctx.fillStyle=col||'#0d1526';ctx.fillRect(0,0,W,H)}
function cover(k,zoom,px,py,alpha){const im=IMGS[k];zoom=zoom||1;px=px||0;py=py||0;
 if(!im||!im.ok){bg();return}
 const s=Math.max(W/im.width,H/im.height)*zoom,w=im.width*s,h=im.height*s;
 if(alpha!==undefined){ctx.globalAlpha=alpha}
 ctx.drawImage(im,(W-w)/2+px,(H-h)/2+py,w,h);ctx.globalAlpha=1}
function sprite(k,x,y,h,alpha){const im=IMGS[k];if(!im||!im.ok)return;
 const w=im.width*h/im.height;if(alpha!==undefined)ctx.globalAlpha=alpha;
 ctx.drawImage(im,x-w/2,y-h/2,w,h);ctx.globalAlpha=1}
function glow(x,y,r,col){const g=ctx.createRadialGradient(x,y,0,x,y,r);
 g.addColorStop(0,col);g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2)}
function ebrRing(x,y,r,col,lw,n){ // حلقهٔ صدای بندِ ابری
 ctx.strokeStyle=col;ctx.lineWidth=lw||3;const m=n||16,bump=r*0.16+3;
 for(let i=0;i<m;i++){const a=i/m*Math.PI*2,bx=x+Math.cos(a)*r,by=y+Math.sin(a)*r;
  ctx.beginPath();ctx.arc(bx,by,bump,0,7);ctx.stroke()}}
function burst(x,y,r,col,n){ // پاپِ فیوز
 ctx.strokeStyle=col;ctx.lineWidth=2.5;
 for(let i=0;i<(n||12);i++){const a=i/(n||12)*Math.PI*2,l=r*(.6+Math.random()*.6);
  ctx.beginPath();ctx.moveTo(x+Math.cos(a)*r*.2,y+Math.sin(a)*r*.2);
  ctx.lineTo(x+Math.cos(a)*l,y+Math.sin(a)*l);ctx.stroke()}
 glow(x,y,r*2,'rgba(230,170,60,.5)')}
function medallion(k,x,y,r){ // مدالیونِ طلایِ روبه‌رو با برشِ دایره‌ای
 const im=IMGS[k];ctx.save();
 ctx.beginPath();ctx.arc(x,y,r,0,7);ctx.closePath();
 ctx.shadowColor='rgba(0,0,0,.6)';ctx.shadowBlur=18;ctx.fillStyle='#0d1526';ctx.fill();ctx.shadowBlur=0;ctx.clip();
 if(im&&im.ok){const s=2*r/Math.min(im.width,im.height);
  ctx.drawImage(im,x-im.width*s/2,y-im.height*s/2,im.width*s,im.height*s)}
 ctx.restore();
 ctx.strokeStyle='#d9b23c';ctx.lineWidth=5;ctx.beginPath();ctx.arc(x,y,r+4,0,7);ctx.stroke();
 ctx.strokeStyle='#8a6d1d';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y,r+10,0,7);ctx.stroke();
 ebrRing(x,y,r+22,'#d9b23c',1.5,20)}
function grain(){ctx.fillStyle='rgba(255,255,255,.03)';
 for(let i=0;i<90;i++)ctx.fillRect(Math.random()*W,Math.random()*H,1.4,1.4)}
function vignette(){const g=ctx.createRadialGradient(W/2,H/2,H*.42,W/2,H/2,H*.78);
 g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(4,7,14,.55)');
 ctx.fillStyle=g;ctx.fillRect(0,0,W,H)}
function tazhib(){ // قابِ تذهیبِ زنده + امضا
 ctx.strokeStyle='#d9b23c';ctx.lineWidth=3;ctx.strokeRect(7,7,W-14,H-14);
 ctx.strokeStyle='#8a6d1d';ctx.lineWidth=1;ctx.strokeRect(15,15,W-30,H-30);
 const c=(x,y)=>{ctx.fillStyle='#d9b23c';
  ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+26,y);ctx.lineTo(x+26,y+8);ctx.lineTo(x+8,y+8);
  ctx.lineTo(x+8,y+26);ctx.lineTo(x,y+26);ctx.closePath();ctx.fill();
  ebrRing(x+13,y+13,10,'#8a6d1d',1,8)};
 c(22,22);c(W-22,22);c(22,H-22);c(W-22,H-22);
 ctx.fillStyle='rgba(217,178,60,.8)';ctx.font='13px Lalezar,Tahoma';ctx.textAlign='left';
 ctx.fillText('K1RT!0NARi',26,H-24)}
// ---------- سکانس‌ها ----------
const SCN={
1(t,S){ // ایوِنت: پرده بالای مجلس
 const idx=STEPS.indexOf(S),p=Math.min(1,idx/4);
 cover('majles',1.07+Math.sin(t*.4)*.008,Math.sin(t*.3)*6,Math.cos(t*.25)*4);
 ctx.fillStyle='rgba(230,180,80,.06)';ctx.fillRect(0,0,W,H);
 if(S.chador){const x=W*.24,y=H*.52; // گوشِ چادر در فیوز
  ctx.strokeStyle='#0b0e18';ctx.lineWidth=14;ctx.beginPath();
  ctx.moveTo(x-130,y+60);ctx.quadraticCurveTo(x-40,y-30,x+30,y);ctx.stroke();
  burst(x+34,y-6,26+Math.sin(t*22)*8,'#f0d070',10);
  ctx.strokeStyle='rgba(240,220,150,.8)';ctx.lineWidth=2; // ترکِ طلا
  ctx.beginPath();ctx.moveTo(W*.2,H*.1);ctx.lineTo(W*.3,H*.2);ctx.lineTo(W*.28,H*.32);
  ctx.moveTo(W*.8,H*.9);ctx.lineTo(W*.72,H*.8);ctx.stroke()}
 const ch=H*(1-p)*.92+8; // پرده‌های مخمل
 for(const side of [0,1]){const x0=side?W*.5:0,w=W*.5;
  ctx.fillStyle='#5e1220';ctx.fillRect(x0,0,w,ch);
  ctx.fillStyle='#7a1a2c';ctx.fillRect(x0+(side?0:w*.12),0,w*.88,ch*.9);
  ctx.strokeStyle='#d9b23c';ctx.lineWidth=4;ctx.beginPath();
  ctx.moveTo(x0,ch);ctx.lineTo(x0+w,ch);ctx.stroke();
  for(let i=1;i<10;i++){const tx=x0+w*i/10;
   ctx.beginPath();ctx.moveTo(tx,ch);ctx.lineTo(tx,ch+18+Math.sin(i*7+t*3)*4);ctx.stroke();
   ctx.fillStyle='#d9b23c';ctx.beginPath();ctx.arc(tx,ch+22+Math.sin(i*7+t*3)*4,4,0,7);ctx.fill()}}
 if(p<1){ctx.fillStyle='rgba(20,8,10,.35)';ctx.fillRect(0,0,W,H)}},
2(t,S){ // تولدِ شمع
 bg('#04060c');
 const sc=Math.min(1,.6+t*.25),bob=Math.sin(t*2.2)*6;
 glow(W/2,H*.52,240*sc,'rgba(245,230,168,.22)');
 sprite('candle',W/2,H*.52+bob,560*sc);
 ebrRing(W/2,H*.3,120+t*30,'rgba(217,178,60,'+Math.max(0,.5-t*.25)+')',2,18);
 for(let i=0;i<3;i++){const a=t*.8+i*2.1;
  glow(W/2+Math.cos(a)*150,H*.45+Math.sin(a)*90,26,'rgba(240,200,90,.5)')}},
3(t,S){ // اتاقِ چهل‌درجه
 cover('room',1.09+Math.sin(t*.35)*.006,Math.sin(t*.28)*5,Math.cos(t*.22)*3);
 ctx.strokeStyle='rgba(226,98,43,.28)';ctx.lineWidth=3; // موجِ گرما
 for(let i=0;i<5;i++){ctx.beginPath();
  for(let x=0;x<=W;x+=26){const y=H*(.12+i*.16)+Math.sin(x*.02+t*(1.2+i*.2))*9;
   x?ctx.lineTo(x,y):ctx.moveTo(x,y)}ctx.stroke()}
 if(S.flash){ // تَرَق: صفحه سیاه + عقاب‌ها
  const on=Math.sin(t*18)>0;
  ctx.fillStyle=on?'#0a0f1a':'#05080f';ctx.fillRect(W*.12,H*.18,W*.34,H*.5);
  ctx.strokeStyle='#c9c4b8';ctx.lineWidth=3;
  for(const s of [1,-1]){ctx.beginPath();
   ctx.moveTo(W*.29-60*s,H*.4);ctx.quadraticCurveTo(W*.29-20*s,H*.34-28*s,W*.29,H*.42);
   ctx.quadraticCurveTo(W*.29+20*s,H*.34-28*s,W*.29+60*s,H*.4);ctx.stroke()}
  glow(W*.29,H*.42,130,'rgba(200,190,170,.15)')}
 if(S.line&&S.line.indexOf('location')>=0){ // پینِ GPS
  const y=H*.1+Math.abs(Math.sin(t*4))*-14;
  ctx.fillStyle='#d93a3a';ctx.beginPath();
  ctx.moveTo(W*.2,y+26);ctx.quadraticCurveTo(W*.2-16,y,W*.2,y-14);
  ctx.quadraticCurveTo(W*.2+16,y,W*.2,y+26);ctx.fill();
  glow(W*.2,y,60+Math.sin(t*6)*22,'rgba(217,58,58,.35)')}
 if(S.line&&S.line.indexOf('جَّهَّنَّم')>=0){ // کرِین به افق
  glow(W*.5,H*.86,300,'rgba(240,190,90,.14)');
  ebrRing(W*.5,H*.87,180+t*40,'rgba(217,178,60,.25)',2,20)}},
4(t,S,q){ // پشت‌بام و مدالیون‌ها
 bg('#0a1020');
 ctx.fillStyle='#141a30';ctx.fillRect(0,H*.72,W,H*.28); // پشتِ بام
 ctx.strokeStyle='#3a3252';ctx.lineWidth=3;
 for(let i=0;i<14;i++){ctx.beginPath();ctx.moveTo(i*W/13,H*.72);ctx.lineTo(i*W/13,H*.72-16);ctx.stroke()}
 sprite('candle',W*.72,H*.62,240);
 const qn=(q||0);
 for(let i=0;i<qn;i++){ebrRing(W*.72,H*.5,90+i*46+Math.sin(t*2+i)*8,'rgba(217,178,60,'+(0.55-i*.09)+')',3-i*.2,16)}
 const POS=[[W*.2,H*.24,86],[W*.42,H*.16,74],[W*.64,H*.2,80],[W*.86,H*.3,72]];
 const MAP=['calf','saddam','angel','basiji'];
 for(let i=0;i<Math.min(qn,4);i++){const[x,y,r]=POS[i];medallion(MAP[i],x,y,r);
  if(i===qn-1&&t<1.2)burst(x+r*.7,y-r*.7,30,'#f0d070',14)}
 if(qn===0){ctx.fillStyle='rgba(230,220,200,.75)';ctx.font='24px Lalezar,Tahoma';ctx.textAlign='center';
  ctx.fillText('؟',W*.3,H*.3)}},
5(t,S){ // خیابانِ دوزخ
 cover('city',1.16,Math.sin(t*.2)*8-40,Math.cos(t*.16)*5);
 ctx.fillStyle='rgba(6,9,18,.42)';ctx.fillRect(0,0,W,H);
 ctx.strokeStyle='#2c313a';ctx.lineWidth=60; // جاده‌های چلیپا
 ctx.beginPath();ctx.moveTo(W*.5,0);ctx.lineTo(W*.5,H);ctx.moveTo(0,H*.55);ctx.lineTo(W,H*.55);ctx.stroke();
 ctx.strokeStyle='rgba(240,200,90,.5)';ctx.lineWidth=3;ctx.setLineDash([26,22]);
 ctx.beginPath();ctx.moveTo(W*.5,0);ctx.lineTo(W*.5,H);ctx.moveTo(0,H*.55);ctx.lineTo(W,H*.55);ctx.stroke();ctx.setLineDash([]);
 const blink=Math.sin(t*7)>0; // ماشین‌های قفل با چراغ‌خطر
 const cars=[[W*.42,H*.42,-1],[W*.6,H*.66,1],[W*.36,H*.68,1],[W*.58,H*.36,-1]];
 for(const[cx,cy,d]of cars){ctx.save();ctx.translate(cx,cy);ctx.rotate(d*.5);
  ctx.fillStyle='#232a3d';ctx.beginPath();ctx.roundRect(-46,-20,92,40,9);ctx.fill();
  ctx.fillStyle='#0d1526';ctx.beginPath();ctx.roundRect(-8,-14,34,28,5);ctx.fill();
  ctx.fillStyle=blink?'#f0a03a':'#5a3a1a';
  ctx.beginPath();ctx.arc(-40,-16,5,0,7);ctx.arc(-40,16,5,0,7);ctx.arc(40,-16,5,0,7);ctx.arc(40,16,5,0,7);ctx.fill();
  ctx.restore();if(blink)glow(cx,cy,90,'rgba(240,160,60,.12)')}
 if(S.ad){ // آگهیِ ۴:۳: موتورِ فساد
  const x=W*.5-230,y=H*.5-180;
  ctx.fillStyle='#0a0f1a';ctx.fillRect(x,y,460,360);
  ctx.strokeStyle='#d9b23c';ctx.lineWidth=6;ctx.strokeRect(x,y,460,360);
  ctx.save();ctx.beginPath();ctx.rect(x+8,y+8,444,344);ctx.clip();
  cover('fasad',1.12,0,0);ctx.restore();
  ctx.fillStyle='rgba(255,255,255,.05)';
  for(let sy=y;sy<y+360;sy+=5)ctx.fillRect(x,sy,460,1.6);
  burst(W*.5,y+40,20,'#f0d070',10);return}
 if(S.line&&S.line.indexOf('کفن')>=0){ // کفنِ کابلی دورِ توربین
  sprite('turbine',W*.78,H*.3,300);
  ctx.strokeStyle='rgba(10,12,22,.85)';ctx.lineWidth=18;ctx.beginPath();
  ctx.moveTo(W*.78,H*.06);ctx.quadraticCurveTo(W*.66,H*.3,W*.8,H*.5);ctx.stroke()}
 if(S.flash){ // ارگاسمِ ترانسفورماتور
  for(let i=0;i<4;i++){const a=t*3+i*1.6;
   ctx.strokeStyle='rgba(240,208,112,.8)';ctx.lineWidth=3.5;ctx.beginPath();
   ctx.moveTo(W*.3+i*90,H*.1);
   for(let s=1;s<6;s++)ctx.lineTo(W*.3+i*90+Math.sin(a+s)*36*s,H*.1+s*H*.14);
   ctx.stroke()}glow(W*.5,H*.5,340,'rgba(240,190,90,.16)')}},
6(t,S){ // پل
 if(S.grave||S.heck){ // بلک‌اوتِ اسکندر
  bg('#03050a');sprite('divche',W*.24,H*.78,120);
  glow(W*.24,H*.7,60+Math.sin(t*9)*16,'rgba(226,98,43,.35)');return}
 cover('haj',1.06+Math.sin(t*.4)*.007,Math.sin(t*.3)*5,0);
 const cx=W*.85,cy=H*.16; // ساعتِ دیوانه
 ctx.strokeStyle='#d9b23c';ctx.lineWidth=6;ctx.beginPath();ctx.arc(cx,cy,74,0,7);ctx.stroke();
 ctx.fillStyle='rgba(10,15,30,.85)';ctx.beginPath();ctx.arc(cx,cy,68,0,7);ctx.fill();
 const a=t*7;ctx.strokeStyle='#efe6cd';ctx.lineWidth=4;
 ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(cx+Math.cos(a)*52,cy+Math.sin(a)*52);ctx.stroke();
 ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(cx+Math.cos(a*2.4)*30,cy+Math.sin(a*2.4)*30);ctx.stroke();
 if(S.line&&S.line.indexOf('آشغالدونی')>=0){ // رینگ‌مستر
  medallion('built',W*.2,H*.72,120);
  burst(W*.2,H*.72,60,'#f0d070',16)}
 ebrRing(W*.5,H*.45,300+Math.sin(t*2.4)*26,'rgba(217,178,60,.16)',2.5,22)},
7(t,S){ // رژهٔ رودِ شمع‌ها
 bg('#080d1a');cover('city',1.3,0,60,.18);
 const path=(u)=>{ // بِزیه از پایین به نیروگاه
  const x0=W*.55,y0=H+40,x1=W*.2,y1=H*.45,x2=W*.6,y2=H*.2,x3=W*.16,y3=H*.1;
  const a=1-u;return[a*a*a*x0+3*a*a*u*x1+3*a*u*u*x2+u*u*u*x3,
                   a*a*a*y0+3*a*a*u*y1+3*a*u*u*y2+u*u*u*y3]};
 glow(W*.16,H*.1,260,'rgba(240,190,90,.2)'); // نیروگاه
 for(let i=0;i<110;i++){const u=((i/110)+(t*.05))%1,[x,y]=path(u);
  glow(x,y,7+i%3*3,'rgba(245,230,168,.6)')}
 const [hx,hy]=path(((t*.05)+.5)%1);ebrRing(hx,hy,46,'rgba(217,178,60,.35)',2,14)},
8(t,S){ // نبردِ نهایی
 cover('riot',1.07+Math.sin(t*.35)*.006,Math.sin(t*.26)*6,0);
 const back=Math.min(1,(STEPS.indexOf(S)>=29?1:STEPS.indexOf(S)/28)); // برگشتِ نور خلافِ طومار
 for(let i=0;i<6;i++){const p=(t*.24+i*.17)%1;
  ctx.fillStyle='rgba(240,200,90,'+(0.1*(1-p))+')';
  ctx.fillRect(W*(1-p),H*(.15+i*.13),W*p,14)}
 if(S.line&&(S.line.indexOf('تخت')>=0)){ // شکستنِ تخت
  medallion('queen',W*.5,H*.4,150);
  ctx.strokeStyle='#f0e6c8';ctx.lineWidth=3;
  for(let i=0;i<5;i++){ctx.beginPath();ctx.moveTo(W*.5,H*.4);
   ctx.lineTo(W*.5+Math.cos(i*1.26-1.6)*(150+i*26),H*.4+Math.sin(i*1.26-1.6)*(150+i*26)*.6);ctx.stroke()}}
 if(S.line&&S.line.indexOf('توربین')>=0){sprite('turbine',W*.26,H*.3,340);
  glow(W*.26,H*.42,180+Math.sin(t*1.2)*120,'rgba(240,190,90,.1)')}},
9(t,S){ // پایانِ پایدار
 cover('threephase',1.06+Math.sin(t*.3)*.005,Math.sin(t*.22)*5,0);
 const f=Math.sin(t*7)*.5+Math.sin(t*11)*.5; // آتشِ ابدی
 glow(W*.5,H*.84,150+f*30,'rgba(240,160,60,.28)');
 for(let i=0;i<5;i++){const fx=W*.5+(i-2)*26,fh=40+Math.sin(t*6+i*2)*18;
  ctx.fillStyle='rgba(245,220,140,.75)';ctx.beginPath();
  ctx.moveTo(fx-11,H*.9);ctx.quadraticCurveTo(fx-6,H*.9-fh,fx,H*.9-fh-14);
  ctx.quadraticCurveTo(fx+6,H*.9-fh,fx+11,H*.9);ctx.fill()}
 for(let i=0;i<7;i++){const a=t*.5+i*.9; // ارواحِ تماشاگر
  glow(W*.5+Math.cos(a)*(W*.36),H*.6+Math.sin(a*.7)*(H*.22),12,'rgba(245,230,168,.4)')}
 ebrRing(W*.5,H*.42,230+Math.sin(t*1.8)*18,'rgba(217,178,60,.14)',2.5,20)}
};
// ---------- موتور ----------
let si=0,playing=false,timer=null,sceneT0=performance.now();
const sec=document.getElementById('sec'),line=document.getElementById('line'),
 tag=document.getElementById('scenetag'),chip=document.getElementById('stepchip');
function q4(S){ // شمارهٔ پرسشِ سکانسِ ۴
 const i=STEPS.indexOf(S);
 if(i<11||i>14)return 0;return i-10}
function draw(){const t=(performance.now()-sceneT0)/1000,S=STEPS[si];
 (SCN[S.scene]||SCN[9])(t,S,q4(S));
 grain();vignette();tazhib();
 requestAnimationFrame(draw)}
requestAnimationFrame(draw);
function doStep(i){si=(i+STEPS.length)%STEPS.length;const S=STEPS[si];sceneT0=performance.now();
 tag.textContent=S.tc+' · '+S.sc;sec.textContent=S.sc;
 line.textContent=S.line==='—'?'♪':S.line;
 chip.textContent='گامِ '+fa(si+1)+' از '+fa(STEPS.length);
 document.querySelectorAll('#chips a').forEach((a,k)=>a.classList.toggle('on',SCENE_FIRST[k]===si));
 if(S.flash||S.white){const f=document.getElementById('flash');
  f.style.transition='none';f.style.opacity=S.white?.95:.8;
  void f.offsetWidth; // اجبارِ reflow تا درخشش واقعاً رسم شود
  requestAnimationFrame(()=>{f.style.transition='opacity .5s';f.style.opacity=0})}
 if(S.stamp){setTimeout(()=>{const s=document.getElementById('stamp');s.style.opacity=1;
  setTimeout(()=>s.style.opacity=0,900)},420)}
 if(S.end){setTimeout(()=>{const s=document.getElementById('stamp');s.style.opacity=1;
  setTimeout(()=>s.style.opacity=0,2600)},1100)}}
function setPlay(p){playing=p;document.getElementById('pp').textContent=p?'⏸ توقف':'▶ پخش';
 clearInterval(timer);if(p)timer=setInterval(next,3400)}
function next(){doStep(si+1)}function prev(){doStep(si-1)}
document.getElementById('pp').onclick=()=>setPlay(!playing);
document.getElementById('next').onclick=next;document.getElementById('prev').onclick=prev;
document.addEventListener('keydown',e=>{if(e.code==='Space'){e.preventDefault();setPlay(!playing)}
 else if(e.key==='ArrowRight')next();else if(e.key==='ArrowLeft')prev()});
// چیپ‌های سکانس
const SEEN={},SCENE_FIRST=[];
STEPS.forEach((S,i)=>{if(!(S.sc in SEEN)){SEEN[S.sc]=i}SCENE_FIRST.push(SEEN[S.sc])});
const chips=document.getElementById('chips');
[...new Set(STEPS.map(S=>S.sc))].forEach((sc)=>{
 const a=document.createElement('a');a.textContent=sc;a.onclick=()=>doStep(SEEN[sc]);
 chips.appendChild(a)});
doStep(0);
</script></body></html>"""

HTML = (HTML.replace('__FONT__', FONT_B64)
            .replace('__RAW__', json.dumps(RAW))
            .replace('__STEPS__', STEPS))

out = os.path.join(BM, 'animatic.html')
open(out, 'w', encoding='utf-8').write(HTML)
print(f"✓ {out} | {os.path.getsize(out)//1024} KB | {N} گام | {len(RAW)} تصویر + فونت لاله‌زار")
