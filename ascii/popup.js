const $ = id => document.getElementById(id);
const toggle = $("toggle"), status = $("status");
const defaults = { trailSize: 100, trailDuration: 1050, glow: 70, customColors: false,
  coreColor: "#2df5ff", midColor: "#ff4ecd", edgeColor: "#a55aff",
  sensitivity: 100, beatImpact: 20 };
const palettes = {
  aurora:["#2df5ff","#ff4ecd","#a55aff"], cyber:["#7dff82","#32e1ff","#7d6eff"],
  sunset:["#ffc341","#ff5591","#b964ff"], ice:["#e1ffff","#5ad2ff","#7d8cff"],
  synth:["#ff46f5","#824bff","#372896"], toxic:["#d2ff28","#5aff73","#009b78"],
  ocean:["#32f5dc","#1e96ff","#374bd2"], ember:["#fff582","#ff7d28","#eb2d5a"]
};
let themeName="aurora",settings={...defaults},audioOn=false,audioBusy=false;
const canvas=$("preview"),ctx=canvas.getContext("2d");
function colors(){return settings.customColors?[settings.coreColor,settings.midColor,settings.edgeColor]:(palettes[themeName]||palettes.aurora);}
function drawPreview(){
  const [core,mid,edge]=colors(),w=canvas.width,h=canvas.height;
  ctx.clearRect(0,0,w,h);
  ctx.fillStyle="#202127";ctx.fillRect(0,0,w,h);
  const cx=w/2,cy=h/2;
  ctx.textAlign="center";ctx.textBaseline="middle";

  // Subtle dotted matrix background.
  ctx.font="13px ui-monospace,Consolas,monospace";
  for(let y=10,row=0;y<h-8;y+=20,row++){
    for(let x=10,col=0;x<w-8;x+=20,col++){
      ctx.globalAlpha=.28;
      ctx.fillStyle="#a66cc4";
      ctx.fillText(".",x,y);
    }
  }

  // Concentric ASCII energy cluster: density and glyph weight increase toward centre.
  const rings=[
    {r:104,count:34,glyphs:["."],color:edge,size:13,alpha:.62},
    {r:84,count:30,glyphs:[".",":"],color:edge,size:14,alpha:.72},
    {r:65,count:27,glyphs:[":","+"],color:mid,size:16,alpha:.78},
    {r:47,count:23,glyphs:["+","*"],color:mid,size:18,alpha:.88},
    {r:29,count:18,glyphs:["*","#","%"],color:core,size:20,alpha:.98},
    {r:12,count:12,glyphs:["#","%","@"],color:core,size:21,alpha:1}
  ];
  for(let ri=0;ri<rings.length;ri++){
    const ring=rings[ri];
    for(let i=0;i<ring.count;i++){
      const angle=(Math.PI*2*i/ring.count)-Math.PI/2;
      const jitter=((i*7+ri*11)%5-2)*1.3;
      const x=cx+Math.cos(angle)*(ring.r+jitter);
      const y=cy+Math.sin(angle)*(ring.r+jitter);
      const glyph=ring.glyphs[(i*3+ri)%ring.glyphs.length];
      ctx.globalAlpha=ring.alpha;
      ctx.fillStyle=ring.color;
      ctx.shadowColor=ring.color;
      ctx.shadowBlur=ri>3?9:4;
      ctx.font=`${i%4===0?"bold ":""}${ring.size}px ui-monospace,Consolas,monospace`;
      ctx.fillText(glyph,x,y);
    }
  }

  // Dense, brighter core.
  const coreGlyphs=["%","#","@","%","#","%"];
  ctx.globalAlpha=1;ctx.shadowColor=core;ctx.shadowBlur=12;
  coreGlyphs.forEach((g,i)=>{
    const angle=(Math.PI*2*i/coreGlyphs.length);
    const x=cx+Math.cos(angle)*10;
    const y=cy+Math.sin(angle)*10;
    ctx.fillStyle=i%2?mid:core;
    ctx.font="bold 21px ui-monospace,Consolas,monospace";
    ctx.fillText(g,x,y);
  });
  ctx.globalAlpha=1;ctx.shadowBlur=0;
}
function updateThemeCards(){document.querySelectorAll(".theme-card").forEach(c=>c.classList.toggle("active",!settings.customColors&&c.dataset.theme===themeName));}
function updateStatus(){status.textContent=toggle.checked?"Running · ESC to pause":"Paused";}
function updateAudioUI(){
  $("audioToggle").textContent=audioBusy?"STARTING…":audioOn?"Ⅱ STOP AUDIO REACTION":"♫ ENABLE AUDIO REACTION";
  $("audioToggle").classList.toggle("active",audioOn);
  $("audioDot").textContent=audioOn?"● ON":"● OFF";$("audioDot").classList.toggle("on",audioOn);
  $("audioStatus").textContent=audioOn?"Reacting to audio from this tab. Playback remains audible.":"Capture starts only when you press the button.";
}
function showSettings(){
  $("trailSize").value=settings.trailSize;$("sizeOut").textContent=`${settings.trailSize}%`;
  $("trailDuration").value=settings.trailDuration;$("durationOut").textContent=`${(settings.trailDuration/1000).toFixed(2)}s`;
  $("glow").value=settings.glow;$("glowOut").textContent=`${settings.glow}%`;
  $("coreColor").value=settings.coreColor;$("midColor").value=settings.midColor;$("edgeColor").value=settings.edgeColor;
  updateThemeCards();drawPreview();
}
function saveSettings(){chrome.storage.local.set({asciiFlowSettings:settings});drawPreview();}
chrome.storage.local.get({asciiFlowEnabled:true,asciiFlowTheme:"aurora",asciiFlowSettings:defaults,asciiFlowAudioActive:false},data=>{
  toggle.checked=data.asciiFlowEnabled;themeName=data.asciiFlowTheme;settings={...defaults,...data.asciiFlowSettings};
  audioOn=!!data.asciiFlowAudioActive;showSettings();updateStatus();updateAudioUI();
});
chrome.storage.onChanged.addListener((changes,area)=>{
  if(area!=="local")return;
  if(changes.asciiFlowAudioActive){audioOn=!!changes.asciiFlowAudioActive.newValue;audioBusy=false;updateAudioUI();}
});
toggle.addEventListener("change",()=>{chrome.storage.local.set({asciiFlowEnabled:toggle.checked});updateStatus();});
document.querySelectorAll(".theme-card").forEach(card=>card.addEventListener("click",()=>{
  themeName=card.dataset.theme;settings.customColors=false;
  const [c,m,e]=palettes[themeName];settings.coreColor=c;settings.midColor=m;settings.edgeColor=e;
  chrome.storage.local.set({asciiFlowTheme:themeName,asciiFlowSettings:settings});showSettings();
}));
$("trailSize").addEventListener("input",e=>{settings.trailSize=Number(e.target.value);$("sizeOut").textContent=`${settings.trailSize}%`;saveSettings();});
$("trailDuration").addEventListener("input",e=>{settings.trailDuration=Number(e.target.value);$("durationOut").textContent=`${(settings.trailDuration/1000).toFixed(2)}s`;saveSettings();});
$("glow").addEventListener("input",e=>{settings.glow=Number(e.target.value);$("glowOut").textContent=`${settings.glow}%`;saveSettings();});
["coreColor","midColor","edgeColor"].forEach(id=>$(id).addEventListener("input",e=>{settings[id]=e.target.value;settings.customColors=true;updateThemeCards();drawPreview();}));
$("applyColors").addEventListener("click",()=>{settings.coreColor=$("coreColor").value;settings.midColor=$("midColor").value;settings.edgeColor=$("edgeColor").value;settings.customColors=true;chrome.storage.local.set({asciiFlowSettings:settings});updateThemeCards();drawPreview();status.textContent="Custom colours applied";});
$("reset").addEventListener("click",()=>{themeName="aurora";settings={...defaults};chrome.storage.local.set({asciiFlowTheme:themeName,asciiFlowSettings:settings});showSettings();status.textContent="Defaults restored";});
$("audioToggle").addEventListener("click",async()=>{
  if(audioBusy)return;
  audioBusy=true;updateAudioUI();
  try{
    if(audioOn){
      await chrome.runtime.sendMessage({type:"STOP_AUDIO_CAPTURE"});
      audioOn=false;chrome.storage.local.set({asciiFlowAudioActive:false});
    }else{
      const result=await chrome.runtime.sendMessage({type:"START_AUDIO_CAPTURE"});
      if(!result?.ok)throw new Error(result?.error||"Could not start audio capture.");
      audioOn=true;chrome.storage.local.set({asciiFlowAudioActive:true});
      $("audioStatus").textContent="Audio capture started. Play something on this tab!";
    }
  }catch(error){$("audioStatus").textContent=error.message||"Audio capture failed.";audioOn=false;}
  audioBusy=false;updateAudioUI();
});
drawPreview();
