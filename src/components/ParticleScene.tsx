import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { getNumberPoints } from '../utils/particleUtils';

const PARTICLE_COUNT = 6000;
const CYCLE_TIME = 4.7; 

const TRANSITION_COLORS: Record<number, THREE.Color> = {
  10: new THREE.Color(0x00ccff), // Electric Blue
  9: new THREE.Color(0x00ccff),
  8: new THREE.Color(0x00ccff),
  7: new THREE.Color(0x9900ff), // Deep Purple
  6: new THREE.Color(0x9900ff),
  5: new THREE.Color(0x9900ff),
  4: new THREE.Color(0xff00cc), // Vibrant Pink
  3: new THREE.Color(0xff00cc),
  2: new THREE.Color(0xff00cc),
  1: new THREE.Color(0xffffff), // White Core
};

const ParticleScene: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  
  const logicRef = useRef({
    currentCount: 10,
    timer: 0,
    shake: 0,
    zoomTarget: 25,
    isSingularity: false,
    color: new THREE.Color(0x00ccff),
    lastTime: 0,
    stage: 0, // 0: HOLD, 1: ANTICIPATE, 2: EXPLODE, 3: REGROUP
    exploded: false,
  });

  const mouseRef = useRef(new THREE.Vector2(-1000, -1000));

  useEffect(() => {
    if (!mountRef.current) return;

    const width = window.innerWidth;
    const height = window.innerHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.z = 25;

    const renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      alpha: false,
      powerPreference: "high-performance"
    });
    renderer.setClearColor(0x000000, 1);
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    if (mountRef.current.firstChild) {
      mountRef.current.removeChild(mountRef.current.firstChild);
    }
    mountRef.current.appendChild(renderer.domElement);
    renderer.domElement.style.display = 'block';
    
    scene.background = new THREE.Color(0x000000);

    const numberTargets: Record<number, { x: number, y: number }[]> = {};
    for (let i = 1; i <= 10; i++) {
        numberTargets[i] = getNumberPoints(i, PARTICLE_COUNT, 32, 32);
    }

    const geometry = new THREE.BufferGeometry();
    const posAttr = new Float32Array(PARTICLE_COUNT * 3);
    const colorAttr = new Float32Array(PARTICLE_COUNT * 3);
    const sizeAttr = new Float32Array(PARTICLE_COUNT);
    
    const initialTheme = TRANSITION_COLORS[10];

    const initialTargets = numberTargets[10];
    const particles = Array.from({ length: PARTICLE_COUNT }, (_, i) => {
      const t = initialTargets[i];
      // Start slightly spread but focused
      const x = t.x + (Math.random() - 0.5) * 5;
      const y = t.y + (Math.random() - 0.5) * 5;
      const z = (Math.random() - 0.5) * 5;
      
      posAttr[i * 3] = x;
      posAttr[i * 3 + 1] = y;
      posAttr[i * 3 + 2] = z;
      
      colorAttr[i * 3] = initialTheme.r;
      colorAttr[i * 3 + 1] = initialTheme.g;
      colorAttr[i * 3 + 2] = initialTheme.b;

      sizeAttr[i] = 1.0;
      return {
        pos: new THREE.Vector3(x, y, z),
        vel: new THREE.Vector3(0, 0, 0),
        target: new THREE.Vector3(t.x, t.y, (Math.random() - 0.5) * 4),
        noise: Math.random() * 100,
        factor: 0.8 + Math.random() * 0.4,
      };
    });

    geometry.setAttribute('position', new THREE.BufferAttribute(posAttr, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colorAttr, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizeAttr, 1));
    geometry.computeBoundingSphere();

    const pCanvas = document.createElement('canvas');
    pCanvas.width = 64; pCanvas.height = 64;
    const pCtx = pCanvas.getContext('2d')!;
    const pGrad = pCtx.createRadialGradient(32, 32, 0, 32, 32, 32);
    pGrad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    pGrad.addColorStop(0.3, 'rgba(255, 255, 255, 0.8)');
    pGrad.addColorStop(0.6, 'rgba(255, 255, 255, 0.1)');
    pGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    pCtx.fillStyle = pGrad; pCtx.fillRect(0,0,64,64);
    const texture = new THREE.CanvasTexture(pCanvas);

    const material = new THREE.ShaderMaterial({
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
        uTexture: { value: texture },
      },
      vertexShader: `
        attribute vec3 color;
        attribute float size;
        varying vec3 vColor;
        void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          float pSize = size * (450.0 / -mvPosition.z);
          gl_PointSize = max(pSize, 1.0);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform sampler2D uTexture;
        varying vec3 vColor;
        void main() {
          vec4 texColor = texture2D(uTexture, gl_PointCoord);
          gl_FragColor = vec4(vColor, 1.0) * texColor;
        }
      `,
    });
    
    const points = new THREE.Points(geometry, material);
    scene.add(points);

    // Energy Core Ring
    const coreGeom = new THREE.TorusGeometry(12, 0.05, 16, 100);
    const coreMat = new THREE.MeshBasicMaterial({ color: 0x00ccff, transparent: true, opacity: 0.1 });
    const core = new THREE.Mesh(coreGeom, coreMat);
    scene.add(core);

    const waveGeom = new THREE.TorusGeometry(10, 0.08, 8, 80);
    const waveMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending });
    const wave = new THREE.Mesh(waveGeom, waveMat);
    scene.add(wave);

    const flashGeom = new THREE.PlaneGeometry(300, 300);
    const flashMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthTest: false });
    const flash = new THREE.Mesh(flashGeom, flashMat);
    flash.position.z = 12;
    scene.add(flash);

    const mouseWorld = new THREE.Vector3();
    const mouseProj = new THREE.Vector3();
    let frameId: number;

    const explodeNum = (num: number) => {
        const isOne = num === 1;
        logicRef.current.shake = isOne ? 12.0 : 3.5;
        flashMat.opacity = isOne ? 0.8 : 0.3;
        wave.scale.set(0.1, 0.1, 0.1);
        waveMat.opacity = 1.0;
        
        particles.forEach(p => {
            const dir = p.pos.clone().normalize();
            if (dir.length() < 0.1) dir.set(Math.random()-0.5, Math.random()-0.5, 0).normalize();
            const power = isOne ? (Math.random() * 350 + 250) : (Math.random() * 140 + 90);
            p.vel.add(dir.multiplyScalar(power));
        });
    };

    const setNextTarget = (num: number) => {
        const targets = numberTargets[num];
        const theme = TRANSITION_COLORS[num] || new THREE.Color(1, 1, 1);
        logicRef.current.color.copy(theme);
        coreMat.color.copy(theme);
        waveMat.color.copy(theme);
        
        particles.forEach((p, i) => {
            const t = targets[i];
            p.target.set(t.x, t.y, (Math.random() - 0.5) * 4);
        });
    };

    const tempVec = new THREE.Vector3();
    const tempVec2 = new THREE.Vector3();

    const handleResize = () => {
      const nextWidth = window.innerWidth;
      const nextHeight = window.innerHeight;
      camera.aspect = nextWidth / nextHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(nextWidth, nextHeight);
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouseRef.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);

    const animate = (now: number) => {
      const dt = Math.min((now - logicRef.current.lastTime) / 1000, 0.1);
      logicRef.current.lastTime = now;
      
      const logic = logicRef.current;
      logic.timer += dt;

      // 4-Stage Rhythm Logic
      if (logic.timer < 2.4) {
          logic.stage = 0; // HOLD
      } else if (logic.timer < 3.2) {
          logic.stage = 1; // ANTICIPATION
          // Special Singularity Collapse when transitioning FROM 1 to 10
          const pull = logic.currentCount === 1 ? dt * 25 : dt * 5;
          particles.forEach(p => {
              tempVec.set(0, 0, 0).sub(p.pos);
              p.pos.add(tempVec.multiplyScalar(pull));
          });
      } else if (!logic.exploded) {
          logic.stage = 2; // EXPLODE
          logic.exploded = true;
          
          let next = logic.currentCount - 1;
          if (next < 1) next = 10;
          
          logic.currentCount = next;
          explodeNum(next);
          setNextTarget(next);
          
          logic.zoomTarget = next === 10 ? 28 : (28 - (10 - next) * 1.5);
      } else {
          logic.stage = 3; // REGROUP
      }

      if (logic.timer >= CYCLE_TIME) {
          logic.timer = 0;
          logic.exploded = false;
      }

      camera.position.z = THREE.MathUtils.lerp(camera.position.z, logic.zoomTarget, 0.04);
      if (logic.shake > 0.01) {
          camera.position.x = (Math.random() - 0.5) * logic.shake;
          camera.position.y = (Math.random() - 0.5) * logic.shake;
          logic.shake *= 0.94;
      } else {
          camera.position.x = THREE.MathUtils.lerp(camera.position.x, 0, 0.1);
          camera.position.y = THREE.MathUtils.lerp(camera.position.y, 0, 0.1);
      }

      mouseProj.set(mouseRef.current.x, mouseRef.current.y, 0.5);
      mouseProj.unproject(camera);
      tempVec.set(mouseProj.x, mouseProj.y, mouseProj.z).sub(camera.position).normalize();
      const mD = -camera.position.z / tempVec.z;
      mouseWorld.copy(camera.position).add(tempVec.multiplyScalar(mD));

      const time = now * 0.001;
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const p = particles[i];
        const d = p.pos.distanceTo(p.target);
        
        const speed = p.vel.length();
        const sizeBase = logic.stage === 2 ? 1.5 : (logic.stage === 1 ? 0.7 : 0.95);
        sizeAttr[i] = sizeBase * (1 + speed * 0.012);

        if (logic.stage === 3 || logic.stage === 0) { 
            // Premium easing for regrouping
            const pull = logic.stage === 3 ? (d < 0.5 ? (d * 18) : (Math.sqrt(d) * 32 * p.factor)) : (d * 8);
            tempVec.subVectors(p.target, p.pos).normalize().multiplyScalar(pull * dt);
            p.vel.add(tempVec);
            
            // Subtle damping as they reach target for zero-jitter hold
            if (d < 0.1) p.vel.multiplyScalar(0.85);
        }

        const distM = p.pos.distanceTo(mouseWorld);
        if (distM < 7) {
          tempVec.subVectors(p.pos, mouseWorld).normalize().multiplyScalar((1 - distM / 7) * 200 * dt);
          p.vel.add(tempVec);
        }

        const drag = logic.stage === 2 ? 0.96 : (d < 0.2 ? 0.7 : 0.9);
        p.vel.multiplyScalar(drag);
        
        tempVec.copy(p.vel).multiplyScalar(dt);
        p.pos.add(tempVec);

        p.pos.x += Math.sin(time + p.noise) * 0.004;
        p.pos.y += Math.cos(time * 0.8 + p.noise) * 0.004;

        posAttr[i * 3] = p.pos.x;
        posAttr[i * 3 + 1] = p.pos.y;
        posAttr[i * 3 + 2] = p.pos.z;

        // Controlled intensity for premium glow
        const intensity = logic.stage === 2 ? 1.15 : 0.95;
        colorAttr[i * 3] = logic.color.r * intensity;
        colorAttr[i * 3 + 1] = logic.color.g * intensity;
        colorAttr[i * 3 + 2] = logic.color.b * intensity;
      }

      geometry.attributes.position.needsUpdate = true;
      geometry.attributes.color.needsUpdate = true;
      geometry.attributes.size.needsUpdate = true;

      // FX
      if (flashMat.opacity > 0) flashMat.opacity -= dt * 1.8;
      if (waveMat.opacity > 0) {
        wave.scale.addScalar(dt * 35);
        waveMat.opacity -= dt * 1.5;
      }
      core.rotation.z += dt * 0.2;
      core.scale.setScalar(THREE.MathUtils.lerp(core.scale.x, logic.stage === 1 ? 0.8 : 1.1, 0.1));
      coreMat.opacity = THREE.MathUtils.lerp(coreMat.opacity, logic.stage === 0 ? 0.15 : 0.4, 0.1);
      
      material.uniforms.uTime.value = time;

      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    };

    logicRef.current.lastTime = performance.now();
    frameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      
      geometry.dispose(); 
      material.dispose(); 
      texture.dispose();
      waveGeom.dispose(); 
      waveMat.dispose();
      flashGeom.dispose(); 
      flashMat.dispose();
      coreGeom.dispose(); 
      coreMat.dispose();
      renderer.dispose();
    };
  }, []);

  return <div ref={mountRef} className="w-full h-full" />;
};

export default ParticleScene;
