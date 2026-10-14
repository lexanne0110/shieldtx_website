/* Architectural institution with straight fluted columns and a flowing ground
   field. Kept independent of the compact trade-flow model. */
(() => {
  if (!window.THREE) return;
  document.querySelectorAll('[data-institution="hero"]').forEach(host => {
  const compact=host.dataset.institution==='flow';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const TAU = Math.PI * 2, paths = [];
  const institutionScale=.82,institutionWidth=.98,coinScale=.62;
  let seed = 137;
  function random(){seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;}
  const mix=(a,b,t)=>a+(b-a)*t;
  function addCurve(points, brightness, category){
    const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)),false,'centripetal');
    paths.push({points:curve.getPoints(category==='roof'?220:340),brightness,category,phase:random()*TAU});
  }
  // Architectural contours stay straight: fluted shafts, capitals, a complete
  // triangular pediment, and stepped plinth. Flow belongs to the ground only.
  function polyline(points, brightness=.55, category='architecture') {
    const vertices=[];
    for(let i=1;i<points.length;i++){
      const a=new THREE.Vector3(...points[i-1]),b=new THREE.Vector3(...points[i]);
      for(let j=0;j<24;j++)vertices.push(a.clone().lerp(b,j/24));
    }
    vertices.push(new THREE.Vector3(...points[points.length-1]));
    paths.push({points:vertices,brightness,category,phase:random()*TAU});
  }
  function course(w,y,d,brightness=.55){
    polyline([[-w,y,d],[w,y,d],[w,y,-d-2.4],[-w,y,-d-2.4],[-w,y,d]],brightness);
  }
  const columns=[
    {x:-4.75,z:0,light:1},{x:-2.15,z:0,light:1},
    {x:2.15,z:0,light:1},{x:4.75,z:0,light:1}
  ];
  for(const column of columns){
    const cx=column.x,cz=column.z;

    for(let lane=0;lane<24;lane++){
      const phase=lane/24*TAU,points=[];
      for(let k=0;k<=36;k++){
        const u=k/36,r=.35-.055*u+.022*Math.sin(u*Math.PI);
        points.push([cx+Math.cos(phase)*r,.95+u*5.6,cz+Math.sin(phase)*r]);
      }
      polyline(points,(.34+random()*.24)*column.light,'column');
    }
    // Clearly defined bases and square capitals anchor each shaft.
    for(const [y,r] of [[.65,.51],[.82,.51],[.9,.43],[.98,.39],[6.5,.34],[6.61,.44],[6.72,.54],[6.85,.54]]){
      polyline([[cx-r,y,cz+r],[cx+r,y,cz+r],[cx+r,y,cz-r],[cx-r,y,cz-r],[cx-r,y,cz+r]],.7*column.light);
    }
    for(let ring=0;ring<5;ring++){
      const y=.88+ring*.025,points=[];
      for(let j=0;j<=64;j++){const a=j/64*TAU;points.push([cx+Math.cos(a)*.43,y,cz+Math.sin(a)*.43]);}
      addCurve(points,.38,'architecture');
    }
  }
  // Separate crisp mouldings from the fine roof texture. Front and back
  // pediments share one ridge; the side eaves make the perspective legible.
  const roofFront=.82,roofBack=-4.05;
  for(const z of [roofFront,roofBack]){
    const brightness=z===roofFront?.82:.36;
    for(let layer=0;layer<3;layer++){
      const t=layer/2,w=6.15-t*.18,y=7.25+t*.13,peak=9.55-t*.12;
      polyline([[-w,y,z],[0,peak,z],[w,y,z],[-w,y,z]],brightness,'roof');
    }
  }
  polyline([[-4.92,7.61,.84],[0,9.16,.84],[4.92,7.61,.84],[-4.92,7.61,.84]],.62,'roof');
  for(const [x,y] of [[-6.15,7.25],[0,9.55],[6.15,7.25]]){
    polyline([[x,y,roofFront],[x,y,roofBack]],.65,'roof');
  }
  for(let layer=1;layer<12;layer++){
    const z=mix(roofFront,roofBack,layer/12);
    polyline([[-6.12,7.28,z],[0,9.55,z],[6.12,7.28,z]],.16,'roof');
  }
  for(const [y,w] of [[6.86,5.85],[6.94,5.85],[7.04,5.98],[7.14,5.98],[7.22,6.15]])course(w,y,.76,.62);
  for(let step=0;step<4;step++){
    const w=5.6+step*.35,y=.65-step*.23,d=.85+step*.3;
    course(w,y,d,.62);course(w,y-.09,d,.38);
    for(const x of [-w,w])polyline([[x,y,d],[x,y-.09,d]],.5);
  }
  // A two-sided dollar coin rotates between the four front columns.
  // Compensate for the building's width compression so the coin stays round.
  function coinPoint(x,y,z){
    return [x*coinScale/institutionWidth,3.75+y*coinScale,-.9+z*coinScale];
  }
  for(const [radius,depth,light] of [[1.40,-.16,1.3],[1.25,-.18,.78],[1.18,-.185,.45],[1.43,0,.85],[1.40,.16,1.3],[1.25,.18,.78],[1.18,.185,.45]]){
    const points=[];
    for(let i=0;i<=120;i++){const a=i/120*TAU;points.push(coinPoint(Math.cos(a)*radius,Math.sin(a)*radius,depth));}
    polyline(points,light,'coin');
  }
  for(let i=0;i<40;i++){
    const a=i/40*TAU,x=Math.cos(a)*1.4,y=Math.sin(a)*1.4;
    polyline([coinPoint(x,y,-.16),coinPoint(x,y,.16)],.38,'coin');
  }
  // A closed, engraved outline gives the dollar sign the blueprint reference's
  // broad letterform instead of a thin S made from overlapping center strokes.
  const dollarOutline=new THREE.Shape();
  dollarOutline.moveTo(.62,.39);
  dollarOutline.bezierCurveTo(.58,.71,.32,.86,-.02,.86);
  dollarOutline.bezierCurveTo(-.40,.86,-.65,.66,-.65,.36);
  dollarOutline.bezierCurveTo(-.65,.06,-.41,-.07,-.05,-.16);
  dollarOutline.bezierCurveTo(.26,-.24,.42,-.29,.42,-.44);
  dollarOutline.bezierCurveTo(.42,-.60,.24,-.69,.02,-.69);
  dollarOutline.bezierCurveTo(-.22,-.69,-.40,-.57,-.43,-.35);
  dollarOutline.lineTo(-.69,-.35);
  dollarOutline.bezierCurveTo(-.66,-.72,-.39,-.94,.02,-.94);
  dollarOutline.bezierCurveTo(.43,-.94,.70,-.74,.70,-.42);
  dollarOutline.bezierCurveTo(.70,-.09,.44,.04,.09,.13);
  dollarOutline.bezierCurveTo(-.24,.21,-.37,.27,-.37,.40);
  dollarOutline.bezierCurveTo(-.37,.54,-.22,.62,-.02,.62);
  dollarOutline.bezierCurveTo(.20,.62,.32,.53,.35,.39);
  dollarOutline.closePath();
  const dollarContour=dollarOutline.getPoints(14);
  for(const side of [-1,1]){
    polyline(dollarContour.map(p=>coinPoint(side*p.x,p.y+.04,side*.205)),1.45,'coin');
    polyline([[-.045,-1.06],[.045,-1.06],[.045,1.06],[-.045,1.06],[-.045,-1.06]].map(([x,y])=>coinPoint(side*x,y,side*.21)),1.15,'coin');
  }
  // Fine uninterrupted arcs create a surrounding field without twisting columns.
  for(let lane=0;lane<(compact?18:85);lane++){
    const r=7.4+lane*.24,points=[];
    for(let j=0;j<=100;j++){
      const a=j/100*TAU;
      points.push([Math.cos(a)*r,-.52-lane*.007,Math.sin(a)*r*.44-1.2]);
    }
    addCurve(points,.19+random()*.17,'ground');
  }
  // Scale the building independently, keeping the surrounding field unchanged.
  for(const path of paths){
    if(path.category!=='ground')for(const point of path.points){point.multiplyScalar(institutionScale);point.x*=institutionWidth;}
  }
  function formationOrder(point,category){
    if(category==='coin')return .80;
    if(category==='ground')return .02+.22*Math.max(0,Math.min(1,(Math.hypot(point.x,(point.z+1.2)/.44)-7.4)/20.2));
    return .16+.65*Math.max(0,Math.min(1,(point.y/institutionScale+.3)/9.85));
  }
  const positions=[],colors=[],phases=[],revealOrders=[],coinFlags=[];
  for(const path of paths){
    for(let i=1;i<path.points.length;i++){
      const t=i/(path.points.length-1);
      const fade=path.category==='column'?Math.min(1,t/.18):1;
      const b=path.brightness*fade*(path.category==='ground'?1:.62);
      for(const p of [path.points[i-1],path.points[i]]){positions.push(p.x,p.y,p.z);colors.push(b,b,b);phases.push(path.phase);revealOrders.push(formationOrder(p,path.category));coinFlags.push(path.category==='coin'?1:0);}
    }
  }
  let renderer;
  try{renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'high-performance'});}catch{return;}
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.8));renderer.setClearColor(0,0);
  host.appendChild(renderer.domElement);renderer.domElement.setAttribute('aria-hidden','true');
  const scene=new THREE.Scene(),group=new THREE.Group();scene.add(group);
  // Almost-black surfaces occlude the far edges, avoiding an X-ray tangle.
  // Their outlines and moving highlights remain the visible material.
  const architectureSurfaces=new THREE.Group();architectureSurfaces.scale.set(institutionScale*institutionWidth,institutionScale,institutionScale);group.add(architectureSurfaces);
  const surface=new THREE.MeshBasicMaterial({color:0x050506,side:THREE.DoubleSide});
  const roofGeometry=new THREE.BufferGeometry();
  roofGeometry.setAttribute('position',new THREE.Float32BufferAttribute([
    -6.12,7.27,.80, 0,9.53,.80, 6.12,7.27,.80,
    -6.12,7.27,-4.03, 0,9.53,-4.03, 6.12,7.27,-4.03
  ],3));
  roofGeometry.setIndex([0,1,2,3,5,4,0,3,4,0,4,1,1,4,5,1,5,2,0,2,5,0,5,3]);
  architectureSurfaces.add(new THREE.Mesh(roofGeometry,surface));
  for(const column of columns){
    const shaft=new THREE.Mesh(new THREE.CylinderGeometry(.285,.34,5.6,40),surface);
    shaft.position.set(column.x,3.75,column.z);architectureSurfaces.add(shaft);
  }
  for(let step=0;step<4;step++){
    const w=5.6+step*.35,y=.65-step*.23,d=.85+step*.3;
    const plinth=new THREE.Mesh(new THREE.BoxGeometry(w*2-.03,.085,d*2+2.37),surface);
    plinth.position.set(0,y-.047,-1.2);architectureSurfaces.add(plinth);
  }
  const coinBody=new THREE.Group();
  coinBody.position.set(0,3.75*institutionScale,-.9*institutionScale);
  const coinCore=new THREE.Mesh(new THREE.CylinderGeometry(1.395*institutionScale*coinScale,1.395*institutionScale*coinScale,.315*institutionScale*coinScale,96),surface);
  coinCore.rotation.x=Math.PI/2;coinBody.add(coinCore);group.add(coinBody);
  const camera=new THREE.PerspectiveCamera(59,1,.1,150);
  const look=new THREE.Vector3(0,4.45,-.6);
  camera.position.set(0,4.45,10.8);camera.lookAt(look);
  const uniforms={sharedCoin:{value:0},coinAngle:{value:.20},formation:{value:reduced.matches?1:0},time:{value:0},opacity:{value:.56},mouse:{value:new THREE.Vector2(10,10)},aspect:{value:1},repel:{value:0}};
  // Native text stays crisp at every resolution, anchored to the 3D model.
  const inscriptions=[];
  const coinAnchor=document.createElement('span');coinAnchor.className='hero-coin-anchor';coinAnchor.setAttribute('aria-hidden','true');host.appendChild(coinAnchor);
  function addInscription(text,width,x,y,z,brightness){
    const label=document.createElement('span');
    label.className='institution-label '+(text==='SHIELD TX'?'institution-label-roof':'institution-label-coin');
    label.textContent=text;label.setAttribute('aria-hidden','true');
    label.style.setProperty('--label-opacity',brightness);
    host.appendChild(label);
    inscriptions.push({label,width,point:new THREE.Vector3(x*institutionScale*institutionWidth,y*institutionScale,z*institutionScale)});
  }
  function positionInscriptions(width,height){
    const coinCenter=new THREE.Vector3(0,3.75*institutionScale,-.9*institutionScale);
    const edge=coinCenter.clone();edge.y+=1.4*institutionScale*coinScale;
    coinCenter.project(camera);edge.project(camera);
    const diameter=Math.abs(edge.y-coinCenter.y)*height;
    Object.assign(coinAnchor.style,{left:((coinCenter.x+1)*width/2)+'px',top:((1-coinCenter.y)*height/2)+'px',width:diameter+'px',height:diameter+'px'});
    for(const inscription of inscriptions){
      const {label,point}=inscription;
      const center=point.clone().project(camera);
      const edge=point.clone();edge.x+=inscription.width*institutionScale*institutionWidth/2;edge.project(camera);
      const projectedWidth=Math.abs(edge.x-center.x)*width;
      label.style.left=((center.x+1)*width/2)+'px';
      label.style.top=((1-center.y)*height/2)+'px';
      label.style.fontSize=(projectedWidth*(label.classList.contains('institution-label-roof')?.145:.125))+'px';
    }
  }

  addInscription('HL perps',2.15,0,2.35,-.45,.88);
  const lineGeometry=new THREE.BufferGeometry();
  lineGeometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  lineGeometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  lineGeometry.setAttribute('phase',new THREE.Float32BufferAttribute(phases,1));
  lineGeometry.setAttribute('revealOrder',new THREE.Float32BufferAttribute(revealOrders,1));
  lineGeometry.setAttribute('coinFlag',new THREE.Float32BufferAttribute(coinFlags,1));
  const motion=`
    vec3 p = position;
    if(coinFlag>.5){
      vec3 center=vec3(0.0,3.075,-.738);
      vec3 local=p-center;
      float c=cos(coinAngle),s=sin(coinAngle);
      p=center+vec3(local.x*c+local.z*s,local.y,-local.x*s+local.z*c);
    }
    vec4 projected=projectionMatrix*modelViewMatrix*vec4(p,1.0);
    vec2 ndc=projected.xy/projected.w;
    vec2 delta=ndc-mouse;
    float distanceToMouse=length(delta*vec2(aspect,1.0));
    ndc+=delta*exp(-distanceToMouse*distanceToMouse/.025)*repel;
    projected.xy=ndc*projected.w;
    if(coinFlag>.5 && sharedCoin>.5)projected=vec4(2.0,2.0,2.0,1.0);
    gl_Position=projected;
  `;
  const lineMaterial=new THREE.ShaderMaterial({uniforms,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
    vertexShader:`attribute vec3 color; attribute float phase;attribute float coinFlag;uniform float sharedCoin;uniform float coinAngle;attribute float revealOrder;uniform float formation;varying float vReveal;uniform float time;uniform vec2 mouse;uniform float aspect;uniform float repel; varying vec3 vColor;void main(){${motion}vReveal=smoothstep(revealOrder,revealOrder+.16,formation);vColor=color;}`,
    fragmentShader:'uniform float opacity;varying vec3 vColor;varying float vReveal;void main(){gl_FragColor=vec4(vColor,opacity*vReveal);}'
  });
  const lines=new THREE.LineSegments(lineGeometry,lineMaterial);lines.frustumCulled=false;group.add(lines);
  const count=compact?900:4800,dots=new Float32Array(count*3),dotPhases=new Float32Array(count),dotSizes=new Float32Array(count),dotBright=new Float32Array(count),dotReveal=new Float32Array(count),dotCoinFlags=new Float32Array(count),seeds=[];
  for(let i=0;i<count;i++){
    const path=paths[Math.floor(random()*paths.length)];
    seeds.push({path,t:random(),speed:.006+random()*.014});dotCoinFlags[i]=path.category==='coin'?1:0;
    dotPhases[i]=random()*TAU;dotSizes[i]=(.85+random()*1.5)*(path.category==='ground'?1.12:1);dotBright[i]=(.16+Math.pow(random(),1.7)*.62)*(path.category==='ground'?1.9:.30);
  }
  const dotGeometry=new THREE.BufferGeometry();dotGeometry.setAttribute('position',new THREE.BufferAttribute(dots,3));dotGeometry.setAttribute('phase',new THREE.BufferAttribute(dotPhases,1));dotGeometry.setAttribute('size',new THREE.BufferAttribute(dotSizes,1));dotGeometry.setAttribute('brightness',new THREE.BufferAttribute(dotBright,1));
  dotGeometry.setAttribute('revealOrder',new THREE.BufferAttribute(dotReveal,1));
  dotGeometry.setAttribute('coinFlag',new THREE.BufferAttribute(dotCoinFlags,1));
  const dotMaterial=new THREE.ShaderMaterial({uniforms:{...uniforms,pixelRatio:{value:renderer.getPixelRatio()}},transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
    vertexShader:`attribute float phase;attribute float coinFlag;uniform float sharedCoin;uniform float coinAngle;attribute float size;attribute float brightness;attribute float revealOrder;uniform float formation;uniform float pixelRatio;uniform float time;uniform vec2 mouse;uniform float aspect;uniform float repel;varying float vAlpha;void main(){${motion}gl_PointSize=size*pixelRatio;vAlpha=smoothstep(revealOrder,revealOrder+.16,formation)*brightness*(.35+.65*pow(.5+.5*sin(time*.8+phase),2.0));}`,
    fragmentShader:'varying float vAlpha;void main(){float radius=length(gl_PointCoord-.5);float alpha=1.-smoothstep(.15,.5,radius);gl_FragColor=vec4(vec3(.92),alpha*vAlpha);}'
  });
  const points=new THREE.Points(dotGeometry,dotMaterial);points.frustumCulled=false;group.add(points);
  let visible=true,last=0,pointerActive=false,formationElapsed=0;
  host.dataset.formation=reduced.matches?'complete':'forming';
  function resize(){const r=host.getBoundingClientRect();if(!r.width||!r.height)return;renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.fov=50;const fitWidth=12.4/(2*Math.tan(25*Math.PI/180)*camera.aspect);camera.position.set(0,4.0,Math.max(11.8,fitWidth));look.set(0,3.85,-.6);camera.lookAt(look);uniforms.opacity.value=r.width<700?.70:.88;camera.updateProjectionMatrix();uniforms.aspect.value=camera.aspect;positionInscriptions(r.width,r.height);}
  new ResizeObserver(resize).observe(host);new IntersectionObserver(entries=>visible=entries[0].isIntersecting,{rootMargin:'100px'}).observe(host);resize();
  host.parentElement.addEventListener('pointermove',event=>{const r=host.getBoundingClientRect();uniforms.mouse.value.set((event.clientX-r.left)/r.width*2-1,-(event.clientY-r.top)/r.height*2+1);pointerActive=true;},{passive:true});
  host.parentElement.addEventListener('pointerleave',()=>pointerActive=false);
  function frame(ms){requestAnimationFrame(frame);if(document.hidden||!visible||ms-last<32)return;const delta=last?Math.min(ms-last,64):0;last=ms;formationElapsed+=delta;uniforms.formation.value=reduced.matches?1:Math.min(1,formationElapsed/1250);if(uniforms.formation.value===1&&host.dataset.formation!=='complete')host.dataset.formation='complete';const time=reduced.matches?0:ms*.001;
    uniforms.coinAngle.value=reduced.matches?.20:.20+Math.max(0,formationElapsed-1250)/1000*TAU/8;
    uniforms.sharedCoin.value=document.documentElement.classList.contains('shared-coin-ready')?1:0;coinBody.rotation.y=uniforms.coinAngle.value;coinBody.visible=uniforms.formation.value>.80&&!uniforms.sharedCoin.value;
    uniforms.time.value=time;uniforms.repel.value+=(Number(pointerActive&&!reduced.matches)*.025-uniforms.repel.value)*.08;
    group.rotation.set(0,0,0);
    for(let i=0;i<count;i++){const seed=seeds[i],array=seed.path.points,at=((seed.t+time*seed.speed)%1)*(array.length-1),j=Math.floor(at),f=at-j,a=array[j],b=array[Math.min(j+1,array.length-1)];dots[i*3]=mix(a.x,b.x,f);dots[i*3+1]=mix(a.y,b.y,f);dots[i*3+2]=mix(a.z,b.z,f);dotReveal[i]=formationOrder(a,seed.path.category);}
    dotGeometry.attributes.position.needsUpdate=true;dotGeometry.attributes.revealOrder.needsUpdate=true;renderer.render(scene,camera);
  }
  requestAnimationFrame(frame);
  });
})();
