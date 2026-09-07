var is=Object.defineProperty;var os=(h,e,t)=>e in h?is(h,e,{enumerable:!0,configurable:!0,writable:!0,value:t}):h[e]=t;var r=(h,e,t)=>os(h,typeof e!="symbol"?e+"":e,t);import{V as f,M as w,S as Ft,O as ns,a as _t,W as rs,H as ls,D as cs,U as hs,b as _,c as U,P as We,B as se,d as V,C as N,e as Wt,A as G,f as He,L as Ve,G as F,g as X,h as Z,i as k,j as ct,k as st,Q as K,l as W,N as Ht,E as Ge,m as Ne,F as de,n as ne,o as Me,p as Tt,q as Ct,r as us,s as ds,t as ps,u as At,v as ms,w as kt,R as fs,x as gs,I as ys,y as vs,z as ws,J as Ss,K as xs}from"./three-DFPkcR09.js";(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const a of document.querySelectorAll('link[rel="modulepreload"]'))s(a);new MutationObserver(a=>{for(const i of a)if(i.type==="childList")for(const o of i.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&s(o)}).observe(document,{childList:!0,subtree:!0});function t(a){const i={};return a.integrity&&(i.integrity=a.integrity),a.referrerPolicy&&(i.referrerPolicy=a.referrerPolicy),a.crossOrigin==="use-credentials"?i.credentials="include":a.crossOrigin==="anonymous"?i.credentials="omit":i.credentials="same-origin",i}function s(a){if(a.ep)return;a.ep=!0;const i=t(a);fetch(a.href,i)}})();const bs="modulepreload",Ms=function(h){return"/"+h},Dt={},Ts=function(e,t,s){let a=Promise.resolve();if(t&&t.length>0){document.getElementsByTagName("link");const o=document.querySelector("meta[property=csp-nonce]"),n=(o==null?void 0:o.nonce)||(o==null?void 0:o.getAttribute("nonce"));a=Promise.allSettled(t.map(l=>{if(l=Ms(l),l in Dt)return;Dt[l]=!0;const c=l.endsWith(".css"),u=c?'[rel="stylesheet"]':"";if(document.querySelector(`link[href="${l}"]${u}`))return;const d=document.createElement("link");if(d.rel=c?"stylesheet":bs,c||(d.as="script"),d.crossOrigin="",d.href=l,n&&d.setAttribute("nonce",n),document.head.appendChild(d),c)return new Promise((p,m)=>{d.addEventListener("load",p),d.addEventListener("error",()=>m(new Error(`Unable to preload CSS for ${l}`)))})}))}function i(o){const n=new Event("vite:preloadError",{cancelable:!0});if(n.payload=o,window.dispatchEvent(n),!n.defaultPrevented)throw o}return a.then(o=>{for(const n of o||[])n.status==="rejected"&&i(n.reason);return e().catch(i)})};class $e extends Error{constructor(e,t){super(t),this.status=e,this.name="ApiError"}}function Cs(h){return new Promise(e=>setTimeout(e,h))}class As{constructor(e){r(this,"baseUrl");r(this,"fetch");this.baseUrl=e.baseUrl.replace(/\/$/,""),this.fetch=e.fetch??globalThis.fetch.bind(globalThis)}async get(e,t){const s=new URL(this.resolveBase()+e);if(t)for(const[a,i]of Object.entries(t))s.searchParams.set(a,String(i));return this.withRetry(async()=>{const a=await this.fetch(s.toString(),{method:"GET"});return this.handle(a)})}async post(e,t){const s=await this.fetch(this.resolveBase()+e,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(t)});return this.handle(s)}async withRetry(e){let s;for(let a=1;a<=3;a++)try{return await e()}catch(i){if(s=i,!(i instanceof TypeError||i instanceof $e&&i.status>=500)||a===3)break;await Cs(120*a)}throw s}resolveBase(){return this.baseUrl!==""?this.baseUrl:typeof window<"u"&&window.location&&window.location.origin!==""?window.location.origin:"http://localhost"}async handle(e){let t=null;try{t=await e.json()}catch{t=null}if(!e.ok){const s=t!==null&&typeof t.error=="string"?t.error:`Request failed with status ${e.status}`;throw new $e(e.status,s)}if(t===null)throw new $e(e.status,"Malformed response body.");return t}}class ks{constructor(e){this.api=e}getGalaxies(e,t){return this.api.get("/api/v1/universe/galaxies",{seed:e,cx:t[0],cy:t[1],cz:t[2]})}getStarSystems(e,t){const s={};return t!==void 0&&(s.radius=t),this.api.get(`/api/v1/galaxies/${e}/systems`,s)}getPlanets(e,t){return this.api.get(`/api/v1/systems/${e}/planets`,{count:t})}getSystemGalaxies(e,t,s){return this.api.get("/api/v1/universe/galaxies",{seed:t,cx:s[0],cy:s[1],cz:s[2],_universeSeed:e})}getColonyArea(e){return this.api.get(`/api/v1/planets/${e.planetSeed}/colony`,{face:e.face,depth:e.depth,x:e.x,y:e.y,size:e.size})}placeBuilding(e){return this.api.post(`/api/v1/planets/${e.planetSeed}/colony/place`,{face:e.face,depth:e.depth,x:e.x,y:e.y,type:e.type})}demolishBuilding(e){return this.api.post(`/api/v1/planets/${e.planetSeed}/colony/demolish`,{face:e.face,depth:e.depth,x:e.x,y:e.y})}}const Fe=class Fe{constructor(e){r(this,"target",new f);r(this,"pitchBase",w.degToRad(63));r(this,"pitch",this.pitchBase);r(this,"pitchTarget",this.pitchBase);r(this,"distance",4400);r(this,"desiredDistance",4400);r(this,"minDistance",300);r(this,"maxDistance",12e3);r(this,"panVelocity",new f);r(this,"draggingPan",!1);r(this,"draggingTilt",!1);r(this,"lastX",0);r(this,"lastY",0);r(this,"domElement",null);r(this,"attached",!1);r(this,"enabled",!1);r(this,"onMouseDown",e=>{if(!(!this.attached||!this.enabled)){if(e.button===1){e.preventDefault(),this.draggingTilt=!0,this.lastY=e.clientY;return}(e.button===0||e.button===2)&&(this.draggingPan=!0,this.lastX=e.clientX,this.lastY=e.clientY)}});r(this,"onMouseUp",()=>{this.draggingPan=!1,this.draggingTilt=!1});r(this,"onMouseMove",e=>{if(!this.attached||!this.enabled)return;const t=e.clientX-this.lastX,s=e.clientY-this.lastY;if(this.draggingTilt){const i=Fe.PITCH_SPAN*this.pitchBase;this.pitchTarget=w.clamp(this.pitchTarget-s*.0025,this.pitchBase-i,this.pitchBase+i),this.lastX=e.clientX,this.lastY=e.clientY;return}if(!this.draggingPan)return;this.lastX=e.clientX,this.lastY=e.clientY;const a=this.distance*.0016;this.target.x-=t*a,this.target.z-=s*a,this.clampTarget()});r(this,"onWheel",e=>{!this.attached||!this.enabled||(e.preventDefault(),this.desiredDistance=w.clamp(this.desiredDistance*(1+e.deltaY*.0011),this.minDistance,this.maxDistance))});this.camera=e,this.camera}attach(e){this.domElement!==e&&(this.unbind(),this.domElement=e,this.bind()),this.attached||(this.target.set(500,0,500),this.distance=4400,this.desiredDistance=this.distance,this.pitch=this.pitchBase,this.pitchTarget=this.pitchBase,this.attached=!0,this.update(1/60))}isActive(){return this.attached}detach(){this.attached=!1,this.draggingPan=!1,this.draggingTilt=!1}dispose(){this.unbind(),this.domElement=null,this.attached=!1}getSpeed(){return Math.abs(this.desiredDistance-this.distance)}getFocus(){return{target:this.target.clone(),distance:this.desiredDistance}}setFocus(e,t){this.target.copy(e),this.target.y=0,this.distance=t,this.desiredDistance=t}resetTilt(){this.pitch=this.pitchBase,this.pitchTarget=this.pitchBase}update(e,t){if(!this.attached)return;const s=t??this.camera;this.distance+=(this.desiredDistance-this.distance)*Math.min(1,e*9),this.pitch+=(this.pitchTarget-this.pitch)*Math.min(1,e*9);const a=Math.cos(this.pitch),i=Math.sin(this.pitch);s.position.set(this.target.x,this.target.y+this.distance*i,this.target.z+this.distance*a),s.lookAt(this.target)}clampTarget(){const t=this.target.clone();t.x=w.clamp(t.x,-1e6,1e6),t.y=0,t.z=w.clamp(t.z,-1e6,1e6),this.target.copy(t)}bind(){const e=this.domElement;e&&(e.addEventListener("mousedown",this.onMouseDown),window.addEventListener("mousemove",this.onMouseMove),window.addEventListener("mouseup",this.onMouseUp),e.addEventListener("wheel",this.onWheel,{passive:!1}))}unbind(){const e=this.domElement;e&&(e.removeEventListener("mousedown",this.onMouseDown),window.removeEventListener("mousemove",this.onMouseMove),window.removeEventListener("mouseup",this.onMouseUp),e.removeEventListener("wheel",this.onWheel))}setEnabled(e){this.enabled=e,e||(this.draggingPan=!1,this.draggingTilt=!1)}};r(Fe,"PITCH_SPAN",.15);let at=Fe;const ye=class ye{constructor(){r(this,"target",new f);r(this,"center",new f);r(this,"pitchBase",w.degToRad(63));r(this,"pitch",w.degToRad(63));r(this,"pitchTarget",w.degToRad(63));r(this,"distance",100);r(this,"desiredDistance",100);r(this,"panVelocity",new f);r(this,"radius",60);r(this,"keys",{left:!1,right:!1,fwd:!1,back:!1,up:!1,down:!1});r(this,"dragging",0);r(this,"lastX",0);r(this,"lastY",0);r(this,"domElement",null);r(this,"attached",!1);r(this,"onContextMenu",e=>{this.attached&&e.preventDefault()});r(this,"onMouseDown",e=>{if(this.attached){if(e.button===1){e.preventDefault(),this.dragging=3,this.lastY=e.clientY;return}(e.button===0||e.button===2)&&(this.dragging=e.button===0?1:2,this.lastX=e.clientX,this.lastY=e.clientY)}});r(this,"onMouseUp",()=>{this.dragging=0});r(this,"onMouseMove",e=>{if(!this.attached||this.dragging===0)return;const t=e.clientX-this.lastX,s=e.clientY-this.lastY;if(this.lastX=e.clientX,this.lastY=e.clientY,this.dragging===3){const i=ye.PITCH_SPAN*this.pitchBase;this.pitchTarget=w.clamp(this.pitchTarget-s*.0025,this.pitchBase-i,this.pitchBase+i);return}const a=this.distance*.0016;this.target.x-=t*a,this.target.z-=s*a,this.clampTarget()});r(this,"onWheel",e=>{if(!this.attached)return;e.preventDefault();const t=this.radius*.22,s=this.radius*10;this.desiredDistance=w.clamp(this.desiredDistance*(1+e.deltaY*.0011),t,s)});r(this,"onKeyDown",e=>{if(this.attached)switch(e.code){case"KeyA":this.keys.left=!0;break;case"KeyD":this.keys.right=!0;break;case"KeyW":this.keys.fwd=!0;break;case"KeyS":this.keys.back=!0;break;case"KeyQ":case"Space":this.keys.up=!0;break;case"KeyE":case"ShiftLeft":case"ShiftRight":this.keys.down=!0;break;default:return}});r(this,"onKeyUp",e=>{switch(e.code){case"KeyA":this.keys.left=!1;break;case"KeyD":this.keys.right=!1;break;case"KeyW":this.keys.fwd=!1;break;case"KeyS":this.keys.back=!1;break;case"KeyQ":case"Space":this.keys.up=!1;break;case"KeyE":case"ShiftLeft":case"ShiftRight":this.keys.down=!1;break;default:return}})}attach(e,t){this.attached&&this.center.equals(new f(e.x,e.y,e.z))||(this.center.set(e.x,e.y,e.z),this.target.copy(this.center),this.radius=Math.max(8,e.radius),this.distance=this.radius*2.4,this.desiredDistance=this.distance,this.panVelocity.set(0,0,0),this.pitch=this.pitchBase,this.pitchTarget=this.pitchBase),this.domElement!==t&&(this.unbind(),this.domElement=t,this.bind()),this.attached=!0}isActive(){return this.attached}getFocus(){return{target:this.target.clone(),distance:this.desiredDistance,pitch:this.pitch}}detach(){this.attached=!1,this.dragging=0;for(const e of Object.keys(this.keys))this.keys[e]=!1}dispose(){this.unbind(),this.domElement=null,this.attached=!1}update(e,t){if(!this.attached)return;const s=this.distance*.7,a=new f;this.keys.right&&(a.x+=1),this.keys.left&&(a.x-=1),(this.keys.up||this.keys.fwd)&&(a.z-=1),(this.keys.down||this.keys.back)&&(a.z+=1),a.lengthSq()>0?(a.normalize().multiplyScalar(s),this.panVelocity.lerp(a,Math.min(1,e*8))):this.panVelocity.multiplyScalar(Math.exp(-6*e)),this.panVelocity.lengthSq()>1e-6&&(this.target.addScaledVector(this.panVelocity,e),this.clampTarget()),this.distance+=(this.desiredDistance-this.distance)*Math.min(1,e*9);const i=this.pitchBase*(1-ye.PITCH_SPAN),o=this.pitchBase*(1+ye.PITCH_SPAN),n=w.clamp(this.pitchTarget,i,o);this.pitch+=(n-this.pitch)*Math.min(1,e*9);const l=Math.cos(this.pitch);t.position.set(this.target.x,this.target.y+this.distance*Math.sin(this.pitch),this.target.z+this.distance*l),t.lookAt(this.target)}clampTarget(){const e=this.radius*1.2,t=this.target.clone().sub(this.center);t.x=w.clamp(t.x,-e,e),t.z=w.clamp(t.z,-e,e),t.y=0,this.target.copy(this.center).add(t)}bind(){const e=this.domElement;e&&(e.addEventListener("mousedown",this.onMouseDown),window.addEventListener("mousemove",this.onMouseMove),window.addEventListener("mouseup",this.onMouseUp),e.addEventListener("wheel",this.onWheel,{passive:!1}),window.addEventListener("keydown",this.onKeyDown),window.addEventListener("keyup",this.onKeyUp),e.addEventListener("contextmenu",this.onContextMenu))}unbind(){const e=this.domElement;e&&(e.removeEventListener("mousedown",this.onMouseDown),window.removeEventListener("mousemove",this.onMouseMove),window.removeEventListener("mouseup",this.onMouseUp),e.removeEventListener("wheel",this.onWheel),window.removeEventListener("keydown",this.onKeyDown),window.removeEventListener("keyup",this.onKeyUp),e.removeEventListener("contextmenu",this.onContextMenu))}};r(ye,"PITCH_SPAN",.15);let it=ye;const be=class be{constructor(){r(this,"target",new f);r(this,"center",new f);r(this,"pitchBase",w.degToRad(63));r(this,"pitch",this.pitchBase);r(this,"pitchTarget",this.pitchBase);r(this,"distance",100);r(this,"desiredDistance",100);r(this,"panVelocity",new f);r(this,"radius",60);r(this,"keys",{left:!1,right:!1,fwd:!1,back:!1});r(this,"dragging",0);r(this,"lastX",0);r(this,"lastY",0);r(this,"domElement",null);r(this,"attached",!1);r(this,"onContextMenu",e=>{this.attached&&e.preventDefault()});r(this,"onMouseDown",e=>{if(this.attached){if(e.button===1){e.preventDefault(),this.dragging=3,this.lastY=e.clientY;return}(e.button===0||e.button===2)&&(this.dragging=e.button===0?1:2,this.lastX=e.clientX,this.lastY=e.clientY)}});r(this,"onMouseUp",()=>{this.dragging=0});r(this,"onMouseMove",e=>{if(!this.attached||this.dragging===0)return;const t=e.clientX-this.lastX,s=e.clientY-this.lastY;if(this.lastX=e.clientX,this.lastY=e.clientY,this.dragging===3){const i=be.PITCH_SPAN*this.pitchBase;this.pitchTarget=w.clamp(this.pitchTarget-s*.0025,this.pitchBase-i,this.pitchBase+i);return}const a=this.distance*.0016;this.target.x-=t*a,this.target.z-=s*a,this.clampTarget()});r(this,"onWheel",e=>{if(!this.attached)return;e.preventDefault();const t=this.radius*.22,s=this.radius*2.6;this.desiredDistance=w.clamp(this.desiredDistance*(1+e.deltaY*.0011),t,s)});r(this,"onKeyDown",e=>{if(this.attached)switch(e.code){case"KeyA":this.keys.left=!0;break;case"KeyD":this.keys.right=!0;break;case"KeyW":this.keys.fwd=!0;break;case"KeyS":this.keys.back=!0;break;default:return}});r(this,"onKeyUp",e=>{switch(e.code){case"KeyA":this.keys.left=!1;break;case"KeyD":this.keys.right=!1;break;case"KeyW":this.keys.fwd=!1;break;case"KeyS":this.keys.back=!1;break;default:return}})}attach(e,t,s,a){if(!(this.attached&&this.center.equals(e))){this.center.copy(e),this.target.copy(e),this.radius=Math.max(4,t);const o=Math.max(t*.22,s);this.distance=o,this.desiredDistance=o,this.panVelocity.set(0,0,0),this.pitch=this.pitchBase,this.pitchTarget=this.pitchBase}this.domElement!==a&&(this.unbind(),this.domElement=a,this.bind()),this.attached=!0}isActive(){return this.attached}getFocus(){return{target:this.target.clone(),distance:this.desiredDistance,pitch:this.pitch}}detach(){this.attached=!1,this.dragging=0,this.keys.left=this.keys.right=this.keys.fwd=this.keys.back=!1}dispose(){this.unbind(),this.domElement=null,this.attached=!1}update(e,t){if(!this.attached)return;const s=this.distance*.7,a=new f;this.keys.right&&(a.x+=1),this.keys.left&&(a.x-=1),this.keys.fwd&&(a.z-=1),this.keys.back&&(a.z+=1),a.lengthSq()>0?(a.normalize().multiplyScalar(s),this.panVelocity.lerp(a,Math.min(1,e*8))):this.panVelocity.multiplyScalar(Math.exp(-6*e)),this.panVelocity.lengthSq()>1e-6&&(this.target.addScaledVector(this.panVelocity,e),this.clampTarget()),this.distance+=(this.desiredDistance-this.distance)*Math.min(1,e*9);const i=be.PITCH_SPAN*this.pitchBase,o=w.clamp(this.pitchTarget,this.pitchBase-i,this.pitchBase+i);this.pitch+=(o-this.pitch)*Math.min(1,e*9),t.position.set(this.target.x,this.target.y+this.distance*Math.sin(this.pitch),this.target.z+this.distance*Math.cos(this.pitch)),t.lookAt(this.target)}clampTarget(){const e=this.radius*1.2,t=this.target.clone().sub(this.center);t.x=w.clamp(t.x,-e,e),t.z=w.clamp(t.z,-e,e),t.y=0,this.target.copy(this.center).add(t)}bind(){const e=this.domElement;e&&(e.addEventListener("mousedown",this.onMouseDown),window.addEventListener("mousemove",this.onMouseMove),window.addEventListener("mouseup",this.onMouseUp),e.addEventListener("wheel",this.onWheel,{passive:!1}),window.addEventListener("keydown",this.onKeyDown),window.addEventListener("keyup",this.onKeyUp),e.addEventListener("contextmenu",this.onContextMenu))}unbind(){const e=this.domElement;e&&(e.removeEventListener("mousedown",this.onMouseDown),window.removeEventListener("mousemove",this.onMouseMove),window.removeEventListener("mouseup",this.onMouseUp),e.removeEventListener("wheel",this.onWheel),window.removeEventListener("keydown",this.onKeyDown),window.removeEventListener("keyup",this.onKeyUp),e.removeEventListener("contextmenu",this.onContextMenu))}};r(be,"PITCH_SPAN",.15);let ot=be;const Ds=`
varying vec2 vUv;
void main(){
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
}`;class Ps{constructor(e){r(this,"renderer");r(this,"scene",new Ft);r(this,"camera",new ns(-1,1,1,-1,0,1));r(this,"material");r(this,"rtA");r(this,"aberration",0);r(this,"bloomStrength",.55);r(this,"focusDepth",1);r(this,"focusRange",0);r(this,"dofStrength",0);r(this,"enabled",!0);this.renderer=e;const t=e.getSize(new _t),s=e.getPixelRatio(),a=Math.max(2,Math.floor(t.x*s)),i=Math.max(2,Math.floor(t.y*s));this.rtA=new rs(a,i,{type:ls});const o=new cs(a,i);o.type=hs,this.rtA.depthTexture=o,this.material=new _({uniforms:{tDiffuse:{value:null},tDepth:{value:null},uAberration:{value:0},uBloom:{value:this.bloomStrength},uAspect:{value:t.x/Math.max(1,t.y)},uFocus:{value:this.focusDepth},uFocusRange:{value:this.focusRange},uDofStrength:{value:this.dofStrength}},vertexShader:Ds,fragmentShader:Os,depthTest:!1,depthWrite:!1}),this.scene.add(new U(new We(2,2),this.material))}setSize(e,t){const s=this.renderer.getPixelRatio(),a=Math.max(2,Math.floor(e*s)),i=Math.max(2,Math.floor(t*s));this.rtA.setSize(a,i),this.rtA.depthTexture&&(this.rtA.depthTexture.image.width=a),this.rtA.depthTexture&&(this.rtA.depthTexture.image.height=i),this.material.uniforms.uAspect.value=e/Math.max(1,t)}setFocus(e,t,s,a=1){const i=e.position.distanceTo(t),o=e.near,n=e.far,l=(n+o)/(n-o)-2*n*o/((n-o)*i);this.focusDepth=w.clamp((l+1)/2,0,1);const c=(n+o)/(n-o)-2*n*o/((n-o)*(i+s));this.focusRange=Math.abs(this.focusDepth-w.clamp((c+1)/2,0,1)),this.dofStrength=a}clearFocus(){this.dofStrength=0}render(e,t){if(!this.enabled){this.renderer.render(e,t);return}this.renderer.setRenderTarget(this.rtA),this.renderer.render(e,t),this.renderer.setRenderTarget(null);const s=this.material.uniforms;s.tDiffuse.value=this.rtA.texture,s.tDepth.value=this.rtA.depthTexture,s.uAberration.value=this.aberration,s.uBloom.value=this.bloomStrength,s.uFocus.value=this.focusDepth,s.uFocusRange.value=this.focusRange,s.uDofStrength.value=this.dofStrength,this.renderer.render(this.scene,this.camera)}dispose(){var e;(e=this.rtA.depthTexture)==null||e.dispose(),this.rtA.dispose(),this.material.dispose(),this.scene.children[0].geometry.dispose()}}const Os=`
uniform sampler2D tDiffuse;
uniform sampler2D tDepth;
uniform float uAberration;
uniform float uBloom;
uniform float uAspect;
uniform float uFocus;
uniform float uFocusRange;
uniform float uDofStrength;
varying vec2 vUv;

vec3 sampleBright(vec2 uv){
    vec3 c = texture2D(tDiffuse, uv).rgb;
    // Яркостный порог: оставляем только светлые пиксели.
    float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
    return c * smoothstep(0.55, 1.0, l);
}

void main(){
    vec2 center = vUv - 0.5;
    float dist = length(center);

    // --- Хроматическая аберрация: сдвиг каналов от центра ---
    float ab = uAberration * 0.012 * dist;
    vec3 col;
    col.r = texture2D(tDiffuse, vUv + center * ab).r;
    col.g = texture2D(tDiffuse, vUv).g;
    col.b = texture2D(tDiffuse, vUv - center * ab).b;

    // --- Bloom: спиральный тап из 8 сэмплов ---
    if (uBloom > 0.001) {
        vec3 blur = vec3(0.0);
        float radius = max(0.004, 0.010 / max(uAspect, 0.5));
        for (int i = 0; i < 8; i++) {
            float a = float(i) * 0.7853981634; // PI/4
            blur += sampleBright(vUv + vec2(cos(a), sin(a)) * radius);
        }
        col += blur * (uBloom * 0.25);
    }

    // --- DoF: вне зоны фокуса добавляем размытые сэмплы ---
    if (uDofStrength > 0.001) {
        float d = texture2D(tDepth, vUv).r;
        float coc = clamp((abs(d - uFocus) - uFocusRange) * 30.0, 0.0, 1.0) * uDofStrength;
        if (coc > 0.001) {
            vec3 blurCol = vec3(0.0);
            // Круг размытия: 12 сэмплов по двум кольцам.
            for (int i = 0; i < 12; i++) {
                float a = float(i) * 0.5235987755; // PI/6
                vec2 off = vec2(cos(a), sin(a)) * coc * 0.008;
                blurCol += texture2D(tDiffuse, vUv + off).rgb;
                blurCol += texture2D(tDiffuse, vUv + off * 2.2).rgb;
            }
            blurCol /= 24.0;
            col = mix(col, blurCol, coc * 0.85);
        }
    }

    // --- Виньетка ---
    float vig = smoothstep(0.95, 0.35, dist);
    col *= mix(0.75, 1.0, vig);

    gl_FragColor = vec4(col, 1.0);
}`;class zs{constructor(e=900,t=260){r(this,"points");r(this,"positions");r(this,"velocities");r(this,"material");r(this,"count");r(this,"halfExtent");r(this,"intensity",0);r(this,"visible",!0);this.count=e,this.halfExtent=t,this.positions=new Float32Array(e*3),this.velocities=new Float32Array(e*3);for(let n=0;n<e;n++)this.positions[n*3]=(Math.random()-.5)*2*t,this.positions[n*3+1]=(Math.random()-.5)*2*t,this.positions[n*3+2]=(Math.random()-.5)*2*t,this.velocities[n*3]=(Math.random()-.5)*2,this.velocities[n*3+1]=(Math.random()-.5)*2,this.velocities[n*3+2]=(Math.random()-.5)*2;const s=new se;s.setAttribute("position",new V(this.positions,3));const a=document.createElement("canvas");a.width=32,a.height=32;const i=a.getContext("2d");let o=null;if(i){const n=i.createRadialGradient(16,16,0,16,16,16);n.addColorStop(0,"rgba(255,255,255,0.9)"),n.addColorStop(1,"rgba(255,255,255,0)"),i.fillStyle=n,i.fillRect(0,0,32,32),o=new N(a)}this.material=new Wt({size:.9,map:o,transparent:!0,opacity:0,depthWrite:!1,blending:G,color:12571903}),this.points=new He(s,this.material),this.points.frustumCulled=!1}getObject(){return this.points}update(e,t){const s=this.halfExtent,a=this.positions;for(let o=0;o<this.count;o++){const n=o*3;a[n]=a[n]+this.velocities[n]*e,a[n+1]=a[n+1]+this.velocities[n+1]*e,a[n+2]=a[n+2]+this.velocities[n+2]*e;for(let l=0;l<3;l++){const c=t.getComponent(l);let u=a[n+l]-c;u-=Math.floor(u/(2*s))*(2*s),u>s&&(u-=2*s),a[n+l]=c+u}}this.points.geometry.getAttribute("position").needsUpdate=!0;const i=this.visible?w.smoothstep(this.intensity,12,140):0;this.material.opacity=i*.75}dispose(){var e;this.points.geometry.dispose(),(e=this.material.map)==null||e.dispose(),this.material.dispose()}}const Es={universe:"galaxy",galaxy:"system",system:"planet",planet:null};class ge extends Error{constructor(e){super(e),this.name="LocationError"}}class ht{constructor(e){r(this,"stack");this.stack=[{kind:"universe",seed:e}]}get current(){return this.stack[this.stack.length-1]}get depth(){return this.stack.length}isAt(e){return this.current.kind===e}push(e){const t=Es[this.current.kind];if(t===null)throw new ge(`Cannot go deeper than ${this.current.kind}.`);if(e.kind!==t)throw new ge(`Cannot push ${e.kind} onto ${this.current.kind}; expected ${t}.`);this.stack.push(e)}pop(){if(this.stack.length<=1)throw new ge("Cannot leave the universe.");return this.stack.pop()}popTo(e){for(;this.current.kind!==e;)this.pop()}path(){return this.stack.slice()}breadcrumb(){return this.stack.map(e=>this.label(e)).join(" > ")}serialize(){return JSON.stringify(this.stack)}static deserialize(e){let t;try{t=JSON.parse(e)}catch{throw new ge("Invalid location stack JSON.")}if(!Array.isArray(t)||t.length===0)throw new ge("Location stack must be a non-empty array.");const s=t[0];if(s.kind!=="universe"||typeof s.seed!="number")throw new ge("Stack must start with a universe location.");const a=new ht(s.seed);for(let i=1;i<t.length;i++)a.push(t[i]);return a}label(e){switch(e.kind){case"universe":return`Universe #${e.seed}`;case"galaxy":return e.name;case"system":return e.name;case"planet":return`Planet ${e.index+1}`}}}class Rs{constructor(){r(this,"plasmaEl",null);r(this,"flashEl",null);r(this,"fogEl",null)}setPlasma(e){if(typeof document>"u")return;const t=Math.max(0,Math.min(1,e));if(t<=.001){this.plasmaEl&&(this.plasmaEl.remove(),this.plasmaEl=null);return}this.plasmaEl||(this.plasmaEl=document.createElement("div"),this.plasmaEl.style.cssText="position:fixed;inset:0;z-index:90;pointer-events:none;",document.body.appendChild(this.plasmaEl));const s=(1-t)*55;this.plasmaEl.style.background=`radial-gradient(ellipse at center, rgba(255,120,30,0) ${s}%, rgba(255,90,20,${.35*t}) ${s+15}%, rgba(200,40,10,${.7*t}) 100%)`}breakthroughFlash(){if(typeof document>"u")return;this.flashEl||(this.flashEl=document.createElement("div"),this.flashEl.style.cssText="position:fixed;inset:0;z-index:95;pointer-events:none;opacity:0;background:radial-gradient(circle at 50% 45%,rgba(255,255,255,0.95) 0%,rgba(220,235,255,0.6) 45%,rgba(180,210,255,0) 80%);transition:opacity 0.25s ease-in;",document.body.appendChild(this.flashEl));const e=this.flashEl;requestAnimationFrame(()=>{e.style.opacity="1",setTimeout(()=>{e.style.transition="opacity 0.9s ease-out",e.style.opacity="0"},260)})}setAtmosphereHaze(e){if(typeof document>"u")return;const t=Math.max(0,Math.min(1,e));if(t<=.001){this.fogEl&&(this.fogEl.remove(),this.fogEl=null);return}this.fogEl||(this.fogEl=document.createElement("div"),this.fogEl.style.cssText="position:fixed;inset:0;z-index:85;pointer-events:none;",document.body.appendChild(this.fogEl)),this.fogEl.style.background=`linear-gradient(to bottom, rgba(160,190,230,${.5*t}) 0%, rgba(120,150,190,${.25*t}) 100%)`,this.fogEl.style.backdropFilter=`blur(${(t*4).toFixed(1)}px)`}clear(){this.setPlasma(0),this.setAtmosphereHaze(0)}dispose(){var e,t,s;(e=this.plasmaEl)==null||e.remove(),(t=this.flashEl)==null||t.remove(),(s=this.fogEl)==null||s.remove(),this.plasmaEl=null,this.flashEl=null,this.fogEl=null}}const je=1e3;function Pt(h,e,t){return{cx:Math.floor(h/je),cy:Math.floor(e/je),cz:Math.floor(t/je)}}function Ls(h){return`${h.cx}|${h.cy}|${h.cz}`}function Bs(h,e){const t=h.length;if(t<2||e<=0)return[];const s=new Set,a=[],i=(o,n)=>{const l=o<n?`${o}-${n}`:`${n}-${o}`;s.has(l)||(s.add(l),a.push({from:o,to:n}))};for(let o=0;o<t;o++){const n=h[o],l=[];for(let u=0;u<t;u++){if(o===u)continue;const d=h[u],p=n.x-d.x,m=n.y-d.y,v=n.z-d.z;l.push({idx:u,d:p*p+m*m+v*v})}l.sort((u,d)=>u.d-d.d);const c=Math.min(e,l.length);for(let u=0;u<c;u++)i(o,l[u].idx)}return a}const Is={spiral:10203391,elliptical:16765601,irregular:12110048},Ot=[9067765,3528936,10134728],$=128;function Gs(h){const e=$/2,t=h.createRadialGradient(e,e,0,e,e,e*.35);t.addColorStop(0,"rgba(255, 240, 200, 0.9)"),t.addColorStop(1,"rgba(255, 240, 200, 0)"),h.fillStyle=t,h.fillRect(0,0,$,$),h.save(),h.translate(e,e);for(let s=0;s<2;s++){h.rotate(Math.PI),h.beginPath();for(let a=.2;a<5.2;a+=.05){const i=6+a*10,o=Math.cos(a)*i,n=Math.sin(a)*i;a<=.25?h.moveTo(o,n):h.lineTo(o,n)}h.strokeStyle="rgba(180, 200, 255, 0.45)",h.lineWidth=3,h.stroke()}h.restore()}function Fs(h){const e=$/2;h.save(),h.translate(e,e),h.scale(1,.6);const t=h.createRadialGradient(0,0,0,0,0,e*.9);t.addColorStop(0,"rgba(255, 230, 180, 0.95)"),t.addColorStop(.5,"rgba(255, 210, 140, 0.4)"),t.addColorStop(1,"rgba(255, 200, 130, 0)"),h.fillStyle=t,h.fillRect(-e,-e,$,$),h.restore()}function _s(h,e){const t=$/2,s=3+Math.floor(e()*4);for(let a=0;a<s;a++){const i=(e()-.5)*t*.9,o=(e()-.5)*t*.9,n=t*(.3+e()*.35),l=h.createRadialGradient(t+i,t+o,0,t+i,t+o,n);l.addColorStop(0,"rgba(200, 220, 255, 0.55)"),l.addColorStop(1,"rgba(200, 220, 255, 0)"),h.fillStyle=l,h.fillRect(0,0,$,$)}}function Ws(h,e){const t=document.createElement("canvas");t.width=$,t.height=$;const s=t.getContext("2d");if(!s)throw new Error("Canvas 2D context unavailable.");s.clearRect(0,0,$,$),h==="spiral"?Gs(s):h==="elliptical"?Fs(s):_s(s,e);const a=new N(t);return a.colorSpace=st,a}class nt{constructor(e){r(this,"group",new F);r(this,"handles",new Map);r(this,"lineMesh",null);r(this,"lineMaterial");r(this,"globalOpacity",1);r(this,"pulseTime",0);r(this,"handlesSnapshot",[]);this.seedGraph=e,this.lineMaterial=new Ve({vertexColors:!0,transparent:!0,opacity:.5,depthWrite:!1,blending:G})}getObject(){return this.group}dispose(){for(const e of this.handles.values())this.disposeHandle(e);for(this.handles.clear(),this.lineMesh&&(this.lineMesh.geometry.dispose(),this.lineMesh=null),this.lineMaterial.dispose();this.group.children.length>0;)this.group.remove(this.group.children[0])}setGalaxies(e){const t=new Set;for(const s of e){const a=String(s.seed);if(t.add(a),!this.handles.has(a)){const i=this.createHandle(s);i.fade=0,this.applyOpacity(i,0),this.handles.set(a,i),this.group.add(i.sprite),this.group.add(i.label)}}for(const[s,a]of this.handles)t.has(s)||(this.group.remove(a.sprite),this.group.remove(a.label),this.disposeHandle(a),this.handles.delete(s));this.rebuildLines(e),this.refreshSnapshot()}update(e){this.pulseTime+=e;const t=this.pulseTime;for(const s of this.handlesSnapshot){s.fade<1&&(s.fade=Math.min(1,s.fade+e*2),this.applyOpacity(s,this.globalOpacity));const a=s.sprite.material,i=this.globalOpacity,o=s.galaxy.seed%628/100;a.opacity=i*s.fade*(.82+.18*Math.sin(t*1.4+o))}}updateLabelScales(e){for(const s of this.handlesSnapshot){const a=s.galaxy,i=Math.max(60,Math.hypot(e.x-a.x,e.y-a.y,e.z-a.z)),o=Math.min(2.2,Math.max(.7,Math.pow(4200/i,.35)));s.label.scale.set(.15*o,.019*o,1)}}pickGalaxy(e){for(const t of this.handles.values())if(t.sprite===e||t.label===e)return t.galaxy;return null}getMeshes(){return Array.from(this.handles.values(),e=>e.sprite)}setGlobalOpacity(e){const t=Math.max(0,Math.min(1,e));this.globalOpacity=t;for(const s of this.handles.values())this.applyOpacity(s,t);this.lineMaterial.opacity=.4*t}applyOpacity(e,t){e.sprite.material.opacity=t,e.label.material.opacity=t}disposeHandle(e){var t,s;(t=e.sprite.material.map)==null||t.dispose(),e.sprite.material.dispose(),(s=e.label.material.map)==null||s.dispose(),e.label.material.dispose()}createHandle(e){const t=this.seedGraph.rng("galaxy/render/"+e.seed),s=.028+t()*.02,a=Is[e.type],i=Ws(e.type,t),o=new X({map:i,color:a,transparent:!0,depthWrite:!1,blending:G,sizeAttenuation:!1}),n=new Z(o);n.scale.set(s,s,1),n.frustumCulled=!1,n.position.set(e.x,e.y,e.z);const l=this.makeLabel(e.name,e.type);return l.position.set(e.x,e.y+s*.6,e.z),{galaxy:e,sprite:n,label:l,fade:1}}makeLabel(e,t){const s=document.createElement("canvas");s.width=512,s.height=64;const a=s.getContext("2d");if(!a)throw new Error("Canvas 2D context unavailable.");a.fillStyle="rgba(0,0,0,0)",a.fillRect(0,0,s.width,s.height),a.font="bold 28px system-ui",a.fillStyle="#eaf2ff",a.textAlign="center",a.textBaseline="middle",a.fillText(e,s.width/2,s.height/2-8),a.font="16px system-ui",a.fillStyle="#7f96c0",a.fillText(t.toUpperCase(),s.width/2,s.height/2+16);const i=new N(s),o=new X({map:i,transparent:!0,depthWrite:!1,sizeAttenuation:!1}),n=new Z(o);return n.scale.set(.15,.019,1),n.frustumCulled=!1,n}rebuildLines(e){this.lineMesh&&(this.group.remove(this.lineMesh),this.lineMesh.geometry.dispose(),this.lineMesh=null);const t=Bs(e,3);if(t.length===0)return;const s=new Float32Array(t.length*6),a=new Float32Array(t.length*6);for(let o=0;o<t.length;o++){const n=e[t[o].from],l=e[t[o].to],c=o*6;s[c]=n.x,s[c+1]=n.y,s[c+2]=n.z,s[c+3]=l.x,s[c+4]=l.y,s[c+5]=l.z;const u=new k(Ot[(n.seed+l.seed)%Ot.length]);a[c]=u.r*.85,a[c+1]=u.g*.85,a[c+2]=u.b*.85,a[c+3]=u.r,a[c+4]=u.g,a[c+5]=u.b}const i=new se;i.setAttribute("position",new V(s,3)),i.setAttribute("color",new V(a,3)),this.lineMesh=new ct(i,this.lineMaterial),this.lineMesh.renderOrder=-1,this.group.add(this.lineMesh)}refreshSnapshot(){this.handlesSnapshot=Array.from(this.handles.values())}}class zt{constructor(e,t,s,a,i=o=>o){r(this,"renderer");r(this,"galaxiesByChunk",new Map);r(this,"updating",!1);r(this,"frameOrigin",{x:0,z:0});r(this,"frameScale",1);this.universeSeed=e,this.client=t,this.seedSource=i,this.renderer=a??new nt(s)}getRenderer(){return this.renderer}getGalaxyCount(){let e=0;for(const t of this.galaxiesByChunk.values())e+=t.length;return e}getFirstGalaxy(){for(const e of this.galaxiesByChunk.values()){const t=e[0];if(t)return t}return null}getLoadedChunkCount(){return this.galaxiesByChunk.size}setFrame(e,t,s){this.frameOrigin={x:e,z:t},this.frameScale=s||1}async update(e){if(this.updating)return this.getGalaxyCount();let t=e;if(this.frameScale!==1||this.frameOrigin.x!==0||this.frameOrigin.z!==0){const s=e.clone();s.position.set((e.position.x-this.frameOrigin.x)/this.frameScale,e.position.y/this.frameScale,(e.position.z-this.frameOrigin.z)/this.frameScale),t=s}this.updating=!0;try{const s=this.visibleMapRect(t);if(!s)return this.getGalaxyCount();const a=Pt(s.minX,s.minZ,0),i=Pt(s.maxX,s.maxZ,0),o=new Set;for(let d=a.cx;d<=i.cx;d++)for(let p=a.cy;p<=i.cy;p++)o.add(Ls({cx:d,cy:p,cz:0}));let n=!1;const l=[];for(const d of o)this.galaxiesByChunk.has(d)||l.push(d);const c=l.map(async d=>{const[p,m,v]=d.split("|");if(p===void 0||m===void 0||v===void 0)return[d,[]];const x=await this.loadChunk(Number(p),Number(m),Number(v));return[d,x]}),u=await Promise.all(c);for(const[d,p]of u)this.galaxiesByChunk.set(d,p),n=!0;if(n){const d=[];for(const p of this.galaxiesByChunk.values())for(const m of p)d.push(m);try{this.renderer.setGalaxies(d)}catch(p){console.error("setGalaxies failed:",p);const m=document.createElement("div");throw m.style.cssText="position:fixed;top:150px;left:8px;font:10px monospace;color:#ff7b7b;z-index:9;white-space:pre;",m.textContent="setGalaxies: "+String(p).slice(0,300),document.body.appendChild(m),p}}return this.getGalaxyCount()}finally{this.updating=!1}}dispose(){this.renderer.dispose()}visibleMapRect(e){const t=e;if(!t.isPerspectiveCamera)return null;const s=new f(0,0,-1).applyQuaternion(t.quaternion);if(s.y>=-1e-6)return null;const a=-t.position.y/s.y;if(!Number.isFinite(a)||a<=0)return null;const i=Math.tan(t.fov*Math.PI/360),o=i*t.aspect,n=new f(1,0,0).applyQuaternion(t.quaternion),l=new f(0,1,0).applyQuaternion(t.quaternion);let c=1/0,u=-1/0,d=1/0,p=-1/0;for(const[m,v]of[[-1,-1],[1,-1],[-1,1],[1,1]]){const x=s.clone().addScaledVector(n,m*o).addScaledVector(l,v*i).normalize(),C=-t.position.y/x.y;if(!Number.isFinite(C)||C<=0)return null;const A=t.position.x+x.x*C,O=t.position.z+x.z*C;c=Math.min(c,A),u=Math.max(u,A),d=Math.min(d,O),p=Math.max(p,O)}return{minX:c,maxX:u,minZ:d,maxZ:p}}async loadChunk(e,t,s){return(await this.client.getGalaxies(this.seedSource(this.universeSeed),[e,t,s])).data.galaxies}}const Hs=new K;function Et(h){return h<.5?4*h*h*h:1-Math.pow(-2*h+2,3)/2}class Vs{constructor(){r(this,"state","idle");r(this,"progress",0);r(this,"config",null);r(this,"onComplete");r(this,"initialized",!1);r(this,"startQuat",new K);r(this,"endQuat",new K);r(this,"trackOffset",new K);r(this,"tmpA",new f);r(this,"tmpB",new f)}getState(){return this.state}isTransitioning(){return this.state==="transitioning"}start(e,t,s){this.state!=="transitioning"&&(this.config=e,this.progress=0,this.initialized=!1,this.state="transitioning",this.onComplete=s,t&&t())}update(e,t){if(this.state!=="transitioning"||!this.config)return;this.initialized||(this.initialized=!0,this.captureOrientations(t)),this.progress+=e/this.config.duration;const s=this.progress>=1,a=s?1:this.progress;if(this.applyFrame(a,t),this.config.onProgress&&this.config.onProgress(this.config.progressRaw?a:Et(a)),s){this.state="idle",this.initialized=!1;const i=this.onComplete;this.config=null,this.onComplete=void 0,i&&i()}}flash(){if(typeof document>"u")return;const e=document.createElement("div");e.style.cssText=["position:fixed","inset:0","z-index:100","pointer-events:none","opacity:0.85","transition:opacity 0.6s ease-out","background:radial-gradient(circle at 50% 50%,","rgba(220,240,255,0.95) 0%,","rgba(120,170,255,0.5) 35%,","rgba(10,20,40,0) 75%)"].join(";"),document.body.appendChild(e),requestAnimationFrame(()=>{e.style.opacity="0"}),setTimeout(()=>e.remove(),700)}captureOrientations(e){if(this.config){if(this.startQuat.copy(e.quaternion),this.config.trackLookAt){if(!this.config.end){this.endQuat.copy(this.startQuat);return}const t=new W;t.lookAt(this.config.end,this.config.trackLookAt,new f(0,1,0)),this.endQuat.setFromRotationMatrix(t);const s=new W;s.lookAt(e.position,this.config.trackLookAt,new f(0,1,0)),this.trackOffset.setFromRotationMatrix(s).invert().multiply(this.startQuat);return}if(this.config.endQuaternion){this.endQuat.copy(this.config.endQuaternion);return}if(this.config.lookAt&&this.config.end){const t=new W;t.lookAt(this.config.end,this.config.lookAt,new f(0,1,0)),this.endQuat.setFromRotationMatrix(t);return}this.endQuat.copy(this.startQuat)}}applyFrame(e,t){if(!this.config)return;const s=Et(w.clamp(e,0,1)),a=this.config;if(a.approach){const o=a.approach,n=o.dip??0,l=w.lerp(Math.log(o.from),Math.log(o.to),s);let c=Math.exp(l);n>0&&(c*=1-n*Math.sin(Math.PI*s)),this.tmpA.copy(o.fromDir).normalize(),this.tmpB.copy(o.toDir).normalize();const u=w.clamp(this.tmpA.dot(this.tmpB),-1,1),d=Math.acos(u);if(d<1e-4)this.tmpA.copy(o.toDir);else{const p=Math.sin(d),m=Math.sin((1-s)*d)/p,v=Math.sin(s*d)/p;this.tmpA.multiplyScalar(m).addScaledVector(this.tmpB,v).normalize()}t.position.copy(o.focus).addScaledVector(this.tmpA,c)}else if(a.control&&a.start&&a.end){const o=1-s;this.tmpA.copy(a.start).multiplyScalar(o*o),this.tmpB.copy(a.control).multiplyScalar(2*o*s),this.tmpA.add(this.tmpB),this.tmpB.copy(a.end).multiplyScalar(s*s),t.position.copy(this.tmpA.add(this.tmpB))}else a.start&&a.end&&t.position.lerpVectors(a.start,a.end,s);let i=0;if(a.shakeHead!==void 0&&e<.35){const o=e/.35;i+=a.shakeHead*Math.sin(o*Math.PI)}if(a.shakeTail!==void 0&&e>=.65&&e<=1){const o=(e-.65)/.35;i+=a.shakeTail*Math.sin(o*Math.PI)}if(i>0){const o=this.progress*this.config.duration;t.position.x+=Math.sin(o*47.3)*i,t.position.y+=Math.sin(o*38.7+1.7)*i,t.position.z+=Math.sin(o*52.9+3.1)*i}if(t.quaternion.slerpQuaternions(this.startQuat,this.endQuat,s),a.trackLookAt){const o=new W;o.lookAt(t.position,a.trackLookAt,new f(0,1,0));const n=new K().setFromRotationMatrix(o),l=new K().slerpQuaternions(this.trackOffset,Hs,s);t.quaternion.copy(l.premultiply(n))}a.fovFrom!==void 0&&a.fovTo!==void 0&&(t.fov=a.fovFrom+(a.fovTo-a.fovFrom)*s,t.updateProjectionMatrix())}}const Ns=2166136261,Us=16777619;function me(h){return h>>>=0,h>=2147483648&&(h-=4294967296),h}function Ye(h,e){h=me(h),e=me(e);const t=h>>>16&65535,s=h&65535,a=e>>>16&65535,i=e&65535,o=t*i+s*a&65535;return me((o<<16)+s*i)}class ut{hash(e){let t=Ns;for(let s=0;s<e.length;s++){const a=e.charCodeAt(s);t=(t^a)>>>0,t=Ye(t,Us)>>>0}return t>>>0}hashInts(...e){return this.hash(e.join("|"))}rng(e){return ut.mulberry32(me(this.hash(e)))}static mulberry32(e){let t=me(e);return()=>{t=me(t+1831565813);let s=Ye(t^t>>>15,1|t);return s=me(s+Ye(s^s>>>7,61|s))^s,((s^s>>>14)>>>0)/4294967296}}}const Rt=[{name:"Пепел",youngA:"#7d90b0",youngB:"#dce6f2",oldA:"#8a6a50",oldB:"#c8a888",hiiA:"#5a0f0f",hiiB:"#a03020",emberA:"#5a6a80",emberB:"#7a2a1a",vortexIn:"#d8a878",vortexOut:"#7d90b0",core:["#a06848","#c05838","#ff7040"]},{name:"Кровь",youngA:"#a08090",youngB:"#e8dce2",oldA:"#7a4a40",oldB:"#c09080",hiiA:"#700a12",hiiB:"#c02030",emberA:"#705058",emberB:"#8a1a1a",vortexIn:"#e0906a",vortexOut:"#907080",core:["#b06048","#d04838","#ff5040"]},{name:"Токсин",youngA:"#7da098",youngB:"#dcf2ea",oldA:"#5a6a50",oldB:"#a8c0a0",hiiA:"#0f5a2a",hiiB:"#20a050",emberA:"#507a68",emberB:"#1a7a3a",vortexIn:"#a8d8b0",vortexOut:"#70a090",core:["#68a080","#38c070","#70ff90"]},{name:"Лёд",youngA:"#7090c0",youngB:"#e0f0ff",oldA:"#607080",oldB:"#a0b8c8",hiiA:"#0f2a5a",hiiB:"#2050a0",emberA:"#506a8a",emberB:"#1a3a7a",vortexIn:"#a8c8e0",vortexOut:"#7090b0",core:["#6890b0","#3878c0","#70b0ff"]},{name:"Формалин",youngA:"#9080a8",youngB:"#ece0f6",oldA:"#6a5a78",oldB:"#b0a0c0",hiiA:"#3a0f5a",hiiB:"#7020a0",emberA:"#6a5a80",emberB:"#4a1a7a",vortexIn:"#c8a8e0",vortexOut:"#9080a8",core:["#9068b0","#a038c0","#d070ff"]}];class dt{constructor(e,t,s,a,i,o,n,l,c,u,d,p,m,v,x,C,A,O){this.arms=e,this.twist=t,this.armWidthBase=s,this.armWidthGrow=a,this.meanderFast=i,this.meanderSlow=o,this.feather=n,this.spinSign=l,this.spinSpeed=c,this.vortexRadius=u,this.vortexDepth=d,this.vortexWind=p,this.vortexSpin=m,this.paletteIndex=v,this.twinkleAmp=x,this.embersDrift=C,this.embersSpeed=A,this.bgBand=O}static create(e,t){const s=e.rng("galaxy/"+t+"/mortis"),a=1+Math.floor(s()*5),i=.02+s()*.28,o=.4+s()*3.6,n=s()*.85,l=s()*4,c=s()*22,u=s(),d=s()<.5?-1:1,p=.005+s()*.075,m=3+s()*77,v=.1+s()*14.9,x=s()*.6,C=.005+s()*.075,A=1,O=p*A,b=C*d,E=Math.min(4,Math.floor(s()*5)),R=s()*.12,z=.2+s()*1.3,q=.2+s()*1,ae=.2+s()*.5;return new dt(a,i,o,n,l,c,u,A,O,m,v,x,b,E,R,z,q,ae)}armCenterOffset(e,t){const s=Math.min(e/16,1);return(Math.sin(e*.09+t*2.4)*this.meanderFast+Math.sin(e*.023+t*.7+1.3)*this.meanderSlow)*s}armWidth(e,t){const s=this.armWidthBase+e*this.armWidthGrow,a=.65+.7*(.5+.5*Math.sin(e*.07+t*1.7+.4));return s*a}armAngle(e,t,s){return t/this.arms*Math.PI*2+e*this.twist+s/Math.max(e,1e-6)}toJSON(){return{arms:this.arms,twist:this.twist,armWidthBase:this.armWidthBase,armWidthGrow:this.armWidthGrow,meanderFast:this.meanderFast,meanderSlow:this.meanderSlow,feather:this.feather,spinSign:this.spinSign,spinSpeed:this.spinSpeed,vortexRadius:this.vortexRadius,vortexDepth:this.vortexDepth,vortexWind:this.vortexWind,vortexSpin:this.vortexSpin,paletteIndex:this.paletteIndex,twinkleAmp:this.twinkleAmp,embersDrift:this.embersDrift,embersSpeed:this.embersSpeed,bgBand:this.bgBand}}}function qs(h,e){const t=h.rng("galaxy/"+e+"/vortex"),s=6+Math.pow(t(),1.4)*74,a=.35+t()*1.9,i=.2+t()*.8,o=1+Math.floor(t()*4),n=.15+t()*.65;return{arms:o,radius:s,twist:a,thickness:i,spinSpeed:n}}const j=Math.PI*2,Xe=[["#7a2030","#241040"],["#a02030","#401018"],["#1a7070","#0a2830"],["#5030a0","#180a30"],["#802050","#200a28"],["#703040","#180a14"],["#284070","#0a1428"],["#206040","#081810"]];function Qs(h){let e=h|0;return()=>{e=e+1831565813|0;let t=Math.imul(e^e>>>15,1|e);return t=t+Math.imul(t^t>>>7,61|t)^t,((t^t>>>14)>>>0)/4294967296}}class pe{constructor(e,t,s,a){r(this,"group",new F);r(this,"spinGroup",new F);r(this,"disposables",[]);r(this,"starMaterial");r(this,"emberMaterial");r(this,"dustMaterial");r(this,"vortexMaterial");r(this,"vortex");r(this,"nebulae",[]);r(this,"glowSprites",[]);r(this,"beacons",[]);r(this,"flares",[]);r(this,"shape");r(this,"time",0);r(this,"globalOpacity",1);r(this,"seedGraph");this.shape=e,this.seedGraph=a??null;const i=Rt[e.paletteIndex]??Rt[0],o=Qs(s|0),n=(g,S)=>g+o()*(S-g),l=()=>(o()+o()+o()-1.5)*.7,c=Math.max(8,t),u=e.arms;this.group.add(this.spinGroup);const d=0;this.starMaterial=new _({depthWrite:!1,transparent:!0,blending:G,uniforms:{uSize:{value:1.9},uTime:{value:0},uTwAmp:{value:e.twinkleAmp},uTwMin:{value:.1},uTwMax:{value:.35},uShear:{value:d},uOpacity:{value:1}},vertexShader:`
                uniform float uSize; uniform float uTime;
                uniform float uTwAmp; uniform float uTwMin; uniform float uTwMax;
                uniform float uShear;
                attribute float aScale; attribute vec3 aColor; attribute float aPhase;
                varying vec3 vColor; varying float vTw;
                void main() {
                    // Дифференциальный сдвиг: поворот вокруг нормали диска (Z),
                    // сильнее в центре (делитель растёт с радиусом).
                    float sr = length(position.xy) + 1e-4;
                    float da = uTime * uShear / (1.0 + sr * 0.06);
                    float cs = cos(da); float sn = sin(da);
                    vec3 pos = vec3(
                        position.x * cs - position.y * sn,
                        position.x * sn + position.y * cs,
                        position.z);
                    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
                    gl_Position = projectionMatrix * mv;
                    float dist = max(-mv.z, 0.1);
                    gl_PointSize = min(uSize * aScale * (300.0 / dist), 20.0);
                    vColor = aColor;
                    float sp = mix(uTwMin, uTwMax, aPhase);
                    vTw = 1.0 - uTwAmp * 0.5 + uTwAmp * 0.5 * sin(uTime * sp + aPhase * 40.0);
                }
            `,fragmentShader:`
                uniform float uOpacity;
                varying vec3 vColor; varying float vTw;
                void main() {
                    float d = length(gl_PointCoord - vec2(0.5));
                    if (d > 0.5) discard;
                    float a = pow(1.0 - d * 2.0, 2.4) * vTw * uOpacity;
                    if (a < 0.003) discard;
                    gl_FragColor = vec4(vColor, a);
                }
            `}),this.disposables.push(this.starMaterial),this.emberMaterial=new _({depthWrite:!1,transparent:!0,blending:G,uniforms:{uSize:{value:2.2},uTime:{value:0},uDrift:{value:e.embersDrift},uVDrift:{value:.15},uSpeed:{value:e.embersSpeed},uSpinDir:{value:e.spinSign},uShear:{value:d},uOpacity:{value:1}},vertexShader:`
                uniform float uSize; uniform float uTime;
                uniform float uDrift; uniform float uVDrift;
                uniform float uSpeed; uniform float uSpinDir;
                uniform float uShear;
                attribute float aScale; attribute vec3 aColor;
                attribute float aPhase; attribute float aDrift;
                varying vec3 vColor; varying float vA;
                void main() {
                    float sr = length(position.xy) + 1e-4;
                    float da = uTime * uShear / (1.0 + sr * 0.06);
                    float cs = cos(da); float sn = sin(da);
                    vec3 p = vec3(
                        position.x * cs - position.y * sn,
                        position.x * sn + position.y * cs,
                        position.z);
                    float t = uTime * uSpeed;
                    float ph = aPhase * 6.28318;
                    // Тангенс орбиты вокруг оси Z (CCW при положительном спине).
                    vec3 tang = normalize(vec3(-p.y, p.x, 0.0) + vec3(1e-5, 1e-5, 0.0));
                    float along = sin(t + ph) * uDrift * aDrift * uSpinDir;
                    p.x += tang.x * along;
                    p.y += tang.y * along;
                    p.z += sin(t * 0.7 + ph * 1.7) * uVDrift * aDrift;
                    vec4 mv = modelViewMatrix * vec4(p, 1.0);
                    gl_Position = projectionMatrix * mv;
                    float dist = max(-mv.z, 0.1);
                    gl_PointSize = min(uSize * aScale * (300.0 / dist), 14.0);
                    vColor = aColor;
                    vA = 0.75 + 0.25 * sin(t * 2.0 + ph * 3.0);
                }
            `,fragmentShader:`
                uniform float uOpacity;
                varying vec3 vColor; varying float vA;
                void main() {
                    float d = length(gl_PointCoord - vec2(0.5));
                    if (d > 0.5) discard;
                    float a = pow(1.0 - d * 2.0, 2.2) * vA * uOpacity;
                    if (a < 0.003) discard;
                    gl_FragColor = vec4(vColor, a);
                }
            `}),this.disposables.push(this.emberMaterial),this.vortexMaterial=new _({depthWrite:!1,transparent:!0,blending:G,uniforms:{uSize:{value:2.1},uTime:{value:0},uShearW:{value:.45},uOpacity:{value:1}},vertexShader:`
                uniform float uSize; uniform float uTime; uniform float uShearW;
                attribute float aScale; attribute vec3 aColor; attribute float aPhase;
                varying vec3 vColor; varying float vTw;
                void main() {
                    // Кеплеровский дифференциал: угол поворота ~ t / sqrt(r).
                    float r = max(length(position.xy), 0.55);
                    float da = uTime * uShearW / sqrt(r);
                    float cs = cos(da); float sn = sin(da);
                    vec3 pos = vec3(
                        position.x * cs - position.y * sn,
                        position.x * sn + position.y * cs,
                        position.z);
                    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
                    gl_Position = projectionMatrix * mv;
                    float dist = max(-mv.z, 0.1);
                    gl_PointSize = min(uSize * aScale * (300.0 / dist), 18.0);
                    vColor = aColor;
                    vTw = 0.85 + 0.15 * sin(uTime * 0.9 + aPhase * 40.0);
                }
            `,fragmentShader:`
                uniform float uOpacity;
                varying vec3 vColor; varying float vTw;
                void main() {
                    float d = length(gl_PointCoord - vec2(0.5));
                    if (d > 0.5) discard;
                    float a = pow(1.0 - d * 2.0, 2.3) * vTw * uOpacity;
                    if (a < 0.003) discard;
                    gl_FragColor = vec4(vColor, a);
                }
            `}),this.disposables.push(this.vortexMaterial),this.dustMaterial=new _({depthWrite:!1,transparent:!0,blending:Ht,uniforms:{uSize:{value:2.6},uColor:{value:new k("#1a100c")},uTime:{value:0},uShear:{value:d},uOpacity:{value:1}},vertexShader:`
                uniform float uSize; uniform float uTime; uniform float uShear;
                attribute float aScale; attribute float aAlpha;
                varying float vA;
                void main() {
                    // Тот же дифференциальный сдвиг, что у звёзд/угольков:
                    // пыль деформируется синхронно с диском.
                    float sr = length(position.xy) + 1e-4;
                    float da = uTime * uShear / (1.0 + sr * 0.06);
                    float cs = cos(da); float sn = sin(da);
                    vec3 pos = vec3(
                        position.x * cs - position.y * sn,
                        position.x * sn + position.y * cs,
                        position.z);
                    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
                    gl_Position = projectionMatrix * mv;
                    float dist = max(-mv.z, 0.1);
                    gl_PointSize = min(uSize * aScale * (300.0 / dist), 12.0);
                    vA = aAlpha;
                }
            `,fragmentShader:`
                uniform vec3 uColor; uniform float uOpacity;
                varying float vA;
                void main() {
                    float d = length(gl_PointCoord - vec2(0.5));
                    if (d > 0.5) discard;
                    float a = pow(1.0 - d * 2.0, 1.5) * vA * uOpacity;
                    if (a < 0.004) discard;
                    gl_FragColor = vec4(uColor, a);
                }
            `}),this.disposables.push(this.dustMaterial);const p=Math.min(c/60,1.6),m={armStars:Math.round(55e3*p),haze:Math.round(12e3*p),oldStars:Math.round(18e3*p),dust:Math.round(15e3*p),hii:Math.round(2500*p),embers:Math.round(8e3*p),vortex:Math.round(7e3*p),bgStars:Math.round(9e3*Math.min(c/60,1.2)),bgNear:Math.round(2500*Math.min(c/60,1.2)),clumps:Math.max(40,Math.round(150*p)),globulars:Math.max(4,Math.round(10*p))};class v{constructor(){r(this,"pos",[]);r(this,"col",[]);r(this,"scl",[]);r(this,"ph",[]);r(this,"al",[]);r(this,"dr",[])}push(S,y,T,M,D,L,Q){this.pos.push(S,y,T),this.scl.push(M),D!==void 0&&this.col.push(D.r,D.g,D.b),L!==void 0&&this.al.push(L),Q!==void 0&&this.dr.push(Q),this.ph.push(o())}get count(){return this.scl.length}}const x=new v,C=new v,A=new v,O=new v,b=new v,E=new v,R=new v,z=new k,q=new k(i.youngA),ae=new k(i.youngB),Te=new k(i.oldA),Ce=new k(i.oldB),qe=new k(i.hiiA),Ae=new k(i.hiiB),re=new k(i.emberA),ke=new k(i.emberB),H=new k(i.vortexIn),ie=new k(i.vortexOut),De=(g,S)=>e.armCenterOffset(g,S),Pe=(g,S)=>e.armWidth(g,S),Oe=(g,S,y)=>e.armAngle(g,S,y),J=[];for(let g=0;g<m.clumps;g++){const S=g%u,y=6+Math.pow(o(),.8)*(c-8),T=De(y,S)+l()*Pe(y,S)*.45,M=Oe(y,S,T);J.push(new f(Math.cos(M)*y,Math.sin(M)*y,l()*.7))}for(let g=0;g<m.armStars;g++){let S,y,T,M;if(o()<.28){const D=J[o()*J.length|0];S=D.x+l()*1.8,y=D.y+l()*.6,T=D.z+l()*.6,M=n(.22,.55)}else{const D=g%u,L=4+Math.pow(o(),1.15)*(c-4),Q=Pe(L,D),ce=l(),he=o()<e.feather?2.6:1,oe=De(L,D)+ce*Q*he,Ee=Oe(L,D,oe),ve=L+l()*1.6;S=Math.cos(Ee)*ve,y=Math.sin(Ee)*ve,T=l()*(.5+2*Math.exp(-L/20)+L*.012),M=n(.22,.55)*(1-.45*Math.min(Math.abs(ce)/2,1))}z.copy(q).lerp(ae,o()).multiplyScalar(M),x.push(S,y,T,n(.3,1)+(o()<.04?.8:0),z)}for(let g=0;g<m.haze;g++){const S=6+Math.pow(o(),1.3)*(c-6),y=o()*j;z.copy(q).lerp(ae,o()*.5).multiplyScalar(n(.08,.22)),x.push(Math.cos(y)*S+l()*2,Math.sin(y)*S+l()*2,l()*(1+2.5*Math.exp(-S/25)),n(.3,.8),z)}for(let g=0;g<m.oldStars;g++){let S,y,T;if(g<m.oldStars*.39){const M=2.5+Math.pow(o(),.7)*8*Math.max(1,c/60),D=o()*j,L=Math.acos(2*o()-1);S=Math.sin(L)*Math.cos(D)*M,y=Math.cos(L)*M*.72,T=Math.sin(L)*Math.sin(D)*M}else{const M=c*Math.pow(o(),1.6),D=o()*j;S=Math.cos(D)*M+l()*1.2,y=Math.sin(D)*M+l()*1.2,T=l()*(.8+3*Math.exp(-M/25))}z.copy(Te).lerp(Ce,o()).multiplyScalar(n(.14,.34)),C.push(S,y,T,n(.3,.9),z)}for(let g=0;g<m.globulars;g++){const S=o()*j,y=Math.acos(2*o()-1),T=n(24,46)*Math.max(.6,c/60),M=Math.sin(y)*Math.cos(S)*T,D=Math.cos(y)*T*.8,L=Math.sin(y)*Math.sin(S)*T;for(let Q=0;Q<300;Q++)z.copy(Ce).multiplyScalar(n(.18,.4)),C.push(M+l()*.9,D+l()*.9,L+l()*.9,n(.25,.7),z)}const jt=Math.min(e.vortexRadius,c*1.2)+4;for(let g=0;g<m.dust;g++){const S=g%u,y=5+Math.pow(o(),1.05)*(c-6);if(y<jt)continue;const T=Pe(y,S)*.55,M=De(y,S)-T*.6+l()*T*(o()<.15?2.2:1),D=Oe(y,S,M),L=y+l()*1.2;b.pos.push(Math.cos(D)*L,Math.sin(D)*L,l()*(.4+1.2*Math.exp(-y/22))),b.scl.push(n(1,2.8)),b.al.push(n(.16,.42)*(o()<.7?1:.35)),b.ph.push(0)}for(let g=0;g<m.hii;g++){const S=J[o()*J.length|0];z.copy(qe).lerp(Ae,o()).multiplyScalar(n(.3,.7)),A.push(S.x+l()*1.2,S.y+l()*.5,S.z+l()*.5,n(.5,1.3),z)}for(let g=0;g<m.embers;g++){const S=g%u,y=5+Math.pow(o(),1.1)*(c-5),T=Pe(y,S)*1.2,M=De(y,S)+l()*T,D=Oe(y,S,M),L=y+l()*2;o()<.15?z.copy(ke).multiplyScalar(n(.1,.3)*1.6):z.copy(re).lerp(ae,o()*.4).multiplyScalar(n(.1,.3)),E.push(Math.cos(D)*L,Math.sin(D)*L,l()*(.6+1.6*Math.exp(-y/22)),n(.5,1.6),z,void 0,n(.4,1.2))}const ze=qs(this.seedGraph??{rng:()=>()=>.5},Math.round(s)),ft=ze.arms,Qe=Math.min(ze.radius*Math.max(.7,c/60),c*1.1),Yt=ze.thickness*Math.max(.6,c/60),Xt=2*(.5+ze.twist),gt=j*Xt,Zt=Math.log(Math.max(Qe,.001)/.3)/gt;for(let g=0;g<m.vortex;g++){const S=o(),y=S*gt,T=g%ft,D=T/ft*j+y,L=.3+(Qe-.3)*Math.exp(-Zt*y),Q=L/Math.max(Qe,.001),ce=.65+.7*(.5+.5*Math.sin(y*2/j*Math.PI*4+T*1.7)),he=Yt*(.22+.78*Q)*ce,oe=l()*he,Ee=l()*(he/Math.max(L,.3))*.5,ve=D+Ee,bt=Math.max(L+oe,.12),as=-e.vortexDepth*.25*Math.pow(S,1.7)+l()*(.12+.3*Q),Mt=Math.pow(S,.75);z.copy(H).lerp(ie,1-S).multiplyScalar(n(.5,1)*(.3+.7*Mt)),R.push(Math.cos(ve)*bt,Math.sin(ve)*bt,as,n(.4,1)*(.3+.7*Mt),z)}const Jt=new W().makeRotationFromEuler(new Ge(.6,0,.4)),fe=new f;for(let g=0;g<m.bgStars;g++){const S=o()*j,y=Math.acos(2*o()-1);fe.set(Math.sin(y)*Math.cos(S),Math.cos(y),Math.sin(y)*Math.sin(S)),o()<e.bgBand&&(fe.y*=.18,fe.applyMatrix4(Jt));const T=n(500,1400),M=n(.35,.85)*(o()<.06?2.2:1);z.setRGB(M*(.8+o()*.2),M*(.85+o()*.15),M),O.push(fe.x*T,fe.y*T,fe.z*T,n(1.2,3)+(o()<.05?2:0),z)}for(let g=0;g<m.bgNear;g++){const S=o()*j,y=Math.acos(2*o()-1),T=n(250,600);let M=n(.3,.8);o()<.05&&(M*=1.8);const D=o()<.25;z.setRGB(M*(D?1:.8),M*(D?.85:.9),M*(D?.7:1)),O.push(Math.sin(y)*Math.cos(S)*T,Math.cos(y)*T,Math.sin(y)*Math.sin(S)*T,n(.8,2),z)}const le=(g,S,y,T)=>{const M=new se;M.setAttribute("position",new de(g.pos,3)),T&&g.col.length===g.pos.length&&M.setAttribute("aColor",new de(g.col,3)),M.setAttribute("aScale",new de(g.scl,1)),M.setAttribute("aPhase",new de(g.ph,1)),g.al.length>0&&M.setAttribute("aAlpha",new de(g.al,1)),g.dr.length>0&&M.setAttribute("aDrift",new de(g.dr,1)),this.disposables.push(M);const D=new He(M,S);return D.frustumCulled=!1,D.renderOrder=y,D};this.spinGroup.add(le(x,this.starMaterial,2,!0)),this.spinGroup.add(le(C,this.starMaterial,2,!0)),this.spinGroup.add(le(b,this.dustMaterial,3,!1)),this.spinGroup.add(le(A,this.starMaterial,3,!0)),this.spinGroup.add(le(E,this.emberMaterial,4,!0)),this.vortex=le(R,this.vortexMaterial,4,!0),this.spinGroup.add(this.vortex),this.group.add(le(O,this.starMaterial,0,!0));const es=[{s:c*.43,op:.16},{s:c*.12,op:.3},{s:c*.037,op:.75}],yt=pe.makeGlowTexture();this.disposables.push(yt),es.forEach((g,S)=>{const y=new X({map:yt,color:new k(i.core[S]??"#ff7040"),transparent:!0,opacity:g.op,depthWrite:!1,blending:G}),T=new Z(y);T.scale.setScalar(g.s),T.renderOrder=5,this.spinGroup.add(T),this.disposables.push(y),this.glowSprites.push({mat:y,base:g.op})});const Ke=pe.makeHaloTexture(),vt=pe.makeDiskGlowTexture();this.disposables.push(Ke,vt),[{tex:Ke,color:i.core[1]??"#c05838",s:c*.97,op:.22},{tex:Ke,color:i.core[0]??"#a06848",s:c*2.17,op:.08},{tex:vt,color:i.core[0]??"#a06848",s:c*3.67,op:.09}].forEach(g=>{const S=new X({map:g.tex,color:new k(g.color),transparent:!0,opacity:g.op,depthWrite:!1,blending:G}),y=new Z(S);y.scale.setScalar(g.s),y.renderOrder=3,this.spinGroup.add(y),this.disposables.push(S),this.glowSprites.push({mat:S,base:g.op})});const wt=pe.makeBeaconTexture();this.disposables.push(wt);const St=10;for(let g=0;g<St;g++){const S=new X({map:wt,transparent:!0,opacity:.04,depthWrite:!1,blending:G}),y=new Z(S);let T;if(g<Math.ceil(St*.6)){const M=J[o()*J.length|0];T=new f(M.x+l()*2.5,M.y+l()*2.5,M.z+l()*.8)}else{const M=o()*j,D=c*n(1.5,3.2);T=new f(Math.cos(M)*D,Math.sin(M)*D,l()*4)}y.position.copy(T),y.scale.setScalar(n(2,7)),y.renderOrder=6,y.userData.speed=n(.4,.95),y.userData.phase=n(0,j),y.userData.peak=n(.6,1),this.spinGroup.add(y),this.beacons.push(y),this.disposables.push(S)}const xt=pe.makeFlareTexture();this.disposables.push(xt);const ts=7;for(let g=0;g<ts;g++){const S=new X({map:xt,transparent:!0,opacity:n(.08,.22),depthWrite:!1,blending:G,rotation:n(0,Math.PI)}),y=new Z(S);if(g===0)y.position.set(0,0,0);else{const T=J[o()*J.length|0];y.position.set(T.x+l()*1.5,T.y+l()*1.5,T.z+l()*.5)}y.scale.setScalar(n(5,12)),y.renderOrder=6,y.userData.rotSpeed=n(-.05,.05),this.spinGroup.add(y),this.flares.push(y),this.disposables.push(S)}const ss=3+(o()*4|0);for(let g=0;g<ss;g++){const S=Xe[o()*Xe.length|0]??Xe[0],y=g===0,T=y?n(700,950):n(240,480)*Math.max(.7,c/60),M=o()*j,D=Math.acos(2*o()-1),L=y?n(2200,2800):n(260,560),Q=y?.28:n(.22,.34),ce={uTime:{value:0},uColorA:{value:new k(S[0])},uColorB:{value:new k(S[1])},uOpacity:{value:Q},uScale:{value:n(2.2,3.2)},uBoost:{value:n(3,4.5)}},he=new _({transparent:!0,depthWrite:!1,side:Ne,blending:G,uniforms:ce,vertexShader:`
                    varying vec2 vUv;
                    void main() {
                        vUv = uv;
                        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                    }
                `,fragmentShader:`
                    uniform float uTime; uniform vec3 uColorA; uniform vec3 uColorB;
                    uniform float uOpacity; uniform float uScale; uniform float uBoost;
                    varying vec2 vUv;
                    float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
                    float noise(vec2 p) {
                        vec2 i = floor(p); vec2 f = fract(p);
                        f = f * f * (3.0 - 2.0 * f);
                        return mix(mix(hash(i), hash(i + vec2(1., 0.)), f.x),
                                   mix(hash(i + vec2(0., 1.)), hash(i + vec2(1., 1.)), f.x), f.y);
                    }
                    float fbm(vec2 p) {
                        float v = 0.0; float a = 0.5;
                        for (int n = 0; n < 4; n++) { v += a * noise(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; }
                        return v;
                    }
                    void main() {
                        vec2 uv = vUv * uScale;
                        float n1 = fbm(uv + uTime * 0.012);
                        float n2 = fbm(uv * 1.9 - uTime * 0.008 + 4.7);
                        float shapeN = smoothstep(0.25, 0.78, n1 * 0.6 + n2 * 0.55);
                        float dist = length(vUv - 0.5) * 2.0;
                        float edge = clamp(1.0 - dist * dist, 0.0, 1.0);
                        edge *= edge;
                        vec3 col = mix(uColorB, uColorA, clamp(n1 * 1.6 - 0.3, 0.0, 1.0)) * uBoost;
                        float alpha = shapeN * edge * uOpacity;
                        if (alpha < 0.004) discard;
                        gl_FragColor = vec4(col, alpha);
                    }
                `}),oe=new U(new We(L,L),he);oe.position.set(Math.sin(D)*Math.cos(M)*T,Math.cos(D)*T*.35,Math.sin(D)*Math.sin(M)*T),oe.renderOrder=0,this.disposables.push(he,oe.geometry),this.nebulae.push({uniforms:ce,base:Q}),this.group.add(oe)}}update(e){this.time+=e;const t=this.time;this.vortexMaterial.uniforms.uTime.value=t,this.starMaterial.uniforms.uTime.value=t,this.emberMaterial.uniforms.uTime.value=t,this.dustMaterial.uniforms.uTime.value=t;for(const o of this.nebulae)o.uniforms.uTime.value=t;const s=[.15,.12,.08,.18,.2,.15],a=[.4,.5,1.3,.4,.4,.25],i=[0,1,0,0,1.5,0];for(let o=0;o<this.glowSprites.length;o++){const n=this.glowSprites[o],l=s[o%s.length]??0,c=a[o%a.length]??0,u=i[o%i.length]??0;n.mat.opacity=n.base*this.globalOpacity*(1+Math.sin(t*c+u)*l)}for(const o of this.beacons)o.material.opacity=.04+Math.pow(Math.max(0,Math.sin(t*o.userData.speed+o.userData.phase)),10)*o.userData.peak;for(const o of this.flares)o.material.rotation+=e*o.userData.rotSpeed}getObject(){return this.group}setOpacity(e){const t=w.clamp(e,0,1);this.globalOpacity=t,this.starMaterial.uniforms.uOpacity.value=t,this.emberMaterial.uniforms.uOpacity.value=t,this.dustMaterial.uniforms.uOpacity.value=t,this.vortexMaterial.uniforms.uOpacity.value=t;for(const s of this.glowSprites)s.mat.opacity=s.base*t;for(let s=0;s<this.nebulae.length;s++){const a=this.nebulae[s];a.uniforms.uOpacity.value=a.base*t}}getOpacity(){return this.globalOpacity}dispose(){for(const e of this.disposables)e.dispose();this.disposables.length=0,this.glowSprites.length=0,this.beacons.length=0,this.flares.length=0,this.nebulae.length=0,this.group.removeFromParent(),this.group.clear()}static makeGlowTexture(){const e=document.createElement("canvas");e.width=128,e.height=128;const t=e.getContext("2d");if(!t)throw new Error("Canvas 2D unavailable.");const s=t.createRadialGradient(64,64,0,64,64,64);return s.addColorStop(0,"rgba(255,255,255,0.5)"),s.addColorStop(.35,"rgba(255,255,255,0.16)"),s.addColorStop(1,"rgba(255,255,255,0)"),t.fillStyle=s,t.fillRect(0,0,128,128),new N(e)}static makeHaloTexture(){const e=document.createElement("canvas");e.width=256,e.height=256;const t=e.getContext("2d");if(!t)throw new Error("Canvas 2D unavailable.");const s=t.createRadialGradient(128,128,0,128,128,128);return s.addColorStop(0,"rgba(180,110,60,0.45)"),s.addColorStop(.4,"rgba(90,45,25,0.15)"),s.addColorStop(1,"rgba(0,0,0,0)"),t.fillStyle=s,t.fillRect(0,0,256,256),new N(e)}static makeDiskGlowTexture(){const e=document.createElement("canvas");e.width=256,e.height=256;const t=e.getContext("2d");if(!t)throw new Error("Canvas 2D unavailable.");const s=t.createRadialGradient(128,128,0,128,128,128);return s.addColorStop(0,"rgba(140,85,45,0.55)"),s.addColorStop(.35,"rgba(70,40,30,0.20)"),s.addColorStop(.7,"rgba(25,25,40,0.07)"),s.addColorStop(1,"rgba(0,0,0,0)"),t.fillStyle=s,t.fillRect(0,0,256,256),new N(e)}static makeBeaconTexture(){const t=document.createElement("canvas");t.width=256,t.height=256;const s=t.getContext("2d");if(!s)throw new Error("Canvas 2D unavailable.");const a=s.createRadialGradient(256/2,256/2,0,256/2,256/2,256/2);a.addColorStop(0,"rgba(255,70,50,0.9)"),a.addColorStop(.3,"rgba(150,20,15,0.35)"),a.addColorStop(1,"rgba(0,0,0,0)"),s.fillStyle=a,s.fillRect(0,0,256,256);const i=new N(t);return i.colorSpace=st,i}static makeFlareTexture(){const t=document.createElement("canvas");t.width=256,t.height=256;const s=t.getContext("2d");if(!s)throw new Error("Canvas 2D unavailable.");s.globalCompositeOperation="lighter";const a=(n,l,c,u)=>{s.save(),s.translate(256/2,256/2),s.rotate(n);const d=s.createLinearGradient(-l,0,l,0);d.addColorStop(0,"rgba(0,0,0,0)"),d.addColorStop(.5,`rgba(255,238,214,${u})`),d.addColorStop(1,"rgba(0,0,0,0)"),s.fillStyle=d,s.fillRect(-l,-c/2,l*2,c),s.restore()};a(0,256*.48,3,.85),a(Math.PI/2,256*.48,3,.85);const i=s.createRadialGradient(256/2,256/2,0,256/2,256/2,256*.12);i.addColorStop(0,"rgba(255,230,200,.9)"),i.addColorStop(1,"rgba(0,0,0,0)"),s.fillStyle=i,s.fillRect(0,0,256,256);const o=new N(t);return o.colorSpace=st,o}}const Ue=`
uniform float uQ;uniform float uDepth;uniform float uPost;
uniform vec3 uSeed;
float hash1(vec3 p){p=fract(p*vec3(.1031,.1030,.0973));p+=dot(p,p.yxz+33.33);
  return fract((p.x+p.y)*(p.x+p.z)*(p.y+p.z));}
vec3 hash3(vec3 p){p=fract(p*vec3(.1031,.1030,.0973));p+=dot(p,p.yxz+33.33);
  return fract((p.xxy+p.yxx)*p.zyx);}
float vnoise(vec3 p){vec3 i=floor(p),f=fract(p);vec3 u=f*f*(3.0-2.0*f);
  return mix(mix(mix(hash1(i),hash1(i+vec3(1,0,0)),u.x),
    mix(hash1(i+vec3(0,1,0)),hash1(i+vec3(1,1,0)),u.x),u.y),
    mix(mix(hash1(i+vec3(0,0,1)),hash1(i+vec3(1,0,1)),u.x),
    mix(hash1(i+vec3(0,1,1)),hash1(i+vec3(1,1,1)),u.x),u.y),u.z);}
float fbm(vec3 p){float a=.5,s=0.;for(int k=0;k<4;k++){s+=a*vnoise(p);p=p*2.02+vec3(1.7);a*=.5;}return s;}
float fbmQ(vec3 p){int oct=uQ>1.5?4:(uQ>0.5?3:3);float a=.5,s=0.;
  for(int k=0;k<4;k++){if(k>=oct)break;s+=a*vnoise(p);p=p*2.03+vec3(1.7);a*=.5;}return s;}
float ridged(vec3 p){return 1.0-abs(fbm(p)*2.0-1.0);}
vec2 voronoiEdge(vec3 p){vec3 i=floor(p),f=fract(p);float d1=8.,d2=8.,id=0.;
  for(int x=-1;x<=1;x++)for(int y=-1;y<=1;y++)for(int z=-1;z<=1;z++){
    vec3 g=vec3(float(x),float(y),float(z));vec3 o=.15+.7*hash3(i+g);vec3 r=g+o-f;float d=dot(r,r);
    if(d<d1){d2=d1;d1=d;id=hash1(i+g);}else if(d<d2){d2=d;}}
  return vec2(sqrt(d2)-sqrt(d1),id);}
vec3 rotAxis(vec3 v,vec3 ax,float a){float c=cos(a),s=sin(a);
  return v*c+cross(ax,v)*s+ax*dot(ax,v)*(1.-c);}
vec3 rotY(vec3 v,float a){float c=cos(a),s=sin(a);
  return vec3(c*v.x+s*v.z,v.y,-s*v.x+c*v.z);}
float lightFall(float nd){return pow(max(nd,0.),1.0+0.35*uDepth);}
vec3 tonemap(vec3 c){return uPost>.5?c:1.-exp(-c*1.65);}
float craterBowl(vec3 d,vec3 pos,float size){
  float dist=acos(clamp(dot(d,normalize(pos)),-1.,1.));
  float rim=smoothstep(size,size*.85,dist)*smoothstep(size*.6,size*.8,dist);
  float bowl=smoothstep(size*.6,0.,dist);
  return rim*.25-bowl*.35;}
`,Vt=`
uniform vec3 uHurPos[3];uniform float uHurInt[3];uniform float uHurSign[3];uniform float uHurRot[3];
uniform float uHurD[3];uniform float uHurScale[3];
vec3 hurWarp(vec3 d){for(int i=0;i<3;i++){float it=uHurInt[i];if(it<=.001)continue;
  vec3 a=normalize(uHurPos[i]);float r=acos(clamp(dot(d,a),-1.,1.));
  float sc=uHurScale[i];float dd=uHurD[i];
  float keepW=1.-smoothstep(mix(.6,.05,dd)*sc,mix(.8,.15,dd)*sc,r);
  float fall=it*(1.-smoothstep(0.,.28*sc,r))*keepW;
  d=rotAxis(d,a,uHurSign[i]*fall*2.2);}return d;}
float hurMask(vec3 d){float M=0.;for(int i=0;i<3;i++){float it=uHurInt[i];if(it<=.001)continue;
  vec3 a=normalize(uHurPos[i]);float r=acos(clamp(dot(d,a),-1.,1.));
  float sc=uHurScale[i];float dd=uHurD[i];
  M=max(M,it*(1.-smoothstep(mix(.55,.08,dd)*sc,mix(.7,.18,dd)*sc,r)));}
  return clamp(M,0.,1.);}
float hurAlpha(vec3 d){float A=0.;for(int i=0;i<3;i++){float it=uHurInt[i];if(it<=.001)continue;
  vec3 a=normalize(uHurPos[i]);float sc=uHurScale[i];
  vec3 up=abs(a.y)<.93?vec3(0.,1.,0.):vec3(1.,0.,0.);
  vec3 t=normalize(cross(up,a));vec3 b=cross(a,t);
  float r=acos(clamp(dot(d,a),-1.,1.))/sc;
  float th=atan(dot(d,b),dot(d,t))*uHurSign[i];
  float dd=uHurD[i];float dissR=dd*.45;
  float vis=smoothstep(dissR,dissR+.18,r);
  float nz=fbmQ(d*7.0+a*5.0+vec3(uHurRot[i]*.12));
  float nz2=fbmQ(d*13.0-a*3.0);
  float rr=r+(nz2-.5)*.06;
  float sp=sin(th*2.0-log(rr+.03)*5.5+uHurRot[i]+(nz-.5)*3.2);
  float arms=pow(.5+.5*sp,2.2)*(.40+.60*nz);
  float env=1.-smoothstep(.13,.23,rr);
  float shield=smoothstep(.23,.07,rr)*(.30+.45*smoothstep(.45,.72,nz));
  float eye=1.-smoothstep(.013,.025,rr+(nz-.5)*.02);
  A+=it*vis*((arms*env+shield*.55)*eye+arms*env*.12);}
  return clamp(A,0.,1.);}
`,Ze=`
varying vec3 vObj;varying vec3 vWN;varying vec3 vWP;varying vec3 vVN;
void main(){vObj=normalize(position);vec4 wp=modelMatrix*vec4(position,1.);vWP=wp.xyz;
  vWN=normalize(mat3(modelMatrix)*normal);vVN=normalize(normalMatrix*normal);
  gl_Position=projectionMatrix*viewMatrix*wp;}`,Ks=`
vec3 cubeDir(int f,vec2 q){
  vec2 c=q*2.0-1.0;
  if(f==0)return normalize(vec3(1.,c.y,-c.x));
  if(f==1)return normalize(vec3(-1.,c.y,c.x));
  if(f==2)return normalize(vec3(c.x,1.,-c.y));
  if(f==3)return normalize(vec3(c.x,-1.,c.y));
  if(f==4)return normalize(vec3(c.x,c.y,1.));
  return normalize(vec3(-c.x,c.y,-1.));
}`,$s=`
${Ks}
attribute float aFace;
attribute vec2 aUV;
varying vec3 vObj;varying vec3 vWN;varying vec3 vWP;varying vec3 vVN;
void main(){
  vec3 d = cubeDir(int(aFace + 0.5), aUV);
  vObj = d;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWP = wp.xyz;
  vWN = normalize(mat3(modelMatrix) * d);
  vVN = normalize(normalMatrix * d);
  gl_Position = projectionMatrix * viewMatrix * wp;
}`,js=`
uniform float uTime;uniform vec3 uSunDir;uniform vec3 uCam;uniform float uDrift;
uniform float uCloud;uniform float uCloudType;uniform float uCloudBands;uniform float uCloudVortex;
uniform float uCloudRot;uniform float uCloudThick;
uniform float uOpaque;
uniform vec3 uCloudCol;uniform vec3 uCloudCol2;
uniform float uVortexLat;uniform float uVortexLon;uniform float uVortexSize;uniform float uVortexDrift;
varying vec3 vObj;varying vec3 vWN;varying vec3 vWP;varying vec3 vVN;
${Ue}${Vt}
void main(){vec3 d0=normalize(vObj);
  float sm=hurMask(d0);
  vec3 d=hurWarp(d0);d=rotY(d,uDrift);
  vec3 n=normalize(vWN);vec3 sun=normalize(uSunDir);
  float nsd=dot(n,sun);float cday=smoothstep(-.25,.15,nsd);
  float t1=uTime*.006+uCloudRot*uTime;

  float cov=0.;
  float bandShade=1.;
  float bandMix=0.;
  if(uCloudType<0.5){discard;}
  else if(uCloudType<1.5){
    float t0=.70-.32*uCloud;
    float cum=smoothstep(t0,t0+.22,fbmQ(d*9.0+vec3(t1,.3*t1,-t1)+uSeed))*smoothstep(t0-.18,t0+.05,fbmQ(d*22.0-t1+uSeed));
    float field=smoothstep(t0-.06,t0+.16,fbmQ(d*3.1+vec3(-t1*.7,0.,t1*.5)+uSeed));
    cov=max(cum*.95,field*.85);
  }else if(uCloudType<2.5){
    float t0=.60-.25*uCloud;
    cov=smoothstep(t0,t0+.25,fbmQ(d*6.0+vec3(t1*.5,t1*.3,-t1*.4)+uSeed));
    cov*=.6+.4*fbmQ(d*15.+vec3(t1)+uSeed);
  }else if(uCloudType<3.5){
    float lat=asin(clamp(d.y,-1.,1.));
    float warp=(fbm(d*5.+uSeed)-.5)*.6+(fbm(d*13.+uSeed)-.5)*.25;
    float latW=lat+warp*.35;
    float bandSpeed=1.0+sin(lat*3.0)*0.4;
    float shiftedLon=atan(d.z,d.x)+t1*bandSpeed;
    vec3 dBand=vec3(cos(shiftedLon)*cos(lat),sin(latW),sin(shiftedLon)*cos(lat));
    float stripes=sin(latW*uCloudBands*3.14159+fbm(dBand*4.+uSeed)*3.5)*.5+.5;
    stripes=smoothstep(.15,.85,stripes);
    float turb=.6+.4*fbmQ(dBand*9.+vec3(t1*.3)+uSeed);
    float mass=smoothstep(.35,.75,fbmQ(dBand*6.+vec3(t1*.2)+uSeed));
    cov=(mass*.55+stripes*.38*turb)*uCloud;
    cov=min(cov,.8);
    bandShade=mix(.82,1.05,stripes);
    bandMix=stripes;
    if(uCloudVortex>.1){
      float vLon=uVortexLon+uTime*uVortexDrift;
      vec3 vp=normalize(vec3(cos(uVortexLat)*cos(vLon),sin(uVortexLat),cos(uVortexLat)*sin(vLon)));
      float vr=acos(clamp(dot(d,vp),-1.,1.));
      float vortex=smoothstep(uVortexSize,0.,vr)*uCloudVortex;
      float angle=atan(d.z-vp.z,d.x-vp.x)+uTime*.5;
      vortex*=.5+.5*sin(angle*3.+vr*10.);
      cov=max(cov,min(vortex,.9));
    }
  }else{
    float vLon=uVortexLon+uTime*uVortexDrift;
    vec3 vp=normalize(vec3(cos(uVortexLat)*cos(vLon),sin(uVortexLat),cos(uVortexLat)*sin(vLon)));
    float vr=acos(clamp(dot(d,vp),-1.,1.));
    float up=abs(vp.y)<.93?1.:0.;
    vec3 t=normalize(cross(vec3(up,1.-up,0.),vp));
    vec3 b=cross(vp,t);
    float angle=atan(dot(d,b),dot(d,t))+uTime*.8;
    float spiral=sin(angle*4.-log(vr+.01)*8.)*.5+.5;
    cov=smoothstep(uVortexSize*1.5,0.,vr)*spiral*uCloudVortex*uCloud;
    cov+=smoothstep(uVortexSize*2.,uVortexSize*.5,vr)*.3*uCloud;
  }

  cov*=uCloudThick;
  cov*=1.-.5*sm;

  float dl=clamp(nsd*.9+.06,0.,1.);
  float nightF=smoothstep(-.45,.05,nsd);
  vec3 cloudTint=mix(uCloudCol,uCloudCol2,bandMix);
  vec3 colT=mix(vec3(.02,.025,.05),cloudTint*1.06,dl);
  colT*=.85+.3*smoothstep(.4,.8,fbmQ(d*9.0+vec3(t1)+uSeed));
  colT*=bandShade;
  colT*=.08+.92*nightF;
  float bandCol=.75+.5*fbmQ(d*6.0+vec3(t1*.2)+uSeed);
  vec3 colO=cloudTint*bandCol*bandShade;
  colO*=.10+.90*dl;
  colO*=.10+.90*nightF;
  colO*=.85+.3*smoothstep(.4,.8,fbmQ(d*9.0+vec3(t1)+uSeed));
  colO=mix(colO,cloudTint*1.25,cov*.4);
  vec3 col=mix(colT,colO,uOpaque);
  float a=mix(cov*.95,1.0,uOpaque);
  if(a<.02)discard;
  vec3 V=normalize(uCam-vWP);
  col+=cloudTint*vec3(1.,.9,.75)*pow(clamp(dot(V,-sun),0.,1.),4.)*cday*mix(cov,1.,uOpaque)*.45;
  gl_FragColor=vec4(tonemap(col),a);}`,Ys=`
uniform float uTime;uniform vec3 uSunDir;uniform vec3 uCloudCol;
varying vec3 vObj;varying vec3 vWN;varying vec3 vWP;varying vec3 vVN;
${Ue}${Vt}
void main(){vec3 d=normalize(vObj);float a=hurAlpha(d);
  float nsd=dot(normalize(vWN),normalize(uSunDir));
  vec3 col=mix(vec3(.03,.035,.06),uCloudCol*1.1,clamp(nsd*.9+.06,0.,1.));
  col*=.12+.88*smoothstep(-.35,.1,nsd);
  if(a<.02)discard;gl_FragColor=vec4(tonemap(col),a*.95);}`,Xs=`
uniform float uTime;uniform vec3 uSunDir;uniform vec3 uCam;
uniform float uAtmoInt;uniform vec3 uAtmoCol;
varying vec3 vObj;varying vec3 vWN;varying vec3 vWP;varying vec3 vVN;
${Ue}
void main(){vec3 n=normalize(vWN);vec3 v=normalize(uCam-vWP);
  float limb=1.-clamp(dot(n,v),0.,1.);
  vec3 dw=normalize(vWP);vec3 sun=normalize(uSunDir);
  float nd=dot(dw,sun);
  float day=smoothstep(-.2,.4,nd);
  float haze=.8+.2*fbmQ(normalize(vObj)*5.+vec3(uTime*.003)+uSeed);
  vec3 col=uAtmoCol*(pow(limb,6.0)*.16+pow(limb,14.0)*.28)*day*haze*uAtmoInt;
  float rayleigh=pow(1.0-abs(dot(n,sun)),4.0)*day;
  col+=vec3(.35,.45,.60)*rayleigh*.07*uAtmoInt;
  float sunset=pow(1.0-abs(nd),10.0)*smoothstep(-.1,.1,nd);
  col+=vec3(1.,.35,.15)*sunset*uAtmoInt*.25;
  gl_FragColor=vec4(col,1.);}`;function Zs(h){let e=h>>>0;return()=>{e|=0,e=e+1831565813|0;let t=Math.imul(e^e>>>15,1|e);return t=t+Math.imul(t^t>>>7,61|t)^t,((t^t>>>14)>>>0)/4294967296}}const Lt={none:0,patchy:1,global:2,bands:3,vortex:4};class Nt{constructor(e,t){r(this,"group",new F);r(this,"lowMat");r(this,"hurMat");r(this,"atmoMat");r(this,"disposables",[]);r(this,"lowMesh");r(this,"hurMesh");r(this,"atmoMesh");r(this,"lowSpin",0);r(this,"hurSpin",0);r(this,"baseAtmoInt",0);const s=Zs(t.meta.seed),a=new k(t.palette.cloud),i=new ne(e*1.035,48,32);this.lowMat=new _({uniforms:{uTime:{value:0},uSeed:{value:new f(s()*200-100,s()*200-100,s()*200-100)},uSunDir:{value:new f(1,.3,.5).normalize()},uCam:{value:new f},uDepth:{value:.15},uPost:{value:1},uQ:{value:2},uDrift:{value:0},uCloud:{value:t.clouds.density},uCloudType:{value:Lt[t.clouds.type]??1},uCloudBands:{value:t.clouds.bands},uCloudVortex:{value:t.clouds.vortexIntensity},uCloudRot:{value:t.clouds.rotation},uCloudThick:{value:t.clouds.thickness},uOpaque:{value:0},uCloudCol:{value:a},uCloudCol2:{value:a.clone().multiplyScalar(.85)},uVortexLat:{value:t.clouds.vortexLat},uVortexLon:{value:t.clouds.vortexLon},uVortexSize:{value:t.clouds.vortexSize},uVortexDrift:{value:t.clouds.driftSpeed},uHurPos:{value:[new f(0,1,0),new f(0,1,0),new f(0,1,0)]},uHurInt:{value:[0,0,0]},uHurSign:{value:[1,1,1]},uHurRot:{value:[0,0,0]},uHurD:{value:[0,0,0]},uHurScale:{value:[1,1,1]}},vertexShader:Ze,fragmentShader:js,transparent:!0,depthWrite:!1,depthTest:!1}),this.lowMesh=new U(i,this.lowMat),this.lowMesh.renderOrder=3,this.group.add(this.lowMesh);const o=new ne(e*1.055,48,32);this.hurMat=new _({uniforms:{uTime:{value:0},uSeed:{value:new f(s()*200-100,s()*200-100,s()*200-100)},uSunDir:{value:new f(1,.3,.5).normalize()},uDepth:{value:.15},uPost:{value:1},uQ:{value:2},uCloudCol:{value:a},uHurPos:{value:[new f(0,1,0),new f(0,1,0),new f(0,1,0)]},uHurInt:{value:[0,0,0]},uHurSign:{value:[1,1,1]},uHurRot:{value:[0,0,0]},uHurD:{value:[0,0,0]},uHurScale:{value:[1,1,1]}},vertexShader:Ze,fragmentShader:Ys,transparent:!0,depthWrite:!1,depthTest:!1}),this.hurMesh=new U(o,this.hurMat),this.hurMesh.renderOrder=4,this.group.add(this.hurMesh);const n=new ne(e*1.02,48,32);this.atmoMat=new _({uniforms:{uTime:{value:0},uSeed:{value:new f(s()*200-100,s()*200-100,s()*200-100)},uSunDir:{value:new f(1,.3,.5).normalize()},uCam:{value:new f},uDepth:{value:.15},uPost:{value:1},uQ:{value:2},uAtmoInt:{value:0},uAtmoCol:{value:a.clone()}},vertexShader:Ze,fragmentShader:Xs,transparent:!0,depthWrite:!1,depthTest:!1,blending:G}),this.atmoMesh=new U(n,this.atmoMat),this.atmoMesh.renderOrder=2,this.group.add(this.atmoMesh),this.disposables.push(i,Je(this.lowMat),o,Je(this.hurMat),n,Je(this.atmoMat))}getObject(){return this.group}setSunDirection(e){this.lowMat.uniforms.uSunDir.value.copy(e).normalize(),this.hurMat.uniforms.uSunDir.value.copy(e).normalize(),this.atmoMat.uniforms.uSunDir.value.copy(e).normalize()}setCloudParams(e,t){this.lowMat.uniforms.uCloud.value=e.density,this.lowMat.uniforms.uCloudType.value=Lt[e.type]??1,this.lowMat.uniforms.uCloudBands.value=e.bands,this.lowMat.uniforms.uCloudVortex.value=e.vortexIntensity,this.lowMat.uniforms.uCloudRot.value=e.rotation,this.lowMat.uniforms.uCloudThick.value=e.thickness,this.lowMat.uniforms.uVortexLat.value=e.vortexLat,this.lowMat.uniforms.uVortexLon.value=e.vortexLon,this.lowMat.uniforms.uVortexSize.value=e.vortexSize,this.lowMat.uniforms.uVortexDrift.value=e.driftSpeed;const s=t.type!=="none"&&t.intensity>.01,a=this.hurMat.uniforms.uHurInt.value;this.hurMat.uniforms.uHurPos.value[0].set(Math.cos(t.lat)*Math.cos(t.lon),Math.sin(t.lat),Math.cos(t.lat)*Math.sin(t.lon)),a[0]=s?t.intensity:0,a[1]=0,a[2]=0}setAtmosphereIntensity(e){this.baseAtmoInt=Math.max(0,Math.min(1,e)),this.atmoMat.uniforms.uAtmoInt.value=this.baseAtmoInt}setAtmosphereOpacity(e){this.atmoMat.uniforms.uAtmoInt.value=this.baseAtmoInt*Math.max(0,Math.min(1,e))}setCloudOpacity(e){const t=Math.max(0,Math.min(1,e));this.lowMat.uniforms.uCloudThick.value*=t}update(e){this.lowSpin+=e*.012,this.hurSpin-=e*.02,this.lowMat.uniforms.uDrift.value=-this.lowSpin,this.hurMat.uniforms.uTime.value+=e,this.lowMat.uniforms.uTime.value+=e,this.atmoMat.uniforms.uTime.value+=e}dispose(){for(const e of this.disposables)e.dispose();for(;this.group.children.length>0;)this.group.remove(this.group.children[0])}}function Je(h){return{dispose:()=>{h.dispose()}}}const Js=Object.freeze({generatorVersion:"5.1.0"}),ea=["none","patchy","global","bands","vortex"],ta=["rocky","lava","ice","sand","metal","bio","cratered","ridged","cracked","maria"],sa=["none","giant_crater","rift_zone","hotspot","dark_basin"];function aa(h){const e=/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(h);return e?[parseInt(e[1]??"0",16)/255,parseInt(e[2]??"0",16)/255,parseInt(e[3]??"0",16)/255]:[.5,.5,.5]}function ia(h,e,t){const s=Math.max(h,e,t),a=Math.min(h,e,t);let i=0,o=0,n=(s+a)/2;if(s!==a){const l=s-a;o=n>.5?l/(2-s-a):l/(s+a),s===h?i=((e-t)/l+(e<t?6:0))/6:s===e?i=((t-h)/l+2)/6:i=((h-e)/l+4)/6}return[i,o,n]}function oa(h,e,t){h=(h%1+1)%1;const s=(o,n,l)=>(l=(l%1+1)%1,l<1/6?o+(n-o)*6*l:l<1/2?n:l<2/3?o+(n-o)*(2/3-l)*6:o);if(e===0)return[t,t,t];const a=t<.5?t*(1+e):t+e-t*e,i=2*t-a;return[s(i,a,h+1/3),s(i,a,h),s(i,a,h-1/3)]}function na(h,e,t){const s=a=>Math.round(Math.max(0,Math.min(1,a))*255).toString(16).padStart(2,"0");return`#${s(h)}${s(e)}${s(t)}`}function Re(h,e,t=.12,s=.25,a=.2){const[i,o,n]=aa(h);let[l,c,u]=ia(i,o,n);l+=(e()*2-1)*t,c=Math.min(1,Math.max(0,c+(e()*2-1)*s)),u=Math.min(.95,Math.max(.05,u+(e()*2-1)*a));const[d,p,m]=oa(l,c,u);return na(d,p,m)}const ra=Object.freeze({massEarth:[.01,10],radiusEarth:[.1,3],density:[2,8],temperatureK:[50,3e3],atmospherePressureAtm:[0,5],magneticField:[0,1],volcanism:[0,1],tectonics:[0,1],ocean:[0,1],ice:[0,1],lava:[0,1],storm:[0,1],cities:[0,0],clouds:[0,1],crust:[0,1],hurricane:[0,1],scale:[.3,2.5],fire:[0,1],dust:[0,1],toxicity:[0,1],craters:[0,1],cloudType:[0,4],cloudBands:[0,20],cloudVortexIntensity:[0,1],cloudRotation:[0,.1],cloudThickness:[0,1],ringsEnabled:[0,1],ringsInner:[1.3,1.8],ringsOuter:[2,3.5],ringsDensity:[0,1],ringsOpacity:[0,1],ringsTilt:[0,30],ringsParticleSize:[.01,.1],surfaceType:[0,9],surfaceRoughness:[0,1],surfaceGloss:[0,1],surfaceDetail:[0,1],anomalyType:[0,4],habitability:[0,100],resources_energy:[0,10],resources_food:[0,10],resources_minerals:[0,10],resources_alloys:[0,10]}),la=Object.freeze({crust:"#7a5c40",cloud:"#e8f4ff",storm:"#ffd166",ring:"#c8b8a0"});function B(h,e,t,s,a={},i={}){return{id:h,name:e,category:t,composition:s,ranges:Object.assign({},ra,a),colors:Object.assign({},la,i)}}const ca=Object.freeze([B("earth_like","Землеподобная","Каменистые","N2/O2, силикатная кора",{massEarth:[.7,1.5],radiusEarth:[.85,1.2],temperatureK:[220,320],atmospherePressureAtm:[.6,1.3],ocean:[.35,.85],lava:[0,.1],clouds:[.3,.8],cloudType:[1,2],surfaceType:[0,0],scale:[.8,1.3]},{crust:"#4f7f52",cloud:"#eaf6ff",ring:"#a89878"}),B("continental","Континентальный","Обитаемые (Stellaris)","Континенты и океаны",{temperatureK:[250,300],atmospherePressureAtm:[.8,1.2],ocean:[.4,.7],clouds:[.4,.7],cities:[.2,.5],habitability:[60,80],resources_energy:[2,4],resources_food:[4,6],resources_minerals:[2,4],resources_alloys:[1,3]},{crust:"#4f7f52",cloud:"#eaf6ff",atmo:"#3485c8"}),B("tropical","Тропический","Обитаемые (Stellaris)","Влажные тропики",{temperatureK:[280,320],atmospherePressureAtm:[.9,1.3],ocean:[.5,.7],clouds:[.5,.8],cities:[.2,.4],habitability:[70,90],resources_energy:[3,5],resources_food:[6,8],resources_minerals:[2,4],resources_alloys:[1,3]},{crust:"#3a8f4a",cloud:"#e8f8ff",atmo:"#5aa0c8"}),B("ocean","Океанический","Обитаемые (Stellaris)","Глобальный океан",{temperatureK:[260,310],atmospherePressureAtm:[.9,1.3],ocean:[.85,.98],clouds:[.5,.8],cities:[.1,.3],habitability:[65,85],resources_energy:[3,5],resources_food:[6,9],resources_minerals:[1,3],resources_alloys:[1,3]},{crust:"#2f65b8",cloud:"#f0fbff",atmo:"#4a8fc8"}),B("swamp","Болотный","Обитаемые (Stellaris)","Влажные болота",{temperatureK:[270,310],atmospherePressureAtm:[.8,1.2],ocean:[.4,.6],clouds:[.4,.7],cities:[.1,.3],habitability:[50,70],resources_energy:[2,4],resources_food:[5,7],resources_minerals:[2,4],resources_alloys:[1,3]},{crust:"#5a7a5a",cloud:"#a8c8a8",atmo:"#6a8a6a"}),B("savanna","Саванна","Обитаемые (Stellaris)","Засушливые равнины",{temperatureK:[270,320],atmospherePressureAtm:[.6,1],ocean:[.2,.4],clouds:[.2,.4],cities:[.1,.3],habitability:[55,75],resources_energy:[4,6],resources_food:[3,5],resources_minerals:[3,5],resources_alloys:[1,3]},{crust:"#b89050",cloud:"#f0e0c0",atmo:"#d8b070"}),B("gaia_world","Мир Гайи","Обитаемые (Stellaris)","Идеальный мир",{temperatureK:[270,290],atmospherePressureAtm:[.9,1.1],ocean:[.5,.7],clouds:[.4,.6],cities:[.3,.5],habitability:[100,100],resources_energy:[6,6],resources_food:[6,6],resources_minerals:[4,4],resources_alloys:[2,2]},{crust:"#4a8f5c",cloud:"#eaf6ff",atmo:"#3a85c8"}),B("arid","Аридный","Обитаемые (Stellaris)","Засушливый мир",{temperatureK:[280,330],atmospherePressureAtm:[.5,.9],ocean:[.1,.3],clouds:[.1,.3],cities:[.1,.3],habitability:[50,70],resources_energy:[4,6],resources_food:[1,3],resources_minerals:[3,5],resources_alloys:[1,3]},{crust:"#c77f45",cloud:"#f4e0c0",atmo:"#d4a060"}),B("desert","Пустынный","Обитаемые (Stellaris)","Экстремальная пустыня",{temperatureK:[300,380],atmospherePressureAtm:[.3,.7],ocean:[0,.15],clouds:[0,.2],cities:[.05,.2],habitability:[40,60],resources_energy:[5,7],resources_food:[0,2],resources_minerals:[4,6],resources_alloys:[1,3]},{crust:"#d89050",cloud:"#f8e8d0",atmo:"#e8b070"}),B("arctic","Арктический","Каменистые","Ледяной мир",{temperatureK:[180,230],atmospherePressureAtm:[.6,1],ocean:[.3,.6],ice:[.6,.9],clouds:[.3,.6],cities:[.1,.3],habitability:[30,50],resources_energy:[1,3],resources_food:[2,4],resources_minerals:[5,7],resources_alloys:[1,3]},{crust:"#aaccee",cloud:"#ddeeff",atmo:"#88aacc"}),B("tundra","Тундра","Каменистые","Вечная мерзлота",{temperatureK:[210,260],atmospherePressureAtm:[.6,1],ocean:[.3,.5],ice:[.4,.7],clouds:[.3,.5],cities:[.1,.3],habitability:[40,60],resources_energy:[2,4],resources_food:[3,5],resources_minerals:[4,6],resources_alloys:[1,3]},{crust:"#8aaa8a",cloud:"#c8d8c8",atmo:"#7a9a7a"}),B("snowball","Снежный мир","Водные","Сплошная ледяная оболочка",{temperatureK:[70,220],ice:[.7,1],clouds:[.2,.7],cloudType:[1,2],surfaceType:[2,9],scale:[.6,1.4]},{crust:"#f2fbff",cloud:"#ffffff"}),B("frozen_wasteland","Замёрзшая пустошь","Безжизненные","Холодная пустыня",{temperatureK:[50,150],atmospherePressureAtm:[.01,.3],ice:[.5,1],clouds:[0,.3],cloudType:[0,2],surfaceType:[2,9],scale:[.5,1.4]},{crust:"#aaccee",cloud:"#ddeeff"}),B("icy_moon","Ледяной спутник","Спутники","Замёрзший спутник",{massEarth:[.01,.15],temperatureK:[50,150],ocean:[.1,.5],ice:[.7,1],clouds:[0,.05],cloudType:[0,1],surfaceType:[2,9],scale:[.25,.55]},{crust:"#ddeeff"}),B("lava_planet","Лавовая планета","Экзотические","Расплавленная поверхность",{temperatureK:[900,2200],volcanism:[.7,1],lava:[.7,1],fire:[.6,1],storm:[.2,.7],clouds:[.2,.6],cloudType:[1,2],surfaceType:[1,1],scale:[.6,2],anomalyType:[2,3]},{crust:"#241108",cloud:"#ffcf9f"}),B("fire_planet","Огненная планета","Экзотические","Горящая поверхность",{temperatureK:[800,2500],volcanism:[.5,1],lava:[.6,1],fire:[.8,1],storm:[.3,.8],clouds:[.1,.5],cloudType:[1,4],surfaceType:[1,1],scale:[.7,2]},{crust:"#4d1a00",cloud:"#ffaa33",storm:"#ffff00"}),B("volcanic","Вулканический","Экзотические","Активная вулканическая деятельность",{temperatureK:[800,1500],volcanism:[.7,1],lava:[.7,1],atmospherePressureAtm:[2,5],clouds:[.2,.5],habitability:[5,15],resources_minerals:[7,9],resources_alloys:[3,5]},{crust:"#2a1a0a",cloud:"#ff7a3a",atmo:"#ff6622"}),B("volcanic_moon","Вулканический спутник","Спутники","Как Ио",{massEarth:[.01,.12],temperatureK:[200,800],volcanism:[.6,1],lava:[.5,1],clouds:[0,.15],cloudType:[0,1],surfaceType:[1,1],scale:[.25,.5],anomalyType:[2,3]},{crust:"#553311",cloud:"#ffaa44"}),B("gas_giant","Газовый гигант","Газовые","H/He",{massEarth:[30,400],radiusEarth:[4,12],density:[.4,1.8],storm:[.4,.9],clouds:[.6,1],cloudType:[3,3],cloudBands:[8,20],cloudVortexIntensity:[.3,.8],surfaceType:[0,0],hurricane:[.2,.85],scale:[2,3],ringsEnabled:[.3,.7]},{crust:"#b4763d",cloud:"#f3e2c2",ring:"#d8c498"}),B("hot_jupiter","Горячий юпитер","Газовые","Раскалённый гигант",{massEarth:[50,500],radiusEarth:[8,15],temperatureK:[900,2500],lava:[.2,.7],storm:[.7,1],clouds:[.5,1],cloudType:[3,4],cloudBands:[5,15],cloudVortexIntensity:[.5,1],hurricane:[.5,1],scale:[2.2,3.5]},{crust:"#4d1600",cloud:"#ffd8a8"}),B("cold_jupiter","Холодный юпитер","Газовые","Облака аммиака",{massEarth:[50,400],temperatureK:[70,160],ice:[.2,.6],storm:[.3,.8],clouds:[.6,1],cloudType:[3,3],cloudBands:[10,25],hurricane:[.15,.7],scale:[1.8,2.8],ringsEnabled:[.2,.5]},{crust:"#6381a8",cloud:"#e8f4ff",ring:"#c8d8e8"}),B("ice_giant","Ледяной гигант","Газовые","Вода, метан, аммиак",{massEarth:[8,60],radiusEarth:[2.5,5],ice:[.5,.9],storm:[.5,.9],clouds:[.5,.9],cloudType:[3,3],cloudBands:[6,18],hurricane:[.3,.85],scale:[1.5,2.2],ringsEnabled:[.4,.8]},{crust:"#2b6f8a",cloud:"#d8fbff",ring:"#a8d8e0"}),B("saturn_like","Сатурноподобная","Газовые","Гигант с кольцами",{massEarth:[50,300],radiusEarth:[5,12],storm:[.3,.7],clouds:[.6,1],cloudType:[3,3],cloudBands:[12,30],hurricane:[.2,.6],scale:[2,3],ringsEnabled:[1,1],ringsInner:[1.3,1.8],ringsOuter:[2.5,4.5],ringsDensity:[.6,1],ringsOpacity:[.7,1]},{crust:"#c8a878",cloud:"#f8e8c8",ring:"#e8d8b8"}),B("moon","Луна","Спутники","Спутник без атмосферы",{massEarth:[.01,.1],radiusEarth:[.2,.5],atmospherePressureAtm:[0,.001],ocean:[0,0],clouds:[0,0],cloudType:[0,0],craters:[.8,1],surfaceType:[6,6],scale:[.2,.5],anomalyType:[0,2]},{crust:"#aaaaaa"}),B("barren_rock","Голая скала","Безжизненные","Каменная пустыня",{massEarth:[.1,3],atmospherePressureAtm:[0,.05],ocean:[0,0],clouds:[0,.05],cloudType:[0,1],craters:[.3,.8],surfaceType:[6,9],scale:[.4,1.3]},{crust:"#554433"}),B("mercury_like","Меркуриеподобная","Безжизненные","Безатмосферная",{massEarth:[.05,.5],radiusEarth:[.3,.7],temperatureK:[100,700],atmospherePressureAtm:[0,.01],ocean:[0,0],clouds:[0,0],cloudType:[0,0],craters:[.7,1],surfaceType:[6,6],scale:[.4,.8],anomalyType:[0,2]},{crust:"#554433"}),B("titan_like","Титаноподобный","Спутники","Плотная атмосфера, углеводороды",{massEarth:[.01,.15],atmospherePressureAtm:[1,2],ocean:[.2,.5],clouds:[.5,.9],cloudType:[2,3],surfaceType:[3,3],scale:[.3,.6]},{crust:"#aa8855",cloud:"#eecc88"})]);function ha(h){let e=h>>>0;return()=>{e|=0,e=e+1831565813|0;let t=Math.imul(e^e>>>15,1|e);return t=t+Math.imul(t^t>>>7,61|t)^t,((t^t>>>14)>>>0)/4294967296}}function P(h,e){return Array.isArray(e)&&e.length===2?e[0]+h()*(e[1]-e[0]):0}function we(h,e){return Math.floor(P(h,e))}function Le(h,e,t){return h.colors[e]??t}const I=h=>Math.min(1,Math.max(0,h));class ua{constructor(e=ca){r(this,"typesById",new Map);for(const t of e)this.typesById.set(t.id,t)}findType(e){return this.typesById.get(e)}getTypeOrFallback(e){return this.typesById.get(e)??this.typesById.get("earth_like")}generate(e,t){const s=t>>>0,a=ha(s),i=this.getTypeOrFallback(e),o={massEarth:P(a,i.ranges.massEarth),radiusEarth:P(a,i.ranges.radiusEarth),density:P(a,i.ranges.density),temperatureK:P(a,i.ranges.temperatureK),atmospherePressureAtm:P(a,i.ranges.atmospherePressureAtm),magneticField:I(P(a,i.ranges.magneticField)),volcanism:I(P(a,i.ranges.volcanism)),tectonics:I(P(a,i.ranges.tectonics)),ocean:I(P(a,i.ranges.ocean)),ice:I(P(a,i.ranges.ice)),lava:I(P(a,i.ranges.lava)),storm:I(P(a,i.ranges.storm)),cities:I(P(a,i.ranges.cities)),fire:I(P(a,i.ranges.fire??[0,0])),dust:I(P(a,i.ranges.dust??[0,0])),toxicity:I(P(a,i.ranges.toxicity??[0,0])),craters:I(P(a,i.ranges.craters??[0,0])),scale:P(a,i.ranges.scale??[.5,1.5]),seedOffset:[a()*200-100,a()*200-100,a()*200-100],habitability:P(a,i.ranges.habitability??[0,100]),gravityEarth:0,resources:{energy:P(a,i.ranges.resources_energy??[0,10]),food:P(a,i.ranges.resources_food??[0,10]),minerals:P(a,i.ranges.resources_minerals??[0,10]),alloys:P(a,i.ranges.resources_alloys??[0,10])}};o.gravityEarth=o.radiusEarth>0?o.massEarth/(o.radiusEarth*o.radiusEarth):0;const n=we(a,i.ranges.cloudType??[0,4]),l={type:ea[n]??"none",density:I(P(a,i.ranges.clouds)),bands:we(a,i.ranges.cloudBands??[0,20]),vortexIntensity:I(P(a,i.ranges.cloudVortexIntensity??[0,0])),rotation:P(a,i.ranges.cloudRotation??[0,.05]),thickness:I(P(a,i.ranges.cloudThickness??[.3,.8])),hurricane:I(P(a,i.ranges.hurricane)),vortexLat:(a()*2-1)*.6,vortexLon:a()*Math.PI*2,vortexSize:.15+a()*.25,driftSpeed:.02+a()*.08},u={enabled:P(a,i.ranges.ringsEnabled??[0,0])>.5,innerRadius:P(a,i.ranges.ringsInner??[1.3,1.8]),outerRadius:P(a,i.ranges.ringsOuter??[2,3.5]),density:I(P(a,i.ranges.ringsDensity??[0,0])),opacity:I(P(a,i.ranges.ringsOpacity??[0,0])),tilt:P(a,i.ranges.ringsTilt??[0,15]),particleSize:P(a,i.ranges.ringsParticleSize??[.02,.05]),gapCount:we(a,[0,3]),gapPositions:[a(),a(),a()],colorVariation:a()*.4-.2},d=we(a,i.ranges.surfaceType??[0,9]),p={type:ta[d]??"rocky",roughness:I(P(a,i.ranges.surfaceRoughness??[.3,.8])),gloss:I(P(a,i.ranges.surfaceGloss??[.1,.4])),detail:I(P(a,i.ranges.surfaceDetail??[.5,1])),ridgeAmount:I(P(a,[0,1])),crackDensity:I(P(a,[0,1])),craterScale:.5+a()*1.5},m=we(a,i.ranges.anomalyType??[0,4]),v={type:sa[m]??"none",lat:(a()*2-1)*.8,lon:a()*Math.PI*2,size:.1+a()*.3,intensity:.5+a()*.5};I(P(a,i.ranges.crust));const x=(a()*2-1)*.15;return{meta:{generatorVersion:Js.generatorVersion,seed:s,typeId:i.id,typeName:i.name,category:i.category,composition:i.composition},physics:o,clouds:l,rings:u,surface:p,anomaly:v,palette:{crust:Re(Le(i,"crust","#7a5c40"),a,.15,.35,.25),cloud:Re(Le(i,"cloud","#e8f4ff"),a,.1,.2,.15),storm:Re(Le(i,"storm","#ffd166"),a,.15,.3,.2),ring:Re(Le(i,"ring","#c8b8a0"),a,.1,.2,.2)},hueShift:x}}}const pt=new ua;class da{constructor(e,t=7,s=3.2,a=pa){r(this,"group",new F);r(this,"layers",[]);r(this,"disposables",[]);r(this,"active",!1);const i=this.makePuffTexture(e);this.disposables.push(i);for(let o=0;o<t;o++){const n=new Me({map:i,transparent:!0,depthWrite:!1,opacity:0,side:Ne}),l=new We(a*(1.6+e()*1.4),a*(.8+e()*.9));this.disposables.push(n,l);const c=new U(l,n);c.position.set((e()-.5)*a*1.4,(e()-.5)*a*.5,(o/Math.max(1,t-1)-.5)*s),c.rotation.z=e()*Math.PI*2,c.renderOrder=5+o,this.layers.push({mesh:c,mat:n}),this.group.add(c)}this.group.visible=!1}getObject(){return this.group}deploy(e,t){this.group.position.copy(e);const s=t.clone().normalize();this.group.quaternion.setFromUnitVectors(new f(0,0,1),s),this.group.visible=!0,this.active=!0}updateProgress(e,t){if(this.active)for(let s=0;s<this.layers.length;s++){const a=this.layers[s],i=this.layerWorldDepth(a.mesh.position.z,t),o=Math.exp(-Math.pow((t-i)*6,2));a.mat.opacity=o*.55}}retract(){this.active=!1,this.group.visible=!1;for(const e of this.layers)e.mat.opacity=0}isActive(){return this.active}layerWorldDepth(e,t){return w.clamp(e/3.2+.5,0,1)}makePuffTexture(e){const s=document.createElement("canvas");s.width=256,s.height=256;const a=s.getContext("2d");if(!a)return new N(s);a.clearRect(0,0,256,256);const i=26;for(let o=0;o<i;o++){const n=128+(e()-.5)*256*.55,l=256/2+(e()-.5)*256*.35,c=256*(.06+e()*.14),u=a.createRadialGradient(n,l,0,n,l,c),d=.1+e()*.16;u.addColorStop(0,`rgba(255,255,255,${d.toFixed(2)})`),u.addColorStop(1,"rgba(255,255,255,0)"),a.fillStyle=u,a.fillRect(n-c,l-c,c*2,c*2)}return new N(s)}dispose(){this.retract();for(const e of this.disposables)e.dispose();for(;this.group.children.length>0;)this.group.remove(this.group.children[0])}}const pa=12;class ma{constructor(e=1200,t=40){r(this,"points");r(this,"positions");r(this,"material");r(this,"count");r(this,"halfExtent");r(this,"fallSpeed");r(this,"kind","none");this.count=e,this.halfExtent=t,this.fallSpeed=22,this.positions=new Float32Array(e*3);for(let n=0;n<e;n++)this.resetParticle(n,new Float32Array(3));const s=new se;s.setAttribute("position",new V(this.positions,3));const a=document.createElement("canvas");a.width=16,a.height=16;const i=a.getContext("2d");let o=null;if(i){const n=i.createRadialGradient(8,8,0,8,8,8);n.addColorStop(0,"rgba(255,255,255,1)"),n.addColorStop(1,"rgba(255,255,255,0)"),i.fillStyle=n,i.fillRect(0,0,16,16),o=new N(a)}this.material=new Wt({size:.12,map:o,transparent:!0,opacity:0,depthWrite:!1,blending:Ht,color:13624575}),this.points=new He(s,this.material),this.points.frustumCulled=!1,this.points.visible=!1}getObject(){return this.points}setWeather(e){this.kind=e,this.points.visible=e!=="none",e==="snow"?(this.material.size=.2,this.material.color.setHex(16777215)):e==="rain"&&(this.material.size=.1,this.material.color.setHex(11193582))}getWeather(){return this.kind}update(e,t){if(this.kind==="none")return;const s=this.halfExtent,a=this.positions,i=this.kind==="rain"?this.fallSpeed:this.fallSpeed*.25;for(let o=0;o<this.count;o++){const n=o*3;a[n+1]=a[n+1]-i*e,a[n]=a[n]+Math.sin(a[n+1]*.5)*e*(this.kind==="snow"?1.5:.3);for(let l=0;l<3;l++){const c=t.getComponent(l);let u=a[n+l]-c;u-=Math.floor(u/(2*s))*(2*s),u>s&&(u-=2*s),a[n+l]=c+u}}this.points.geometry.getAttribute("position").needsUpdate=!0,this.material.opacity=this.kind==="rain"?.45:.7}resetParticle(e,t){const s=this.halfExtent;this.positions[e*3]=t[0]+(Math.random()-.5)*2*s,this.positions[e*3+1]=t[1]+Math.random()*2*s,this.positions[e*3+2]=t[2]+(Math.random()-.5)*2*s}dispose(){var e;this.points.geometry.dispose(),(e=this.material.map)==null||e.dispose(),this.material.dispose()}}const xe=10,Ut=`
float hash1(vec3 p){p=fract(p*vec3(.1031,.1030,.0973));p+=dot(p,p.yxz+33.33);return fract((p.x+p.y)*(p.x+p.z)*(p.y+p.z));}
float vnoise(vec3 p){vec3 i=floor(p),f=fract(p);vec3 u=f*f*(3.0-2.0*f);return mix(mix(mix(hash1(i),hash1(i+vec3(1,0,0)),u.x),mix(hash1(i+vec3(0,1,0)),hash1(i+vec3(1,1,0)),u.x),u.y),mix(mix(hash1(i+vec3(0,0,1)),hash1(i+vec3(1,0,1)),u.x),mix(hash1(i+vec3(0,1,1)),hash1(i+vec3(1,1,1)),u.x),u.y),u.z);}
float fbmN(vec3 p,float oct){float a=.5,s=0.;for(int k=0;k<7;k++){if(float(k)>=oct)break;s+=a*vnoise(p);p=p*2.03+vec3(1.7);a*=.5;}return s;}
`,fa=`
uniform vec3 uSeed;
uniform float uAmp;
varying vec3 vDir;
${Ut}
void main(){
  vec3 n = normalize(position);
  vDir = n;
  float h = fbmN(n*3.0 + uSeed, 5.0);
  vec3 p = position + n * (h - 0.5) * uAmp;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}`,ga=`
uniform vec3 uSeed;
uniform float uSea;
uniform float uLava;
uniform float uIce;
uniform vec3 uColA;
uniform vec3 uColB;
uniform vec3 uColC;
uniform vec3 uSunDir;
uniform float uCityLights;
varying vec3 vDir;
${Ut}
void main(){
  float h = fbmN(vDir*3.0 + uSeed, 5.0);
  float land = smoothstep(uSea, uSea+0.05, h);
  vec3 col = mix(uColA, uColB, land);
  col = mix(col, uColC, smoothstep(0.6, 0.8, h));
  float ice = smoothstep(0.7, 0.9, abs(vDir.y)) * uIce;
  col = mix(col, vec3(0.95), ice);
  float crack = 1.0 - smoothstep(0.0, 0.05, abs(fbmN(vDir*5.0+uSeed, 4.0) - 0.5));
  col = mix(col, vec3(1.0, 0.3, 0.05), crack * uLava);

  // День/ночь: диффуз от солнца, тёплый терминатор.
  vec3 N = normalize(vDir);
  vec3 S = normalize(uSunDir);
  float ndl = dot(N, S);
  float diff = max(ndl, 0.0);
  float night = smoothstep(0.08, -0.12, ndl);
  // Терминатор: узкая тёплая полоса на границе дня и ночи.
  float term = smoothstep(0.18, 0.02, abs(ndl)) * (1.0 - night);

  vec3 lit = col * (0.04 + 0.96 * diff);
  lit += col * vec3(1.0, 0.55, 0.25) * term * 0.22;

  // Огни городов: пятна fbm только на суше ночной стороны.
  float cities = smoothstep(0.72, 0.9, fbmN(vDir*11.0 + uSeed, 3.0));
  float lightsMask = land * (1.0 - ice) * night * cities * uCityLights;
  vec3 lightColor = vec3(1.0, 0.85, 0.55);
  lit += lightColor * lightsMask * 0.85;

  gl_FragColor = vec4(lit, 1.0);
}`;function Bt(h,e,t,s){const a=e*2-1,i=t*2-1;switch(h){case 0:s.set(1,i,-a);break;case 1:s.set(-1,i,a);break;case 2:s.set(a,1,-i);break;case 3:s.set(a,-1,i);break;case 4:s.set(a,i,1);break;default:s.set(-a,i,-1);break}return s.normalize()}const ya={dome:5087231,extractor:16747586,power:16765286,turret:13652048,tower:11562992,landing_pad:9425151};class va{constructor(e){r(this,"group",new F);r(this,"spinGroup",new F);r(this,"disposables",[]);r(this,"terrain",null);r(this,"buildingMeshes",[]);r(this,"buildingGlows",[]);r(this,"grid",null);r(this,"gridMaterial",null);this.seedGraph=e,this.group.add(this.spinGroup)}getObject(){return this.group}update(e){this.spinGroup.rotation.y+=e*.013}setSunDirection(e){const t=this.terrain,s=t==null?void 0:t.material;s!=null&&s.uniforms&&s.uniforms.uSunDir&&s.uniforms.uSunDir.value.copy(e).normalize()}setPlanet(e){this.clearTerrain();const t=this.seedGraph.rng("planet/surface/"+e.seed),s=this.surfaceParams(e,t),a=this.track(new ne(xe,96,64)),i=this.track(new _({vertexShader:fa,fragmentShader:ga,uniforms:{uSeed:{value:new f(t()*10,t()*10,t()*10)},uAmp:{value:.4},uSea:{value:s.sea},uLava:{value:s.lava},uIce:{value:s.ice},uColA:{value:s.colA},uColB:{value:s.colB},uColC:{value:s.colC},uSunDir:{value:new f(1,.3,.5)},uCityLights:{value:e.type==="terran"?1:0}}}));this.terrain=new U(a,i),this.spinGroup.add(this.terrain)}setColony(e,t,s,a,i,o){this.clearColony();const n=new f(0,1,0),l=new f;for(const c of e){const u=1/(1<<s),d=(c.x+.5)*u,p=(c.y+.5)*u;Bt(t,d,p,l);const m=this.makeBuilding(c);m.position.copy(l).multiplyScalar(xe+.05),m.quaternion.setFromUnitVectors(n,l),this.buildingMeshes.push(m),this.spinGroup.add(m)}this.buildGrid(t,s,a,i,o)}setGlobalOpacity(e){const t=Math.max(0,Math.min(1,e));for(const s of this.buildingMeshes)s.traverse(a=>{const i=a;i.material&&(i.material.opacity=t)});for(const s of this.buildingGlows)s.material.opacity=t;this.gridMaterial&&(this.gridMaterial.opacity=.5*t)}dispose(){this.clearTerrain(),this.clearColony();for(const e of this.disposables)e.dispose();for(this.disposables.length=0;this.spinGroup.children.length>0;)this.spinGroup.remove(this.spinGroup.children[0]);for(;this.group.children.length>0;)this.group.remove(this.group.children[0])}track(e){return this.disposables.push(e),e}clearTerrain(){this.terrain&&(this.terrain.geometry.dispose(),this.terrain.material.dispose(),this.spinGroup.remove(this.terrain),this.terrain=null)}clearColony(){var e;for(const t of this.buildingMeshes)t.traverse(s=>{const a=s;a.geometry&&a.geometry.dispose(),a.material&&a.material.dispose()}),this.spinGroup.remove(t);this.buildingMeshes.length=0;for(const t of this.buildingGlows)(e=t.material.map)==null||e.dispose(),t.material.dispose(),t.removeFromParent();this.buildingGlows.length=0,this.grid&&(this.grid.geometry.dispose(),this.spinGroup.remove(this.grid),this.grid=null)}surfaceParams(e,t){switch(e.type){case"terran":return{sea:.45,lava:0,ice:.6,colA:new k(1723018),colB:new k(5209938),colC:new k(9075290)};case"ice":return{sea:.3,lava:0,ice:1,colA:new k(10143968),colB:new k(15924223),colC:new k(16777215)};case"lava":return{sea:.5,lava:.8,ice:0,colA:new k(2363656),colB:new k(3809560),colC:new k(5910808)};case"gas":return{sea:.5,lava:0,ice:0,colA:new k(11826749),colB:new k(13668442),colC:new k(14725248)};default:return{sea:.6,lava:0,ice:.3,colA:new k(6974058),colB:new k(9079434),colC:new k(11184810)}}}makeBuilding(e){const t=ya[e.type],s=this.track(new Me({color:t,transparent:!0}));let a;switch(e.type){case"dome":a=this.track(new ne(.3,12,8,0,Math.PI*2,0,Math.PI/2));break;case"tower":a=this.track(new Ct(.1,.16,.7,8));break;case"turret":a=this.track(new us(.14,.4,8));break;case"power":a=this.track(new Tt(.3,.2,.3));break;case"landing_pad":a=this.track(new Ct(.4,.4,.05,16));break;default:a=this.track(new Tt(.2,.4,.2))}const i=new U(a,s),o=document.createElement("canvas");o.width=32,o.height=32;const n=o.getContext("2d");if(n){const l=n.createRadialGradient(16,16,0,16,16,16);l.addColorStop(0,"rgba(255,230,170,0.95)"),l.addColorStop(1,"rgba(255,200,120,0)"),n.fillStyle=l,n.fillRect(0,0,32,32);const c=this.track(new N(o)),u=this.track(new X({map:c,transparent:!0,depthWrite:!1,blending:G})),d=new Z(u),p=e.type==="tower"||e.type==="power"?.55:.35;d.scale.set(p,p,1),d.position.y=e.type==="tower"?.45:.2,i.add(d),this.buildingGlows.push(d)}return i}buildGrid(e,t,s,a,i){const o=1/(1<<t),n=[],l=new f,c=xe+.03,u=(p,m)=>(Bt(e,p*o,m*o,l),l.clone().multiplyScalar(c));for(let p=0;p<=i;p++)for(let m=0;m<i;m++){const v=u(s+p,a+m),x=u(s+p,a+m+1);n.push(v.x,v.y,v.z,x.x,x.y,x.z)}for(let p=0;p<=i;p++)for(let m=0;m<i;m++){const v=u(s+m,a+p),x=u(s+m+1,a+p);n.push(v.x,v.y,v.z,x.x,x.y,x.z)}const d=this.track(new se);d.setAttribute("position",new de(n,3)),this.gridMaterial=this.track(new Ve({color:5087231,transparent:!0,opacity:.5,depthWrite:!1})),this.grid=new ct(d,this.gridMaterial),this.spinGroup.add(this.grid)}}const Be=900,ue=2500,wa=.006,et=[["#7a2030","#241040"],["#a02030","#401018"],["#1a7070","#0a2830"],["#5030a0","#180a30"],["#802050","#200a28"],["#703040","#180a14"],["#284070","#0a1428"],["#206040","#081810"]];function Sa(h){let e=2166136261;for(let s=0;s<h.length;s++)e^=h.charCodeAt(s),e=Math.imul(e,16777619)>>>0;let t=e||1;return()=>(t=t*1664525+1013904223>>>0,t/4294967295)}const tt=[[16777215,.6,1],[10470655,.16,1.1],[16763024,.14,1.1],[16748399,.08,1.25],[16773848,.02,3.2]];function xa(h){let e=0;for(const[t,s,a]of tt)if(e+=s,h<=e)return[t,a];return[tt[0][0],tt[0][2]]}const ba=`
    varying vec2 vUv;
    void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`,Ma=`
    uniform float uTime; uniform vec3 uColorA; uniform vec3 uColorB;
    uniform float uOpacity; uniform float uScale; uniform float uBoost;
    varying vec2 vUv;
    float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float noise(vec2 p) {
        vec2 i = floor(p); vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1., 0.)), f.x),
                   mix(hash(i + vec2(0., 1.)), hash(i + vec2(1., 1.)), f.x), f.y);
    }
    float fbm(vec2 p) {
        float v = 0.0; float a = 0.5;
        for (int n = 0; n < 4; n++) { v += a * noise(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; }
        return v;
    }
    void main() {
        vec2 uv = vUv * uScale;
        float n1 = fbm(uv + uTime * 0.012);
        float n2 = fbm(uv * 1.9 - uTime * 0.008 + 4.7);
        float shapeN = smoothstep(0.25, 0.78, n1 * 0.6 + n2 * 0.55);
        float dist = length(vUv - 0.5) * 2.0;
        float edge = clamp(1.0 - dist * dist, 0.0, 1.0);
        edge *= edge;
        vec3 col = mix(uColorB, uColorA, clamp(n1 * 1.6 - 0.3, 0.0, 1.0)) * uBoost;
        float alpha = shapeN * edge * uOpacity;
        if (alpha < 0.004) discard;
        gl_FragColor = vec4(col, alpha);
    }
`;class Ta{constructor(e){r(this,"group",new F);r(this,"points");r(this,"geometry");r(this,"material");r(this,"disposables",[]);r(this,"nebulae",[]);r(this,"lastTime",null);const t=Sa("system/"+e+"/stardust"),s=new Float32Array(ue*3),a=new Float32Array(ue*3),i=new Float32Array(ue),o=new Float32Array(ue),n=new Float32Array(ue),l=new Float32Array(ue),c=new k;for(let d=0;d<ue;d++){const p=t()*2-1,m=t()*Math.PI*2,v=Math.sqrt(Math.max(0,1-p*p));s[d*3]=Be*v*Math.cos(m),s[d*3+1]=Be*p,s[d*3+2]=Be*v*Math.sin(m);const[x,C]=xa(t());c.setHex(x),a[d*3]=c.r,a[d*3+1]=c.g,a[d*3+2]=c.b,i[d]=(1+t()*1.6)*C,o[d]=t()*Math.PI*2,n[d]=.25+t()*.55,l[d]=.4+t()*1.8}this.geometry=new se,this.geometry.setAttribute("position",new V(s,3)),this.geometry.setAttribute("aColor",new V(a,3)),this.geometry.setAttribute("aSize",new V(i,1)),this.geometry.setAttribute("aPhase",new V(o,1)),this.geometry.setAttribute("aTwAmp",new V(n,1)),this.geometry.setAttribute("aTwFreq",new V(l,1)),this.disposables.push(this.geometry),this.material=new _({uniforms:{uTime:{value:0},uOpacity:{value:0},uSunDir:{value:new f(0,0,1)},uSunCos:{value:.95},uSunSoft:{value:.1}},vertexShader:`
                attribute float aSize;
                attribute vec3 aColor;
                attribute float aPhase;
                attribute float aTwAmp;
                attribute float aTwFreq;
                uniform float uTime;
                uniform vec3 uSunDir;
                uniform float uSunCos;
                uniform float uSunSoft;
                varying vec3 vColor;
                varying float vTw;
                varying float vBright;
                void main() {
                    vColor = aColor;
                    vTw = 1.0 - aTwAmp * (0.5 + 0.5 * sin(uTime * aTwFreq + aPhase));
                    // Угол между направлением к звезде и направлением на
                    // солнце (на небе). Внутри конуса — затемнение.
                    vec3 dir = normalize(position);
                    float c = dot(dir, normalize(uSunDir));
                    float k = smoothstep(uSunCos - uSunSoft, uSunCos + uSunSoft, c);
                    vBright = mix(1.0, 0.08, k); // у солнца ~8% яркости, вдали полная
                    vec4 mv = modelViewMatrix * vec4(position, 1.0);
                    gl_Position = projectionMatrix * mv;
                    gl_PointSize = aSize;
                }
            `,fragmentShader:`
                varying vec3 vColor;
                varying float vTw;
                varying float vBright;
                uniform float uOpacity;
                void main() {
                    vec2 c = gl_PointCoord - 0.5;
                    float d = length(c);
                    float alpha = smoothstep(0.5, 0.06, d);
                    float a = alpha * vTw * uOpacity * vBright;
                    if (a < 0.003) discard;
                    gl_FragColor = vec4(vColor, a);
                }
            `,transparent:!0,depthWrite:!1,blending:G}),this.disposables.push(this.material),this.points=new He(this.geometry,this.material),this.points.frustumCulled=!1,this.points.renderOrder=-10,this.group.add(this.points);const u=[1600+t()*600,400+t()*320,400+t()*320,400+t()*320,400+t()*320,400+t()*320,250+t()*130,250+t()*130,250+t()*130,250+t()*130];for(const d of u){const p=et[t()*et.length|0]??et[0],m=Be*(.55+t()*.4),v=t()*Math.PI*2,x=Math.acos(2*t()-1),C=.22+t()*.14,A={uTime:{value:0},uColorA:{value:new k(p[0])},uColorB:{value:new k(p[1])},uOpacity:{value:C},uScale:{value:2.2+t()*1},uBoost:{value:3+t()*1.5}},O=new _({transparent:!0,depthWrite:!1,side:Ne,blending:G,uniforms:A,vertexShader:ba,fragmentShader:Ma}),b=new U(new We(d,d),O);b.position.set(Math.sin(x)*Math.cos(v)*m,Math.cos(x)*m,Math.sin(x)*Math.sin(v)*m),b.lookAt(0,0,0),b.rotateZ(t()*Math.PI*2),b.renderOrder=-9,this.disposables.push(O,b.geometry),this.nebulae.push({uniforms:A,base:C}),this.group.add(b)}}getObject(){return this.group}update(e){const t=this.lastTime===null?0:Math.max(0,e-this.lastTime);this.lastTime=e,this.material.uniforms.uTime.value=e;for(const s of this.nebulae)s.uniforms.uTime.value=e;this.group.rotation.y+=wa*t}setSunDirection(e){const t=e.clone(),s=new W().makeRotationY(-this.group.rotation.y);t.applyMatrix4(s).normalize(),this.material.uniforms.uSunDir.value.copy(t)}setOpacity(e){const t=w.clamp(e,0,1);this.material.uniforms.uOpacity.value=t;for(const s of this.nebulae)s.uniforms.uOpacity.value=s.base*t;this.group.visible=t>.01}dispose(){for(const e of this.disposables)e.dispose();for(this.disposables.length=0,this.nebulae.length=0;this.group.children.length>0;)this.group.remove(this.group.children[0])}}const Ca={O:{deep:3429065,mid:8230911,hot:15921919,rim:11058431,cellScale:6.5,flowSpeed:1.5,brightness:1.75,flares:.55,spots:.05,prominences:.35},B:{deep:4282582,mid:10071039,hot:16184831,rim:12109567,cellScale:5.8,flowSpeed:1.3,brightness:1.65,flares:.6,spots:.07,prominences:.3},A:{deep:10134238,mid:14869754,hot:16777215,rim:15528191,cellScale:5,flowSpeed:1.15,brightness:1.55,flares:.65,spots:.11,prominences:.25},F:{deep:15647592,mid:16774616,hot:16777206,rim:16774094,cellScale:4.4,flowSpeed:1,brightness:1.48,flares:.7,spots:.24,prominences:.35},G:{deep:14711318,mid:16765538,hot:16775378,rim:16760904,cellScale:3.8,flowSpeed:.9,brightness:1.4,flares:.8,spots:.36,prominences:.45},K:{deep:13129234,mid:16754746,hot:16769700,rim:16755268,cellScale:3,flowSpeed:.72,brightness:1.32,flares:.95,spots:.48,prominences:.6},M:{deep:9841162,mid:15886376,hot:16757352,rim:16284210,cellScale:2.4,flowSpeed:.55,brightness:1.18,flares:1.15,spots:.58,prominences:.8}};function Aa(h){let e=2166136261;for(let s=0;s<h.length;s++)e^=h.charCodeAt(s),e=Math.imul(e,16777619)>>>0;let t=e||1;return()=>(t=t*1664525+1013904223>>>0,t/4294967295)}const ka=`
    varying vec3 vNormal;
    varying vec3 vWorldPos;
    varying vec3 vObjPos;
    void main() {
        vNormal = normalize(normalMatrix * normal);
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        vObjPos = normalize(position);
        gl_Position = projectionMatrix * viewMatrix * wp;
    }
`,Da=`
    const float SPIN_LAT_FACTOR = 2.2;
    uniform float uTime;
    uniform float uOpacity;
    uniform vec3 uDeep; uniform vec3 uMid; uniform vec3 uHot; uniform vec3 uRim;
    uniform float uCellScale;
    uniform float uFlowSpeed;
    uniform float uBrightness;
    uniform float uFlares;
    uniform float uSpots;
    uniform float uProminences;
    uniform float uSpinEq;
    uniform float uSeedShift;
    uniform mat3 uTilt;
    varying vec3 vNormal;
    varying vec3 vWorldPos;
    varying vec3 vObjPos;

    float hash(vec3 p) {
        p = fract(p * 0.3183099 + vec3(0.71, 0.113, 0.419));
        p *= 17.0;
        return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
    }
    float noise(vec3 x) {
        vec3 i = floor(x);
        vec3 f = fract(x);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x),
                       mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
                   mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
                       mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
    }
    float fbm(vec3 p) {
        float v = 0.0;
        float a = 0.5;
        for (int n = 0; n < 4; n++) {
            v += a * noise(p);
            p = p * 2.07 + vec3(11.3, 5.7, 3.1);
            a *= 0.5;
        }
        return v;
    }

    void main() {
        // СЛУЧАЙНАЯ ОСЬ ВРАЩЕНИЯ (замечание юзера «от солнца к солнцу»):
        // пер-звёздная матрица наклона задаёт, где у ЭТОЙ звезды полюса.
        vec3 q = uTilt * vObjPos;
        float t = uTime * uFlowSpeed;
        // Дифференциальное вращение ПЕРЕНЕСЕНО на физический меш звезды:
        // SystemRenderer крутит mesh вокруг той же наклонённой оси. Здесь
        // домен зафиксирован в объектных координатах и вращается вместе с
        // геометрией как твёрдое тело (без двойного счёта скорости).
        float lat = clamp(q.y, -1.0, 1.0);

        // Единый домен: грануляция, пятна и протуберанцы вращаются ВМЕСТЕ
        // с геометрией (физическое вращение меша, см. SystemRenderer).
        vec3 p = q * uCellScale;

        // Два слоя грануляции, текущие навстречу: «кипение» плазмы.
        float n1 = fbm(p + vec3(t * 0.35, t * 0.22, -t * 0.28));
        float n2 = fbm(p * 1.9 - vec3(t * 0.27, -t * 0.31, t * 0.19));
        float cells = clamp(n1 * 0.62 + n2 * 0.48, 0.0, 1.0);

        // Температурная палитра: тёмные впадины -> средний -> горячие пики.
        float heat = smoothstep(0.22, 0.82, cells);
        vec3 col = mix(uDeep, uMid, heat);
        col = mix(col, uHot, smoothstep(0.62, 0.97, cells));

        // Вспышки: редкие яркие пятна у холодных звёзд (пульсирующие).
        if (uFlares > 0.01) {
            // Домен на q: та же частота, что раньше, но вращается со звездой.
            float spot = fbm(q * 5.3 + vec3(-t * 0.5, t * 0.4, t * 0.33));
            float burst = smoothstep(0.78, 0.93, spot) * (0.6 + 0.4 * sin(uTime * 2.1 + spot * 21.0));
            col += uHot * burst * uFlares * 1.6;
        }

        // Звёздные пятна: крупный шум с жёстким порогом -> тёмные области.
        // Пятно слегка «ползёт» вместе с вращением (тот же домен spin).
        // Тон пятна = ЗАТЕМНЁННЫЙ СРЕДНИЙ цвет звезды (не чёрный uDeep):
        // класс звезды остаётся читаемым даже при плотном покрытии.
        if (uSpots > 0.01) {
            float sp = fbm(p * 0.55 + vec3(31.7, 17.3, 9.1));
            float dark = smoothstep(1.0 - uSpots * 0.55, 1.0 - uSpots * 0.25, sp);
            col = mix(col, mix(uMid, uDeep, 0.45) * 0.72, dark * 0.8);
        }

        // Лимбное затемнение + мягкий эмиссивный ободок (часть самой сферы,
        // НЕ спрайт-свечение).
        vec3 viewDir = normalize(cameraPosition - vWorldPos);
        float ndv = clamp(dot(normalize(vNormal), viewDir), 0.0, 1.0);
        float limb = 0.55 + 0.45 * ndv;
        // Протуберанцы: ободок модулируется угловым шумом вокруг оси Y —
        // языки плазмы пляшут по краю диска, рисунок детерминирован сидом
        // (uSeedShift) и медленно дрейфует со временем.
        float ang = atan(q.z, q.x);
        float prom = fbm(vec3(cos(ang), sin(ang), lat * 0.7) * 3.1
            + vec3(uTime * 0.11 + uSeedShift, -uTime * 0.083, uSeedShift * 0.5));
        float rim = pow(1.0 - ndv, 2.6)
            * (1.0 - uProminences + uProminences * (0.35 + 1.3 * prom));

        vec3 outCol = col * uBrightness * limb + uRim * rim * 0.55;
        // ЯВНАЯ прозрачность (ShaderMaterial НЕ применяет material.opacity
        // сам): зум-гашение и перелёты управляют видимостью через uOpacity.
        gl_FragColor = vec4(outCol * uOpacity, uOpacity);
    }
`;function Pa(h,e){const t=Ca[h],s=Aa("star/"+e+"/surface"),a=t.cellScale*(.92+s()*.16),i=t.flowSpeed*(.7+s()*.6),o=s()*Math.PI*2,n=(s()-.5)*Math.PI*.9,l=s()*Math.PI*2,c=s()<.5?-1:1,u=Math.cos(n),d=Math.sin(n),p=Math.cos(l),m=Math.sin(l),v=new ds().set(p,d*m,u*m,0,u,-d,-m,d*p,u*p),x=new _({uniforms:{uTime:{value:0},uOpacity:{value:1},uDeep:{value:new k(t.deep)},uMid:{value:new k(t.mid)},uHot:{value:new k(t.hot)},uRim:{value:new k(t.rim)},uCellScale:{value:a},uFlowSpeed:{value:i},uBrightness:{value:t.brightness},uFlares:{value:t.flares},uSpots:{value:t.spots},uProminences:{value:t.prominences*(.9+s()*.2)},uSpinEq:{value:.07*(.4+s()*1.6)*c},uSeedShift:{value:o},uTilt:{value:v}},vertexShader:ka,fragmentShader:Da});return{material:x,update(C){x.uniforms.uTime.value=C},setOpacity(C){const A=Math.max(0,Math.min(1,C));x.uniforms.uOpacity.value=A,x.opacity=A},dispose(){x.dispose()}}}const Oa=`
    varying vec3 vNormal;
    varying vec3 vWorldPos;
    varying vec3 vDir;
    // МИРОВАЯ нормаль: фреснель обязан считаться в мире вместе с viewDir
    // (смешение view-space нормали и мирового направления давало асимметрию
    // «полукруга», плывущую с наклоном камеры).
    varying vec3 vWorldNormal;
    void main() {
        vNormal = normalize(normalMatrix * normal);
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        vDir = normalize(position);
        gl_Position = projectionMatrix * viewMatrix * wp;
    }
`,za=`
    uniform float uTime;
    uniform float uOpacity;
    uniform vec3 uColor;
    uniform float uIntensity;
    uniform float uEdgeGain;
    // Рандом горения (от сида звезды): мелкость языков, скорость пламени,
    // профиль спада, сила базы/языков, частота дыхания.
    uniform float uNoiseScale;
    uniform float uFlowSpeed;
    uniform float uEdgePow;
    uniform float uBaseGlow;
    uniform float uTongueGain;
    uniform float uBreatheSpeed;
    varying vec3 vNormal;
    varying vec3 vWorldPos;
    varying vec3 vDir;
    varying vec3 vWorldNormal;

    float hash(vec3 p) {
        p = fract(p * 0.3183099 + vec3(0.71, 0.113, 0.419));
        p *= 17.0;
        return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
    }
    float noise(vec3 x) {
        vec3 i = floor(x);
        vec3 f = fract(x);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x),
                       mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
                   mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
                       mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
    }
    float fbm(vec3 p) {
        float v = 0.0;
        float a = 0.5;
        for (int n = 0; n < 3; n++) {
            v += a * noise(p);
            p = p * 2.07 + vec3(11.3, 5.7, 3.1);
            a *= 0.5;
        }
        return v;
    }

    void main() {
        vec3 viewDir = normalize(cameraPosition - vWorldPos);
        // BackSide-оболочка: мировая нормаль направлена ОТ камеры, инвертируем.
        // Фреснель полностью в мировых координатах — симметричен на все 360°.
        float ndv = clamp(dot(-normalize(vWorldNormal), viewDir), 0.0, 1.0);

        // band: пик свечения сидит ПОД диском звезды (нормировка к ~0.69
        // от лимба) — снаружи остаётся лишь монотонный спад, отдельной
        // яркой полосы у края нет, ореол сливается с ободком звезды.
        float band = clamp(ndv * uEdgeGain * 0.69, 0.0, 1.0);
        // Высота над лимбом: 0 = у диска, 1 = край оболочки.
        float h = 1.0 - band;

    // Пламя: языки ВЫТЕКАЮТ от середины (лимба) к краям (юзер).
    // Фаза шума привязана к высоте h и течёт наружу со временем —
    // изолинии узора ползут от диска к краю оболочки непрерывно.
    vec3 dom = vDir * uNoiseScale;
    dom.z += h * 4.5 - uTime * 1.35 * uFlowSpeed;
    float n = fbm(dom);

    // Рваные языки: порог растёт с высотой, сила языков — юниформ (рандом).
    float thr = mix(0.08, 0.55, h * h);
    float tongue = smoothstep(thr, thr + 0.24, n);

    // Сплошное основание по всему кругу + языки сверху. Пик под диском,
    // снаружи — монотонный спад; база держит кольцо ярким на 360°.
    float glow = pow(band, uEdgePow) * (uBaseGlow + uTongueGain * tongue);
    // ЖЁСТКОЕ гашение ДО края оболочки: ниже band < 0.24 свечение уходит
    // в ноль плавно, но гарантированно — иначе внешняя граница оболочки
    // видна как кольцо («выглядит как сатурн», юзер).
    glow *= smoothstep(0.0, 0.24, band);
    // Лёгкое дыхание общей яркости (частота тоже рандомится).
    glow *= 0.90 + 0.10 * sin(uTime * uBreatheSpeed);

        float a = glow * uIntensity;
        gl_FragColor = vec4(uColor * a, a * uOpacity);
        if (gl_FragColor.a < 0.003) discard;
    }
`;function Ea(h,e,t){const s=t.width,a=new ne(h*s,96,48),i=1/t.width,o=1/Math.sqrt(Math.max(1e-4,1-i*i)),n=new _({uniforms:{uTime:{value:0},uOpacity:{value:1},uColor:{value:new k(e)},uIntensity:{value:t.intensity},uEdgeGain:{value:o},uNoiseScale:{value:t.noiseScale},uFlowSpeed:{value:t.flowSpeed},uEdgePow:{value:t.edgePow},uBaseGlow:{value:t.baseGlow},uTongueGain:{value:t.tongueGain},uBreatheSpeed:{value:t.breatheSpeed}},vertexShader:Oa,fragmentShader:za,side:ps,transparent:!0,depthWrite:!1,blending:G}),l=new U(a,n);return l.renderOrder=1,{mesh:l,setScale(c){l.scale.setScalar(c/s)},update(c){n.uniforms.uTime.value=c},setOpacity(c){n.uniforms.uOpacity.value=Math.max(0,Math.min(1,c))},dispose(){a.dispose(),n.dispose()}}}const qt={ocDeep:[.015,.07,.19],ocShelf:[.03,.15,.3],ocTurq:[.05,.27,.35],ocShore:[.16,.38,.42],landDry:[.44,.37,.25],landLow:[.19,.29,.14],landHigh:[.34,.29,.19],rock:[.29,.26,.23],snow:[.85,.88,.92],cloud:[.9,.92,.95],cloud2:[.78,.82,.88],atmo:[.34,.54,.85]},It={earth_like:{cfg:{sea:.47,water:1,iceCaps:.5,cloud:.6,cloudType:1,atmoInt:.5,craters:0,lava:0,cities:1,bump:.8},col:qt},gas_giant:{cfg:{sea:.5,water:0,iceCaps:0,cloud:.9,cloudType:3,cloudBands:12,cloudVortex:.5,atmoInt:.3,craters:0,lava:0,cities:0,bump:.3,opaqueClouds:1},col:{cloud:[.85,.78,.66],cloud2:[.6,.46,.34],landDry:[.7,.62,.5],landLow:[.6,.5,.4],landHigh:[.5,.4,.32],rock:[.4,.32,.26],snow:[.85,.8,.72],ocDeep:[.5,.42,.34],ocShelf:[.55,.47,.39],ocTurq:[.6,.52,.44],ocShore:[.65,.57,.49],atmo:[.75,.65,.5]}},saturn_like:{cfg:{sea:.5,water:0,iceCaps:0,cloud:.9,cloudType:3,cloudBands:16,cloudVortex:.3,atmoInt:.25,craters:0,lava:0,cities:0,bump:.3,opaqueClouds:1},col:{cloud:[.88,.82,.68],cloud2:[.72,.62,.46],landDry:[.75,.68,.55],landLow:[.65,.57,.45],landHigh:[.55,.47,.37],rock:[.45,.37,.29],snow:[.88,.83,.74],ocDeep:[.55,.47,.37],ocShelf:[.6,.52,.42],ocTurq:[.65,.57,.47],ocShore:[.7,.62,.52],atmo:[.8,.7,.55]}},ice_giant:{cfg:{sea:.5,water:0,iceCaps:0,cloud:.8,cloudType:3,cloudBands:8,cloudVortex:.6,atmoInt:.35,craters:0,lava:0,cities:0,bump:.3,opaqueClouds:1},col:{cloud:[.55,.75,.85],cloud2:[.35,.55,.7],landDry:[.45,.6,.7],landLow:[.35,.5,.62],landHigh:[.27,.42,.54],rock:[.2,.32,.42],snow:[.75,.83,.9],ocDeep:[.25,.4,.52],ocShelf:[.3,.45,.57],ocTurq:[.35,.5,.62],ocShore:[.4,.55,.67],atmo:[.4,.6,.75]}},cold_jupiter:{cfg:{sea:.5,water:0,iceCaps:0,cloud:.9,cloudType:3,cloudBands:14,cloudVortex:.4,atmoInt:.3,craters:0,lava:0,cities:0,bump:.3,opaqueClouds:1},col:{cloud:[.88,.91,.95],cloud2:[.58,.68,.82],landDry:[.72,.76,.82],landLow:[.62,.67,.75],landHigh:[.52,.58,.68],rock:[.42,.48,.58],snow:[.9,.93,.96],ocDeep:[.45,.52,.62],ocShelf:[.5,.57,.67],ocTurq:[.55,.62,.72],ocShore:[.6,.67,.77],atmo:[.6,.7,.85]}},hot_jupiter:{cfg:{sea:.5,water:0,iceCaps:0,cloud:.85,cloudType:3,cloudBands:8,cloudVortex:.8,atmoInt:.4,craters:0,lava:.3,cities:0,bump:.3,opaqueClouds:1},col:{cloud:[.85,.6,.4],cloud2:[.6,.35,.25],landDry:[.7,.45,.3],landLow:[.6,.36,.24],landHigh:[.5,.28,.18],rock:[.4,.2,.13],snow:[.85,.7,.55],ocDeep:[.45,.25,.15],ocShelf:[.5,.3,.18],ocTurq:[.55,.35,.21],ocShore:[.6,.4,.24],atmo:[.8,.45,.3]}},lava_planet:{cfg:{sea:.4,water:0,iceCaps:0,cloud:.15,cloudType:0,atmoInt:.25,craters:0,lava:1,cities:0,bump:1,surfaceType:1},col:{landDry:[.12,.09,.08],landLow:[.09,.07,.06],landHigh:[.15,.1,.08],rock:[.07,.05,.05],snow:[.3,.2,.15],ocDeep:[.08,.05,.04],ocShelf:[.1,.06,.05],ocTurq:[.12,.07,.05],ocShore:[.14,.08,.06],cloud:[.35,.28,.24],cloud2:[.3,.22,.18],atmo:[.55,.25,.12]}},fire_planet:{cfg:{sea:.4,water:0,iceCaps:0,cloud:.1,cloudType:0,atmoInt:.3,craters:0,lava:1,cities:0,bump:1.1,surfaceType:1},col:{landDry:[.1,.07,.06],landLow:[.08,.05,.05],landHigh:[.13,.08,.07],rock:[.06,.04,.04],snow:[.28,.18,.12],ocDeep:[.07,.04,.03],ocShelf:[.09,.05,.04],ocTurq:[.11,.06,.04],ocShore:[.13,.07,.05],cloud:[.32,.24,.2],cloud2:[.27,.2,.16],atmo:[.6,.28,.12]}},ocean_planet:{cfg:{sea:.55,water:1,iceCaps:.2,cloud:.5,cloudType:1,atmoInt:.45,craters:0,lava:0,cities:.5},col:{ocDeep:[.01,.05,.16],ocShelf:[.02,.12,.26],ocTurq:[.04,.22,.3],ocShore:[.14,.34,.38],landDry:[.4,.36,.26],landLow:[.28,.26,.18],landHigh:[.22,.2,.15],rock:[.18,.16,.13],snow:[.85,.88,.92],cloud:[.9,.92,.95],cloud2:[.8,.84,.9],atmo:[.35,.55,.85]}},snowball:{cfg:{sea:.5,water:.3,iceCaps:1.3,cloud:.3,cloudType:1,atmoInt:.3,craters:0,lava:0,cities:0},col:{landDry:[.66,.71,.79],landLow:[.52,.58,.68],landHigh:[.4,.46,.56],rock:[.3,.35,.45],snow:[.82,.86,.92],ocDeep:[.1,.16,.26],ocShelf:[.16,.24,.34],ocTurq:[.22,.32,.42],ocShore:[.3,.4,.5],cloud:[.88,.91,.95],cloud2:[.78,.82,.9],atmo:[.55,.65,.8]}},moon:{cfg:{sea:.5,water:0,iceCaps:0,cloud:0,cloudType:0,atmoInt:0,craters:1,lava:0,cities:0,bump:.7,surfaceType:6},col:{landDry:[.42,.41,.4],landLow:[.3,.29,.28],landHigh:[.22,.21,.2],rock:[.16,.15,.14],snow:[.55,.55,.55],ocDeep:[.2,.2,.2],ocShelf:[.25,.25,.25],ocTurq:[.3,.3,.3],ocShore:[.35,.35,.35],cloud:[.5,.5,.5],cloud2:[.45,.45,.45],atmo:[.3,.3,.3]}},mercury_like:{cfg:{sea:.5,water:0,iceCaps:0,cloud:0,cloudType:0,atmoInt:0,craters:.9,lava:0,cities:0,bump:.8,surfaceType:6},col:{landDry:[.38,.34,.3],landLow:[.27,.24,.21],landHigh:[.19,.17,.15],rock:[.14,.12,.11],snow:[.5,.48,.45],ocDeep:[.2,.18,.16],ocShelf:[.24,.22,.2],ocTurq:[.28,.26,.24],ocShore:[.32,.3,.28],cloud:[.5,.5,.5],cloud2:[.45,.45,.45],atmo:[.3,.3,.3]}},barren_rock:{cfg:{sea:.5,water:0,iceCaps:0,cloud:0,cloudType:0,atmoInt:0,craters:.6,lava:0,cities:0,bump:.8,surfaceType:6},col:{landDry:[.4,.37,.33],landLow:[.29,.26,.23],landHigh:[.2,.18,.16],rock:[.15,.13,.12],snow:[.5,.48,.45],ocDeep:[.2,.18,.16],ocShelf:[.24,.22,.2],ocTurq:[.28,.26,.24],ocShore:[.32,.3,.28],cloud:[.5,.5,.5],cloud2:[.45,.45,.45],atmo:[.3,.3,.3]}},frozen_wasteland:{cfg:{sea:.5,water:.2,iceCaps:1.1,cloud:.15,cloudType:1,atmoInt:.2,craters:.3,lava:0,cities:0,surfaceType:2},col:{landDry:[.62,.67,.75],landLow:[.48,.54,.64],landHigh:[.36,.42,.52],rock:[.28,.33,.43],snow:[.8,.84,.9],ocDeep:[.1,.16,.26],ocShelf:[.16,.24,.34],ocTurq:[.22,.32,.42],ocShore:[.3,.4,.5],cloud:[.85,.88,.93],cloud2:[.75,.79,.87],atmo:[.5,.6,.75]}},icy_moon:{cfg:{sea:.5,water:.2,iceCaps:1.2,cloud:0,cloudType:0,atmoInt:0,craters:.5,lava:0,cities:0,surfaceType:2},col:{landDry:[.6,.65,.73],landLow:[.46,.52,.62],landHigh:[.34,.4,.5],rock:[.26,.31,.41],snow:[.8,.84,.9],ocDeep:[.1,.16,.26],ocShelf:[.16,.24,.34],ocTurq:[.22,.32,.42],ocShore:[.3,.4,.5],cloud:[.6,.6,.6],cloud2:[.5,.5,.5],atmo:[.3,.3,.3]}},volcanic_moon:{cfg:{sea:.4,water:0,iceCaps:0,cloud:0,cloudType:0,atmoInt:0,craters:.4,lava:.8,cities:0,bump:.9,surfaceType:1},col:{landDry:[.55,.45,.2],landLow:[.45,.35,.15],landHigh:[.32,.25,.11],rock:[.2,.15,.08],snow:[.6,.52,.3],ocDeep:[.25,.18,.08],ocShelf:[.3,.22,.1],ocTurq:[.35,.26,.12],ocShore:[.4,.3,.14],cloud:[.5,.45,.3],cloud2:[.4,.35,.25],atmo:[.4,.3,.15]}},titan_like:{cfg:{sea:.45,water:.4,iceCaps:0,cloud:.7,cloudType:2,atmoInt:.8,craters:0,lava:0,cities:0},col:{cloud:[.78,.58,.28],cloud2:[.66,.48,.22],landDry:[.5,.36,.18],landLow:[.4,.28,.14],landHigh:[.3,.21,.11],rock:[.24,.16,.09],snow:[.8,.7,.55],ocDeep:[.1,.07,.03],ocShelf:[.14,.1,.05],ocTurq:[.18,.13,.07],ocShore:[.22,.16,.09],atmo:[.83,.55,.2]}},tropical:{cfg:{sea:.5,water:1,iceCaps:.1,cloud:.6,cloudType:1,atmoInt:.45,craters:0,lava:0,cities:.4},col:{ocDeep:[.02,.1,.22],ocShelf:[.04,.18,.32],ocTurq:[.06,.26,.38],ocShore:[.16,.34,.42],landDry:[.38,.42,.26],landLow:[.22,.3,.16],landHigh:[.3,.29,.19],rock:[.2,.18,.14],snow:[.85,.88,.92],cloud:[.9,.92,.95],cloud2:[.8,.84,.9],atmo:[.35,.55,.85]}},arid:{cfg:{sea:.4,water:0,iceCaps:0,cloud:.1,cloudType:0,atmoInt:.25,craters:.2,lava:0,cities:.3},col:{landDry:[.55,.32,.18],landLow:[.43,.25,.14],landHigh:[.3,.17,.1],rock:[.24,.15,.1],snow:[.85,.78,.72],ocDeep:[.3,.18,.11],ocShelf:[.36,.22,.13],ocTurq:[.42,.26,.15],ocShore:[.48,.3,.17],cloud:[.75,.65,.55],cloud2:[.65,.55,.45],atmo:[.72,.45,.28]}},desert:{cfg:{sea:.4,water:0,iceCaps:0,cloud:.05,cloudType:0,atmoInt:.18,craters:.4,lava:0,cities:.1},col:{landDry:[.55,.32,.18],landLow:[.43,.25,.14],landHigh:[.3,.17,.1],rock:[.24,.15,.1],snow:[.85,.78,.72],ocDeep:[.3,.18,.11],ocShelf:[.36,.22,.13],ocTurq:[.42,.26,.15],ocShore:[.48,.3,.17],cloud:[.75,.65,.55],cloud2:[.65,.55,.45],atmo:[.72,.45,.28]}},arctic:{cfg:{sea:.5,water:1,iceCaps:1,cloud:.4,cloudType:1,atmoInt:.35,craters:0,lava:0,cities:.2},col:{ocDeep:[.1,.16,.26],ocShelf:[.16,.24,.34],ocTurq:[.22,.32,.42],ocShore:[.3,.4,.5],landDry:[.55,.62,.72],landLow:[.42,.5,.62],landHigh:[.32,.4,.52],rock:[.26,.32,.42],snow:[.82,.86,.92],cloud:[.88,.91,.95],cloud2:[.78,.82,.9],atmo:[.55,.65,.8]}},tundra:{cfg:{sea:.5,water:.8,iceCaps:.8,cloud:.35,cloudType:1,atmoInt:.3,craters:0,lava:0,cities:.2},col:{ocDeep:[.1,.16,.26],ocShelf:[.16,.24,.34],ocTurq:[.22,.32,.42],ocShore:[.3,.4,.5],landDry:[.52,.6,.7],landLow:[.4,.48,.6],landHigh:[.3,.38,.5],rock:[.24,.3,.4],snow:[.8,.84,.9],cloud:[.85,.88,.93],cloud2:[.75,.79,.87],atmo:[.5,.6,.75]}},swamp:{cfg:{sea:.5,water:1,iceCaps:0,cloud:.5,cloudType:1,atmoInt:.4,craters:0,lava:0,cities:.2},col:{ocDeep:[.03,.1,.16],ocShelf:[.05,.18,.26],ocTurq:[.07,.26,.32],ocShore:[.16,.34,.38],landDry:[.4,.42,.28],landLow:[.3,.32,.2],landHigh:[.22,.24,.15],rock:[.18,.18,.12],snow:[.82,.86,.92],cloud:[.88,.9,.94],cloud2:[.78,.82,.88],atmo:[.4,.55,.85]}},savanna:{cfg:{sea:.4,water:0,iceCaps:0,cloud:.25,cloudType:1,atmoInt:.3,craters:.1,lava:0,cities:.2},col:{landDry:[.55,.45,.22],landLow:[.43,.35,.16],landHigh:[.3,.24,.11],rock:[.24,.18,.1],snow:[.85,.8,.72],ocDeep:[.3,.18,.11],ocShelf:[.36,.22,.13],ocTurq:[.42,.26,.15],ocShore:[.48,.3,.17],cloud:[.78,.7,.58],cloud2:[.68,.6,.48],atmo:[.72,.5,.3]}},gaia_world:{cfg:{sea:.5,water:1,iceCaps:.6,cloud:.6,cloudType:1,atmoInt:.55,craters:0,lava:0,cities:1},col:{ocDeep:[.015,.08,.2],ocShelf:[.03,.16,.3],ocTurq:[.05,.26,.36],ocShore:[.16,.36,.42],landDry:[.48,.4,.26],landLow:[.22,.3,.16],landHigh:[.34,.3,.2],rock:[.26,.24,.2],snow:[.88,.9,.94],cloud:[.92,.94,.96],cloud2:[.8,.84,.9],atmo:[.35,.55,.85]}}},Ra=`
precision highp float;
uniform float uTime;uniform vec3 uSunDir;uniform vec3 uCam;uniform float uDriftLow;
uniform float uSea;uniform float uWater;uniform float uCities;uniform float uLava;
uniform float uIceCaps;uniform float uBump;
uniform float uSurfType;uniform float uSurfRough;uniform float uSurfGloss;uniform float uSurfDetail;
uniform float uRidgeAmount;uniform float uCrackDensity;uniform float uCraterScale;
uniform float uAnomalyType;uniform vec3 uAnomalyPos;uniform float uAnomalySize;uniform float uAnomalyIntensity;
uniform float uCraterDensity;
uniform float uCloud;
uniform float uSpecInt;
uniform vec3 uOcDeep;uniform vec3 uOcShelf;uniform vec3 uOcTurq;uniform vec3 uOcShore;
uniform vec3 uLandDry;uniform vec3 uLandLow;uniform vec3 uLandHigh;uniform vec3 uRock;uniform vec3 uSnow;
uniform vec3 uCityCol;uniform vec3 uAtmoCol;
varying vec3 vObj;varying vec3 vWN;varying vec3 vWP;varying vec3 vVN;
${Ue}
float terrainH(vec3 d){
  vec3 sd=d+uSeed*.05;
  float base=(fbm(sd*2.0+vec3(7.31)+uSeed)+.30*fbm(sd*5.5+vec3(3.71)+uSeed)+.15*fbm(sd*12.+vec3(1.3)+uSeed))/1.45;
  base+=uRidgeAmount*ridged(sd*4.0+uSeed)*.3;
  if(uCraterDensity>.05){
    vec3 csd=sd*3.0;
    vec3 ci=floor(csd);
    float acc=0.;
    for(int x=-1;x<=1;x++)for(int y=-1;y<=1;y++)for(int z=-1;z<=1;z++){
      vec3 g=vec3(float(x),float(y),float(z));
      float rnd=hash1(ci+g);
      if(rnd>.55){
        vec3 o=hash3(ci+g+7.7);
        vec3 cpos=normalize(ci+g+o-.5);
        float csize=(.02+.05*hash1(ci+g+3.3))*uCraterScale;
        float cdepth=.3+.7*hash1(ci+g+5.1);
        acc+=craterBowl(d,cpos,csize)*cdepth;
      }
    }
    float craterBoost=(uSurfType>5.5&&uSurfType<7.5)?.35:.10;
    base+=acc*uCraterDensity*craterBoost;
  }
  return base;}
void main(){vec3 n=normalize(vWN);vec3 d=normalize(vObj);vec3 sun=normalize(uSunDir);
  float S=uSea;float h=terrainH(d);float hC=h+fbm(d*32.+1.7+uSeed)*.025;
  float land=smoothstep(S,S+.008,hC);
  float iceN=.16*(fbm(d*7.+uSeed)-.5)+.07*(fbm(d*17.+uSeed*1.7)-.5);
  float ice=clamp(smoothstep(.80,.97,abs(d.y)+iceN)*clamp(uIceCaps,0.,1.5),0.,1.);
  vec3 upv=abs(n.y)<.98?vec3(0.,1.,0.):vec3(1.,0.,0.);
  vec3 tg=normalize(cross(upv,n));vec3 bn=cross(n,tg);
  float e=.015;float h0=terrainH(d);
  float h1=terrainH(normalize(d+tg*e));float h2b=terrainH(normalize(d+bn*e));
  vec3 nn=normalize(n-(tg*(h1-h0)+bn*(h2b-h0))*(14.0*uBump*land*(1.-ice)));

  if(uAnomalyType>.5&&uAnomalyType<1.5){
    float ac=craterBowl(d,uAnomalyPos,uAnomalySize);
    nn=normalize(nn+uAnomalyPos*ac*uAnomalyIntensity*.5);
    h+=ac*uAnomalyIntensity*.3;
  }else if(uAnomalyType>1.5&&uAnomalyType<2.5){
    float dist=acos(clamp(dot(d,normalize(uAnomalyPos)),-1.,1.));
    float rift=smoothstep(uAnomalySize,uAnomalySize*.3,abs(dist-.5))*uAnomalyIntensity;
    nn=normalize(nn-tg*rift*.3);
  }else if(uAnomalyType>2.5&&uAnomalyType<3.5){
    float dist=acos(clamp(dot(d,normalize(uAnomalyPos)),-1.,1.));
    float hs=smoothstep(uAnomalySize,0.,dist)*uAnomalyIntensity;
    h+=hs*.2;
  }else if(uAnomalyType>3.5){
    float dist=acos(clamp(dot(d,normalize(uAnomalyPos)),-1.,1.));
    float basin=smoothstep(uAnomalySize,0.,dist)*uAnomalyIntensity;
    h-=basin*.15;
  }

  float nd=dot(nn,sun);float diff=.22+.78*lightFall(nd);
  vec3 snowCol=mix(uSnow*.40,uSnow,smoothstep(-.15,.30,nd));
  float night=smoothstep(.08,-.15,nd);float dayF=smoothstep(-.1,.3,nd);
  float term=smoothstep(-.15,-.02,nd)*(1.-smoothstep(.02,.3,nd));
  float coastLight=smoothstep(.03,.42,nd);

  vec3 ocW=mix(uOcDeep*.45,uOcDeep,smoothstep(S-.140,S-.100,hC));
  ocW=mix(ocW,uOcShelf,smoothstep(S-.050,S-.026,hC+.004*(fbmQ(d*40.+3.3+uSeed)-.5)));
  ocW=mix(ocW,uOcTurq,smoothstep(S-.024,S-.010,hC+.005*(fbmQ(d*55.+7.7+uSeed)-.5))*coastLight);
  ocW=mix(ocW,uOcShore,smoothstep(S-.002,S+.006,hC)*coastLight*.8);
  ocW*=.90+.18*fbmQ(d*6.+3.3+uSeed);
  vec3 ocDry=mix(uLandDry*.55,uRock*.7,fbmQ(d*8.+1.3+uSeed));
  vec3 oc=mix(ocW,ocDry,1.-uWater);
  oc=mix(oc,snowCol,ice*uWater);

  vec3 lc=uLandDry;
  float st=uSurfType;
  if(st<0.5){
    lc=mix(lc,uLandLow,smoothstep(S+.02,S+.06,h));
    lc=mix(lc,uLandHigh,smoothstep(S+.05,S+.10,h));
    lc=mix(lc,uRock,smoothstep(S+.14,S+.20,h));
    lc=mix(lc,snowCol,smoothstep(S+.20,S+.34,h+abs(d.y)*.12+iceN*.5));
    lc*=.90+.18*fbmQ(d*7.+5.5+uSeed);
  }else if(st<1.5){
    float lv=max(uLava,.55)*(1.-smoothstep(0.,.045,abs(fbmQ(d*5.+uSeed+vec3(0.,uTime*.01,0.))-.5)));
    lv*=smoothstep(.40,.70,fbmQ(d*3.+7.7+uSeed));
    lc=mix(uRock*.4,mix(vec3(.5,.03,0.),vec3(1.,.45,.08),lv),lv*1.5+0.2);
    lc+=vec3(1.,.6,.2)*lv*.7*(.15+.85*night);
  }else if(st<2.5){
    float iceDetail=.7+.6*fbmQ(d*15.+uSeed+vec3(uTime*.002));
    lc=mix(snowCol*.8,snowCol,iceDetail);
    lc=mix(lc,uOcDeep*.3,smoothstep(.82,.88,abs(d.y)));
    float cracks=1.-smoothstep(0.,.02,abs(fbmQ(d*30.+uSeed)-.5));
    lc=mix(lc,vec3(.4,.6,.8),cracks*.3*uCrackDensity);
  }else if(st<3.5){
    float dunes=.6+.8*fbm(d*8.+vec3(2.1,.3,1.7)+uSeed);
    float ripples=.7+.5*fbm(d*40.+vec3(uTime*.001)+uSeed);
    lc=mix(uLandDry,uLandDry*1.3,dunes*ripples);
    float shadow=smoothstep(.3,.7,dot(nn,normalize(vec3(.4,.3,.5))));
    lc*=.7+.5*shadow;
  }else if(st<4.5){
    float metalTexture=.5+.5*fbmQ(d*12.+uSeed);
    float scratches=.8+.4*fbmQ(d*60.+uSeed);
    lc=mix(uRock*.5,uRock*1.2,metalTexture*.5+scratches*.3);
    float specular=pow(max(dot(nn,normalize(sun+normalize(uCam-vWP))),0.),60.)*uSurfGloss*2.;
    lc+=vec3(1.)*specular;
  }else if(st<5.5){
    float bio=.5+.8*fbmQ(d*20.+uSeed+vec3(uTime*.003));
    float patches=smoothstep(.4,.7,fbmQ(d*10.+uSeed));
    lc=mix(uLandLow,uLandHigh*1.3,bio*patches);
    lc=mix(lc,vec3(.8,.4,.2),smoothstep(.6,.8,fbmQ(d*30.+7.7+uSeed))*.4);
  }else if(st<6.5){
    float cr=0.;
    vec3 sd2=d+uSeed*.1;
    vec3 i=floor(sd2*6.0);
    for(int x=-1;x<=1;x++)for(int y=-1;y<=1;y++)for(int z=-1;z<=1;z++){
      vec3 g=vec3(float(x),float(y),float(z));
      vec3 o=hash3(i+g);
      if(hash1(i+g)>.45)cr+=craterBowl(d,normalize(sd2+g+o-.5),.06*uCraterScale);
    }
    lc=mix(uRock*.6,uRock*1.1,.5+cr*.6);
    lc*=.8+.4*fbmQ(d*10.+uSeed);
  }else if(st<7.5){
    float r=ridged(d*5.+uSeed);
    lc=mix(uLandLow,uLandHigh,r);
    lc=mix(lc,uRock,smoothstep(.6,.8,r));
    lc*=.7+.5*r;
  }else if(st<8.5){
    float crackNoise=fbmQ(d*12.+uSeed);
    float crackLine=1.-smoothstep(0.,.15,abs(crackNoise-.5));
    lc=mix(uLandDry,uRock*.4,crackLine*uCrackDensity);
    lc*=.8+.4*fbmQ(d*12.+uSeed);
  }else{
    float mare=smoothstep(.45,.6,fbm(d*2.5+uSeed*.3));
    vec3 bright=mix(uSnow,uLandDry,.3);
    vec3 darkm=mix(uRock*.35,uLandLow,.4);
    lc=mix(darkm,bright,mare);
    lc*=.85+.3*fbmQ(d*9.+uSeed);
    lc=mix(lc,snowCol,smoothstep(.75,.9,fbm(d*4.+uSeed+4.2))*.5);
  }
  lc=mix(lc,snowCol,ice);

  lc=mix(lc,lc*.72,smoothstep(.55,.78,fbm(d*2.2+uSeed*.3))*.55);

  vec3 albedo=mix(oc,lc,land);
  float hill=clamp(dot(nn,normalize(vec3(.6,.35,.5)))*1.5,.55,1.25);
  float ao=.85+.15*smoothstep(S-.008,S+.14,h);
  albedo=mix(albedo,albedo*mix(1.,hill,(1.-ice)*.5)*ao,land);

  float citySh=.65+.7*fbmQ(d*48.+2.2+uSeed);
  float denseCity=smoothstep(.50,.70,fbmQ(d*8.+9.2+uSeed))*smoothstep(.52,.78,vnoise(d*150.+uSeed))*land*(1.-ice)*(uSurfType<0.5?1.:0.2)*citySh*uCities;
  float suburbs=smoothstep(.45,.65,fbmQ(d*10.+9.2+uSeed))*smoothstep(.45,.70,vnoise(d*70.+uSeed))*land*(1.-ice)*(uSurfType<0.5?1.:0.2)*uCities;

  vec3 V=normalize(uCam-vWP);vec3 H=normalize(sun+nn);
  float fres=pow(1.-max(dot(nn,V),0.),5.);
  float waterM=(1.-land)*(1.-ice)*uWater;
  float spec=pow(max(dot(nn,H),0.),240.)*waterM*(1.-night)*(.10+.90*fres)*1.4;
  float fillK=.004+.03*smoothstep(-1.0,.1,nd);
  float ambK=1.-.25*clamp(uDepth,0.,1.5);
  vec3 col=albedo*(vec3(fillK*.8,fillK,fillK*1.4)*ambK+diff*vec3(1.05,1.0,0.95));
  col=mix(col,col*vec3(1.15,.72,.45)+vec3(.10,.04,.015)*albedo,term*.55);
  col+=waterM*(vec3(.014,.048,.115)*(0.10+0.90*dayF)+fres*vec3(.06,.11,.19)*dayF);

  float lavaK=smoothstep(.15,.6,uLava);
  if(lavaK>.01){
    float ln=fbmQ(d*5.+uSeed+vec3(0.,uTime*.01,0.));
    float crack=1.-smoothstep(0.,.02,abs(ln-.5));
    crack*=smoothstep(.40,.70,fbmQ(d*3.+7.7+uSeed));
    float scorch=1.-smoothstep(0.,.12,abs(ln-.5));
    col=mix(col,vec3(.05,.03,.025),scorch*lavaK*.6);
    vec3 lav=mix(vec3(.45,.05,0.),vec3(1.,.5,.1),crack);
    col+=lav*crack*lavaK*(.12+1.0*night+.04*diff);
  }

  float t1=uTime*.006;vec3 dc=rotY(d,uDriftLow);
  float cs=max(max(
    smoothstep(.44,.66,fbmQ(dc*9.0+vec3(t1,.3*t1,-t1)+uSeed))*smoothstep(.28,.52,fbmQ(dc*22.0-t1+uSeed))*.95,
    smoothstep(.40,.62,fbmQ(dc*3.1+vec3(-t1*.7,0.,t1*.5)+uSeed))*.8),
    smoothstep(.52,.72,fbmQ(dc*4.6+t1*.4+uSeed)));
  col*=1.-.42*cs*diff;
  col+=vec3(1.)*spec;
  float specAll=pow(max(dot(nn,H),0.),48.)*uSpecInt*dayF;
  col+=vec3(1.,.98,.95)*specAll;
  col+=uAtmoCol*fres*waterM*dayF*.22;
  col+=uCityCol*vec3(1.,.95,.8)*suburbs*.8*night+uCityCol*denseCity*citySh*2.2*night;

  float hSun=terrainH(normalize(d+sun*.08));
  float selfSh=smoothstep(-.03,.06,h-hSun+.02);
  col*=.72+.28*selfSh;

  float cT0=.70-.32*uCloud;
  float cSh=smoothstep(cT0,cT0+.22,fbmQ(dc*9.0+vec3(t1,.3*t1,-t1)+uSeed))*smoothstep(cT0-.18,cT0+.05,fbmQ(dc*22.0-t1+uSeed));
  col*=1.-cSh*.30*dayF;

  float viewMu=clamp(dot(n,V),0.,1.);
  float limbHaze=pow(1.-viewMu,2.2);
  col=mix(col,uAtmoCol*.85,limbHaze*(.45*dayF+.03));

  gl_FragColor=vec4(tonemap(col),1.);}`;function La(h){const e=pt.generate(h.variant??"earth_like",h.seed);return Ba(e)}function Ba(h){const e=h.physics,t=It.earth_like,s=It[h.meta.typeId]??t,a=s.cfg,i=s.col,o=e.atmospherePressureAtm<.05;o||Math.min(.65,Math.pow(e.atmospherePressureAtm/3,.8)*(1-e.craters*.3));const n=u=>new f(u[0],u[1],u[2]),l=u=>new k(u),c=u=>i[u]??qt[u]??[0,0,0];return new _({vertexShader:$s,fragmentShader:Ra,uniforms:{uTime:{value:0},uSeed:{value:new f(h.physics.seedOffset[0],h.physics.seedOffset[1],h.physics.seedOffset[2])},uSunDir:{value:new f(1,.3,.5).normalize()},uCam:{value:new f},uDepth:{value:.15},uPost:{value:1},uQ:{value:2},uDriftLow:{value:0},uSea:{value:a.sea??.47},uWater:{value:a.water??(e.ocean>.2?1:e.ocean/.2)},uIceCaps:{value:a.iceCaps??0},uBump:{value:a.bump??.8},uCities:{value:o?0:(a.cities??0)*(Math.random()>.3?1:0)},uLava:{value:e.lava+e.fire*.5>.55?(e.lava+e.fire*.5-.55)*2.2:0},uSpecInt:{value:.15+Math.random()*.45},uSurfType:{value:Ia(h.surface.type)},uSurfRough:{value:h.surface.roughness},uSurfGloss:{value:h.surface.gloss},uSurfDetail:{value:h.surface.detail},uRidgeAmount:{value:h.surface.ridgeAmount},uCrackDensity:{value:h.surface.crackDensity},uCraterScale:{value:h.surface.craterScale},uCraterDensity:{value:e.craters},uAnomalyType:{value:Ga(h.anomaly.type)},uAnomalyPos:{value:new f(Math.cos(h.anomaly.lat)*Math.cos(h.anomaly.lon),Math.sin(h.anomaly.lat),Math.cos(h.anomaly.lat)*Math.sin(h.anomaly.lon))},uAnomalySize:{value:h.anomaly.size},uAnomalyIntensity:{value:h.anomaly.intensity},uCloud:{value:o?h.clouds.density*.08:h.clouds.density},uOcDeep:{value:n(c("ocDeep"))},uOcShelf:{value:n(c("ocShelf"))},uOcTurq:{value:n(c("ocTurq"))},uOcShore:{value:n(c("ocShore"))},uLandDry:{value:n(c("landDry"))},uLandLow:{value:n(c("landLow"))},uLandHigh:{value:n(c("landHigh"))},uRock:{value:n(c("rock"))},uSnow:{value:n(c("snow"))},uCityCol:{value:l("#d9a85a")},uAtmoCol:{value:n(c("atmo"))}}})}function Ia(h){return Math.max(0,["rocky","lava","ice","sand","metal","bio","cratered","ridged","cracked","maria"].indexOf(h))}function Ga(h){return Math.max(0,["none","giant_crater","rift_zone","hotspot","dark_basin"].indexOf(h))}const mt=12,Ie=.02,Qt=5,ee=220,Y=mt+1,te=Y*Y+4*Y,Se=(()=>{const h=mt,e=Y,t=[];for(let o=0;o<h;o++)for(let n=0;n<h;n++){const l=o*e+n,c=l+1,u=l+e,d=u+1;t.push(l,c,u,c,d,u)}const s=(o,n)=>o*e+n,a=e*e,i=(o,n)=>{for(let l=0;l<h;l++){const c=o(l),u=o(l+1),d=n+l,p=n+l+1;t.push(c,d,u,u,d,p)}};return i(o=>s(0,o),a),i(o=>s(h,o),a+e),i(o=>s(o,0),a+2*e),i(o=>s(o,h),a+3*e),new Uint32Array(t)})();Se.length/3;function rt(h,e,t,s){const a=e*2-1,i=t*2-1;switch(h){case 0:s.set(1,i,-a);break;case 1:s.set(-1,i,a);break;case 2:s.set(a,1,-i);break;case 3:s.set(a,-1,i);break;case 4:s.set(a,i,1);break;default:s.set(-a,i,-1);break}return s.normalize()}function Fa(h,e,t,s,a){const i=mt,o=1/(1<<e),n=t*o,l=s*o,c=(t+1)*o,u=(s+1)*o,d=new Float32Array(te*3),p=new Float32Array(te),m=new Float32Array(te*2),v=new Float32Array(te),x=new f,C=e/Qt;let A=0;const O=(b,E,R)=>{rt(h,b,E,x),d[A*3]=x.x*a*R,d[A*3+1]=x.y*a*R,d[A*3+2]=x.z*a*R,p[A]=h,m[A*2]=b,m[A*2+1]=E,v[A]=C,A++};for(let b=0;b<Y;b++){const E=l+b/i*(u-l);for(let R=0;R<Y;R++){const z=n+R/i*(c-n);O(z,E,1)}}for(let b=0;b<Y;b++)O(n+b/i*(c-n),l,1-Ie);for(let b=0;b<Y;b++)O(n+b/i*(c-n),u,1-Ie);for(let b=0;b<Y;b++)O(n,l+b/i*(u-l),1-Ie);for(let b=0;b<Y;b++)O(c,l+b/i*(u-l),1-Ie);return{positions:d,faces:p,uvs:m,lods:v}}class _a{constructor(e){r(this,"mesh");r(this,"material");r(this,"radius",1);r(this,"targetPx",120);r(this,"cache",new Map);r(this,"leaves",[]);r(this,"lastSignature","");r(this,"projFactor",1080/(2*Math.tan(45*Math.PI/360)));r(this,"posArr",new Float32Array(ee*te*3));r(this,"faceArr",new Float32Array(ee*te));r(this,"uvArr",new Float32Array(ee*te*2));r(this,"lodArr",new Float32Array(ee*te));r(this,"idxArr",new Uint32Array(ee*Se.length));r(this,"geo");r(this,"_c",new f);r(this,"_corner",new f);r(this,"_center",new f);r(this,"_centerLocal",new f);r(this,"_sp",new At);r(this,"_m",new W);r(this,"_vp",new W);r(this,"_fr",new ms);this.material=e,this.geo=new se;const t=(a,i)=>{const o=new V(a,i);return o.setUsage(kt),o};this.geo.setAttribute("position",t(this.posArr,3)),this.geo.setAttribute("aFace",t(this.faceArr,1)),this.geo.setAttribute("aUV",t(this.uvArr,2)),this.geo.setAttribute("aLod",t(this.lodArr,1));const s=new V(this.idxArr,1);s.setUsage(kt),this.geo.setIndex(s),this.geo.setDrawRange(0,0),this.geo.boundingSphere=new At(new f,10),this.mesh=new U(this.geo,this.material),this.mesh.frustumCulled=!1}setRadius(e){this.radius=e,this.cache.clear(),this.lastSignature="__reset__"}getLeaf(e,t,s,a){const i=e<<17|t<<14|a<<7|s;let o=this.cache.get(i);return o||(o=Fa(e,t,s,a,this.radius),this.cache.set(i,o)),o}visit(e,t,s,a,i,o){const n=1/(1<<t),l=s*n,c=a*n,u=(s+1)*n,d=(a+1)*n;rt(e,(l+u)/2,(c+d)/2,this._center);let p=0;for(const C of[[l,c],[u,c],[l,d],[u,d]]){rt(e,C[0],C[1],this._corner);const A=this._corner.angleTo(this._center);A>p&&(p=A)}const m=Math.sin(p)*1.15;if(this._centerLocal.copy(this._center).multiplyScalar(this.radius),this._sp.center.copy(this._centerLocal).applyMatrix4(this._m),this._sp.radius=m*this.radius,!this._fr.intersectsSphere(this._sp))return;const v=i.distanceTo(this._sp.center),x=m*this.radius*this.projFactor/v;if(t<Qt&&x>this.targetPx&&this.leaves.length<ee){const C=s*2,A=a*2;this.visit(e,t+1,C,A,i,o),this.visit(e,t+1,C+1,A,i,o),this.visit(e,t+1,C,A+1,i,o),this.visit(e,t+1,C+1,A+1,i,o);return}this.leaves.length<ee&&this.leaves.push({face:e,depth:t,x:s,y:a,screenPx:x})}update(e,t){t&&(this.projFactor=t),this._m.multiplyMatrices(this.mesh.parent?this.mesh.parent.matrixWorld:new W,this.mesh.matrix),this._vp.multiplyMatrices(e.projectionMatrix,e.matrixWorldInverse),this._fr.setFromProjectionMatrix(this._vp);const s=e.getWorldPosition(new f),a=s.clone().normalize();this.leaves.length=0;for(let o=0;o<6;o++)this.visit(o,0,0,0,s,a);this.leaves.length>ee*.95?this.targetPx=Math.min(220,this.targetPx*1.08):this.leaves.length<ee*.5&&this.targetPx>120&&(this.targetPx=Math.max(120,this.targetPx*.97));let i="";for(const o of this.leaves)i+=(o.face<<17|o.depth<<14|o.y<<7|o.x).toString(36)+",";i!==this.lastSignature&&(this.lastSignature=i,this.fill())}fill(){let e=0,t=0;for(const s of this.leaves){const a=this.getLeaf(s.face,s.depth,s.x,s.y);this.posArr.set(a.positions,e*3),this.faceArr.set(a.faces,e),this.uvArr.set(a.uvs,e*2),this.lodArr.set(a.lods,e);for(let i=0;i<Se.length;i++)this.idxArr[t+i]=Se[i]+e;e+=te,t+=Se.length}for(const s of["position","aFace","aUV","aLod"])this.geo.getAttribute(s).needsUpdate=!0;this.geo.getIndex().needsUpdate=!0,this.geo.setDrawRange(0,t)}dispose(){this.geo.dispose()}}const Wa={O:6,B:5,A:4.2,F:3.6,G:3.2,K:2.8,M:2.4},Ha={terran:.26,ice:.24,lava:.22,gas:.52,moon:.15},Va={terran:4164170,ice:12375786,lava:16734762,gas:14198890,moon:10132122};class Na{constructor(e){r(this,"group",new F);r(this,"disposables",[]);r(this,"star",null);r(this,"starSurface",null);r(this,"starCorona",null);r(this,"starDust",null);r(this,"planets",[]);r(this,"sunLayerOpacity",1);r(this,"sunZoomFade",1);r(this,"starSpinGroup",null);r(this,"starTiltQuat",new K);r(this,"starSpinSpeed",0)}getObject(){return this.group}getSceneRadius(){return 20}getStarWorldPosition(){return this.star?this.star.getWorldPosition(new f):null}setSystem(e,t=[]){this.dispose(),this.buildStar(e),this.buildPlanets(t,e.seed),this.starDust=new Ta(e.seed),this.starDust.setOpacity(0),this.group.add(this.starDust.getObject())}rng(e){let t=2166136261;for(let s=0;s<e.length;s++)t^=e.charCodeAt(s),t=Math.imul(t,16777619)>>>0;return()=>(t=t*1664525+1013904223>>>0,t/4294967295)}update(e,t,s){var o,n,l;if(t&&this.starDust){const u=(this.star?this.star.getWorldPosition(new f):this.group.getWorldPosition(new f)).sub(t.getWorldPosition(new f));u.lengthSq()>1e-6&&this.starDust.setSunDirection(u)}if((o=this.starDust)==null||o.update(e),(n=this.starSurface)==null||n.update(e),(l=this.starCorona)==null||l.update(e),this.starSpinGroup){const c=this.starSpinSpeed*e,u=new K().setFromAxisAngle(new f(0,1,0),c);this.starSpinGroup.quaternion.copy(this.starTiltQuat).multiply(u)}const a=this.star?this.star.getWorldPosition(new f):this.group.getWorldPosition(new f),i=s??1080/(2*Math.tan(45*Math.PI/180/2));for(const c of this.planets){const u=c.phase+c.omega*e;c.spinGroup.position.set(Math.cos(u)*c.orbitRadius,0,Math.sin(u)*c.orbitRadius),c.spinGroup.rotation.y+=c.surfaceSpin;const d=c.spinGroup.getWorldPosition(new f),p=a.clone().sub(d).normalize();c.surfaceMat.uniforms.uSunDir.value.copy(p),t&&c.nanite.update(t,i)}}getMeshes(){return this.planets.map(e=>e.mesh)}pickPlanet(e){for(const t of this.planets)if(t.mesh===e)return t.planet;return null}getPlanetWorldPosition(e){for(const t of this.planets)if(t.planet.seed===e)return t.spinGroup.getWorldPosition(new f);return null}setGlobalOpacity(e){const t=Math.max(0,Math.min(1,e));this.sunLayerOpacity=t,this.applySunOpacity(),this.starDust&&this.starDust.setOpacity(t);for(const s of this.planets)s.mesh.visible=t>.005,s.ring&&(s.ring.material.opacity=.5*t,s.ring.visible=t>.005),s.orbitLine.material.opacity=.5*t}setSunFade(e){this.sunZoomFade=Math.max(0,Math.min(1,e)),this.applySunOpacity()}applySunOpacity(){var t,s;if(!this.star)return;const e=this.sunLayerOpacity*this.sunZoomFade;(t=this.starSurface)==null||t.setOpacity(e),(s=this.starCorona)==null||s.setOpacity(e),this.star.visible=e>.005,this.starCorona&&(this.starCorona.mesh.visible=e>.005)}dispose(){for(const e of this.disposables)e.dispose();this.disposables.length=0,this.star=null,this.starSpinGroup=null,this.starSurface&&(this.starSurface.dispose(),this.starSurface=null),this.starCorona&&(this.starCorona.dispose(),this.starCorona=null),this.starDust&&(this.starDust.dispose(),this.starDust=null);for(const e of this.planets)e.mesh.geometry.dispose(),e.mesh.material.dispose(),e.nanite.dispose(),e.ring&&(e.ring.geometry.dispose(),e.ring.material.dispose()),e.orbitLine.geometry.dispose(),e.orbitLine.material.dispose();for(this.planets.length=0;this.group.children.length>0;)this.group.remove(this.group.children[0])}track(e){return this.disposables.push(e),e}buildStar(e){const t=Wa[e.spectralType]??3,s=this.rng("star/"+e.seed+"/size"),a=t*(.75+s()*.6),i=this.track(new ne(a,48,32)),o=Pa(e.spectralType,e.seed);this.starSurface=o;const n=o.material;n.transparent=!0,this.star=new U(i,n);const c={width:1.28,noiseScale:3.6,flowSpeed:1.15,edgePow:2.8,baseGlow:1.7,tongueGain:1.9,breatheSpeed:.7,intensity:{O:1.5,B:1.4,A:1.25,F:1.1,G:1,K:.9,M:.8}[e.spectralType]??1};this.starCorona=Ea(a,o.material.uniforms.uRim.value,c);const u=o.material.uniforms;this.starSpinSpeed=u.uSpinEq.value;const p=u.uTilt.value.elements,m=new W().set(p[0]??0,p[3]??0,p[6]??0,0,p[1]??0,p[4]??0,p[7]??0,0,p[2]??0,p[5]??0,p[8]??0,0,0,0,0,1);this.starTiltQuat.setFromRotationMatrix(m),this.starSpinGroup=new F,this.starSpinGroup.quaternion.copy(this.starTiltQuat),this.starSpinGroup.add(this.star),this.starSpinGroup.add(this.starCorona.mesh),this.group.add(this.starSpinGroup)}buildPlanets(e,t){if(e.length===0)return;const s=this.star?this.star.geometry.parameters.radius:3;let a=s+6;const i=8,o=2.6;for(const n of e){const l=this.rng("planet/orbit/"+n.seed),c=s*Ha[n.type]*(.85+l()*.3);Va[n.type];const u=a;a+=i+c*o;const v=((n.inclinationFixed??0)/261799-.5)*2*.12,x=l()*Math.PI*2,C=.28/Math.pow(u,1.5),A=(l()<.5?-1:1)*(.0028+l()*.0024);this.rng("planet/surface/"+n.seed);const O=this.track(La(n)),b=new _a(O);b.setRadius(c);const E=b.mesh;E.renderOrder=2;const R=new F;R.rotation.z=(l()-.5)*.5,R.add(E);let z=null;if(n.type!=="moon"){const H=pt.generate(n.variant,n.seed),ie=H.physics.atmospherePressureAtm<.05;z=new Nt(c,H),z.setSunDirection(new f(1,.3,.5)),z.setCloudParams(H.clouds,H.anomaly),z.setAtmosphereIntensity(ie?0:Math.min(.65,Math.pow(H.physics.atmospherePressureAtm/3,.8)*(1-H.physics.craters*.3))),R.add(z.getObject())}let q=null;if(n.type==="gas"){const H=this.track(new fs(c*1.4,c*2.2,64)),ie=this.track(new Me({color:14205850,transparent:!0,opacity:.5,side:Ne,depthWrite:!1}));q=new U(H,ie),q.rotation.x=Math.PI/2,R.add(q)}const ae=96,Te=[];for(let H=0;H<ae;H++){const ie=H/ae*Math.PI*2;Te.push(new f(Math.cos(ie)*u,0,Math.sin(ie)*u))}const Ce=this.track(new se().setFromPoints(Te)),qe=this.track(new Ve({color:6978186,transparent:!0,opacity:.5,depthWrite:!1})),Ae=new gs(Ce,qe),re=new F;re.rotation.x=v,re.add(Ae),re.add(R),this.group.add(re),this.planets.push({planet:n,orbitRadius:u,inclination:v,phase:x,omega:C,mesh:E,orbitLine:Ae,spinSpeed:0,group:re,surfaceMat:O,ring:q,spinGroup:R,surfaceSpin:A,nanite:b});const ke=x;R.position.set(Math.cos(ke)*u,0,Math.sin(ke)*u)}}}const Ua={O:8230911,B:10071039,A:14869754,F:16774616,G:16765538,K:16754746,M:15886376};class qa{constructor(e){r(this,"group",new F);r(this,"handles",[]);r(this,"routeMesh",null);r(this,"routeMaterial");r(this,"asteroidMesh",null);r(this,"asteroidMaterial");this.seedGraph=e,this.routeMaterial=new Ve({vertexColors:!0,transparent:!0,opacity:.55,depthWrite:!1,blending:G}),this.asteroidMaterial=new Me({color:9079418,transparent:!0,opacity:.7,depthWrite:!1})}getObject(){return this.group}dispose(){var e;for(const t of this.handles)t.mesh.geometry.dispose(),t.mesh.material.dispose(),(e=t.label.material.map)==null||e.dispose(),t.label.material.dispose();for(this.routeMesh&&(this.routeMesh.geometry.dispose(),this.routeMesh=null),this.asteroidMesh&&(this.asteroidMesh.geometry.dispose(),this.asteroidMesh.material.dispose(),this.asteroidMesh=null),this.routeMaterial.dispose(),this.asteroidMaterial.dispose(),this.handles.length=0;this.group.children.length>0;)this.group.remove(this.group.children[0])}setSystemsAndRoutes(e,t){this.dispose();for(const s of e){const a=this.createSystemHandle(s);this.handles.push(a),this.group.add(a.mesh),this.group.add(a.label)}this.buildRoutes(t),this.buildAsteroids(e)}pickSystem(e){for(const t of this.handles)if(t.mesh===e||t.label===e)return t.system;return null}getMeshes(){return this.handles.map(e=>e.mesh)}findSystemWorldPosition(e){for(const t of this.handles)if(t.system.seed===e)return t.mesh.getWorldPosition(new f);return null}setSystemLabelVisible(e,t){for(const s of this.handles)s.system.seed===e&&(s.label.visible=t)}setGlobalOpacity(e){const t=Math.max(0,Math.min(1,e));for(const s of this.handles)s.mesh.material.opacity=t,s.label.material.opacity=t;this.routeMaterial.opacity=.5*t,this.asteroidMaterial.opacity=.7*t}updateLabelScales(e){for(const s of this.handles){const a=s.system,i=Math.max(8,Math.hypot(e.x-a.x,e.y-a.y,e.z-a.z)),o=Math.min(1.6,Math.max(1,Math.pow(190/i,.3)));s.label.scale.set(.105*o,.02*o,1)}}createSystemHandle(e){const s=.4+this.seedGraph.rng("system/render/"+e.seed)()*.3,a=Ua[e.spectralType],i=new ne(s,12,8),o=new Me({color:a,transparent:!0,depthWrite:!1}),n=new U(i,o);n.position.set(e.x,e.y,e.z);const l=this.makeLabel(e.name,e.spectralType);return l.position.set(e.x,e.y+s+.3,e.z),{system:e,mesh:n,label:l}}makeLabel(e,t){const s=document.createElement("canvas");s.width=256,s.height=48;const a=s.getContext("2d");if(!a)throw new Error("Canvas 2D context unavailable.");a.fillStyle="rgba(0,0,0,0)",a.fillRect(0,0,s.width,s.height),a.font="bold 22px system-ui",a.fillStyle="#eaf2ff",a.textAlign="center",a.textBaseline="middle",a.fillText(e,s.width/2,s.height/2-4),a.font="14px system-ui",a.fillStyle="#7f96c0",a.fillText(t+"-class",s.width/2,s.height/2+12);const i=new N(s),o=new X({map:i,transparent:!0,depthWrite:!1,sizeAttenuation:!1}),n=new Z(o);return n.scale.set(.105,.02,1),n}buildRoutes(e){if(e.length===0)return;let t=0;for(const c of e)t+=Math.max(0,c.points.length-1);const s=new Float32Array(t*6),a=[9067765,3528936,10134728],i=new Float32Array(t*6),o=new k;let n=0;for(const c of e){o.setHex(a[(c.from+c.to)%a.length]??a[0]);for(let u=0;u<c.points.length-1;u++){const d=c.points[u],p=c.points[u+1];s[n]=d.x,s[n+1]=d.y,s[n+2]=d.z,s[n+3]=p.x,s[n+4]=p.y,s[n+5]=p.z,i[n]=o.r*.85,i[n+1]=o.g*.85,i[n+2]=o.b*.85,i[n+3]=o.r,i[n+4]=o.g,i[n+5]=o.b,n+=6}}const l=new se;l.setAttribute("position",new V(s,3)),l.setAttribute("color",new V(i,3)),this.routeMesh=new ct(l,this.routeMaterial),this.routeMesh.renderOrder=-1,this.group.add(this.routeMesh)}buildAsteroids(e){const t=this.seedGraph.rng("galaxy/asteroids"),s=30+Math.floor(t()*40),a=new ys(.15,0);this.asteroidMesh=new vs(a,this.asteroidMaterial,s);const i=new W,o=new f,n=new K,l=new f,c=e.reduce((m,v)=>Math.min(m,v.x),0)-10,u=e.reduce((m,v)=>Math.max(m,v.x),0)+10,d=e.reduce((m,v)=>Math.min(m,v.z),0)-10,p=e.reduce((m,v)=>Math.max(m,v.z),0)+10;for(let m=0;m<s;m++){o.set(c+t()*(u-c),(t()-.5)*4,d+t()*(p-d)),n.setFromEuler(new Ge(t()*Math.PI*2,t()*Math.PI*2,t()*Math.PI*2));const v=.6+t()*.8;l.set(v,v,v),i.compose(o,n,l),this.asteroidMesh.setMatrixAt(m,i)}this.asteroidMesh.instanceMatrix.needsUpdate=!0,this.group.add(this.asteroidMesh)}}class Qa{constructor(){r(this,"scene",new Ft);r(this,"seedGraph",new ut);r(this,"universeRenderer");r(this,"galaxyLayer",null);r(this,"galaxySprite",null);r(this,"galaxyDust",null);r(this,"mortisGalaxy",null);r(this,"systemsRenderer",null);r(this,"systemLayer",null);r(this,"systemRenderer",null);r(this,"innerMapLayer",null);r(this,"innerMapRenderer",null);r(this,"innerMapScale",.02);r(this,"beacon",null);r(this,"planetLayer",null);r(this,"surfaceRenderer",null);r(this,"atmosphere",null);r(this,"clouds");r(this,"weather");r(this,"galaxySpinEnabled",!0);r(this,"galaxySpinSpeed",.02);r(this,"time",0);r(this,"weatherCameraPos",null);r(this,"systemCameraPos",null);r(this,"systemCamera",null);r(this,"lastBackdropOpacity",0);r(this,"lastSystemOpacity",1);r(this,"lastSystemsMapOpacity",1);r(this,"weatherEnabled",!0);this.scene.background=new k(65795),this.weather=new ma,this.scene.add(this.weather.getObject());const e=this.seedGraph.rng("fx/volumetric-clouds");this.clouds=new da(e),this.scene.add(this.clouds.getObject()),this.universeRenderer=new nt(this.seedGraph),this.scene.add(this.universeRenderer.getObject())}setCameraPosition(e){this.weatherCameraPos=e.clone()}setSystemCamera(e){this.systemCameraPos=e.position.clone(),this.systemCamera=e}setAttractorOpacity(e){}getUniverseRenderer(){return this.universeRenderer}setUniverseOpacity(e){this.universeRenderer.setGlobalOpacity(e)}setSystemLabelHidden(e){var t;(t=this.systemsRenderer)==null||t.setSystemLabelVisible(e,!1)}getBackdropOpacity(){return this.lastBackdropOpacity}getSystemLayerOpacity(){return this.lastSystemOpacity}getSystemsMapOpacity(){return this.lastSystemsMapOpacity}showGalaxy(e,t,s){this.hideGalaxy();const a=new F;a.position.set(e.x,e.y,e.z),a.rotation.x=-Math.PI/2;const i=dt.create(this.seedGraph,e.seed),o=new pe(i,e.radius,this.seedGraph.hash("galaxy/"+e.seed+"/mortis/build"),this.seedGraph);o.setOpacity(0),a.add(o.getObject()),this.mortisGalaxy=o,this.galaxySpinSpeed=-i.spinSpeed*.12,this.galaxySpinEnabled=!0;const n=this.makeGalaxySprite(e);a.add(n),this.galaxySprite=n,this.systemsRenderer=new qa(this.seedGraph),this.systemsRenderer.setSystemsAndRoutes(t,s),this.systemsRenderer.setGlobalOpacity(0),a.add(this.systemsRenderer.getObject()),a.rotation.y=0,this.galaxyLayer=a,this.scene.add(a)}setGalaxyOpacity(e){const t=w.clamp(e,0,1);this.mortisGalaxy&&this.mortisGalaxy.setOpacity(t),this.galaxySprite&&(this.galaxySprite.material.opacity=t*.35),this.systemsRenderer&&this.systemsRenderer.setGlobalOpacity(t)}setGalaxyBackdropOpacity(e){const t=w.clamp(e,0,1);this.lastBackdropOpacity=t,this.mortisGalaxy&&this.mortisGalaxy.setOpacity(t),this.galaxySprite&&(this.galaxySprite.material.opacity=t*.35)}setSystemsMapOpacity(e){const t=w.clamp(e,0,1);this.lastSystemsMapOpacity=t,this.systemsRenderer&&this.systemsRenderer.setGlobalOpacity(t)}getSystemsRenderer(){return this.systemsRenderer}getGalaxyLayer(){return this.galaxyLayer}findSystemsMapPosition(e){return this.systemsRenderer?this.systemsRenderer.findSystemWorldPosition(e):null}getSystemDeployPos(e,t,s){const a=this.galaxyLayer;if(!a)return e.clone();const i=e.distanceTo(a.position);if(i<1e-6)return e.clone();const o=e.clone().sub(a.position).divideScalar(i),n=a.position.clone().addScaledVector(o,i*10);if(!t||!s||s<=0)return n;const l=e.clone().sub(t);return l.lengthSq()<1e-6?n:t.clone().addScaledVector(l.normalize(),s)}showSystemAt(e,t,s,a,i=[]){this.hideSystem();const o=new F;o.position.copy(a),this.systemRenderer=new Na(this.seedGraph),this.systemRenderer.setSystem({spectralType:t,seed:s},i),this.systemRenderer.setGlobalOpacity(0),o.add(this.systemRenderer.getObject()),this.systemLayer=o,this.scene.add(o),this.galaxySpinEnabled=!1}setSystemOpacity(e){const t=w.clamp(e,0,1);this.lastSystemOpacity=t,this.systemRenderer&&this.systemRenderer.setGlobalOpacity(t)}setSunFade(e){var t;(t=this.systemRenderer)==null||t.setSunFade(e)}getSystemRenderer(){return this.systemRenderer}getSystemLayer(){return this.systemLayer}showInnerMap(e){this.hideInnerMap();const t=new F;return t.position.copy(e),t.scale.setScalar(this.innerMapScale),this.innerMapRenderer=new nt(this.seedGraph),t.add(this.innerMapRenderer.getObject()),this.innerMapLayer=t,this.scene.add(t),this.innerMapRenderer}getInnerMapRenderer(){return this.innerMapRenderer}getInnerMapScale(){return this.innerMapScale}innerMapToWorld(e){return this.innerMapLayer?(this.innerMapLayer.updateMatrixWorld(),e.clone().applyMatrix4(this.innerMapLayer.matrixWorld)):e.clone()}setInnerMapOpacity(e){const t=w.clamp(e,0,1);this.innerMapRenderer&&this.innerMapRenderer.setGlobalOpacity(t)}hideInnerMap(){this.innerMapLayer&&(this.scene.remove(this.innerMapLayer),this.innerMapLayer=null),this.innerMapRenderer&&(this.innerMapRenderer.dispose(),this.innerMapRenderer=null)}showBeacon(e){this.hideBeacon();const t=new X({color:16765562,sizeAttenuation:!1,transparent:!0,opacity:0,depthTest:!1});this.beacon=new Z(t),this.beacon.scale.setScalar(.018),this.beacon.position.copy(e),this.beacon.renderOrder=999,this.scene.add(this.beacon)}setBeaconOpacity(e){this.beacon&&(this.beacon.material.opacity=w.clamp(e,0,1))}hideBeacon(){var e,t;if(this.beacon){const s=this.beacon.material;(e=s.map)==null||e.dispose(),s.dispose(),(t=this.beacon.parent)==null||t.remove(this.beacon),this.beacon=null}}showPlanet(e,t,s){this.hidePlanet();const a=new F;a.position.copy(t),this.surfaceRenderer=new va(this.seedGraph),this.surfaceRenderer.setPlanet(e),this.surfaceRenderer.setGlobalOpacity(0),s.length>0&&this.surfaceRenderer.setColony(s,2,3,2,2,4),a.add(this.surfaceRenderer.getObject());const i=pt.generate(e.variant,e.seed),o=i.physics.atmospherePressureAtm<.05;this.atmosphere=new Nt(xe,i),this.atmosphere.setSunDirection(new f(1,.3,.5)),this.atmosphere.setCloudParams(i.clouds,i.anomaly),this.atmosphere.setAtmosphereIntensity(o?0:Math.min(.65,Math.pow(i.physics.atmospherePressureAtm/3,.8)*(1-i.physics.craters*.3))),this.atmosphere.setAtmosphereOpacity(0),this.atmosphere.setCloudOpacity(0),a.add(this.atmosphere.getObject()),this.planetLayer=a,this.scene.add(a)}setSunDirection(e){var a;const t=e.clone().normalize(),s=this.getSurfaceRenderer();s==null||s.setSunDirection(t),(a=this.atmosphere)==null||a.setSunDirection(t)}setPlanetOpacity(e){this.surfaceRenderer&&this.surfaceRenderer.setGlobalOpacity(w.clamp(e,0,1))}setAtmosphereOpacity(e,t){var s,a;(s=this.atmosphere)==null||s.setAtmosphereOpacity(w.clamp(e,0,1.5)),(a=this.atmosphere)==null||a.setCloudOpacity(w.clamp(t,0,1))}deployClouds(e,t){this.clouds.deploy(e,t)}updateCloudProgress(e,t){this.clouds.updateProgress(e,t)}retractClouds(){this.clouds.retract()}setWeather(e){this.weather.setWeather(e)}setWeatherEnabled(e){this.weatherEnabled=e,e||this.weather.setWeather("none")}isWeatherEnabled(){return this.weatherEnabled}getSurfaceRenderer(){return this.surfaceRenderer}getPlanetLayer(){return this.planetLayer}getPlanetWorldCenter(){return this.planetLayer?this.planetLayer.position.clone():new f}hideGalaxy(){this.galaxyLayer&&(this.scene.remove(this.galaxyLayer),this.galaxyLayer=null),this.systemsRenderer&&(this.systemsRenderer.dispose(),this.systemsRenderer=null),this.galaxyDust&&(this.galaxyDust.dispose(),this.galaxyDust=null),this.mortisGalaxy&&(this.mortisGalaxy.dispose(),this.mortisGalaxy=null),this.galaxySprite=null,this.hideSystem()}hideSystem(){var e;this.systemLayer&&((e=this.systemLayer.parent)==null||e.remove(this.systemLayer),this.systemLayer=null),this.systemRenderer&&(this.systemRenderer.dispose(),this.systemRenderer=null),this.galaxySpinEnabled=!0}hidePlanet(){this.planetLayer&&(this.scene.remove(this.planetLayer),this.planetLayer=null),this.surfaceRenderer&&(this.surfaceRenderer.dispose(),this.surfaceRenderer=null),this.atmosphere&&(this.atmosphere.dispose(),this.atmosphere=null)}update(e){var t,s;this.time+=e,this.galaxyLayer&&this.galaxySpinEnabled&&(this.galaxyLayer.rotation.z+=this.galaxySpinSpeed*e),this.mortisGalaxy&&this.mortisGalaxy.update(e),this.systemRenderer&&this.systemRenderer.update(this.time,this.systemCamera??void 0),(t=this.atmosphere)==null||t.update(e),(s=this.getSurfaceRenderer())==null||s.update(e),this.weatherCameraPos&&this.weather.update(e,this.weatherCameraPos),this.universeRenderer.update(e)}get planetRadius(){return xe}makeGalaxySprite(e){const t=document.createElement("canvas");t.width=256,t.height=256;const s=t.getContext("2d");if(!s)throw new Error("Canvas 2D unavailable.");const a=s.createRadialGradient(128,128,0,128,128,128);a.addColorStop(0,"rgba(255,240,210,0.9)"),a.addColorStop(.4,"rgba(160,180,255,0.35)"),a.addColorStop(1,"rgba(120,140,220,0)"),s.fillStyle=a,s.fillRect(0,0,256,256);const i=new N(t),o=new X({map:i,transparent:!0,depthWrite:!1,blending:G}),n=new Z(o),l=e.radius*2.6;return n.scale.set(l,l,1),n}}const Ka=new f(500,3920,-1500),_e=class _e{constructor(e,t,s){r(this,"world",new Qa);r(this,"locations");r(this,"callbacks");r(this,"transition",new Vs);r(this,"fx",new Rs);r(this,"postFx",null);r(this,"universeMap");r(this,"mode","universe-map");r(this,"busy",!1);r(this,"breakthroughDone",!1);r(this,"cloudsDeployed",!1);r(this,"activeGalaxy",null);r(this,"activeSystem",null);r(this,"activePlanet",null);r(this,"activeSystemRadius",60);r(this,"systemGalaxyMap",null);r(this,"innerSeed",null);r(this,"universePose",null);r(this,"systemPose",null);this.universeSeed=e,this.client=t,this.callbacks=s,this.locations=new ht(e),this.universeMap=new zt(e,t,this.world.seedGraph,this.world.getUniverseRenderer())}getScene(){return this.world.scene}getCurrentMode(){return this.mode}getBreadcrumb(){return this.locations.breadcrumb()}getCurrentLocation(){return this.locations.current}getLocationPath(){return this.locations.path()}getGalaxyCount(){return this.universeMap.getGalaxyCount()}getSystemCount(){const e=this.world.getSystemsRenderer();return this.mode==="galaxy-systems"&&e?e.getMeshes().length:0}getPlanetCount(){const e=this.world.getSystemRenderer();return this.mode==="star-system"&&e?e.getMeshes().length:0}getBuildingCount(){return 0}isTransitioning(){return this.transition.isTransitioning()||this.busy}getActiveGalaxy(){return this.activeGalaxy}getActiveSystem(){return this.activeSystem}getActiveSystemCenter(){const e=this.world.getSystemRenderer();return e?e.getStarWorldPosition():null}getActiveSystemRadius(){return this.activeSystemRadius??60}getActiveSystemDistance(){return this.getActiveSystemRadius()*2.4}getPickableObjects(){var e,t,s,a;return this.isTransitioning()?[]:this.mode==="star-system"?[...((e=this.world.getSystemRenderer())==null?void 0:e.getMeshes())??[],...((t=this.world.getInnerMapRenderer())==null?void 0:t.getMeshes())??[]]:this.mode==="galaxy-systems"?((s=this.world.getSystemsRenderer())==null?void 0:s.getMeshes())??[]:this.mode==="universe-map"?this.world.getUniverseRenderer().getMeshes():this.mode==="system-galaxies"?((a=this.world.getInnerMapRenderer())==null?void 0:a.getMeshes())??[]:[]}pickObject(e){var t,s,a,i;if(this.isTransitioning())return null;if(this.mode==="star-system"){const o=(t=this.world.getInnerMapRenderer())==null?void 0:t.pickGalaxy(e);return o||(((s=this.world.getSystemRenderer())==null?void 0:s.pickPlanet(e))??null)}return this.mode==="galaxy-systems"?((a=this.world.getSystemsRenderer())==null?void 0:a.pickSystem(e))??null:this.mode==="universe-map"?this.world.getUniverseRenderer().pickGalaxy(e)??null:this.mode==="system-galaxies"?((i=this.world.getInnerMapRenderer())==null?void 0:i.pickGalaxy(e))??null:null}async update(e,t){return this.transition.update(t,e),this.world.setCameraPosition(e.position),this.world.setSystemCamera(e),this.world.update(t),this.isTransitioning()?0:(this.mode==="star-system"&&this.updateGalaxyVisibilityByZoom(e),this.mode==="universe-map"?this.universeMap.update(e):(this.mode==="star-system"||this.mode==="system-galaxies")&&this.systemGalaxyMap&&this.innerSeed!==null?this.systemGalaxyMap.update(e):0)}updateGalaxyVisibilityByZoom(e){const t=this.world.getSystemRenderer(),s=this.getActiveSystemCenter();if(!t||!s)return;const a=e.position.distanceTo(s),i=Math.max(1,this.getActiveSystemRadius()),o=a/i,n=w.clamp((o-4.2)/(9.5-4.2),0,1);this.world.setSunFade(1-n*n*(3-2*n)*.55);const l=w.clamp((o-3.2)/(6.5-3.2),0,1);this.world.setGalaxyBackdropOpacity(l*l*(3-2*l))}setPostFx(e){this.postFx=e}flyDuration(e,t){const s=e.distanceTo(t);return w.clamp(s/3400,1.6,4.5)}capturePose(e){return{position:e.position.clone(),quaternion:e.quaternion.clone()}}applyDepthOfField(e){const t=this.postFx;t&&t.clearFocus()}async enterGalaxy(e,t){if(!(this.mode!=="universe-map"||this.isTransitioning())){this.busy=!0;try{this.universePose=this.capturePose(t);const s=await this.client.getStarSystems(e.seed,e.radius),a=t.position.clone(),i=w.degToRad(63),o=e.radius*2.4,n=new f(e.x,e.y+Math.sin(i)*o,e.z+Math.cos(i)*o);this.transition.start({duration:this.flyDuration(a,n),start:a,end:n,lookAt:new f(e.x,e.y,e.z),fovFrom:t.fov,fovTo:55,onProgress:l=>{this.world.setAttractorOpacity(1-w.clamp(l/.45,0,1)),this.world.setUniverseOpacity(1-w.clamp(l/.55,0,1)),this.world.setGalaxyBackdropOpacity(w.clamp((l-.35)/.65,0,1)),this.world.setSystemsMapOpacity(w.clamp((l-.55)/.45,0,1))}},()=>{this.world.showGalaxy(e,s.data.systems,s.data.routes),this.world.setGalaxyBackdropOpacity(0),this.world.setSystemsMapOpacity(0)},()=>{var l,c;this.busy=!1,this.activeGalaxy=e,this.mode="galaxy-systems",this.locations.push({kind:"galaxy",seed:e.seed,name:e.name,type:e.type}),(c=(l=this.callbacks).onGalaxySelected)==null||c.call(l,e)})}catch(s){this.busy=!1,console.error("Failed to enter galaxy:",s)}}}async enterSystem(e,t){if(!(this.mode!=="galaxy-systems"||this.isTransitioning()||!this.activeGalaxy)){this.busy=!0;try{const s=await this.client.getPlanets(e.seed,e.planetCount),a=this.world.getGalaxyLayer(),i=(a==null?void 0:a.position.clone())??new f,o=this.world.findSystemsMapPosition(e.seed)??i.clone(),n=t.position.clone(),c=o.clone().sub(n).clone().normalize(),u=Math.max(0,_e.REFERENCE_SPAN-n.distanceTo(i)),d=o.clone().addScaledVector(c,u),m={O:6,B:5,A:4.2,F:3.6,G:3.2,K:2.8,M:2.4}[e.spectralType]??3,v=Math.max(1,s.data.planets.length),x=Math.max(7,m*1.6);let C=m+6+(v-1)*x+4;this.activeSystemRadius=C;const A=w.degToRad(63),O=C*2.4,b=new f(d.x,d.y+Math.sin(A)*O,d.z+Math.cos(A)*O);this.transition.start({duration:this.flyDuration(n,b),start:n,end:b,trackLookAt:d.clone(),fovFrom:t.fov,fovTo:55,progressRaw:!0,onProgress:E=>{this.world.setSystemsMapOpacity(1-w.clamp(E/.1,0,1)),this.world.setGalaxyBackdropOpacity(1-w.clamp((E-.15)/.55,0,1)),this.world.setSystemOpacity(w.clamp((E-.25)/.75,0,1))}},()=>{this.world.showSystemAt(e,e.spectralType,e.seed,d,s.data.planets),this.world.setSystemOpacity(0),this.world.hideBeacon(),this.world.setSystemLabelHidden(e.seed)},()=>{var R,z;this.busy=!1,this.activeSystem=e;const E=this.activeGalaxy;E&&((z=(R=this.callbacks).onSystemSelected)==null||z.call(R,E,e)),this.mode="star-system",this.locations.push({kind:"system",seed:e.seed,name:e.name,spectralType:e.spectralType}),this.world.setSystemOpacity(1),this.world.setSunFade(1),this.world.setSystemsMapOpacity(0),this.world.setGalaxyBackdropOpacity(0),this.world.hideBeacon()})}catch(s){this.busy=!1,console.error("Failed to enter system:",s)}}}async enterPlanet(e,t){var i;if(this.mode!=="star-system"||this.isTransitioning())return;const s=this.world.getSystemRenderer();if(!s)return;const a=s.getPlanetWorldPosition(e.seed);if(a){this.busy=!0;try{let o=[];try{o=(await this.client.getColonyArea({planetSeed:e.seed,face:2,depth:3,x:2,y:2,size:4})).data.buildings}catch{o=[]}const n=t.position.clone(),l=w.degToRad(63),c=10*2.4,u=new f(a.x,a.y+Math.sin(l)*c,a.z+Math.cos(l)*c),d=(i=this.world.getSystemRenderer())==null?void 0:i.getStarWorldPosition(),p=d?a.clone().sub(d).normalize():new f(1,.3,.5).normalize();this.world.setSunDirection(p),this.transition.start({duration:this.flyDuration(n,u),start:n,end:u,trackLookAt:a.clone(),fovFrom:t.fov,fovTo:55,progressRaw:!0,onProgress:m=>{this.world.setSystemOpacity(1-w.clamp((m-.25)/.75,0,1)),this.world.setPlanetOpacity(w.clamp((m-.25)/.75,0,1)),this.world.setAtmosphereOpacity(w.clamp((m-.4)/.6,0,1.5),w.clamp((m-.4)/.6,0,1))}},()=>{this.world.showPlanet(e,a.clone(),o),this.world.setPlanetOpacity(0),this.world.setAtmosphereOpacity(0,0)},()=>{this.busy=!1,this.activePlanet=e,this.mode="planet-surface",this.locations.push({kind:"planet",seed:e.seed,index:e.index,type:e.type}),this.world.setPlanetOpacity(1),this.world.setAtmosphereOpacity(1,e.type==="gas"?0:1),e.type==="terran"||e.type==="ice"?this.world.setWeather(e.type==="ice"?"snow":"rain"):this.world.setWeather("none")})}catch(o){this.busy=!1,console.error("Failed to enter planet:",o)}}}async enterSystemGalaxy(e,t){if(!(this.mode!=="system-galaxies"&&this.mode!=="star-system")&&!(this.isTransitioning()||!this.world.getInnerMapRenderer())){this.busy=!0;try{const s=await this.client.getStarSystems(e.seed,e.radius);this.universePose=null;const a=t.position.clone(),i=this.world.innerMapToWorld(new f(e.x,e.y,e.z)),o=e.radius*2.4,n=w.degToRad(63),l=new f(i.x,i.y+Math.sin(n)*o,i.z+Math.cos(n)*o);this.transition.start({duration:this.flyDuration(a,l),start:a,end:l,trackLookAt:i.clone(),fovFrom:t.fov,fovTo:55,onProgress:c=>{this.world.setInnerMapOpacity(w.clamp((c-.35)/.65,0,1))}},()=>{},()=>{var c,u;this.busy=!1,this.mode="galaxy-systems",this.locations.push({kind:"galaxy",seed:e.seed,name:e.name,type:e.type}),(u=(c=this.callbacks).onGalaxySelected)==null||u.call(c,e)})}catch(s){this.busy=!1,console.error("Failed to enter system galaxy:",s)}}}returnToSystem(e,t){if(this.mode!=="planet-surface"||this.transition.isTransitioning())return;let s,a;if(t){const l=Math.cos(t.pitch),c=Math.sin(t.pitch);s=new f(t.target.x,t.target.y+t.distance*c,t.target.z+t.distance*l);const u=new W().lookAt(s,t.target,new f(0,1,0));a=new K().setFromRotationMatrix(u)}else{const l=this.systemPose;s=l?l.position.clone():e.position.clone(),a=l?l.quaternion:void 0}const i=e.position.clone(),o=new f().subVectors(s,i).cross(new f(0,1,0)).normalize(),n=i.clone().lerp(s,.4).add(o.multiplyScalar(i.distanceTo(s)*.25));this.transition.start({duration:this.flyDuration(i,s),start:i,end:s,control:n,endQuaternion:a,fovFrom:e.fov,fovTo:55,shakeHead:.04,onProgress:l=>{this.world.setPlanetOpacity(1-w.clamp(l/.6,0,1)),this.world.setSystemOpacity(w.clamp((l-.4)/.6,0,1)),l<.3?this.fx.setPlasma(Math.sin(l/.3*Math.PI)*.8):this.fx.setPlasma(0),l>.25&&this.world.setWeather("none")}},void 0,()=>{this.world.hidePlanet(),this.mode="star-system",this.locations.popTo("system"),this.fx.clear()})}returnToGalaxy(e,t){if(this.mode!=="star-system"||this.transition.isTransitioning())return;let s,a;const i=this.activeGalaxy;if(i){const n=i.radius*2.4,l=w.degToRad(63),c=new f(i.x,i.y,i.z);s=new f(i.x,i.y+Math.sin(l)*n,i.z+Math.cos(l)*n);const u=new W().lookAt(s,c,new f(0,1,0));a=new K().setFromRotationMatrix(u)}else if(t){const n=Math.cos(t.pitch),l=Math.sin(t.pitch);s=new f(t.target.x,t.target.y+t.distance*l,t.target.z+t.distance*n);const c=new W().lookAt(s,t.target,new f(0,1,0));a=new K().setFromRotationMatrix(c)}else s=e.position.clone();const o=e.position.clone();this.transition.start({duration:this.flyDuration(o,s),start:o,end:s,endQuaternion:a,fovFrom:e.fov,fovTo:55,onProgress:n=>{this.world.setSystemOpacity(1-w.clamp(n/.55,0,1)),this.world.setGalaxyBackdropOpacity(w.clamp((n-.35)/.65,0,1)),this.world.setSystemsMapOpacity(w.clamp((n-.55)/.45,0,1))}},void 0,()=>{this.world.hideSystem(),this.world.hideBeacon(),this.exitInnerMap(),this.mode="galaxy-systems",this.locations.popTo("galaxy")})}returnToUniverseMap(e,t){var n;if(this.mode!=="galaxy-systems"||this.transition.isTransitioning())return;const s=t?new f(t.target.x,t.target.y+Math.sin(w.degToRad(63))*t.distance,t.target.z+Math.cos(w.degToRad(63))*t.distance):((n=this.universePose)==null?void 0:n.position.clone())??Ka.clone(),a=e.position.clone(),i=new f().subVectors(s,a).cross(new f(0,1,0)).normalize(),o=a.clone().lerp(s,.45).add(new f(0,a.distanceTo(s)*.18,0)).add(i.multiplyScalar(a.distanceTo(s)*.15));this.transition.start({duration:this.flyDuration(a,s),start:a,end:s,control:o,endQuaternion:new K().setFromRotationMatrix(new W().lookAt(s,s.clone().add(new f(0,-Math.sin(w.degToRad(63)),-Math.cos(w.degToRad(63)))),new f(0,1,0))),fovFrom:e.fov,fovTo:60,onProgress:l=>{this.world.setSystemsMapOpacity(1-w.clamp(l/.5,0,1)),this.world.setGalaxyBackdropOpacity(1-w.clamp((l-.25)/.75,0,1)),this.world.setUniverseOpacity(w.clamp((l-.45)/.55,0,1)),this.world.setAttractorOpacity(w.clamp((l-.45)/.55,0,1))}},void 0,()=>{this.world.hideGalaxy(),this.exitInnerMap(),this.mode="universe-map",this.locations.popTo("universe")})}enterInnerMap(e){var a;this.innerSeed=e.seed;const t=((a=this.world.getSystemLayer())==null?void 0:a.position)??new f,s=this.world.showInnerMap(t);s.setGlobalOpacity(1),this.systemGalaxyMap=new zt(this.universeSeed,this.client,this.world.seedGraph,s,()=>e.seed),this.systemGalaxyMap.setFrame(t.x,t.z,this.world.getInnerMapScale())}exitInnerMap(){this.systemGalaxyMap&&(this.systemGalaxyMap.dispose(),this.systemGalaxyMap=null),this.innerSeed=null,this.world.hideInnerMap()}hasInnerMap(){return this.innerSeed!==null}dispose(){this.universeMap.dispose(),this.exitInnerMap(),this.world.hideGalaxy()}};r(_e,"REFERENCE_SPAN",5798.4);let lt=_e;class Kt{constructor(e){r(this,"renderer");r(this,"camera");r(this,"sceneManager");r(this,"controller");r(this,"orbit",new it);r(this,"systemOrbit",new ot);r(this,"postFx");r(this,"dust");r(this,"raycaster",new xs);r(this,"pointer",new _t);r(this,"lastTime",0);r(this,"frameNo",0);r(this,"running",!0);r(this,"selected",null);r(this,"count",0);r(this,"lastCrumb","");r(this,"wasTransitioning",!1);r(this,"prevCamPos",new f);r(this,"prevCamPosValid",!1);r(this,"dbgEl",null);r(this,"pxSamples","n/a");r(this,"fxToggles",{bloom:!0,aberration:!1,dust:!0,weather:!0,dof:!1,postMaster:!0});r(this,"fxPanel",null);r(this,"postIntensity",1);r(this,"loop",e=>{if(this.running)try{this.frame(e)}catch(t){this.running=!1;const s=t instanceof Error?`${t.message} | ${t.stack??""}`:String(t);this.dbgEl?this.dbgEl.textContent="LOOP-ERROR: "+s.slice(0,500):console.error("LOOP-ERROR:",t)}});r(this,"frame",e=>{var c;const t=this.lastTime===0?0:Math.min(.1,(e-this.lastTime)/1e3);this.lastTime=e,this.frameNo++;const s=this.sceneManager.getCurrentMode(),a=s==="universe-map"&&!this.sceneManager.isTransitioning()&&this.controller.isActive(),i=s==="galaxy-systems"&&!this.sceneManager.isTransitioning()&&this.orbit.isActive(),o=s==="star-system"&&!this.sceneManager.isTransitioning()&&this.systemOrbit.isActive();if(a)this.controller.update(t,this.camera),this.dust.intensity=0,this.postFx.aberration=0,this.sceneManager.world.getUniverseRenderer().updateLabelScales(this.camera.position);else if(i)this.orbit.update(t,this.camera),this.dust.intensity=0,this.postFx.aberration=0,(c=this.sceneManager.world.getSystemsRenderer())==null||c.updateLabelScales(this.camera.position);else if(o)this.systemOrbit.update(t,this.camera),this.dust.intensity=0,this.postFx.aberration=0;else{const u=this.controller.getSpeed();this.fxToggles.dust&&(this.dust.intensity=u),this.fxToggles.aberration&&(this.postFx.aberration=w.clamp((u-60)/340,0,1))}const n=this.prevCamPosValid?this.camera.position.distanceTo(this.prevCamPos)/Math.max(t,1e-4):0;!a&&!i&&!o&&this.fxToggles.dust&&(this.dust.intensity=Math.max(this.dust.intensity,w.clamp((n-12)*2.2,0,400))),this.prevCamPos.copy(this.camera.position),this.prevCamPosValid=!0,this.dust.update(t,this.camera.position),this.sceneManager.update(this.camera,t).then(u=>{if(this.sceneManager.isTransitioning())this.orbit.detach(),this.systemOrbit.detach(),this.controller.setEnabled(!1);else{const p=this.sceneManager.getCurrentMode();if(p==="galaxy-systems"){const m=this.sceneManager.getActiveGalaxy();m&&this.orbit.attach(m,this.renderer.domElement)}else if(p==="star-system"||p==="system-galaxies"){const m=this.sceneManager.getActiveSystemCenter();m&&this.systemOrbit.attach(m,this.sceneManager.getActiveSystemRadius(),this.sceneManager.getActiveSystemDistance(),this.renderer.domElement)}else this.systemOrbit.detach();p!=="galaxy-systems"&&this.orbit.detach(),this.controller.setEnabled(p==="universe-map")}if(this.wasTransitioning&&!this.sceneManager.isTransitioning()&&(this.sceneManager.getCurrentMode()==="universe-map"&&(this.controller.attach(this.renderer.domElement),this.controller.resetTilt()),this.sceneManager.applyDepthOfField(this.camera),this.updateHud()),this.wasTransitioning=this.sceneManager.isTransitioning(),this.dbgEl){const p=this.renderer.info.render,m=this.camera.position;let v=0,x=0;const C=new Set;this.sceneManager.getScene().traverse(b=>{if(b.isSprite){v++,b.visible&&x++;const E=b.material;C.add(`${E.opacity.toFixed(2)}${E.map?"":":NO-MAP"}`)}});let A=0;const O=new f;for(const b of this.sceneManager.world.getUniverseRenderer().getMeshes())O.copy(b.position).project(this.camera),O.x>=-1&&O.x<=1&&O.y>=-1&&O.y<=1&&O.z<1&&A++;this.dbgEl.textContent=`sceneChildren=${this.sceneManager.getScene().children.length}
galaxies=${u} drawCalls=${p.calls} inFrame=${A}
sprites=${v} visible=${x}
opacity=[${Array.from(C).slice(0,4).join(" | ")}] px[${this.pxSamples}]cam=(${m.x.toFixed(0)}, ${m.y.toFixed(0)}, ${m.z.toFixed(0)}) yaw=${w.radToDeg(new Ge().setFromQuaternion(this.camera.quaternion,"ZXY").z).toFixed(0)} pitch=${w.radToDeg(new Ge().setFromQuaternion(this.camera.quaternion,"ZXY").x).toFixed(0)}`+(()=>{if(s==="star-system"){const b=this.systemOrbit.getFocus().distance,E=this.sceneManager.getActiveSystemRadius()??0;return`
dist=${b.toFixed(0)} (${(E>0?b/E:0).toFixed(1)}xR)`}return""})()}const d=this.sceneManager.getBreadcrumb();(u!==this.count||d!==this.lastCrumb)&&(this.count=u,this.lastCrumb=d,this.updateHud())}).catch(u=>{if(console.error("Scene update failed:",u),this.dbgEl){const d=u instanceof Error?`${u.message} | ${u.stack??""}`:String(u);this.dbgEl.textContent="UPDATE-ERROR: "+d.slice(0,400)}}),this.renderer.info.reset();const l=this.fxToggles.postMaster?s==="universe-map"?.7:s==="galaxy-systems"?.25:s==="star-system"?.0055:.02:0;if(this.postIntensity+=(l-this.postIntensity)*Math.min(1,t*3.2),this.postFx.enabled=this.postIntensity>.005,this.postFx.bloomStrength=.55*this.postIntensity*(this.fxToggles.bloom?1:0),this.postFx.render(this.sceneManager.getScene(),this.camera),this.dbgEl&&this.frameNo%30===0){const u=this.renderer.getContext(),d=u.drawingBufferWidth,p=u.drawingBufferHeight,m=16,v=9,x=u.readPixels.bind(u),C=new Uint8Array(m*v*4);let A=0,O=0,b=u.isContextLost();for(let E=0;E<v&&!b;E++)for(let R=0;R<m;R++){x(Math.floor(d*(R+.5)/m),Math.floor(p*(E+.5)/v),1,1,u.RGBA,u.UNSIGNED_BYTE,C.subarray((E*m+R)*4));const z=(E*m+R)*4,q=(C[z]+C[z+1]+C[z+2])/3;A+=q,q>O&&(O=q)}this.pxSamples=b?"CTX-LOST":`buf=${d}x${p} avg=${(A/(m*v)).toFixed(1)} max=${O.toFixed(0)}`}requestAnimationFrame(this.loop)});r(this,"onBreadcrumbClick",e=>{const t=e.target,s=t==null?void 0:t.closest("[data-kind]");if(!s||this.sceneManager.isTransitioning())return;const a=this.sceneManager.getCurrentMode(),i=s.dataset.kind;if(!(!i||i===a)){if(a==="star-system"&&i==="galaxy")this.sceneManager.returnToGalaxy(this.camera,this.orbit.getFocus());else if(a==="galaxy-systems"&&i==="universe"){const o=this.controller.getFocus();this.sceneManager.returnToUniverseMap(this.camera,o)}this.clearSelection(),this.updateHud()}});r(this,"onResize",()=>{this.camera.aspect=window.innerWidth/window.innerHeight,this.camera.updateProjectionMatrix(),this.renderer.setSize(window.innerWidth,window.innerHeight),this.postFx.setSize(window.innerWidth,window.innerHeight)});r(this,"onClick",e=>{const t=this.renderer.domElement.getBoundingClientRect();this.pointer.x=(e.clientX-t.left)/t.width*2-1,this.pointer.y=-((e.clientY-t.top)/t.height)*2+1,this.raycaster.setFromCamera(this.pointer,this.camera);const s=this.sceneManager.getPickableObjects();let a=this.raycaster.intersectObjects(s,!1);if(a.length===0&&s.length>0){const o=this.raycaster.ray;let n=null,l=1/0;const c=72;for(const u of s){const d=o.distanceToPoint(u.getWorldPosition(new f));if(d<0)continue;const p=o.distanceSqToPoint(u.getWorldPosition(new f)),m=2*Math.tan(this.camera.fov*Math.PI/360)*d/this.renderer.domElement.clientHeight,v=c*m;p<=v*v&&p<l&&(l=p,n=u)}n&&(a=[{object:n,distance:0,point:n.getWorldPosition(new f)}])}if(a.length===0){this.clearSelection();return}const i=this.sceneManager.pickObject(a[0].object);i&&this.select(i)});r(this,"onDblClick",e=>{this.onClick(e),!(!this.selected||this.sceneManager.isTransitioning())&&this.onEnter()});r(this,"onEnter",()=>{if(!this.selected||this.sceneManager.isTransitioning())return;const e=this.sceneManager.getCurrentMode();if(e==="universe-map"&&this.isGalaxy(this.selected)){this.sceneManager.enterGalaxy(this.selected,this.camera),this.clearSelection();return}if(e==="galaxy-systems"&&this.isSystem(this.selected)){this.sceneManager.enterSystem(this.selected,this.camera),this.clearSelection();return}if((e==="system-galaxies"||e==="star-system")&&this.isGalaxy(this.selected)&&this.sceneManager.hasInnerMap()){this.sceneManager.enterSystemGalaxy(this.selected,this.camera),this.clearSelection();return}e==="star-system"&&this.isPlanet(this.selected)&&(this.sceneManager.enterPlanet(this.selected,this.camera),this.clearSelection())});r(this,"onBack",()=>{if(this.sceneManager.isTransitioning())return;const e=this.sceneManager.getCurrentMode();if(e==="planet-surface")this.sceneManager.returnToSystem(this.camera,this.systemOrbit.getFocus());else if(e==="star-system")this.sceneManager.returnToGalaxy(this.camera,this.orbit.getFocus());else if(e==="galaxy-systems"){const t=this.controller.getFocus();this.sceneManager.returnToUniverseMap(this.camera,t)}this.clearSelection(),this.updateHud()});this.deps=e,this.renderer=new ws({antialias:!0}),this.renderer.setPixelRatio(Math.min(window.devicePixelRatio,2)),this.renderer.setSize(window.innerWidth,window.innerHeight),e.container.appendChild(this.renderer.domElement),this.camera=new Ss(60,window.innerWidth/window.innerHeight,.1,1e5),this.camera.position.set(0,250,4400),this.postFx=new Ps(this.renderer),this.renderer.info.autoReset=!1,this.dust=new zs,this.sceneManager=new lt(e.universeSeed,e.client,{onGalaxySelected:s=>{this.updateHud()}}),this.controller=new at(this.camera),this.controller.attach(this.renderer.domElement),window.__uni={camera:this.camera,sm:this.sceneManager,orbit:this.orbit},this.sceneManager.getScene().add(this.dust.getObject()),this.sceneManager.setPostFx(this.postFx);const t=document.createElement("div");t.id="dbg",t.style.cssText="position:fixed;bottom:8px;left:8px;font:11px monospace;color:#9fe89f;z-index:3;white-space:pre;text-shadow:0 0 3px #000;",document.body.appendChild(t),this.dbgEl=t,this.buildFxPanel(),this.bindEvents(),this.updateHud(),requestAnimationFrame(this.loop)}buildFxPanel(){const e=document.createElement("div");e.id="fxpanel",e.style.cssText="position:fixed;bottom:8px;right:8px;z-index:20;display:flex;flex-direction:column;gap:4px;background:rgba(0,0,0,.65);padding:8px;border:1px solid #3a5a3a;border-radius:6px;font:11px monospace;max-height:calc(100vh - 60px);overflow-y:auto;";const t=document.createElement("div");t.textContent="ФИЛЬТРЫ (TEMP)",t.style.cssText="color:#9fe89f;letter-spacing:1px;margin-bottom:2px;",e.appendChild(t);const s={bloom:"Bloom (свечение)",aberration:"Аберрация RGB",dust:"Пыль скорости",weather:"Погода (дождь/снег)",dof:"DoF (размытие)",postMaster:"Мастер-пост (весь)"};for(const a of Object.keys(this.fxToggles)){const i=document.createElement("button");i.dataset.fx=a;const o=()=>{const n=this.fxToggles[a];i.textContent=`${n?"●":"○"} ${s[a]??a}`,i.style.color=n?"#9fe89f":"#666",i.style.borderColor=n?"#3a5a3a":"#333"};i.style.cssText="background:#0a120a;border:1px solid #333;color:#9fe89f;font:11px monospace;padding:4px 8px;text-align:left;cursor:pointer;border-radius:3px;",i.addEventListener("click",()=>{this.fxToggles[a]=!this.fxToggles[a],this.applyFxToggles(),o()}),o(),e.appendChild(i)}document.body.appendChild(e),this.fxPanel=e,this.applyFxToggles()}applyFxToggles(){const e=this.fxToggles;e.dof||this.postFx.clearFocus(),this.postFx.aberration=e.aberration?this.postFx.aberration:0,this.dust.visible=e.dust,this.sceneManager.world.setWeatherEnabled(e.weather)}dispose(){this.running=!1,this.orbit.dispose(),this.systemOrbit.dispose(),this.controller.dispose(),this.sceneManager.dispose(),this.dust.dispose(),this.postFx.dispose(),this.renderer.dispose()}bindEvents(){var e,t,s;window.addEventListener("resize",this.onResize),this.renderer.domElement.addEventListener("click",this.onClick),this.renderer.domElement.addEventListener("dblclick",this.onDblClick),(e=document.getElementById("enterButton"))==null||e.addEventListener("click",this.onEnter),(t=document.getElementById("backButton"))==null||t.addEventListener("click",this.onBack),(s=document.getElementById("breadcrumbs"))==null||s.addEventListener("click",this.onBreadcrumbClick)}select(e){this.selected=e;const t=document.getElementById("selected");if(!t)return;t.style.display="block";const s=document.getElementById("selectedName"),a=document.getElementById("selectedType");this.isGalaxy(e)?(s&&(s.textContent=e.name),a&&(a.textContent=e.type)):this.isSystem(e)&&(s&&(s.textContent=e.name),a&&(a.textContent=e.spectralType+"-class star"))}clearSelection(){this.selected=null;const e=document.getElementById("selected");e&&(e.style.display="none")}updateHud(){const e=document.getElementById("seedValue"),t=document.getElementById("countValue"),s=document.getElementById("modeValue"),a=document.getElementById("crumbValue"),i=document.getElementById("backButton");e&&(e.textContent=String(this.deps.universeSeed));const o=this.sceneManager.getCurrentMode(),n={"universe-map":"Карта вселенной","galaxy-systems":"Карта галактики","star-system":"Звёздная система","system-galaxies":"Галактики системы","planet-surface":"Поверхность планеты"};if(s&&(s.textContent=n[o]),a&&(a.textContent=this.sceneManager.getBreadcrumb()),t){const c=o==="universe-map"?this.sceneManager.getGalaxyCount():o==="galaxy-systems"?this.sceneManager.getSystemCount():o==="star-system"?this.sceneManager.getPlanetCount():this.sceneManager.getBuildingCount();t.textContent=String(c)}i&&(i.style.display=o==="universe-map"?"none":"block");const l=document.getElementById("breadcrumbs");if(l){const c=this.sceneManager.getLocationPath(),u={universe:"Вселенная",galaxy:"Галактика",system:"Система",planet:"Планета"};l.textContent="",c.forEach((d,p)=>{const m=p===c.length-1,v=d.kind==="universe"?u.universe:"name"in d?d.name:`Планета ${"index"in d?d.index+1:"?"}`;if(p>0){const C=document.createElement("span");C.className="crumb-sep",C.textContent="›",l.appendChild(C)}const x=document.createElement(m?"span":"button");x.className=m?"crumb crumb-current":"crumb",m||(x.type="button",x.dataset.kind=d.kind,x.title=`Вернуться: ${u[d.kind]??d.kind}`),x.textContent=m?`${v}`:v,l.appendChild(x)})}}isGalaxy(e){return"type"in e&&(e.type==="spiral"||e.type==="elliptical"||e.type==="irregular")}isSystem(e){return"spectralType"in e}isPlanet(e){return"radiusKm"in e}}r(Kt,"PICK_THRESHOLD",1.2);const Gt=new URLSearchParams(window.location.search).get("seed"),$a=Gt?Number.parseInt(Gt,10):1337,$t=document.getElementById("app");if(!$t)throw new Error("Container #app not found.");const ja=new As({baseUrl:""}),Ya=new ks(ja);new URLSearchParams(window.location.search).has("tuner")&&Ts(async()=>{const{mountSunTuner:h}=await import("./sun-tuner-PYhIxmLa.js");return{mountSunTuner:h}},[]).then(({mountSunTuner:h})=>{const e=()=>{const s=window.__uni;s!=null&&s.sm?h(()=>({getScene:()=>s.sm.getScene(),world:s.sm.world})):setTimeout(e,300)};e()});new Kt({container:$t,universeSeed:$a,client:Ya});
