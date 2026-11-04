(function(){
 var host=document.getElementById('gallery');
 if(host&&window.THETA_GALLERY){window.THETA_GALLERY.forEach(function(it,i){
  var afters=it.afters&&it.afters.length?it.afters:[{label:'THETA render',src:it.after}];
  var multi=afters.length>1;
  var f=document.createElement('figure');
  f.innerHTML='<div class="cmp" tabindex="0" role="slider" aria-label="Compare example '+(i+1)+'" aria-valuemin="0" aria-valuemax="100" aria-valuenow="50"><img class="after" alt="THETA render result" draggable="false"><div class="before"><img alt="Original image" draggable="false"></div><div class="handle"></div><span class="tag l">Original</span><span class="tag r"></span></div>'+(multi?'<div class="modes"></div>':'')+(it.caption?'<figcaption></figcaption>':'');
  var imgs=f.querySelectorAll('img'), tag=f.querySelector('.tag.r');
  imgs[0].addEventListener('load',function(){f.querySelector('.cmp').style.setProperty('--ar',this.naturalWidth+'/'+this.naturalHeight);});
  imgs[0].src=afters[0].src; imgs[1].src=it.before; tag.textContent=multi?afters[0].label:'THETA render';
  if(multi){var box=f.querySelector('.modes');afters.forEach(function(a,k){var b=document.createElement('button');b.type='button';b.textContent=a.label;b.setAttribute('aria-pressed',k===0?'true':'false');
   b.addEventListener('click',function(){imgs[0].src=a.src;tag.textContent=a.label;box.querySelectorAll('button').forEach(function(x){x.setAttribute('aria-pressed',x===b?'true':'false');});});box.appendChild(b);});}
  if(it.caption)f.querySelector('figcaption').textContent=it.caption;
  host.appendChild(f);});}
 document.querySelectorAll('.cmp').forEach(function(el){
  var dragging=false;
  function set(x){var r=el.getBoundingClientRect();var p=Math.max(0,Math.min(100,(x-r.left)/r.width*100));el.style.setProperty('--p',p+'%');el.setAttribute('aria-valuenow',Math.round(p));}
  el.addEventListener('pointerdown',function(e){dragging=true;try{el.setPointerCapture(e.pointerId)}catch(_){}set(e.clientX);});
  el.addEventListener('pointermove',function(e){if(dragging)set(e.clientX);});
  ['pointerup','pointercancel'].forEach(function(t){el.addEventListener(t,function(){dragging=false;});});
  el.addEventListener('keydown',function(e){var v=parseFloat(el.getAttribute('aria-valuenow')||'50');
   if(e.key==='ArrowLeft'||e.key==='ArrowDown'){v-=5}else if(e.key==='ArrowRight'||e.key==='ArrowUp'){v+=5}else if(e.key==='Home'){v=0}else if(e.key==='End'){v=100}else return;
   v=Math.max(0,Math.min(100,v));el.style.setProperty('--p',v+'%');el.setAttribute('aria-valuenow',Math.round(v));e.preventDefault();});
 });
})();