import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/OrbitControls.js';

const host=document.querySelector('#earth-scene'), loading=document.querySelector('#loading');
const speed=document.querySelector('#speed'), speedValue=document.querySelector('#speed-value');
const zoomValue=document.querySelector('#zoom-value'), toggle=document.querySelector('#toggle');
let scene,camera,renderer,controls,earth,clouds,playing=true,rate=1;

function init(){
 scene=new THREE.Scene();
 camera=new THREE.PerspectiveCamera(38,host.clientWidth/host.clientHeight,.1,150);
 camera.position.set(0,0,5.8);
 renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});
 renderer.setPixelRatio(Math.min(devicePixelRatio,2)); renderer.setSize(host.clientWidth,host.clientHeight);
 renderer.outputColorSpace=THREE.SRGBColorSpace; renderer.toneMapping=THREE.ACESFilmicToneMapping; host.appendChild(renderer.domElement);
 controls=new OrbitControls(camera,renderer.domElement); controls.enableDamping=true; controls.dampingFactor=.045;
 controls.enablePan=false; controls.minDistance=3.2; controls.maxDistance=9; controls.rotateSpeed=.55;
 scene.add(new THREE.AmbientLight(0x7898bd,.75));
 const sun=new THREE.DirectionalLight(0xffffff,2.4); sun.position.set(-5,2,5); scene.add(sun);
 const rim=new THREE.DirectionalLight(0x2d8cff,.6); rim.position.set(5,-2,-5); scene.add(rim);
 addStars();
 const group=new THREE.Group(); scene.add(group);
 const loader=new THREE.TextureLoader(); loader.setCrossOrigin('anonymous');
 const earthMap=loader.load('https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg',()=>loading.classList.add('done'),undefined,()=>loading.textContent='Tekstur gagal dimuat — periksa internet');
 earthMap.colorSpace=THREE.SRGBColorSpace;
 const normal=loader.load('https://threejs.org/examples/textures/planets/earth_normal_2048.jpg');
 const specular=loader.load('https://threejs.org/examples/textures/planets/earth_specular_2048.jpg');
 earth=new THREE.Mesh(new THREE.SphereGeometry(1.55,96,96),new THREE.MeshPhongMaterial({map:earthMap,normalMap:normal,normalScale:new THREE.Vector2(.65,.65),specularMap:specular,specular:new THREE.Color(0x263d55),shininess:16}));
 earth.rotation.z=THREE.MathUtils.degToRad(12); group.add(earth);
 const cloudMap=loader.load('https://threejs.org/examples/textures/planets/earth_clouds_1024.png');
 clouds=new THREE.Mesh(new THREE.SphereGeometry(1.575,96,96),new THREE.MeshLambertMaterial({map:cloudMap,transparent:true,opacity:.36,depthWrite:false})); group.add(clouds);
 const glow=new THREE.Mesh(new THREE.SphereGeometry(1.64,96,96),new THREE.ShaderMaterial({
  vertexShader:'varying vec3 n; varying vec3 v; void main(){n=normalize(normalMatrix*normal);vec4 p=modelViewMatrix*vec4(position,1.0);v=-p.xyz;gl_Position=projectionMatrix*p;}',
  fragmentShader:'varying vec3 n; varying vec3 v; void main(){float i=pow(0.72-dot(n,normalize(v)),3.0);gl_FragColor=vec4(0.18,0.55,1.0,1.0)*i*0.72;}',
  blending:THREE.AdditiveBlending,side:THREE.BackSide,transparent:true,depthWrite:false
 })); group.add(glow);
 addResize(); animate();
}
function addStars(){
 const count=1900, pos=new Float32Array(count*3);
 for(let i=0;i<count;i++){const r=35+Math.random()*55,t=Math.random()*Math.PI*2,p=Math.acos(2*Math.random()-1);pos[i*3]=r*Math.sin(p)*Math.cos(t);pos[i*3+1]=r*Math.cos(p);pos[i*3+2]=r*Math.sin(p)*Math.sin(t);}
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(pos,3));
 scene.add(new THREE.Points(geo,new THREE.PointsMaterial({color:0xc5e5ff,size:.11,transparent:true,opacity:.85})));
}
function addResize(){window.addEventListener('resize',()=>{camera.aspect=host.clientWidth/host.clientHeight;camera.updateProjectionMatrix();renderer.setSize(host.clientWidth,host.clientHeight);});}
function animate(){requestAnimationFrame(animate);if(playing&&earth){earth.rotation.y+=.0018*rate;clouds.rotation.y+=.00225*rate;}controls.update();renderer.render(scene,camera);}
function updateZoom(){zoomValue.textContent=Math.round(5.8/camera.position.length()*100)+'%';}
speed.addEventListener('input',()=>{rate=Number(speed.value);speedValue.textContent=rate.toFixed(1)+'×';});
toggle.addEventListener('click',()=>{playing=!playing;toggle.textContent=playing?'Ⅱ PAUSE':'▶ PLAY';});
document.querySelector('#zoom-in').addEventListener('click',()=>{camera.position.multiplyScalar(.88);camera.position.clampLength(3.2,9);updateZoom();});
document.querySelector('#zoom-out').addEventListener('click',()=>{camera.position.multiplyScalar(1.12);camera.position.clampLength(3.2,9);updateZoom();});
document.querySelector('#reset').addEventListener('click',()=>{camera.position.set(0,0,5.8);controls.target.set(0,0,0);controls.update();rate=1;speed.value='1';speedValue.textContent='1.0×';playing=true;toggle.textContent='Ⅱ PAUSE';updateZoom();});
init();
