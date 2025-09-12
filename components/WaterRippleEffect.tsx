'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';

// Shader definitions
const simulationVertexShader = `
varying vec2 vUv;
void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const simulationFragmentShader = `
uniform sampler2D textureA;
uniform vec2 mouse;
uniform vec2 resolution;
uniform float time;
uniform int frame;
varying vec2 vUv;

const float delta = 1.4;  

void main() {
    vec2 uv = vUv;
    if (frame == 0) {
        gl_FragColor = vec4(0.0);
        return;
    }
    
    vec4 data = texture2D(textureA, uv);
    float pressure = data.x;
    float pVel = data.y;
    
    vec2 texelSize = 1.0 / resolution;
    float p_right = texture2D(textureA, uv + vec2(texelSize.x, 0.0)).x;
    float p_left = texture2D(textureA, uv + vec2(-texelSize.x, 0.0)).x;
    float p_up = texture2D(textureA, uv + vec2(0.0, texelSize.y)).x;
    float p_down = texture2D(textureA, uv + vec2(0.0, -texelSize.y)).x;
    
    if (uv.x <= texelSize.x) p_left = p_right;
    if (uv.x >= 1.0 - texelSize.x) p_right = p_left;
    if (uv.y <= texelSize.y) p_down = p_up;
    if (uv.y >= 1.0 - texelSize.y) p_up = p_down;
    
    // Enhanced wave equation matching ShaderToy
    pVel += delta * (-2.0 * pressure + p_right + p_left) / 4.0;
    pVel += delta * (-2.0 * pressure + p_up + p_down) / 4.0;
    
    pressure += delta * pVel;
    
    pVel -= 0.005 * delta * pressure;
    
    pVel *= 1.0 - 0.002 * delta;
    pressure *= 0.999;
    
    vec2 mouseUV = mouse / resolution;
    if(mouse.x > 0.0) {
        float dist = distance(uv, mouseUV);
        if(dist <= 0.02) {  // Smaller radius for more precise ripples
            pressure += 2.0 * (1.0 - dist / 0.02);  // Increased intensity
        }
    }
    
    gl_FragColor = vec4(pressure, pVel, 
        (p_right - p_left) / 2.0, 
        (p_up - p_down) / 2.0);
}
`;

const renderVertexShader = `
varying vec2 vUv;
void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const renderFragmentShader = `
uniform sampler2D textureA;
uniform sampler2D textureB;
varying vec2 vUv;

void main() {
    vec4 data = texture2D(textureA, vUv);
    
    vec2 distortion = 0.3 * data.zw;
    vec4 color = texture2D(textureB, vUv + distortion);
    
    vec3 normal = normalize(vec3(-data.z * 2.0, 0.5, -data.w * 2.0));
    vec3 lightDir = normalize(vec3(-3.0, 10.0, 3.0));
    float specular = pow(max(0.0, dot(normal, lightDir)), 60.0) * 1.5;
    
    gl_FragColor = color + vec4(specular);
}
`;

export interface WaterRippleEffectProps {
  text?: string;
  textColor?: string;
  backgroundColor?: string;
  fontSize?: number;
  fontFamily?: string;
  className?: string;
  style?: React.CSSProperties;
  intensity?: number;
  damping?: number;
  rippleRadius?: number;
}

const WaterRippleEffect: React.FC<WaterRippleEffectProps> = ({
  text = 'Oceanel',
  textColor = '#b8e1fe',
  backgroundColor = '#000000',
  fontSize = 250,
  fontFamily = 'Test Söhne, Arial, sans-serif',
  className = '',
  style = {},
  intensity = 2.0,
  damping = 0.999,
  rippleRadius = 0.02,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animationIdRef = useRef<number | null>(null);
  const frameRef = useRef<number>(0);

  const createTextTexture = useCallback((width: number, height: number) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { alpha: true });
    
    if (!ctx) return null;

    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    const scaledFontSize = Math.round(fontSize * window.devicePixelRatio);
    ctx.fillStyle = textColor;
    ctx.font = `bold ${scaledFontSize}px ${fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.textRendering = 'geometricPrecision';
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.fillText(text, width / 2, height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.format = THREE.RGBAFormat;
    
    return texture;
  }, [text, textColor, backgroundColor, fontSize, fontFamily]);

  const initThreeJS = useCallback(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    
    // Use viewport dimensions for full page effect
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Ensure minimum dimensions to avoid WebGL errors
    const minWidth = Math.max(viewportWidth, 100);
    const minHeight = Math.max(viewportHeight, 100);
    const width = minWidth * window.devicePixelRatio;
    const height = minHeight * window.devicePixelRatio;

    // Create scenes
    const scene = new THREE.Scene();
    const simScene = new THREE.Scene();
    sceneRef.current = scene;

    // Create camera
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    // Create renderer with better error handling
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
      powerPreference: "high-performance",
    });
    
    // Check if WebGL is supported
    if (!renderer.domElement.getContext('webgl2') && !renderer.domElement.getContext('webgl')) {
      console.error('WebGL is not supported');
      return;
    }
    
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(minWidth, minHeight);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Create render targets with proper dimensions
    const options = {
      format: THREE.RGBAFormat,
      type: THREE.FloatType,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      stencilBuffer: false,
      depthBuffer: false,
      generateMipmaps: false, // Disable mipmaps to avoid WebGL errors
    };
    
    // Ensure dimensions are valid for WebGL
    const validWidth = Math.max(Math.floor(width), 1);
    const validHeight = Math.max(Math.floor(height), 1);
    
    let rtA = new THREE.WebGLRenderTarget(validWidth, validHeight, options);
    let rtB = new THREE.WebGLRenderTarget(validWidth, validHeight, options);

    // Mouse tracking
    const mouse = new THREE.Vector2();

    // Create simulation material
    const simMaterial = new THREE.ShaderMaterial({
      uniforms: {
        textureA: { value: null },
        mouse: { value: mouse },
        resolution: { value: new THREE.Vector2(validWidth, validHeight) },
        time: { value: 0 },
        frame: { value: 0 },
      },
      vertexShader: simulationVertexShader,
      fragmentShader: simulationFragmentShader,
    });

    // Create render material
    const renderMaterial = new THREE.ShaderMaterial({
      uniforms: {
        textureA: { value: null },
        textureB: { value: null },
      },
      vertexShader: renderVertexShader,
      fragmentShader: renderFragmentShader,
      transparent: true,
    });

    // Create geometry and meshes
    const plane = new THREE.PlaneGeometry(2, 2);
    const simQuad = new THREE.Mesh(plane, simMaterial);
    const renderQuad = new THREE.Mesh(plane, renderMaterial);

    simScene.add(simQuad);
    scene.add(renderQuad);

    // Create text texture with valid dimensions
    const textTexture = createTextTexture(validWidth, validHeight);

    // Mouse event handlers
    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX * window.devicePixelRatio;
      mouse.y = (viewportHeight - e.clientY) * window.devicePixelRatio;
    };

    const handleMouseLeave = () => {
      mouse.set(0, 0);
    };

    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseleave', handleMouseLeave);

    // Animation loop
    const animate = () => {
      simMaterial.uniforms.frame.value = frameRef.current++;
      simMaterial.uniforms.time.value = performance.now() / 1000;

      simMaterial.uniforms.textureA.value = rtA.texture;
      renderer.setRenderTarget(rtB);
      renderer.render(simScene, camera);

      renderMaterial.uniforms.textureA.value = rtB.texture;
      renderMaterial.uniforms.textureB.value = textTexture;
      renderer.setRenderTarget(null);
      renderer.render(scene, camera);

      // Swap render targets
      const temp = rtA;
      rtA = rtB;
      rtB = temp;

      animationIdRef.current = requestAnimationFrame(animate);
    };

    // Start animation
    animate();

    // Cleanup function
    return () => {
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseleave', handleMouseLeave);
      
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      
      if (renderer) {
        container.removeChild(renderer.domElement);
        renderer.dispose();
      }
      
      rtA.dispose();
      rtB.dispose();
      simMaterial.dispose();
      renderMaterial.dispose();
      plane.dispose();
      if (textTexture) textTexture.dispose();
    };
  }, [createTextTexture]);

  const handleResize = useCallback(() => {
    if (!containerRef.current || !rendererRef.current) return;

    const newWidth = window.innerWidth;
    const newHeight = window.innerHeight;

    rendererRef.current.setSize(newWidth, newHeight);
    
    // Update resolution uniform if it exists
    const simMaterial = sceneRef.current?.children[0] as THREE.Mesh;
    if (simMaterial?.material && 'uniforms' in simMaterial.material) {
      const uniforms = (simMaterial.material as THREE.ShaderMaterial).uniforms;
      if (uniforms.resolution) {
        uniforms.resolution.value.set(newWidth * window.devicePixelRatio, newHeight * window.devicePixelRatio);
      }
    }
  }, []);

  useEffect(() => {
    const cleanup = initThreeJS();
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      if (cleanup) cleanup();
      window.removeEventListener('resize', handleResize);
    };
  }, [initThreeJS, handleResize]);

  return (
    <div
      ref={containerRef}
      className={`water-ripple-effect ${className}`}
      style={{
        width: '100vw',
        height: '100vh',
        position: 'absolute',
        top: 0,
        left: 0,
        overflow: 'hidden',
        ...style,
      }}
    />
  );
};

export default WaterRippleEffect;
