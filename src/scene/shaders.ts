/* All GLSL lives here. Palette is warm "heat-tempered steel" — no blue/purple anywhere. */

export const NOISE = /* glsl */ `
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0); const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.0-g; vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx; vec3 x2=x0-i2+C.yyy; vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857; vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z); vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy; vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0; vec4 s1=floor(b1)*2.0+1.0; vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y); vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0); m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}`

/* ---------------- the Ego Core: liquid tempered steel ---------------- */
export const CORE_VERT = /* glsl */ `
${NOISE}
uniform float uTime, uAmp, uSpike, uNoise, uHit, uChaos, uPulse;
varying vec3 vN; varying vec3 vW; varying float vD;
float disp(vec3 n){
  float t = uTime;
  float a = snoise(n*uNoise + vec3(0.0, t*0.22, t*0.13));
  float b = snoise(n*uNoise*3.1 - vec3(t*0.5, 0.0, t*0.3));
  float c = snoise(n*9.0 + t*vec3(1.7, -1.3, 0.9));
  float spikes = pow(abs(b), 1.4) * uSpike;
  return a*uAmp + spikes + uHit*0.14*c + uChaos*0.08*c + uPulse*0.05*sin(t*14.0 + n.y*9.0);
}
void main(){
  vec3 n = normalize(position);
  float d = disp(n);
  vec3 t = normalize(cross(n, vec3(0.0,1.0,0.013)));
  vec3 b = normalize(cross(n, t));
  float e = 0.025;
  vec3 n1 = normalize(n + t*e); vec3 n2 = normalize(n + b*e);
  vec3 q0 = n*(1.0+d); vec3 q1 = n1*(1.0+disp(n1)); vec3 q2 = n2*(1.0+disp(n2));
  vec3 nn = normalize(cross(q1-q0, q2-q0)); if(dot(nn,n)<0.0) nn=-nn;
  vN = normalize(mat3(modelMatrix)*nn);
  vec4 w = modelMatrix*vec4(q0,1.0); vW = w.xyz; vD = d;
  gl_Position = projectionMatrix*viewMatrix*w;
}`

export const CORE_FRAG = /* glsl */ `
uniform vec3 uColA, uColB, uColC; uniform float uTime, uHit, uIri, uPoster, uDark, uEye;
varying vec3 vN; varying vec3 vW; varying float vD;
vec3 env(vec3 r){
  float y = r.y;
  vec3 c = mix(vec3(0.012,0.010,0.009), vec3(0.075,0.058,0.046), smoothstep(-1.0,1.0,y));
  c += uColC * 2.6 * smoothstep(0.5,0.58,y) * smoothstep(0.97,0.82,y);                       // overhead softbox
  c += uColC * 1.5 * smoothstep(0.10,0.15,r.x) * smoothstep(0.30,0.22,r.x) * smoothstep(-0.3,0.05,y) * smoothstep(0.85,0.4,y); // vertical strip
  c += uColA * 3.4 * pow(max(dot(normalize(r), normalize(vec3(-0.6,0.15,0.75))),0.0), 22.0);  // key
  c += uColB * 1.6 * pow(max(dot(normalize(r), normalize(vec3(0.8,-0.35,-0.4))),0.0), 10.0);  // rim
  c += uColC * 0.9 * pow(max(dot(normalize(r), normalize(vec3(0.0,-1.0,0.2))),0.0), 6.0) * 0.4; // floor bounce
  return c;
}
vec3 heat(float x){ // tempered-steel ramp: deep red -> vermilion -> brass -> straw
  vec3 a=uColA*0.55, b=uColA, c=uColB, d=uColC;
  x = clamp(x,0.0,1.0);
  return x<0.34 ? mix(a,b,x/0.34) : x<0.67 ? mix(b,c,(x-0.34)/0.33) : mix(c,d,(x-0.67)/0.33);
}
void main(){
  vec3 N = normalize(vN); vec3 V = normalize(cameraPosition - vW);
  float ndv = max(dot(N,V),0.0);
  float fr = pow(1.0-ndv, 3.0);
  vec3 R = reflect(-V,N);
  vec3 col = env(R);
  float ph = fract(ndv*1.4 + vD*3.0 + uTime*0.04);
  vec3 tint = heat(ph);
  col = mix(col, col*(0.35+tint*1.7), uIri);
  col += uColA*fr*0.85;
  col += (uColA+uColC*0.6)*uHit*1.2;
  col = mix(col, vec3(dot(col,vec3(0.3,0.59,0.11))*0.25), uDark);
  // eye mode: pupil slit that tracks the camera
  if(uEye>0.0){
    vec3 fwd = normalize(cameraPosition - vW);
    float pu = smoothstep(0.34,0.30, length(vec2(N.x*0.85, N.y*1.9)) ) * step(0.0, N.z);
    col = mix(col, uColC*2.4, pu*uEye*0.9);
    float slit = smoothstep(0.075,0.05,abs(N.x)) * smoothstep(0.34,0.2,abs(N.y)) * step(0.0,N.z);
    col = mix(col, vec3(0.0), slit*uEye);
  }
  if(uPoster>0.5){ float s=uPoster; col = floor(col*s+0.5)/s; }
  gl_FragColor = vec4(col,1.0);
}`

/* ---------------- floor: world-space grid + radial pulse ---------------- */
export const FLOOR_VERT = /* glsl */ `
varying vec3 vW;
void main(){ vec4 w = modelMatrix*vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`
export const FLOOR_FRAG = /* glsl */ `
uniform vec3 uColor, uCenter; uniform float uTime, uGrid, uLevel, uChaos, uFade;
varying vec3 vW;
float gridLine(vec2 p, float s){ vec2 g = abs(fract(p/s-0.5)-0.5)/fwidth(p/s); return 1.0-min(min(g.x,g.y),1.0); }
void main(){
  float d = distance(vW.xz, cameraPosition.xz);
  float g = gridLine(vW.xz, uGrid)*0.55 + gridLine(vW.xz, uGrid*5.0)*0.9;
  float rd = distance(vW.xz, uCenter.xz);
  float ring = smoothstep(0.12,0.0,abs(fract(rd*0.11 - uTime*0.18 - uLevel*0.4)-0.5)-0.38)*0.5;
  float warp = 0.5+0.5*sin(vW.x*0.4+uTime*2.0)*sin(vW.z*0.4+uTime*1.4);
  float a = (g*(0.12+uChaos*0.35*warp) + ring*0.35) * smoothstep(uFade, uFade*0.2, d);
  gl_FragColor = vec4(uColor*a*1.6, a);
}`

/* ---------------- dust: drifting motes ---------------- */
export const DUST_VERT = /* glsl */ `
attribute float aSeed; uniform float uTime, uSize, uChaos; varying float vA;
void main(){
  vec3 p = position;
  p.x += sin(uTime*0.15 + aSeed*30.0)*0.8;
  p.y += mod(uTime*(0.05+aSeed*0.12) + aSeed*40.0, 14.0) - 7.0 + sin(uTime*0.3+aSeed*11.0)*0.3;
  p.z += cos(uTime*0.12 + aSeed*17.0)*0.8;
  p += (fract(vec3(aSeed*13.1, aSeed*7.7, aSeed*3.3))-0.5) * uChaos * 3.0 * sin(uTime*3.0+aSeed*50.0);
  vec4 mv = viewMatrix*modelMatrix*vec4(p,1.0);
  float dist = -mv.z;
  vA = smoothstep(70.0, 8.0, dist) * (0.35 + 0.65*fract(aSeed*91.7)) * smoothstep(0.2, 2.0, dist);
  gl_PointSize = clamp(uSize*(0.5+fract(aSeed*37.3))/dist, 1.0, 14.0);
  gl_Position = projectionMatrix*mv;
}`
export const DUST_FRAG = /* glsl */ `
uniform vec3 uColor; varying float vA;
void main(){ vec2 c = gl_PointCoord-0.5; float r = length(c); float a = smoothstep(0.5,0.0,r); gl_FragColor = vec4(uColor*a*vA*1.4, a*vA); }`

/* ---------------- post: grade + chaos ---------------- */
export const POST_FRAG = /* glsl */ `
uniform sampler2D tDiffuse; uniform float uTime, uChaos, uGlitch, uDesat, uInvert, uVig, uGrain, uSplit, uPoster;
varying vec2 vUv;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
vec3 aces(vec3 x){ return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14),0.0,1.0); }
void main(){
  vec2 uv = vUv;
  float ch = uChaos + uGlitch;
  // horizontal tear bands
  float band = step(0.97 - uGlitch*0.25, hash(vec2(floor(uv.y*34.0), floor(uTime*9.0))));
  uv.x += band*(hash(vec2(floor(uv.y*34.0), uTime))-0.5)*0.12*(0.3+ch);
  // wobble
  uv += vec2(sin(uv.y*18.0+uTime*3.0), cos(uv.x*14.0+uTime*2.4))*0.0016*uChaos*4.0;
  vec2 dir = (uv-0.5);
  float split = (0.0011 + uSplit*0.003 + ch*0.007) * (0.4+length(dir)*2.2);
  vec3 c;
  c.r = texture2D(tDiffuse, uv + dir*split).r;
  c.g = texture2D(tDiffuse, uv).g;
  c.b = texture2D(tDiffuse, uv - dir*split).b;
  c = aces(c*1.05);
  float l = dot(c, vec3(0.299,0.587,0.114));
  c = mix(c, vec3(l), uDesat);
  // warm grade: lift shadows a hair toward ink-brown, avoid cold casts
  c = mix(c, c*vec3(1.04,1.0,0.94), 0.5);
  if(uPoster>0.5){ c = floor(c*uPoster+0.5)/uPoster; }
  c = mix(c, 1.0-c, uInvert);
  // vignette
  float v = smoothstep(0.95, 0.25, length(dir*vec2(1.1,1.0)));
  c *= mix(1.0, v, uVig);
  // scanlines under chaos
  c *= 1.0 - ch*0.12*(0.5+0.5*sin(uv.y*900.0));
  // grain
  c += (hash(uv*vec2(1920.0,1080.0)+uTime)-0.5)*uGrain;
  c = pow(max(c,0.0), vec3(1.0/2.2));
  gl_FragColor = vec4(c,1.0);
}`
export const POST_VERT = /* glsl */ `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`
