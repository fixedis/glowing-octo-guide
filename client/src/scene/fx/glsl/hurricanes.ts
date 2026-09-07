// client/src/scene/fx/glsl/hurricanes.ts
// GLSL-блок ураганов (перенесён из прототипа earth_3d.html, HUR_U).

export const GLSL_HURRICANES = /* glsl */ `
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
`;
