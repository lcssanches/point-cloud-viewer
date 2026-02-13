import { useState, useEffect, useRef } from "react";
import * as THREE from "three";

const SHAPES = ["sphere", "torus", "plane", "helix", "cylinder", "cube", "octahedron"];

const COLORS = {
  sphere: "#00e5ff",
  torus: "#ff6b6b",
  plane: "#69ff47",
  helix: "#ffd600",
  cylinder: "#ff3d00",
  cube: "#40c4ff",
  random: "#f040f1",
  octahedron: "#7c4dff",
};

export default function App() {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const frameRef = useRef(null);
  const pointsRef = useRef(null);

  const [shape, setShape] = useState("sphere");
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Bootstrap Three.js scene once
  useEffect(() => {
    const el = mountRef.current;
    const w = el.clientWidth;
    const h = el.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#0a0a0f");
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(60, w / h, 0.01, 100);
    camera.position.set(0, 0, 2.8);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(w, h);
    el.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Subtle grid
    const grid = new THREE.GridHelper(4, 20, "#1a1a2e", "#1a1a2e");
    grid.position.y = -1.2;
    scene.add(grid);

    // Axes helper (small)
    const axes = new THREE.AxesHelper(0.3);
    axes.position.set(-1.2, -1.1, 0);
    scene.add(axes);

    // Mouse orbit (simple)
    let isDragging = false;
    let prevMouse = { x: 0, y: 0 };
    let spherical = { theta: 0, phi: Math.PI / 2 };
    let radius = 2.8;

    const onMouseDown = (e) => { isDragging = true; prevMouse = { x: e.clientX, y: e.clientY }; };
    const onMouseUp = () => { isDragging = false; };
    const onMouseMove = (e) => {
      if (!isDragging) return;
      const dx = e.clientX - prevMouse.x;
      const dy = e.clientY - prevMouse.y;
      spherical.theta -= dx * 0.008;
      spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.phi + dy * 0.008));
      prevMouse = { x: e.clientX, y: e.clientY };
      camera.position.set(
        radius * Math.sin(spherical.phi) * Math.sin(spherical.theta),
        radius * Math.cos(spherical.phi),
        radius * Math.sin(spherical.phi) * Math.cos(spherical.theta),
      );
      camera.lookAt(0, 0, 0);
    };
    const onWheel = (e) => {
      radius = Math.max(1.2, Math.min(8, radius + e.deltaY * 0.004));
      camera.position.setLength(radius);
    };

    el.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("mousemove", onMouseMove);
    el.addEventListener("wheel", onWheel, { passive: true });

    // Animate
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      // if (pointsRef.current) {
      //   pointsRef.current.rotation.y += 0.0015;
      // }
      renderer.render(scene, camera);
    };
    animate();

    // Resize
    const onResize = () => {
      const nw = el.clientWidth, nh = el.clientHeight;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(frameRef.current);
      renderer.dispose();
      el.removeChild(renderer.domElement);
      el.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("mousemove", onMouseMove);
      el.removeEventListener("wheel", onWheel);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  const loadShape = async (shapeName) => {
    setLoading(true);
    setError(null);
    try {

      const rawPoints = await fetch(`shapes/${shapeName}.points.json`).then(x => x.json());
      const _statsData = await fetch(`shapes/${shapeName}.stats.json`).then(x => x.json());
      const statsData = _statsData;

      setStats(statsData);

      // Update Three.js scene
      const scene = sceneRef.current;
      if (pointsRef.current) {
        scene.remove(pointsRef.current);
        pointsRef.current.geometry.dispose();
        pointsRef.current.material.dispose();
      }

      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(rawPoints.flatMap(p => [p.x, p.y, p.z]));
      geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

      const color = new THREE.Color(COLORS[shapeName] || "#ffffff");
      const material = new THREE.PointsMaterial({
        color,
        size: 0.012,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.5,
      });

      const points = new THREE.Points(geometry, material);
      scene.add(points);
      pointsRef.current = points;

    } catch (e) {
      setError("Could not connect to backend. Make sure FastAPI is running on :8000");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadShape(shape); }, []);

  const accentColor = COLORS[shape];

  return (
    <div style={{
      display: "flex", height: "100vh", width: "100vw",
      background: "#0a0a0f", color: "#e0e0e0",
      fontFamily: "'Courier New', monospace", overflow: "hidden",
    }}>

      {/* Sidebar */}
      <div style={{
        width: 280, flexShrink: 0, padding: "24px 20px",
        borderRight: `1px solid #1e1e2e`,
        display: "flex", flexDirection: "column", gap: 24,
        background: "#0d0d17",
      }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "center" }}>
          <div style={{ fontSize: 10, letterSpacing: 3, color: "#fff", marginBottom: 4 }}>SOME CONCEPT</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: accentColor, letterSpacing: 1 }}>
            Point Cloud Viewer
          </div>
        </div>

        {/* Shape selector */}
        <div>
          <Label>SHAPE</Label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            {SHAPES.map(s => (
              <button key={s} onClick={() => { setShape(s); loadShape(s); }}
                style={{
                  padding: "8px 0", border: `1px solid ${shape === s ? COLORS[s] : "#222"}`,
                  background: shape === s ? `${COLORS[s]}18` : "transparent",
                  color: shape === s ? COLORS[s] : "#aaa",
                  cursor: "pointer", borderRadius: 4,
                  fontSize: 11, letterSpacing: 1, textTransform: "uppercase",
                  transition: "all 0.15s",
                }}>
                {s}
              </button>
            ))}
          </div>
        </div>

        <button onClick={() => loadShape(shape)}
          disabled={loading}
          style={{
            padding: "10px 0", background: loading ? "#1a1a2e" : `${accentColor}22`,
            border: `1px solid ${loading ? "#222" : accentColor}`,
            color: loading ? "#777" : accentColor,
            cursor: loading ? "not-allowed" : "pointer",
            borderRadius: 4, fontSize: 12, letterSpacing: 2,
            textTransform: "uppercase",
          }}>
          {loading ? "LOADING…" : "RELOAD"}
        </button>

        {/* Stats panel */}
        {stats && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}>
            <Label style={{ color: "#777" }}>GEOMETRY STATS</Label>
            <StatRow label="Points" value={stats.point_count} color={accentColor} />
            <StatRow label="NN Avg Dist"
              value={stats.nearest_neighbor_avg.toFixed(4)}
              color={accentColor} />
            <StatRow label="Centroid"
              value={`${stats.centroid.x.toFixed(2)}, ${stats.centroid.y.toFixed(2)}, ${stats.centroid.z.toFixed(2)}`}
              color={accentColor} />
            <div style={{ borderTop: "1px solid #1e1e2e", paddingTop: 10 }}>
              <div style={{ fontSize: 10, color: "#777", marginBottom: 6 }}>BOUNDING BOX</div>
              <StatRow label="W / H / D"
                value={`${stats.bounding_box.dimensions.x.toFixed(2)} / ${stats.bounding_box.dimensions.y.toFixed(2)} / ${stats.bounding_box.dimensions.z.toFixed(2)}`}
                color={accentColor} />
            </div>
            <div style={{ borderTop: "1px solid #1e1e2e", paddingTop: 10 }}>
              <div style={{ fontSize: 10, color: "#777", marginBottom: 6 }}>VARIANCE (SPREAD)</div>
              <StatRow label="X / Y / Z"
                value={`${stats.variance.x.toFixed(3)} / ${stats.variance.y.toFixed(3)} / ${stats.variance.z.toFixed(3)}`}
                color={accentColor} />
            </div>
          </div>
        )}

        {error && (
          <div style={{
            padding: 12, background: "#ff000011", border: "1px solid #ff000033",
            borderRadius: 4, fontSize: 11, color: "#ff6b6b", lineHeight: 1.5,
          }}>
            {error}
          </div>
        )}

        <div style={{ marginTop: "auto", fontSize: 10, color: "#333", lineHeight: 1.8 }}>
          Drag to orbit · Scroll to zoom
        </div>
      </div>

      {/* 3D Viewport */}
      <div ref={mountRef} style={{ flex: 1, position: "relative" }}>
        {loading && (
          <div style={{
            position: "absolute", inset: 0, display: "flex",
            alignItems: "center", justifyContent: "center",
            background: "#0a0a0f99", zIndex: 10,
            fontSize: 13, letterSpacing: 3, color: accentColor,
          }}>
            PROCESSING…
          </div>
        )}
      </div>
    </div>
  );
}

function Label({ children, style }) {
  return (
    <div style={{ fontSize: 10, letterSpacing: 2, color: "#aaa", marginBottom: 8, textTransform: "uppercase", ...style }}>
      {children}
    </div>
  );
}

function StatRow({ label, value, color }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
      <span style={{ fontSize: 10, color: "#aaa" }}>{label}</span>
      <span style={{ fontSize: 12, color, fontVariantNumeric: "tabular-nums" }}>{value}</span>
    </div>
  );
}
