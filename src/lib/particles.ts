import type { ParticleSettings } from "@/store/settings";

export interface PxPoint {
  x: number;
  y: number;
}
export interface HandInput {
  active: boolean;
  points: PxPoint[];
}

const NUM_HANDS = 2;
const FINGERS = 5;
const TIP_INDEX = [4, 8, 12, 16, 20];
const MAX_WELLS = NUM_HANDS * FINGERS;

const CONNECTIONS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20],
  [0, 17],
];

const GRID = 256;
const GRAIN_COUNT = GRID * GRID;
const MAX_POINTS = 4000;
const MAX_LINE_VERTS = 2400;

const SIM_VS = `#version 300 es
in vec2 a_pos;
out vec2 v_uv;
void main() {
  v_uv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

const SIM_FS = `#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_pos;
uniform sampler2D u_life;
uniform vec2 u_resolution;
uniform float u_dt;
uniform float u_time;
uniform float u_scale;
uniform int u_wellCount;
uniform vec4 u_wells[${MAX_WELLS}];
layout(location = 0) out vec4 outPos;
layout(location = 1) out vec4 outLife;

vec3 mod289v3(vec3 x){return x - floor(x*(1.0/289.0))*289.0;}
vec2 mod289v2(vec2 x){return x - floor(x*(1.0/289.0))*289.0;}
vec3 permute(vec3 x){return mod289v3(((x*34.0)+1.0)*x);}
float snoise(vec2 v){
  const vec4 C=vec4(0.211324865405187,0.366025403784439,-0.577350269189626,0.024390243902439);
  vec2 i=floor(v+dot(v,C.yy));
  vec2 x0=v-i+dot(i,C.xx);
  vec2 i1=(x0.x>x0.y)?vec2(1.0,0.0):vec2(0.0,1.0);
  vec4 x12=x0.xyxy+C.xxzz;
  x12.xy-=i1;
  i=mod289v2(i);
  vec3 p=permute(permute(i.y+vec3(0.0,i1.y,1.0))+i.x+vec3(0.0,i1.x,1.0));
  vec3 m=max(0.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.0);
  m=m*m; m=m*m;
  vec3 x1=2.0*fract(p*C.www)-1.0;
  vec3 h=abs(x1)-0.5;
  vec3 ox=floor(x1+0.5);
  vec3 a0=x1-ox;
  m*=1.79284291400159-0.85373472095314*(a0*a0+h*h);
  vec3 g;
  g.x=a0.x*x0.x+h.x*x0.y;
  g.yz=a0.yz*x12.xz+h.yz*x12.yw;
  return 130.0*dot(m,g);
}
vec2 curlField(vec2 p){
  float e=1.4;
  float n_ya=snoise(p+vec2(0.0,e));
  float n_yb=snoise(p-vec2(0.0,e));
  float n_xa=snoise(p+vec2(e,0.0));
  float n_xb=snoise(p-vec2(e,0.0));
  return vec2(n_ya-n_yb, -(n_xa-n_xb));
}
float hash1(vec2 co){return fract(sin(dot(co,vec2(12.9898,78.233)))*43758.5453);}

void main(){
  vec4 pos = texture(u_pos, v_uv);
  vec4 life = texture(u_life, v_uv);
  vec2 p = pos.xy;
  vec2 v = pos.zw;
  float age = life.x;
  float gsize = life.y;
  float seed = life.z;
  float bright = life.w;

  vec2 nc = p * (0.0021 / max(u_scale,0.4)) + vec2(u_time*0.05, u_time*0.03);
  vec2 flow = curlField(nc);
  v += flow * (24.0 * u_scale) * u_dt;
  v.x += sin(u_time*0.3 + p.y*0.004 + seed*6.28) * 4.0 * u_scale * u_dt;
  v.y += cos(u_time*0.27 + p.x*0.004 + seed*6.28) * 4.0 * u_scale * u_dt;

  float R = 280.0 * u_scale;
  float R2 = R*R;
  float G = 7.6e6 * u_scale;
  float eps2 = (40.0*u_scale)*(40.0*u_scale);
  for(int i=0;i<${MAX_WELLS};i++){
    if(i>=u_wellCount) break;
    vec4 w = u_wells[i];
    vec2 d = w.xy - p;
    float d2 = dot(d,d);
    if(d2 > R2) continue;
    float dist = sqrt(d2)+0.0001;
    float fall = 1.0 - dist/R;
    float pull = (G/(d2+eps2)) * w.z * (0.38+0.62*fall);
    vec2 n = d/dist;
    v += n * pull * u_dt;
    v += vec2(-n.y, n.x) * pull * 1.18 * u_dt;
    if(dist < 48.0*u_scale){
      v *= (0.82);
    }
  }

  v *= pow(0.24, u_dt);
  float sp2 = dot(v,v);
  float maxSp = 780.0*u_scale;
  if(sp2 > maxSp*maxSp){ v *= maxSp/sqrt(sp2); }

  p += v * u_dt;
  age += u_dt * (0.085 + seed*0.04);

  bool off = p.x < -40.0 || p.x > u_resolution.x+40.0 || p.y < -40.0 || p.y > u_resolution.y+40.0;
  if(age > 1.0 || off){
    float h1 = hash1(v_uv + vec2(u_time, 0.13));
    float h2 = hash1(v_uv*2.3 + vec2(0.0, u_time));
    float h3 = hash1(v_uv*3.7 + u_time*0.5);
    float h4 = hash1(v_uv*5.1 + u_time*0.2);
    float h5 = hash1(v_uv*7.9 + u_time*0.7);
    p = vec2(h1 * u_resolution.x, h2 * u_resolution.y);
    v = vec2((h3-0.5)*14.0, (h4-0.5)*14.0);
    age = 0.0;
    gsize = 0.7 + h5*1.7;
    bright = 0.55 + hash1(v_uv*9.2)*0.45;
    seed = hash1(v_uv*11.0+u_time*0.1);
  }

  outPos = vec4(p, v);
  outLife = vec4(age, gsize, seed, bright);
}`;

const RENDER_VS = `#version 300 es
uniform sampler2D u_pos;
uniform sampler2D u_life;
uniform ivec2 u_texSize;
uniform vec2 u_resolution;
uniform float u_dpr;
uniform float u_scale;
uniform float u_intensity;
uniform int u_wellCount;
uniform vec4 u_wells[${MAX_WELLS}];
uniform vec3 u_wellColors[${MAX_WELLS}];
uniform vec3 u_sandColor;
out vec3 v_color;
out float v_alpha;
void main(){
  int idx = gl_VertexID;
  int tx = idx % u_texSize.x;
  int ty = idx / u_texSize.x;
  vec2 uv = (vec2(tx,ty)+0.5)/vec2(u_texSize);
  vec4 pos = texture(u_pos, uv);
  vec4 life = texture(u_life, uv);
  vec2 p = pos.xy;
  float age = life.x;
  float gsize = life.y;
  float bright = life.w;

  vec2 ndc = (p/u_resolution)*2.0-1.0;
  gl_Position = vec4(ndc.x, -ndc.y, 0.0, 1.0);

  vec3 col = u_sandColor;
  float bestInf = 0.0;
  vec3 bestCol = u_sandColor;
  float R = 280.0*u_scale;
  for(int i=0;i<${MAX_WELLS};i++){
    if(i>=u_wellCount) break;
    vec4 w=u_wells[i];
    vec2 d=w.xy-p;
    float dist=sqrt(dot(d,d));
    float inf=clamp(1.0-dist/R,0.0,1.0)*w.z;
    if(inf>bestInf){ bestInf=inf; bestCol=u_wellColors[i]; }
  }
  col = mix(u_sandColor, bestCol, bestInf*0.85);
  col *= bright;

  float fade = smoothstep(0.0,0.14,age)*smoothstep(1.0,0.78,age);
  v_color = col;
  v_alpha = fade * (0.6 + 0.4*u_intensity);
  gl_PointSize = max(1.0, gsize * u_scale * 1.9 * u_dpr);
}`;

const RENDER_FS = `#version 300 es
precision highp float;
in vec3 v_color;
in float v_alpha;
out vec4 frag;
void main(){
  vec2 uv = gl_PointCoord*2.0-1.0;
  float r2 = dot(uv,uv);
  if(r2>1.0) discard;
  float core = exp(-r2*9.0);
  float halo = exp(-r2*2.3)*0.34;
  float i = core + halo;
  frag = vec4(v_color*i*v_alpha, i*v_alpha);
}`;

const POINT_VS = `#version 300 es
in vec2 a_position;
in float a_size;
in vec3 a_color;
in float a_alpha;
uniform vec2 u_resolution;
uniform float u_dpr;
out vec3 v_color;
out float v_alpha;
void main() {
  vec2 ndc = (a_position / u_resolution) * 2.0 - 1.0;
  gl_Position = vec4(ndc.x, -ndc.y, 0.0, 1.0);
  gl_PointSize = a_size * u_dpr;
  v_color = a_color;
  v_alpha = a_alpha;
}`;

const POINT_FS = `#version 300 es
precision highp float;
in vec3 v_color;
in float v_alpha;
out vec4 frag;
void main() {
  vec2 uv = gl_PointCoord * 2.0 - 1.0;
  float r2 = dot(uv, uv);
  if (r2 > 1.0) discard;
  float halo = exp(-r2 * 3.2);
  float core = exp(-r2 * 22.0);
  float i = halo * 0.5 + core * 1.05;
  frag = vec4(v_color * i * v_alpha, i * v_alpha);
}`;

const LINE_VS = `#version 300 es
in vec2 a_position;
in vec4 a_color;
uniform vec2 u_resolution;
out vec4 v_color;
void main() {
  vec2 ndc = (a_position / u_resolution) * 2.0 - 1.0;
  gl_Position = vec4(ndc.x, -ndc.y, 0.0, 1.0);
  v_color = a_color;
}`;

const LINE_FS = `#version 300 es
precision highp float;
in vec4 v_color;
out vec4 frag;
void main() { frag = v_color; }`;

const QUAD_VS = `#version 300 es
in vec2 a_pos;
out vec2 v_uv;
void main() {
  v_uv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

const FADE_FS = `#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_tex;
uniform float u_fade;
out vec4 frag;
void main() {
  frag = texture(u_tex, v_uv) * u_fade;
}`;

const DISPLAY_FS = `#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_tex;
uniform float u_gain;
out vec4 frag;
void main() {
  vec3 c = texture(u_tex, v_uv).rgb * u_gain;
  c = 1.0 - exp(-c);
  float a = clamp(max(c.r, max(c.g, c.b)) * 1.3, 0.0, 1.0);
  frag = vec4(c, a);
}`;

interface Star {
  x: number;
  y: number;
  vx: number;
  vy: number;
  baseR: number;
  baseG: number;
  baseB: number;
  baseSize: number;
  twinkle: number;
  twinkleSpeed: number;
  flowAng: number;
  captured: number;
}

interface ActiveWell {
  x: number;
  y: number;
  alpha: number;
  r: number;
  g: number;
  b: number;
}

function hsl2rgb(h: number, s: number, l: number): [number, number, number] {
  const hn = (h % 360 + 360) % 360 / 360;
  if (s === 0) return [l, l, l];
  const hue2 = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [hue2(p, q, hn + 1 / 3), hue2(p, q, hn), hue2(p, q, hn - 1 / 3)];
}

interface Program {
  program: WebGLProgram;
  attribs: Record<string, number>;
  uniforms: Record<string, WebGLUniformLocation | null>;
}

export class ParticleEngine {
  private canvas: HTMLCanvasElement;
  private gl: WebGL2RenderingContext | null = null;
  private w = 0;
  private h = 0;
  private dpr = 1;
  private sizeScale = 1;
  private ok = false;
  private mode: "gpgpu" | "stars" = "gpgpu";

  private simProg!: Program;
  private renderProg!: Program;
  private pointProg!: Program;
  private lineProg!: Program;
  private fadeProg!: Program;
  private displayProg!: Program;

  private quadBuf!: WebGLBuffer;
  private pointBuf!: WebGLBuffer;
  private lineBuf!: WebGLBuffer;
  private emptyVao!: WebGLVertexArrayObject;
  private overlayVao!: WebGLVertexArrayObject;
  private lineVao!: WebGLVertexArrayObject;
  private quadVao!: WebGLVertexArrayObject;
  private pointData = new Float32Array(MAX_POINTS * 7);
  private lineData = new Float32Array(MAX_LINE_VERTS * 6);
  private pointCount = 0;
  private lineCount = 0;

  private posTex: [WebGLTexture, WebGLTexture] = [null as unknown as WebGLTexture, null as unknown as WebGLTexture];
  private lifeTex: [WebGLTexture, WebGLTexture] = [null as unknown as WebGLTexture, null as unknown as WebGLTexture];
  private simFbo!: WebGLFramebuffer;
  private simRead = 0;
  private simReady = false;

  private accumTex: [WebGLTexture, WebGLTexture] = [null as unknown as WebGLTexture, null as unknown as WebGLTexture];
  private accumFbo: [WebGLFramebuffer, WebGLFramebuffer] = [null as unknown as WebGLFramebuffer, null as unknown as WebGLFramebuffer];
  private accumRead = 0;
  private accumW = 0;
  private accumH = 0;
  private maxPointSize = 64;
  private time = 0;

  private wellData = new Float32Array(MAX_WELLS * 4);
  private wellColorData = new Float32Array(MAX_WELLS * 3);
  private curWellCount = 0;

  private stars: Star[] = [];
  private wells: { x: number; y: number; alpha: number }[][] = [
    Array.from({ length: FINGERS }, () => ({ x: 0, y: 0, alpha: 0 })),
    Array.from({ length: FINGERS }, () => ({ x: 0, y: 0, alpha: 0 })),
  ];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.init();
  }

  private init() {
    const gl = this.canvas.getContext("webgl2", {
      alpha: true,
      premultipliedAlpha: false,
      antialias: false,
      preserveDrawingBuffer: false,
    }) as WebGL2RenderingContext | null;
    if (!gl) {
      this.ok = false;
      return;
    }
    this.gl = gl;

    const floatExt = gl.getExtension("EXT_color_buffer_float");
    if (floatExt) {
      this.mode = "gpgpu";
      this.simProg = this.makeProgram(SIM_VS, SIM_FS, ["a_pos"], ["u_pos", "u_life", "u_resolution", "u_dt", "u_time", "u_scale", "u_wellCount", "u_wells"]);
      this.renderProg = this.makeProgram(RENDER_VS, RENDER_FS, [], ["u_pos", "u_life", "u_texSize", "u_resolution", "u_dpr", "u_scale", "u_intensity", "u_wellCount", "u_wells", "u_wellColors", "u_sandColor"]);
    } else {
      this.mode = "stars";
    }

    this.pointProg = this.makeProgram(POINT_VS, POINT_FS, ["a_position", "a_size", "a_color", "a_alpha"], ["u_resolution", "u_dpr"]);
    this.lineProg = this.makeProgram(LINE_VS, LINE_FS, ["a_position", "a_color"], ["u_resolution"]);
    this.fadeProg = this.makeProgram(QUAD_VS, FADE_FS, ["a_pos"], ["u_tex", "u_fade"]);
    this.displayProg = this.makeProgram(QUAD_VS, DISPLAY_FS, ["a_pos"], ["u_tex", "u_gain"]);

    this.quadBuf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

    this.pointBuf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.pointBuf);
    gl.bufferData(gl.ARRAY_BUFFER, this.pointData.byteLength, gl.DYNAMIC_DRAW);

    this.lineBuf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.lineBuf);
    gl.bufferData(gl.ARRAY_BUFFER, this.lineData.byteLength, gl.DYNAMIC_DRAW);

    this.quadVao = gl.createVertexArray()!;
    gl.bindVertexArray(this.quadVao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuf);
    const qLoc = this.fadeProg.attribs.a_pos;
    gl.enableVertexAttribArray(qLoc);
    gl.vertexAttribPointer(qLoc, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);

    this.emptyVao = gl.createVertexArray()!;

    this.overlayVao = gl.createVertexArray()!;
    gl.bindVertexArray(this.overlayVao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.pointBuf);
    const stride7 = 7 * 4;
    let a = this.pointProg.attribs.a_position;
    gl.enableVertexAttribArray(a);
    gl.vertexAttribPointer(a, 2, gl.FLOAT, false, stride7, 0);
    a = this.pointProg.attribs.a_size;
    gl.enableVertexAttribArray(a);
    gl.vertexAttribPointer(a, 1, gl.FLOAT, false, stride7, 2 * 4);
    a = this.pointProg.attribs.a_color;
    gl.enableVertexAttribArray(a);
    gl.vertexAttribPointer(a, 3, gl.FLOAT, false, stride7, 3 * 4);
    a = this.pointProg.attribs.a_alpha;
    gl.enableVertexAttribArray(a);
    gl.vertexAttribPointer(a, 1, gl.FLOAT, false, stride7, 6 * 4);
    gl.bindVertexArray(null);

    this.lineVao = gl.createVertexArray()!;
    gl.bindVertexArray(this.lineVao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.lineBuf);
    const stride6 = 6 * 4;
    a = this.lineProg.attribs.a_position;
    gl.enableVertexAttribArray(a);
    gl.vertexAttribPointer(a, 2, gl.FLOAT, false, stride6, 0);
    a = this.lineProg.attribs.a_color;
    gl.enableVertexAttribArray(a);
    gl.vertexAttribPointer(a, 4, gl.FLOAT, false, stride6, 2 * 4);
    gl.bindVertexArray(null);

    const range = gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE) as [number, number];
    this.maxPointSize = Array.isArray(range) ? Math.max(16, range[1]) : 64;

    if (this.mode === "gpgpu") {
      this.makeSimTargets();
    }
    this.makeAccumTargets();
    this.ok = true;
  }

  private makeProgram(
    vsSrc: string,
    fsSrc: string,
    attribNames: string[],
    uniformNames: string[],
  ): Program {
    const gl = this.gl!;
    const compile = (type: number, src: string) => {
      const sh = gl.createShader(type)!;
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        const log = gl.getShaderInfoLog(sh);
        gl.deleteShader(sh);
        throw new Error("Shader compile error: " + log);
      }
      return sh;
    };
    const vs = compile(gl.VERTEX_SHADER, vsSrc);
    const fs = compile(gl.FRAGMENT_SHADER, fsSrc);
    const program = gl.createProgram()!;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error("Program link error: " + gl.getProgramInfoLog(program));
    }
    const attribs: Record<string, number> = {};
    for (const n of attribNames) attribs[n] = gl.getAttribLocation(program, n);
    const uniforms: Record<string, WebGLUniformLocation | null> = {};
    for (const n of uniformNames) uniforms[n] = gl.getUniformLocation(program, n);
    return { program, attribs, uniforms };
  }

  private makeSimTargets() {
    const gl = this.gl!;
    for (let i = 0; i < 2; i++) {
      this.posTex[i] = this.makeFloatTex();
      this.lifeTex[i] = this.makeFloatTex();
    }
    this.simFbo = gl.createFramebuffer()!;
  }

  private makeFloatTex(): WebGLTexture {
    const gl = this.gl!;
    const tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, GRID, GRID, 0, gl.RGBA, gl.FLOAT, null);
    return tex;
  }

  private seedSimTextures() {
    const gl = this.gl!;
    const pos = new Float32Array(GRAIN_COUNT * 4);
    const life = new Float32Array(GRAIN_COUNT * 4);
    for (let i = 0; i < GRAIN_COUNT; i++) {
      pos[i * 4] = Math.random() * this.w;
      pos[i * 4 + 1] = Math.random() * this.h;
      pos[i * 4 + 2] = 0;
      pos[i * 4 + 3] = 0;
      life[i * 4] = Math.random();
      life[i * 4 + 1] = 0.7 + Math.random() * 1.7;
      life[i * 4 + 2] = Math.random();
      life[i * 4 + 3] = 0.55 + Math.random() * 0.45;
    }
    for (let i = 0; i < 2; i++) {
      gl.bindTexture(gl.TEXTURE_2D, this.posTex[i]);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, GRID, GRID, 0, gl.RGBA, gl.FLOAT, pos);
      gl.bindTexture(gl.TEXTURE_2D, this.lifeTex[i]);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, GRID, GRID, 0, gl.RGBA, gl.FLOAT, life);
    }
    gl.bindTexture(gl.TEXTURE_2D, null);
    this.simReady = true;
  }

  private makeAccumTargets() {
    const gl = this.gl!;
    for (let i = 0; i < 2; i++) {
      const tex = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 8, 8, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      const fbo = gl.createFramebuffer()!;
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
      this.accumTex[i] = tex;
      this.accumFbo[i] = fbo;
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  resize(cssW: number, cssH: number, dpr: number) {
    this.dpr = dpr;
    this.w = cssW;
    this.h = cssH;
    this.canvas.width = Math.max(1, Math.round(cssW * dpr));
    this.canvas.height = Math.max(1, Math.round(cssH * dpr));
    this.sizeScale = Math.max(0.7, Math.min(1.7, Math.min(cssW, cssH) / 900));
    if (this.mode === "stars") this.seedStars();
    if (this.mode === "gpgpu" && !this.simReady && this.w > 0 && this.h > 0) this.seedSimTextures();
    if (this.gl) this.resizeAccum();
  }

  private resizeAccum() {
    const gl = this.gl!;
    const tw = this.canvas.width;
    const th = this.canvas.height;
    if (tw === this.accumW && th === this.accumH) return;
    this.accumW = tw;
    this.accumH = th;
    for (let i = 0; i < 2; i++) {
      gl.bindTexture(gl.TEXTURE_2D, this.accumTex[i]);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, tw, th, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    }
    gl.bindTexture(gl.TEXTURE_2D, null);
  }

  get width() {
    return this.w;
  }
  get height() {
    return this.h;
  }

  private seedStars() {
    const area = this.w * this.h;
    const target = Math.round(Math.min(6000, Math.max(500, area / 2400)));
    const stars = this.stars;
    if (stars.length < target) {
      for (let i = stars.length; i < target; i++) stars.push(this.spawnStar());
    } else if (stars.length > target) {
      stars.length = target;
    }
  }

  private spawnStar(): Star {
    const roll = Math.random();
    let h: number, s: number, l: number;
    if (roll < 0.68) {
      h = 210 + (Math.random() * 30 - 15);
      s = 0.4;
      l = 0.86;
    } else if (roll < 0.84) {
      h = 38;
      s = 0.65;
      l = 0.8;
    } else if (roll < 0.95) {
      h = 300;
      s = 0.55;
      l = 0.8;
    } else {
      h = 182;
      s = 0.55;
      l = 0.84;
    }
    const [r, g, b] = hsl2rgb(h, s, l);
    const big = Math.random() < 0.12;
    return {
      x: Math.random() * this.w,
      y: Math.random() * this.h,
      vx: 0,
      vy: 0,
      baseR: r,
      baseG: g,
      baseB: b,
      baseSize: big ? 3.0 + Math.random() * 2.2 : 1.2 + Math.random() * 1.6,
      twinkle: Math.random() * Math.PI * 2,
      twinkleSpeed: 0.8 + Math.random() * 2.4,
      flowAng: Math.random() * Math.PI * 2,
      captured: 0,
    };
  }

  private pushPoint(x: number, y: number, size: number, r: number, g: number, b: number, a: number) {
    if (this.pointCount >= MAX_POINTS) return;
    const o = this.pointCount * 7;
    const d = this.pointData;
    d[o] = x;
    d[o + 1] = y;
    d[o + 2] = Math.min(size, this.maxPointSize / this.dpr);
    d[o + 3] = r;
    d[o + 4] = g;
    d[o + 5] = b;
    d[o + 6] = a;
    this.pointCount++;
  }

  private pushLine(x1: number, y1: number, x2: number, y2: number, r: number, g: number, b: number, a: number) {
    if (this.lineCount + 2 > MAX_LINE_VERTS) return;
    let o = this.lineCount * 6;
    const d = this.lineData;
    d[o] = x1; d[o + 1] = y1; d[o + 2] = r; d[o + 3] = g; d[o + 4] = b; d[o + 5] = a;
    o += 6;
    d[o] = x2; d[o + 1] = y2; d[o + 2] = r; d[o + 3] = g; d[o + 4] = b; d[o + 5] = a;
    this.lineCount += 2;
  }

  render(hands: HandInput[], dt: number, settings: ParticleSettings, hues: number[]) {
    const gl = this.gl;
    if (!gl || !this.ok || this.w === 0 || this.h === 0) return;
    this.time += dt;
    const s = this.sizeScale;
    const intensity = settings.intensity;

    this.updateWells(hands, dt);

    const wellRGB = hues.map((hh) => hsl2rgb(hh, 1, 0.62));
    const wellsActive: ActiveWell[] = [];
    for (let h = 0; h < NUM_HANDS; h++) {
      if (!hands[h].active) continue;
      for (let f = 0; f < FINGERS; f++) {
        const wll = this.wells[h][f];
        if (wll.alpha < 0.12) continue;
        const rgb = wellRGB[f];
        wellsActive.push({ x: wll.x, y: wll.y, alpha: wll.alpha, r: rgb[0], g: rgb[1], b: rgb[2] });
      }
    }

    this.pointCount = 0;
    this.lineCount = 0;
    this.curWellCount = wellsActive.length;

    if (this.mode === "gpgpu" && this.simReady) {
      this.simulateGrains(dt, wellsActive, s);
      for (const wl of wellsActive) {
        const pulse = 0.5 + 0.5 * Math.sin(this.time * 2.4 + wl.x * 0.03);
        this.pushPoint(wl.x, wl.y, 20 * s * intensity, wl.r, wl.g, wl.b, 0.9 * wl.alpha);
        this.pushPoint(wl.x, wl.y, (5 + 3 * pulse) * s, 1, 1, 1, wl.alpha * 0.85);
      }
    } else {
      this.simulateStars(dt, wellsActive, s, intensity);
      for (const wl of wellsActive) {
        const pulse = 0.5 + 0.5 * Math.sin(this.time * 2.4 + wl.x * 0.03);
        this.pushPoint(wl.x, wl.y, 22 * s * intensity, wl.r, wl.g, wl.b, 0.95 * wl.alpha);
        this.pushPoint(wl.x, wl.y, (6 + 3 * pulse) * s, 1, 1, 1, wl.alpha * 0.9);
      }
    }

    if (settings.showLinks) this.buildArcs(wellsActive, intensity, s);
    if (settings.showSkeleton) this.buildSkeleton(hands, wellRGB[1], s);

    this.draw(gl);
  }

  private simulateGrains(dt: number, wells: ActiveWell[], s: number) {
    const gl = this.gl!;
    const read = this.simRead;
    const write = read ^ 1;

    for (let i = 0; i < wells.length; i++) {
      const wl = wells[i];
      const o = i * 4;
      this.wellData[o] = wl.x;
      this.wellData[o + 1] = wl.y;
      this.wellData[o + 2] = wl.alpha;
      this.wellData[o + 3] = 0;
      const oc = i * 3;
      this.wellColorData[oc] = wl.r;
      this.wellColorData[oc + 1] = wl.g;
      this.wellColorData[oc + 2] = wl.b;
    }
    const wellCount = wells.length;

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.simFbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.posTex[write], 0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, this.lifeTex[write], 0);
    gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);
    gl.viewport(0, 0, GRID, GRID);
    gl.disable(gl.BLEND);

    const p = this.simProg;
    gl.useProgram(p.program);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.posTex[read]);
    gl.uniform1i(p.uniforms.u_pos, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.lifeTex[read]);
    gl.uniform1i(p.uniforms.u_life, 1);
    gl.uniform2f(p.uniforms.u_resolution, this.w, this.h);
    gl.uniform1f(p.uniforms.u_dt, dt);
    gl.uniform1f(p.uniforms.u_time, this.time);
    gl.uniform1f(p.uniforms.u_scale, s);
    gl.uniform1i(p.uniforms.u_wellCount, wellCount);
    if (p.uniforms.u_wells) gl.uniform4fv(p.uniforms.u_wells, this.wellData);

    gl.bindVertexArray(this.quadVao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindVertexArray(null);

    this.simRead = write;
  }

  private simulateStars(
    dt: number,
    wells: ActiveWell[],
    s: number,
    intensity: number,
  ) {
    const R = 255 * s * (0.85 + intensity * 0.25);
    const R2 = R * R;
    const G = 6.2e6 * s;
    const eps2 = (40 * s) * (40 * s);
    const swirl = 1.06;
    const damping = Math.pow(0.84, dt);
    const driftDamp = Math.pow(0.9, dt);
    const maxSpeed = 720 * s;
    const drift = 22 * s;
    const stars = this.stars;

    for (let i = 0; i < stars.length; i++) {
      const star = stars[i];
      let captured = false;
      let wr = 0, wg = 0, wb = 0;

      for (let k = 0; k < wells.length; k++) {
        const wl = wells[k];
        const dx = wl.x - star.x;
        const dy = wl.y - star.y;
        const d2 = dx * dx + dy * dy;
        if (d2 > R2) continue;
        captured = true;
        wr = wl.r; wg = wl.g; wb = wl.b;
        const dist = Math.sqrt(d2) || 0.001;
        const fall = 1 - dist / R;
        const pull = (G / (d2 + eps2)) * dt * wl.alpha * (0.35 + 0.65 * fall);
        const inv = 1 / dist;
        const nx = dx * inv;
        const ny = dy * inv;
        star.vx += nx * pull;
        star.vy += ny * pull;
        const tan = pull * swirl;
        star.vx += -ny * tan;
        star.vy += nx * tan;
      }

      if (captured) {
        star.captured = Math.min(1, star.captured + dt * 2.4);
        star.vx *= damping;
        star.vy *= damping;
        const sp2 = star.vx * star.vx + star.vy * star.vy;
        if (sp2 > maxSpeed * maxSpeed) {
          const sp = Math.sqrt(sp2);
          star.vx = (star.vx / sp) * maxSpeed;
          star.vy = (star.vy / sp) * maxSpeed;
        }
      } else {
        star.captured *= Math.pow(0.5, dt);
        star.flowAng += dt * 0.4;
        star.vx += Math.cos(star.flowAng + star.y * 0.0021) * drift * dt;
        star.vy += Math.sin(star.flowAng + star.x * 0.0021) * drift * dt;
        star.vx *= driftDamp;
        star.vy *= driftDamp;
      }

      star.x += star.vx * dt;
      star.y += star.vy * dt;

      const margin = 60;
      if (star.x < -margin) star.x = this.w + margin;
      else if (star.x > this.w + margin) star.x = -margin;
      if (star.y < -margin) star.y = this.h + margin;
      else if (star.y > this.h + margin) star.y = -margin;

      star.twinkle += dt * star.twinkleSpeed;
      const tw = 0.6 + 0.4 * Math.sin(star.twinkle);
      const cap = star.captured;
      const r = star.baseR + (wr - star.baseR) * cap;
      const g = star.baseG + (wg - star.baseG) * cap;
      const b = star.baseB + (wb - star.baseB) * cap;
      if (cap > 0.05) {
        const a = (0.05 + 0.22 * cap) * (0.7 + 0.3 * tw) * intensity;
        const size = star.baseSize * s * (2.4 + cap * 3.0) * intensity;
        this.pushPoint(star.x, star.y, size, r, g, b, a);
      } else {
        const a = (0.03 + 0.06 * tw) * intensity;
        const size = star.baseSize * s * 1.7 * intensity;
        this.pushPoint(star.x, star.y, size, r, g, b, a);
      }
    }
  }

  private updateWells(hands: HandInput[], dt: number) {
    for (let h = 0; h < NUM_HANDS; h++) {
      const hand = hands[h];
      for (let f = 0; f < FINGERS; f++) {
        const wll = this.wells[h][f];
        if (hand.active) {
          const p = hand.points[TIP_INDEX[f]];
          wll.alpha += (1 - wll.alpha) * Math.min(1, dt * 6);
          const follow = Math.min(1, dt * 9);
          wll.x += (p.x - wll.x) * follow;
          wll.y += (p.y - wll.y) * follow;
        } else {
          wll.alpha += (0 - wll.alpha) * Math.min(1, dt * 4);
        }
      }
    }
  }

  private buildArcs(wells: ActiveWell[], intensity: number, s: number) {
    if (wells.length < 2) return;
    for (let i = 0; i < wells.length; i++) {
      const j = i + 1;
      if (j >= wells.length) break;
      if (Math.floor(i / FINGERS) !== Math.floor(j / FINGERS)) continue;
      const a = wells[i];
      const b = wells[j];
      const gate = Math.min(a.alpha, b.alpha);
      if (gate < 0.12) continue;
      const seed = i + j;
      const pulse = 0.04 + 0.1 * Math.abs(Math.sin(this.time * 2.4 + seed));
      const flick = pulse * (0.4 + Math.random() * 0.9) * intensity * gate;
      if (flick < 0.04) continue;
      const segs = 12;
      const jitter = 12 * s;
      const r = a.r * 0.5 + 1;
      const g = a.g * 0.5 + 1;
      const bl = a.b * 0.5 + 1;
      for (let k = 0; k <= segs; k++) {
        const t = k / segs;
        const x = a.x + (b.x - a.x) * t + (Math.random() - 0.5) * jitter;
        const y = a.y + (b.y - a.y) * t + (Math.random() - 0.5) * jitter;
        this.pushPoint(x, y, 3.4 * s, Math.min(1, r), Math.min(1, g), Math.min(1, bl), flick);
      }
    }
  }

  private buildSkeleton(hands: HandInput[], rgb: [number, number, number], s: number) {
    for (let h = 0; h < NUM_HANDS; h++) {
      const hand = hands[h];
      if (!hand.active) continue;
      for (const [a, b] of CONNECTIONS) {
        const pa = hand.points[a];
        const pb = hand.points[b];
        this.pushLine(pa.x, pa.y, pb.x, pb.y, rgb[0], rgb[1], rgb[2], 0.45);
      }
      for (let i = 0; i < hand.points.length; i++) {
        const p = hand.points[i];
        const isTip = TIP_INDEX.includes(i);
        this.pushPoint(p.x, p.y, (isTip ? 10 : 5) * s, rgb[0], rgb[1], rgb[2], isTip ? 0.8 : 0.4);
      }
    }
  }

  private draw(gl: WebGL2RenderingContext) {
    const dw = this.canvas.width;
    const dh = this.canvas.height;
    const writeIdx = this.accumRead ^ 1;
    const readTex = this.accumTex[this.accumRead];
    const writeFbo = this.accumFbo[writeIdx];

    gl.bindFramebuffer(gl.FRAMEBUFFER, writeFbo);
    gl.viewport(0, 0, dw, dh);
    gl.disable(gl.BLEND);
    this.blitTexture(this.fadeProg, readTex, 0.84, 0);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    if (this.mode === "gpgpu" && this.simReady) this.drawGrains(gl);
    this.drawOverlayPoints(gl);
    this.drawOverlayLines(gl);
    gl.disable(gl.BLEND);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, dw, dh);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    this.blitTexture(this.displayProg, this.accumTex[writeIdx], 0, 1.5);

    this.accumRead = writeIdx;
  }

  private drawGrains(gl: WebGL2RenderingContext) {
    const p = this.renderProg;
    gl.useProgram(p.program);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.posTex[this.simRead]);
    gl.uniform1i(p.uniforms.u_pos, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.lifeTex[this.simRead]);
    gl.uniform1i(p.uniforms.u_life, 1);
    gl.uniform2i(p.uniforms.u_texSize, GRID, GRID);
    gl.uniform2f(p.uniforms.u_resolution, this.w, this.h);
    gl.uniform1f(p.uniforms.u_dpr, this.dpr);
    gl.uniform1f(p.uniforms.u_scale, this.sizeScale);
    gl.uniform1f(p.uniforms.u_intensity, 1);
    gl.uniform1i(p.uniforms.u_wellCount, this.curWellCount);
    if (p.uniforms.u_wells) gl.uniform4fv(p.uniforms.u_wells, this.wellData);
    if (p.uniforms.u_wellColors) gl.uniform3fv(p.uniforms.u_wellColors, this.wellColorData);
    if (p.uniforms.u_sandColor) gl.uniform3f(p.uniforms.u_sandColor, 1.0, 0.92, 0.78);
    gl.bindVertexArray(this.emptyVao);
    gl.drawArrays(gl.POINTS, 0, GRAIN_COUNT);
    gl.bindVertexArray(null);
  }

  private drawOverlayPoints(gl: WebGL2RenderingContext) {
    if (this.pointCount === 0) return;
    const p = this.pointProg;
    gl.useProgram(p.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.pointBuf);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.pointData.subarray(0, this.pointCount * 7));
    gl.uniform2f(p.uniforms.u_resolution, this.w, this.h);
    gl.uniform1f(p.uniforms.u_dpr, this.dpr);
    gl.bindVertexArray(this.overlayVao);
    gl.drawArrays(gl.POINTS, 0, this.pointCount);
    gl.bindVertexArray(null);
  }

  private drawOverlayLines(gl: WebGL2RenderingContext) {
    if (this.lineCount === 0) return;
    const p = this.lineProg;
    gl.useProgram(p.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.lineBuf);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.lineData.subarray(0, this.lineCount * 6));
    gl.uniform2f(p.uniforms.u_resolution, this.w, this.h);
    gl.bindVertexArray(this.lineVao);
    gl.drawArrays(gl.LINES, 0, this.lineCount);
    gl.bindVertexArray(null);
  }

  private blitTexture(prog: Program, tex: WebGLTexture, fade: number, gain: number) {
    const gl = this.gl!;
    gl.useProgram(prog.program);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.uniform1i(prog.uniforms.u_tex, 0);
    if (prog.uniforms.u_fade) gl.uniform1f(prog.uniforms.u_fade, fade);
    if (prog.uniforms.u_gain) gl.uniform1f(prog.uniforms.u_gain, gain);
    gl.bindVertexArray(this.quadVao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindVertexArray(null);
  }
}
