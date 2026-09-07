// client/src/scene/fx/glsl/shared.ts
// Общие вершинники (перенесены/адаптированы из прототипа earth_3d.html).
// - VS_SIMPLE: стандартная сфера по normalize(position) (для оболочек атмосферы/облаков).
// - VS_NANITE: куб-квадтри нанит-меша — направление через cubeDir(aFace, aUV),
//   непрерывное по всей сфере без разрывов на рёбрах куба.

export const VS_SIMPLE = /* glsl */ `
varying vec3 vObj;varying vec3 vWN;varying vec3 vWP;varying vec3 vVN;
void main(){vObj=normalize(position);vec4 wp=modelMatrix*vec4(position,1.);vWP=wp.xyz;
  vWN=normalize(mat3(modelMatrix)*normal);vVN=normalize(normalMatrix*normal);
  gl_Position=projectionMatrix*viewMatrix*wp;}`;

const GLSL_CUBEDIR = /* glsl */ `
vec3 cubeDir(int f,vec2 q){
  vec2 c=q*2.0-1.0;
  if(f==0)return normalize(vec3(1.,c.y,-c.x));
  if(f==1)return normalize(vec3(-1.,c.y,c.x));
  if(f==2)return normalize(vec3(c.x,1.,-c.y));
  if(f==3)return normalize(vec3(c.x,-1.,c.y));
  if(f==4)return normalize(vec3(c.x,c.y,1.));
  return normalize(vec3(-c.x,c.y,-1.));
}`;

export const VS_NANITE = /* glsl */ `
${GLSL_CUBEDIR}
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
}`;

export const VS_RINGS = /* glsl */ `
varying vec3 vPos;varying vec3 vWN;varying vec3 vWP;
void main(){vPos=position;vec4 wp=modelMatrix*vec4(position,1.);vWP=wp.xyz;
  vWN=normalize(mat3(modelMatrix)*normal);
  gl_Position=projectionMatrix*viewMatrix*wp;}`;
