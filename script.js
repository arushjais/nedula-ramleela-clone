const toggle=document.querySelector('.nav-toggle');
const nav=document.querySelector('#site-nav');
toggle?.addEventListener('click',()=>{
  const open=nav.classList.toggle('is-open');
  toggle.setAttribute('aria-expanded',String(open));
});
nav?.querySelectorAll('a').forEach(link=>link.addEventListener('click',()=>{
  if(link.classList.contains('mail-tab'))return;
  nav.classList.remove('is-open');
  toggle?.setAttribute('aria-expanded','false');
}));
const aboutButton=document.querySelector('.nav-drop > button');
aboutButton?.addEventListener('click',()=>{
  const open=aboutButton.parentElement.classList.toggle('open');
  aboutButton.setAttribute('aria-expanded',String(open));
});

// Let the homepage video cast an ambient glow while it plays.
(()=>{
  const frame=document.querySelector('.live-grid>.video-frame');
  const iframe=frame?.querySelector('iframe');
  if(!frame||!iframe)return;
  const previousReady=window.onYouTubeIframeAPIReady;
  window.onYouTubeIframeAPIReady=()=>{
    if(typeof previousReady==='function')previousReady();
    if(!window.YT?.Player)return;
    new window.YT.Player(iframe,{events:{onReady:event=>frame.classList.toggle('is-playing',event.target.getPlayerState()===1),onStateChange:event=>frame.classList.toggle('is-playing',event.data===1)}});
  };
  const api=document.createElement('script');
  api.src='https://www.youtube.com/iframe_api';
  api.async=true;
  document.head.append(api);
})();

// Refract the homepage hero image with small WebGL ripple waves.
(()=>{
  const art=document.querySelector('.hero-art');
  const image=art?.querySelector(':scope > img');
  const canvas=art?.querySelector(':scope > .hero-ripple-canvas');
  if(!art||!image||!canvas||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;

  const gl=canvas.getContext('webgl',{alpha:true,antialias:true,powerPreference:'low-power'});
  if(!gl)return;

  const vertexSource=`
    attribute vec2 aPosition;
    varying vec2 vUv;
    void main(){
      vUv=aPosition*0.5+0.5;
      gl_Position=vec4(aPosition,0.0,1.0);
    }
  `;
  const fragmentSource=`
    precision mediump float;
    uniform sampler2D uImage;
    uniform vec2 uResolution;
    uniform vec2 uImageSize;
    uniform vec3 uRipples[6];
    varying vec2 vUv;

    vec2 containUv(vec2 uv){
      float imageAspect=uImageSize.x/uImageSize.y;
      float boxAspect=uResolution.x/uResolution.y;
      if(imageAspect>boxAspect){
        float visibleHeight=boxAspect/imageAspect;
        uv.y=(uv.y-0.5)/visibleHeight+0.5;
      }else{
        float visibleWidth=imageAspect/boxAspect;
        uv.x=(uv.x-0.5)/visibleWidth+0.5;
      }
      return uv;
    }

    void main(){
      vec2 sampleScreenUv=vUv;
      for(int i=0;i<6;i++){
        vec3 ripple=uRipples[i];
        if(ripple.z>=0.0&&ripple.z<1.15){
          vec2 delta=(vUv-ripple.xy)*uResolution;
          float distanceFromCenter=length(delta);
          float distanceFromFront=distanceFromCenter-ripple.z*250.0;
          float ring=sin(distanceFromFront*0.14)*exp(-abs(distanceFromFront)*0.12)*exp(-ripple.z*2.2);
          if(distanceFromCenter>0.001){
            sampleScreenUv+=(delta/distanceFromCenter)*(vec2(ring*3.0)/uResolution);
          }
        }
      }
      vec2 fittedUv=(sampleScreenUv-0.5)/0.78+0.5;
      vec2 sampleUv=containUv(fittedUv);
      gl_FragColor=texture2D(uImage,clamp(sampleUv,vec2(0.001),vec2(0.999)));
    }
  `;

  function compileShader(type,source){
    const shader=gl.createShader(type);
    if(!shader)return null;
    gl.shaderSource(shader,source);
    gl.compileShader(shader);
    if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)){
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  const vertexShader=compileShader(gl.VERTEX_SHADER,vertexSource);
  const fragmentShader=compileShader(gl.FRAGMENT_SHADER,fragmentSource);
  if(!vertexShader||!fragmentShader)return;
  const program=gl.createProgram();
  if(!program)return;
  gl.attachShader(program,vertexShader);
  gl.attachShader(program,fragmentShader);
  gl.linkProgram(program);
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS)){
    gl.deleteProgram(program);
    return;
  }

  const texture=gl.createTexture();
  const buffer=gl.createBuffer();
  if(!texture||!buffer){
    gl.deleteProgram(program);
    return;
  }
  const position=gl.getAttribLocation(program,'aPosition');
  const resolution=gl.getUniformLocation(program,'uResolution');
  const imageSize=gl.getUniformLocation(program,'uImageSize');
  const rippleUniform=gl.getUniformLocation(program,'uRipples[0]');
  const ripples=[];
  const rippleValues=new Float32Array(18);
  let nextRipple=0;
  let frame=0;
  let lastPointer=null;
  let contentWidth=0;
  let contentHeight=0;

  gl.useProgram(program);
  gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D,texture);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
  gl.uniform1i(gl.getUniformLocation(program,'uImage'),0);
  gl.uniform2f(imageSize,image.naturalWidth,image.naturalHeight);
  gl.clearColor(0,0,0,0);

  function resize(){
    const rect=canvas.getBoundingClientRect();
    const style=getComputedStyle(canvas);
    const horizontalInset=['borderLeftWidth','borderRightWidth','paddingLeft','paddingRight'].reduce((sum,key)=>sum+parseFloat(style[key]||0),0);
    const verticalInset=['borderTopWidth','borderBottomWidth','paddingTop','paddingBottom'].reduce((sum,key)=>sum+parseFloat(style[key]||0),0);
    contentWidth=Math.max(1,rect.width-horizontalInset);
    contentHeight=Math.max(1,rect.height-verticalInset);
    const pixelRatio=Math.min(window.devicePixelRatio||1,1.5);
    canvas.width=Math.max(1,Math.round(contentWidth*pixelRatio));
    canvas.height=Math.max(1,Math.round(contentHeight*pixelRatio));
    gl.viewport(0,0,canvas.width,canvas.height);
    gl.uniform2f(resolution,contentWidth,contentHeight);
    draw(performance.now());
  }

  function draw(now){
    const nowSeconds=now/1000;
    let active=false;
    for(let i=0;i<6;i++){
      const ripple=ripples[i];
      if(ripple){
        const age=nowSeconds-ripple.started;
        if(age<1.15){
          rippleValues[i*3]=ripple.x;
          rippleValues[i*3+1]=ripple.y;
          rippleValues[i*3+2]=age;
          active=true;
        }else{
          rippleValues[i*3]=0;
          rippleValues[i*3+1]=0;
          rippleValues[i*3+2]=-1;
          ripples[i]=null;
        }
      }else{
        rippleValues[i*3]=0;
        rippleValues[i*3+1]=0;
        rippleValues[i*3+2]=-1;
      }
    }
    gl.useProgram(program);
    gl.uniform3fv(rippleUniform,rippleValues);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES,0,6);
    if(active)frame=requestAnimationFrame(draw);
    else frame=0;
  }

  function addRipple(event){
    const rect=image.getBoundingClientRect();
    const style=getComputedStyle(image);
    const insetX=parseFloat(style.borderLeftWidth||0)+parseFloat(style.paddingLeft||0);
    const insetY=parseFloat(style.borderTopWidth||0)+parseFloat(style.paddingTop||0);
    const width=Math.max(1,rect.width-insetX*2);
    const height=Math.max(1,rect.height-insetY*2);
    const x=event.clientX-rect.left-insetX;
    const y=event.clientY-rect.top-insetY;
    if(x<0||y<0||x>width||y>height)return;
    ripples[nextRipple]={x:x/width,y:1-y/height,started:performance.now()/1000};
    nextRipple=(nextRipple+1)%6;
    if(!frame)frame=requestAnimationFrame(draw);
  }

  function handlePointerMove(event){
    if(event.pointerType==='touch')return;
    const point={x:event.clientX,y:event.clientY};
    if(!lastPointer||Math.hypot(point.x-lastPointer.x,point.y-lastPointer.y)>=10){
      addRipple(event);
      lastPointer=point;
    }
  }

  function initialize(){
    if(!image.complete||!image.naturalWidth)return;
    try{gl.bindTexture(gl.TEXTURE_2D,texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);}
    catch{return;}
    art.classList.add('hero-art--ripple-ready');
    resize();
  }

  art.addEventListener('pointerdown',addRipple,{passive:true});
  art.addEventListener('pointermove',handlePointerMove,{passive:true});
  window.addEventListener('resize',resize,{passive:true});
  if('ResizeObserver' in window)new ResizeObserver(resize).observe(canvas);
  if(image.complete)initialize();
  else image.addEventListener('load',initialize,{once:true});
})();

// A warm silk-light bloom radiates from the homepage Ram Darbar mark.
(()=>{
  const hero=document.querySelector('.hero');
  const art=hero?.querySelector('.hero-art');
  const canvas=hero?.querySelector('.hero-silk-canvas');
  const context=canvas?.getContext('2d');
  if(!hero||!art||!canvas||!context)return;
  const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let width=0,height=0,scale=1,frame=0,lastDraw=0;
  function resize(){
    const bounds=hero.getBoundingClientRect();
    width=bounds.width;height=bounds.height;scale=1;
    canvas.width=Math.max(1,Math.round(width*scale));canvas.height=Math.max(1,Math.round(height*scale));
    canvas.style.width=`${width}px`;canvas.style.height=`${height}px`;
    draw(reducedMotion?0:performance.now()/1000);
  }
  function draw(time){
    if(!width||!height)return;
    context.setTransform(scale,0,0,scale,0,0);context.clearRect(0,0,width,height);
    const heroBox=hero.getBoundingClientRect(),artBox=art.getBoundingClientRect();
    const cx=artBox.left-heroBox.left+artBox.width/2,cy=artBox.top-heroBox.top+artBox.height/2;
    const reach=Math.hypot(width,height)*.9,count=48;
    context.globalCompositeOperation='source-over';context.lineCap='round';
    for(let i=0;i<count;i++){
      const angle=i/count*Math.PI*2;
      const phase=i*1.73;
      const startAngle=angle+Math.sin(time*.45+phase)*.025;
      const endAngle=startAngle+.46+Math.sin(time*.38+phase*.61)*.18;
      const startRadius=artBox.width*.43;
      const sx=cx+Math.cos(startAngle)*startRadius,sy=cy+Math.sin(startAngle)*startRadius;
      const ex=cx+Math.cos(endAngle)*reach,ey=cy+Math.sin(endAngle)*reach;
      const distance=reach-startRadius,normalStartX=-Math.sin(startAngle),normalStartY=Math.cos(startAngle);
      const normalEndX=-Math.sin(endAngle),normalEndY=Math.cos(endAngle);
      const c1x=sx+Math.cos(startAngle)*distance*.34+normalStartX*distance*.36;
      const c1y=sy+Math.sin(startAngle)*distance*.34+normalStartY*distance*.36;
      const c2x=ex-Math.cos(endAngle)*distance*.34-normalEndX*distance*.36;
      const c2y=ey-Math.sin(endAngle)*distance*.34-normalEndY*distance*.36;
      context.beginPath();context.moveTo(sx,sy);context.bezierCurveTo(c1x,c1y,c2x,c2y,ex,ey);
      context.strokeStyle=i%6===0?'rgba(211,151,67,.24)':'rgba(186,126,48,.13)';context.lineWidth=i%6===0?1.5:.85;context.stroke();
    }
  }
  function animate(now){
    if(now-lastDraw>=1000/30){draw(now/1000);lastDraw=now;}
    frame=requestAnimationFrame(animate);
  }
  window.addEventListener('resize',()=>{cancelAnimationFrame(frame);resize();},{passive:true});
  if('ResizeObserver' in window)new ResizeObserver(()=>{cancelAnimationFrame(frame);resize();}).observe(hero);
  resize();
  if(!reducedMotion)frame=requestAnimationFrame(animate);
})();

// Apple Mail-style navigation: compact icon pills expand for the active label.
if(nav){
  const tabDefinitions=[
    {href:'/',label:'Home',icon:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>'},
    {href:'/live/',label:'Live Telecast',icon:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m10 9 5 3-5 3z"/>'},
    {href:'/schedule/',label:'Schedule',icon:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18M8 14h2M14 14h2M8 17h2"/>'},
    {href:'/gallery/',label:'Gallery',icon:'<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9" r="1.5"/><path d="m21 15-5-5L5 20"/>'},
    {href:'/sponsor/',label:'Sponsors',icon:'<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9z"/>'},
    {href:'/contact/',label:'Contact Us',icon:'<path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8A8.5 8.5 0 0 1 8.7 4a8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8z"/>'},
    {about:true,label:'About Us',icon:'<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>'}
  ];
    const topLinks=[...nav.querySelectorAll(':scope > a')];
    const tabItems=tabDefinitions.map(def=>def.about?nav.querySelector('.nav-drop'):topLinks.find(link=>link.textContent.trim()===def.label));
  if(tabItems.every(Boolean)){
    const track=document.createElement('div');
    track.className='mail-tabs-track';
    track.setAttribute('aria-label','मुख्य नेविगेशन');
    nav.prepend(track);
    const aboutMenu=tabItems[6].querySelector('.nav-drop-menu');
    const basePath=new URL(document.baseURI).pathname;
    const relativePath=location.pathname.startsWith(basePath)?location.pathname.slice(basePath.length):location.pathname.replace(/^\/+/, '');
    const path=`/${relativePath}`.replace(/\/+$/,'')||'/';
    let activeIndex=0;
    tabDefinitions.forEach((def,index)=>{
      const item=tabItems[index];
      const control=def.about?item.querySelector('button'):item;
      item.classList.add('mail-tab-item');
      control.classList.add('mail-tab');
      const labelNode=[...control.childNodes].find(node=>node.nodeType===Node.TEXT_NODE&&node.nodeValue.trim());
      const label=document.createElement('span');
      label.className='mail-tab-label';
      label.textContent=def.label;
      if(labelNode)labelNode.replaceWith(label);
      else control.prepend(label);
      const icon=document.createElement('span');
      icon.className='mail-tab-icon';
      icon.setAttribute('aria-hidden','true');
      icon.innerHTML=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${def.icon}</svg>`;
      control.prepend(icon);
      const active=def.about?path.startsWith('/about'):path===def.href.replace(/\/+$/,'')||path===def.href;
      if(active)activeIndex=index;
      if(active&&!def.about)item.setAttribute('aria-current','page');
      track.append(item);
    });
    if(aboutMenu){
      nav.append(aboutMenu);
      aboutMenu.hidden=true;
    }
    function measureMailTabs(){
      tabItems.forEach(item=>{
        const control=item.matches('.mail-tab')?item:item.querySelector('.mail-tab');
        const label=control?.querySelector('.mail-tab-label');
        if(label&&label.getBoundingClientRect().width)control.style.setProperty('--label-width',`${label.getBoundingClientRect().width}px`);
      });
    }
    function setActiveTab(index){
      tabItems.forEach((item,itemIndex)=>item.classList.toggle('is-current',itemIndex===index));
      requestAnimationFrame(measureMailTabs);
    }
    nav.classList.add('mail-tab-nav');
    if(track.clientWidth)requestAnimationFrame(()=>requestAnimationFrame(()=>setActiveTab(activeIndex)));
    toggle?.addEventListener('click',()=>requestAnimationFrame(()=>setActiveTab(activeIndex)));
    window.addEventListener('resize',measureMailTabs,{passive:true});
    const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    tabDefinitions.forEach((def,index)=>{
      if(def.about)return;
      const link=tabItems[index];
      link.addEventListener('click',event=>{
        if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
        event.preventDefault();
        activeIndex=index;
        setActiveTab(index);
        window.setTimeout(()=>{
          nav.classList.remove('is-open');
          toggle?.setAttribute('aria-expanded','false');
          window.location.assign(link.href);
        },reducedMotion?0:480);
      });
    });
    aboutButton?.addEventListener('click',()=>{
      const aboutIsOpen=aboutButton.parentElement.classList.contains('open');
      if(aboutMenu){aboutMenu.hidden=!aboutIsOpen;nav.classList.toggle('about-menu-open',aboutIsOpen);}
      if(aboutIsOpen)setActiveTab(6);
      else setActiveTab(activeIndex);
    });
  }
}
document.querySelectorAll('.gallery-filters button').forEach(button=>button.addEventListener('click',()=>{
  const filter=button.dataset.filter;
  document.querySelectorAll('.gallery-filters button').forEach(item=>item.setAttribute('aria-pressed',String(item===button)));
  document.querySelectorAll('.album-card').forEach(card=>{card.hidden=filter!=='सभी'&&card.dataset.category!==filter;});
}));

// Reveal semantic headings word by word without changing their inline layout.
const headingNodes=document.querySelectorAll('h1,h2,h3,h4,h5,h6');
const headingRevealObserver=('IntersectionObserver' in window)?new IntersectionObserver(entries=>{
  entries.forEach(entry=>{
    if(!entry.isIntersecting)return;
    entry.target.classList.add('is-streaming');
    headingRevealObserver.unobserve(entry.target);
  });
},{threshold:0.15}):null;
if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches){
  headingNodes.forEach(heading=>{
    if(heading.closest('.hero-title-plaque'))return;
    const walker=document.createTreeWalker(heading,NodeFilter.SHOW_TEXT);
    const textNodes=[];
    while(walker.nextNode())if(walker.currentNode.nodeValue.trim())textNodes.push(walker.currentNode);
    if(!textNodes.length)return;
    let wordIndex=0;
    textNodes.forEach(node=>{
      const fragment=document.createDocumentFragment();
      node.nodeValue.split(/(\s+)/u).forEach(part=>{
        if(!part)return;
        if(/^\s+$/u.test(part))fragment.append(document.createTextNode(part));
        else{
          const word=document.createElement('span');
          word.className='streaming-word';
          word.style.setProperty('--stream-delay',`${100+wordIndex*50}ms`);
          word.style.setProperty('--stream-ink',getComputedStyle(node.parentElement).color);
          word.textContent=part;
          fragment.append(word);
          wordIndex++;
        }
      });
      node.replaceWith(fragment);
    });
    heading.classList.add('streaming-heading');
    if(headingRevealObserver)headingRevealObserver.observe(heading);
    else heading.classList.add('is-streaming');
  });
}

const glide=document.querySelector('[data-image-glide]');
if(glide){
  const stage=glide.querySelector('.glide-stage');
  const activeImage=glide.querySelector('.glide-active');
  const previousImage=glide.querySelector('.glide-previous');
  const count=glide.querySelector('.glide-count');
  const title=glide.querySelector('.glide-title');
  const description=glide.querySelector('.glide-description');
  const choices=[...glide.querySelectorAll('.glide-thumbnails button')];
  const reduceMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let activeIndex=0;
  let hoverTimer;
  let wipeTimer;
  const clearHover=()=>{window.clearTimeout(hoverTimer);hoverTimer=undefined;};
  choices.forEach(button=>{const preload=new Image();preload.src=button.dataset.src;});

  function selectImage(index){
    if(index===activeIndex)return;
    clearHover();
    const choice=choices[index];
    const nextSrc=choice.dataset.src;
    if(!reduceMotion&&activeImage.getAttribute('src')!==nextSrc){
      window.clearTimeout(wipeTimer);
      previousImage.classList.remove('is-wiping');
      previousImage.src=activeImage.getAttribute('src');
      previousImage.hidden=false;
      void previousImage.offsetWidth;
      previousImage.classList.add('is-wiping');
      wipeTimer=window.setTimeout(()=>{
        previousImage.classList.remove('is-wiping');
        previousImage.hidden=true;
      },560);
    }
    activeImage.src=nextSrc;
    activeImage.alt=choice.dataset.alt;
    title.textContent=choice.dataset.title;
    description.textContent=choice.dataset.description;
    count.textContent=`${String(index+1).padStart(2,'0')} / ${String(choices.length).padStart(2,'0')}`;
    choices.forEach((item,itemIndex)=>{
      const selected=itemIndex===index;
      item.classList.toggle('is-active',selected);
      item.setAttribute('aria-pressed',String(selected));
    });
    activeIndex=index;
  }

  choices.forEach((button,index)=>{
    button.addEventListener('click',()=>selectImage(index));
    button.addEventListener('pointerenter',event=>{
      if(event.pointerType==='touch'||index===activeIndex)return;
      clearHover();
      hoverTimer=window.setTimeout(()=>selectImage(index),70);
    });
    button.addEventListener('pointerleave',clearHover);
  });

  stage.addEventListener('pointermove',event=>{
    if(reduceMotion||event.pointerType==='touch')return;
    const rect=stage.getBoundingClientRect();
    const x=event.clientX-rect.left;
    const y=event.clientY-rect.top;
    stage.style.setProperty('--glide-x',`${((x/rect.width)-.5)*-10}px`);
    stage.style.setProperty('--glide-y',`${((y/rect.height)-.5)*-8}px`);
    stage.style.setProperty('--glow-x',`${x}px`);
    stage.style.setProperty('--glow-y',`${y}px`);
    stage.classList.add('is-hovering');
  });
  stage.addEventListener('pointerleave',()=>{
    stage.style.setProperty('--glide-x','0px');
    stage.style.setProperty('--glide-y','0px');
    stage.classList.remove('is-hovering');
  });
  stage.addEventListener('keydown',event=>{
    if(event.key==='ArrowRight'||event.key==='ArrowLeft'){
      event.preventDefault();
      const offset=event.key==='ArrowRight'?1:-1;
      selectImage((activeIndex+offset+choices.length)%choices.length);
    }
  });
}
