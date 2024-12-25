import { useEffect, useRef } from "react";
import * as THREE from "three";
import * as CANNON from "cannon-es";
import "./App.css";

function App() {
  const canvasRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const worldRef = useRef(null);
  const spheresRef = useRef([]);
  const sphereBodiesRef = useRef([]);

  useEffect(() => {
    // 初始化Three.js场景
    sceneRef.current = new THREE.Scene();
    sceneRef.current.background = new THREE.Color(0x1a1a1a);

    // 设置相机
    cameraRef.current = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    cameraRef.current.position.set(0, 15, 35);
    cameraRef.current.lookAt(0, 10, 0);

    // 设置渲染器
    rendererRef.current = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
    });
    rendererRef.current.setSize(window.innerWidth, window.innerHeight);
    rendererRef.current.setPixelRatio(window.devicePixelRatio);

    // 添加环境光和平行光
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(0, 10, 10);
    sceneRef.current.add(ambientLight, directionalLight);

    // 初始化物理世界
    worldRef.current = new CANNON.World({
      gravity: new CANNON.Vec3(0, -9.82, 0),
    });

    // 添加圆柱障碍物
    const addCylinder = (x, y, z) => {
      // Three.js 圆柱体
      const radius = 0.3;
      const height = 2;
      const cylinderGeometry = new THREE.CylinderGeometry(
        radius,
        radius,
        height,
        32
      );
      const cylinderMaterial = new THREE.MeshStandardMaterial({
        color: 0xff4444,
        metalness: 0.7,
        roughness: 0.3,
      });
      const cylinder = new THREE.Mesh(cylinderGeometry, cylinderMaterial);
      cylinder.position.set(x, y, z);
      // 旋转圆柱体使其平放
      cylinder.rotation.x = Math.PI / 2;
      sceneRef.current.add(cylinder);

      // Cannon.js 圆柱体物理体
      const cylinderShape = new CANNON.Cylinder(radius, radius, height, 8);
      const cylinderBody = new CANNON.Body({
        mass: 0, // 质量为0使其保持静止
        shape: cylinderShape,
        material: new CANNON.Material({
          restitution: 0.9, // 增加弹性
          friction: 0.1, // 减少摩擦力
        }),
      });
      cylinderBody.position.set(x, y, z);
      // 旋转物理体使其平放
      cylinderBody.quaternion.setFromAxisAngle(
        new CANNON.Vec3(1, 0, 0),
        Math.PI / 2
      );
      worldRef.current.addBody(cylinderBody);
    };

    // 添加多个障碍物，形成金字塔形状
    const createPyramidObstacles = () => {
      const obstacles = [];
      const startY = 20; // 起始高度
      const layerSpacing = 1.8; // 增加垂直层间距
      const horizontalSpacing = 3; // 增加水平间距
      const maxLayers = 15; // 总层数
      const z = -5; // z轴位置保持不变

      // 从第二层开始（index=1），跳过最顶层
      for (let layer = 1; layer < maxLayers; layer++) {
        const y = startY - layer * layerSpacing;
        const pins = layer + 1; // 每层的柱子数量

        // 计算每层的起始 x 位置，使其居中
        const startX = (-(pins - 1) * horizontalSpacing) / 2;

        for (let pin = 0; pin < pins; pin++) {
          const x = startX + pin * horizontalSpacing;
          obstacles.push({ x, y, z });
        }
      }

      return obstacles;
    };

    // 使用新的障碍物布局
    const obstacles = createPyramidObstacles();
    obstacles.forEach((pos) => addCylinder(pos.x, pos.y, pos.z));

    // 创建地面
    const groundGeometry = new THREE.PlaneGeometry(80, 50);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x666666,
      side: THREE.DoubleSide,
    });
    const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
    groundMesh.rotation.x = -Math.PI / 2;
    sceneRef.current.add(groundMesh);

    // 地面物理体
    const groundBody = new CANNON.Body({
      type: CANNON.Body.STATIC,
      shape: new CANNON.Plane(),
    });
    groundBody.quaternion.setFromAxisAngle(
      new CANNON.Vec3(1, 0, 0),
      -Math.PI / 2
    );
    worldRef.current.addBody(groundBody);

    // 添加墙壁
    const wallGeometry = new THREE.PlaneGeometry(80, 20);
    const wallMaterial = new THREE.MeshStandardMaterial({
      color: 0x666666,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.3,
    });

    // 左墙
    const leftWall = new THREE.Mesh(wallGeometry, wallMaterial);
    leftWall.position.x = -40;
    leftWall.rotation.y = Math.PI / 2;
    sceneRef.current.add(leftWall);

    // 右墙
    const rightWall = new THREE.Mesh(wallGeometry, wallMaterial);
    rightWall.position.x = 40;
    rightWall.rotation.y = -Math.PI / 2;
    sceneRef.current.add(rightWall);

    // 墙壁物理体
    const wallShape = new CANNON.Plane();
    const leftWallBody = new CANNON.Body({ type: CANNON.Body.STATIC });
    leftWallBody.addShape(wallShape);
    leftWallBody.quaternion.setFromAxisAngle(
      new CANNON.Vec3(0, 1, 0),
      Math.PI / 2
    );
    leftWallBody.position.x = -40;
    worldRef.current.addBody(leftWallBody);

    const rightWallBody = new CANNON.Body({ type: CANNON.Body.STATIC });
    rightWallBody.addShape(wallShape);
    rightWallBody.quaternion.setFromAxisAngle(
      new CANNON.Vec3(0, 1, 0),
      -Math.PI / 2
    );
    rightWallBody.position.x = 40;
    worldRef.current.addBody(rightWallBody);

    // 点击事件处理
    const handleClick = (event) => {
      // 创建球体
      const radius = 0.5;
      const sphereGeometry = new THREE.SphereGeometry(radius);
      const sphereMaterial = new THREE.MeshStandardMaterial({
        color: 0x61dafb,
        metalness: 0.3,
        roughness: 0.4,
      });
      const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);

      // 添加微小的随机水平偏移（±0.2 范围内）
      const randomOffset = (Math.random() - 0.5) * 0.4;
      // 设置球体位置
      const spawnPoint = new THREE.Vector3(randomOffset, 23, -5);
      sphere.position.copy(spawnPoint);
      sceneRef.current.add(sphere);
      spheresRef.current.push(sphere);

      // 创建物理球体
      const sphereShape = new CANNON.Sphere(radius);
      const sphereBody = new CANNON.Body({
        mass: 1,
        shape: sphereShape,
        position: new CANNON.Vec3(spawnPoint.x, spawnPoint.y, spawnPoint.z),
        material: new CANNON.Material({
          restitution: 0.7, // 保持球体弹性
          friction: 0.1, // 减少球体摩擦力
          angularDamping: 0.3, // 添加角度阻尼，减少旋转
        }),
      });
      worldRef.current.addBody(sphereBody);
      sphereBodiesRef.current.push(sphereBody);
    };

    // 动画循环
    const animate = () => {
      worldRef.current.step(1 / 60);

      // 更新球体位置
      for (let i = 0; i < spheresRef.current.length; i++) {
        spheresRef.current[i].position.copy(
          sphereBodiesRef.current[i].position
        );
        spheresRef.current[i].quaternion.copy(
          sphereBodiesRef.current[i].quaternion
        );
      }

      rendererRef.current.render(sceneRef.current, cameraRef.current);
      requestAnimationFrame(animate);
    };

    window.addEventListener("click", handleClick);
    animate();

    // 清理函数
    return () => {
      window.removeEventListener("click", handleClick);
      rendererRef.current.dispose();
    };
  }, []);

  return (
    <div className="App">
      <div className="instructions">点击屏幕任意位置来创建小球</div>
      <canvas ref={canvasRef} />
    </div>
  );
}

export default App;
