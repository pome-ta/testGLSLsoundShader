import * as THREE from 'https://cdn.skypack.dev/three';


const DURATION = 6; // Loop 3 sec

// Size of render target
const WIDTH = 512;
const HEIGHT = 512;

const fragmentShader = `
precision mediump float;
uniform float iSampleRate;
uniform float iBlockOffset;

float tri(in float freq, in float time) {
  return -abs(1. - mod(freq * time * 2., 2.));
}

vec2 mainSound( float time ) {
  float freq = 440.;
  freq *= pow(1.06 * 1.06, floor(mod(time, 6.)));
  return vec2(
    tri(freq, time) * sin(time * 3.141592),
    tri(freq * 1.5, time) * sin(time * 3.141592)
  );
}

void main() {
  float t = iBlockOffset + ((gl_FragCoord.x-0.5) + (gl_FragCoord.y-0.5)*512.0) / iSampleRate;
  vec2 y = mainSound(t);
  vec2 v  = floor((0.5+0.5*y)*65536.0);
  vec2 vl = mod(v,256.0)/255.0;
  vec2 vh = floor(v/256.0)/255.0;
  gl_FragColor = vec4(vl.x,vh.x,vl.y,vh.y);
}`;

// Create audio context
const AudioContext = window.AudioContext || window.webkitAudioContext;

const ctx = new AudioContext();
const node = ctx.createBufferSource();
const anlyz = ctx.createAnalyser();
node.connect(anlyz);
anlyz.connect(ctx.destination);

node.loop = true;
const audioBuffer = ctx.createBuffer(2, ctx.sampleRate * DURATION, ctx.sampleRate);


// Create canvas
const canvas = document.createElement('canvas');
canvas.width = WIDTH;
canvas.height = HEIGHT;
const renderer = new THREE.WebGLRenderer({ canvas, alpha: true });
const wctx = renderer.getContext();


// Create scenes
const uniforms = {
  iBlockOffset: { type: 'f', value: 0.0 },
  iSampleRate: { type: 'f', value: ctx.sampleRate },
};

const geometry = new THREE.PlaneGeometry(2, 2);
const material = new THREE.ShaderMaterial({ uniforms, fragmentShader });
const plane = new THREE.Mesh(geometry, material);
const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);

camera.position.set(0, 0, 1);
camera.lookAt(scene.position);
scene.add(plane);
const target = new THREE.WebGLRenderTarget(WIDTH, HEIGHT);


// Render
const samples = WIDTH * HEIGHT;
const numBlocks = (ctx.sampleRate * DURATION) / samples;
for (let i = 0; i < numBlocks; i++) {
  // Update uniform & Render
  uniforms.iBlockOffset.value = i * samples / ctx.sampleRate;
  renderer.render(scene, camera, target, true);
  // Read pixels
  const pixels = new Uint8Array(WIDTH * HEIGHT * 4);
  wctx.readPixels(0, 0, WIDTH, HEIGHT, wctx.RGBA, wctx.UNSIGNED_BYTE, pixels);
  // Convert pixels to samples
  const outputDataL = audioBuffer.getChannelData(0);
  const outputDataR = audioBuffer.getChannelData(1);
  for (let j = 0; j < samples; j++) {
    outputDataL[i * samples + j] = (pixels[j * 4 + 0] + 256 * pixels[j * 4 + 1]) / 65535 * 2 - 1;
    outputDataR[i * samples + j] = (pixels[j * 4 + 2] + 256 * pixels[j * 4 + 3]) / 65535 * 2 - 1;
  }
}


// Play
node.buffer = audioBuffer;
node.start(0);

// 着火のおまじない
const eventName = typeof document.ontouchend !== 'undefined' ? 'touchend' : 'mouseup';
document.addEventListener(eventName, initAudioContext);
function initAudioContext(){
  document.removeEventListener(eventName, initAudioContext);
  // wake up AudioContext
  ctx.resume();
}



/* visualizar */
function visualize() {
  const WIDTH = viCanvas.width;
  const HEIGHT = viCanvas.height;
  
  anlyz.fftSize = 256;
  const bufferLength = anlyz.fftSize;
  //const bufferLength = anlyz.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);
  vcctx.clearRect(0, 0, WIDTH, HEIGHT);
  
  const draw = () => {
    requestAnimationFrame(draw);
    anlyz.getByteFrequencyData(dataArray);
    
    vcctx.fillStyle = 'rgb(0, 0, 0)';
    vcctx.fillRect(0, 0, WIDTH, HEIGHT);
    
    const barWidth = (WIDTH / bufferLength);
    let barHeight;
    let x = 0;
    
    for(let i = 0; i < bufferLength; i++) {
      barHeight = dataArray[i] / 2;
      vcctx.fillStyle = 'rgb(' + (barHeight + 100) + ', 50, 50)';
      vcctx.fillRect(x, HEIGHT-barHeight / 2, barWidth, barHeight);
        x += barWidth + 1;
    }
  };
    /*
    vcctx.fillStyle = 'rgb(3, 3, 3)';
    vcctx.fillRect(0, 0, WIDTH, HEIGHT);
    vcctx.lineWidth = 1;
    vcctx.strokeStyle = 'rgb(0, 255, 0)';
    vcctx.beginPath();
    const sliceWidth = WIDTH * 1.0 / bufferLength;
    
    let x = 0;
    for (let i = 0; i < bufferLength; i++) {
      const v = dataArray[i] / 128.0;
      const y = v * HEIGHT / 2;
      // todo: ショートハンドすぎる？
      i === 0 ? vcctx.moveTo(x, y) : vcctx.lineTo(x, y);
      x += sliceWidth;
    }
    vcctx.lineTo(viCanvas.width, viCanvas.height / 2);
    vcctx.stroke();
    
  };*/
  draw();
}

const viCanvas = document.querySelector('.visualizer');
const vcctx = viCanvas.getContext("2d");
const intendedWidth = document.querySelector('.wrapper').clientWidth;
viCanvas.setAttribute('width', intendedWidth);
viCanvas.setAttribute('height', intendedWidth / 2);

visualize();

