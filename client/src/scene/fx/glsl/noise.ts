// client/src/scene/fx/glsl/noise.ts
// Общий GLSL-блок шума/рельефа (перенесён из прототипа earth_3d.html).
// Используется в planet-surface (FS_CRUST) и planet-atmosphere (FS_LOW/FS_HUR/FS_ATMO).

export const GLSL_NOISE = /* glsl */ `
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
`;
