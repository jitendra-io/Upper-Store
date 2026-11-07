import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { LayersIcon, StarIcon, ActivityIcon } from './Icons';
import './CrystalCore3D.css';

const CrystalCore3D = () => {
  const mountRef = useRef(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let width = container.clientWidth || 460;
    let height = container.clientHeight || 460;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.z = 5.4;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const coreGroup = new THREE.Group();
    scene.add(coreGroup);

    // 1. Inner Displaced Crimson Crystalline Sphere
    const icosaGeo = new THREE.IcosahedronGeometry(1.52, 4);
    const posAttr = icosaGeo.attributes.position;
    const vertex = new THREE.Vector3();

    // Create organic crystalline faceted ridges
    for (let i = 0; i < posAttr.count; i++) {
      vertex.fromBufferAttribute(posAttr, i);
      const noise = Math.sin(vertex.x * 3.5) * Math.cos(vertex.y * 3.5) * Math.sin(vertex.z * 3.5);
      vertex.multiplyScalar(1 + noise * 0.18);
      posAttr.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }
    icosaGeo.computeVertexNormals();

    const coreMat = new THREE.MeshPhysicalMaterial({
      color: 0xcc0a0a,
      emissive: 0x4a0000,
      roughness: 0.18,
      metalness: 0.35,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
      flatShading: true,
    });
    const crystalMesh = new THREE.Mesh(icosaGeo, coreMat);
    coreGroup.add(crystalMesh);

    // 2. Outer Glowing Crimson Wireframe Cage
    const wireGeo = new THREE.IcosahedronGeometry(1.76, 2);
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0xff2a2a,
      wireframe: true,
      transparent: true,
      opacity: 0.28,
    });
    const wireMesh = new THREE.Mesh(wireGeo, wireMat);
    coreGroup.add(wireMesh);

    // 3. Floating Particle Halo around the Core
    const particleCount = 140;
    const pGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      const r = 1.95 + Math.random() * 0.7;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
    }
    pGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const pMat = new THREE.PointsMaterial({
      color: 0xff4d4d,
      size: 0.045,
      transparent: true,
      opacity: 0.85,
    });
    const particleSystem = new THREE.Points(pGeo, pMat);
    coreGroup.add(particleSystem);

    // 4. Dramatic Crimson & Specular Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
    scene.add(ambientLight);

    const pointLight1 = new THREE.PointLight(0xff1e1e, 4.2, 15);
    pointLight1.position.set(4, 4, 4);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0xff5555, 2.8, 15);
    pointLight2.position.set(-4, -3, 3);
    scene.add(pointLight2);

    const rimLight = new THREE.DirectionalLight(0xffffff, 1.4);
    rimLight.position.set(0, 5, -5);
    scene.add(rimLight);

    // 5. Mouse & Touch Drag Interaction
    let isDragging = false;
    let prevX = 0;
    let prevY = 0;

    const onMouseDown = (e) => {
      isDragging = true;
      prevX = e.clientX;
      prevY = e.clientY;
    };

    const onMouseMove = (e) => {
      if (!isDragging) return;
      const dx = e.clientX - prevX;
      const dy = e.clientY - prevY;
      coreGroup.rotation.y += dx * 0.008;
      coreGroup.rotation.x += dy * 0.008;
      prevX = e.clientX;
      prevY = e.clientY;
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    const onTouchStart = (e) => {
      if (e.touches.length === 1) {
        isDragging = true;
        prevX = e.touches[0].clientX;
        prevY = e.touches[0].clientY;
      }
    };

    const onTouchMove = (e) => {
      if (!isDragging || e.touches.length !== 1) return;
      const dx = e.touches[0].clientX - prevX;
      const dy = e.touches[0].clientY - prevY;
      coreGroup.rotation.y += dx * 0.008;
      coreGroup.rotation.x += dy * 0.008;
      prevX = e.touches[0].clientX;
      prevY = e.touches[0].clientY;
    };

    const onTouchEnd = () => {
      isDragging = false;
    };

    container.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    container.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd);

    // 6. Responsive Resize Handler
    const handleResize = () => {
      if (!container) return;
      width = container.clientWidth || 460;
      height = container.clientHeight || 460;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener('resize', handleResize);

    // 7. Animation Loop
    let clock = new THREE.Clock();
    let animId;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      if (!isDragging) {
        crystalMesh.rotation.y += 0.0045;
        crystalMesh.rotation.x += 0.002;
        wireMesh.rotation.y -= 0.003;
        particleSystem.rotation.y += 0.0015;
      }

      // Subtle organic breathing pulse
      const scale = 1 + Math.sin(elapsed * 2.2) * 0.025;
      crystalMesh.scale.set(scale, scale, scale);

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      container.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      container.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('resize', handleResize);

      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
      icosaGeo.dispose();
      coreMat.dispose();
      wireGeo.dispose();
      wireMat.dispose();
      pGeo.dispose();
      pMat.dispose();
    };
  }, []);

  return (
    <div className="crystal-core-wrapper">
      {/* Background Pulse Rings */}
      <div className="crystal-ring-outer animate-pulse-slow" />
      <div className="crystal-ring-inner" />

      {/* Three.js Interactive Viewport */}
      <div
        ref={mountRef}
        className="crystal-canvas-container"
        title="Drag to rotate the Crimson Neural Core"
      />

      {/* Floating Top-Left Telemetry Badge */}
      <div className="floating-badge badge-top-left">
        <div className="badge-icon-box">
          <LayersIcon size={18} />
        </div>
        <div className="badge-text-col">
          <span className="badge-title">High-Speed CDN</span>
          <span className="badge-subtitle">Global ImageKit Edge Mesh</span>
        </div>
      </div>

      {/* Floating Top-Right Uptime Pill */}
      <div className="floating-badge badge-top-right">
        <span className="uptime-status-dot" />
        <span className="uptime-text">99.05% System Uptime</span>
      </div>

      {/* Floating Bottom-Right Telemetry Card */}
      <div className="floating-badge badge-bottom-right">
        <div className="telemetry-stat">
          <span className="telemetry-value">5+</span>
          <span className="telemetry-label">Curated Products</span>
        </div>
        <div className="telemetry-divider" />
        <div className="telemetry-stat">
          <span className="telemetry-value-flex">
            100% <StarIcon size={14} className="crimson-star" />
          </span>
          <span className="telemetry-label">SHA-256 Verified</span>
        </div>
      </div>

      {/* Drag to Inspect Instruction */}
      <div className="crystal-drag-hint">
        <ActivityIcon size={12} className="drag-hint-icon" />
        <span>Interactive 3D Core &bull; Drag to Inspect</span>
      </div>
    </div>
  );
};

export default CrystalCore3D;

