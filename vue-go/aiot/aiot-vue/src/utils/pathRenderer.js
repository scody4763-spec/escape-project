/**
 * PathRenderer - 在 Three.js 场景中渲染逃生路径
 * 地面发光路径带 + 方向箭头 + 起终点标记 + 沿途指示灯
 */
import * as THREE from 'three'

const ALGO_COLORS = {
  aco: 0xef4444,
  iaco: 0x22c55e,
  greedy: 0xf59e0b,
  pso: 0x3b82f6,
  sa:  0xf59e0b,
  ga:  0x8b5cf6,
}

const START_COLOR = 0x22c55e
const END_COLOR   = 0xef4444

export class PathRenderer {
  constructor(scene, nodePositions) {
    this.scene = scene
    this.nodePositions = nodePositions
    this.objects = []
    this._animItems = []
    this._animId = null
    this._clock = new THREE.Clock()
  }

  render(data) {
    this.clear()
    const groups = data.results && data.results.length
      ? data.results.map((r, gi) => ({
          color: ALGO_COLORS[r.algorithm] || 0xffffff,
          paths: r.paths || [],
          optimal: true,
          offsetY: gi * 0.08,
        }))
      : [{ color: ALGO_COLORS[data.algorithm] || 0xffffff, paths: data.paths || [], optimal: true, offsetY: 0 }]

    groups.forEach(group => {
      const compareMode = !!(data.results && data.results.length)
      const paths = compareMode ? group.paths.slice(0, 1) : group.paths
      paths.forEach((path, pathIdx) => {
      const nodeKeys = path.nodes || []
      const points = nodeKeys.map(k => this.nodePositions.get(k)).filter(Boolean)
        .map(pt => new THREE.Vector3(pt.x, pt.y + (group.offsetY || 0), pt.z))
      if (points.length < 2) return

      const isOptimal = group.optimal && pathIdx === 0
      const color = isOptimal ? group.color : 0x94a3b8
      const tubeRadius = isOptimal ? 0.22 : 0.14
      const emissiveIntensity = isOptimal ? 0.9 : 0.4

      // ── 发光路径管道 ──
      const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.3)
      const tubeGeo = new THREE.TubeGeometry(curve, Math.max(points.length * 16, 64), tubeRadius, 12, false)
      const tubeMat = new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity,
        transparent: true,
        opacity: 0.9,
        roughness: 0.3,
        metalness: 0.1,
      })
      const tube = new THREE.Mesh(tubeGeo, tubeMat)
      tube.name = `path-tube-${pathIdx}`
      this.scene.add(tube)
      this.objects.push(tube)

      // ── 地面投影虚线 ──
      const floorPoints = points.map(p => new THREE.Vector3(p.x, p.y - 0.1, p.z))
      const floorGeo = new THREE.BufferGeometry().setFromPoints(floorPoints)
      const floorLine = new THREE.Line(floorGeo, new THREE.LineDashedMaterial({
        color, dashSize: 0.6, gapSize: 0.25, transparent: true, opacity: 0.5, linewidth: 2,
      }))
      floorLine.computeLineDistances()
      this.scene.add(floorLine)
      this.objects.push(floorLine)

      // ── 管道外发光光晕线 ──
      if (isOptimal) {
        const glowGeo = new THREE.TubeGeometry(curve, Math.max(points.length * 16, 64), tubeRadius + 0.12, 12, false)
        const glowMat = new THREE.MeshBasicMaterial({
          color, transparent: true, opacity: 0.15, side: THREE.BackSide,
        })
        const glow = new THREE.Mesh(glowGeo, glowMat)
        this.scene.add(glow)
        this.objects.push(glow)
      }

      // ── 节点标记 ──
      points.forEach((pt, i) => {
        const isStart = i === 0
        const isEnd = i === points.length - 1
        if (isStart || isEnd) {
          this._buildEndpointMarker(pt, isStart, isStart ? START_COLOR : END_COLOR)
        } else if (isOptimal) {
          this._buildWaypointDot(pt, color)
        }
      })

      // ── 方向箭头（沿曲线均匀分布） ──
      if (isOptimal) {
        const arrowCount = Math.max(Math.floor(curve.getLength() / 3), points.length - 1)
        for (let i = 1; i <= arrowCount; i++) {
          const t = i / (arrowCount + 1)
          const pos = curve.getPointAt(t)
          const tan = curve.getTangentAt(t).normalize()
          pos.y += 0.05
          const arrow = new THREE.ArrowHelper(tan, pos, 0.9, color, 0.4, 0.22)
          this.scene.add(arrow)
          this.objects.push(arrow)
        }
      }

      // ── 沿路径的点光源（最优路径） ──
      if (isOptimal) {
        const lightCount = Math.min(Math.ceil(curve.getLength() / 6), 5)
        for (let i = 0; i < lightCount; i++) {
          const t = (i + 1) / (lightCount + 1)
          const pos = curve.getPointAt(t)
          const pl = new THREE.PointLight(color, 1.5, 6)
          pl.position.set(pos.x, pos.y + 1.0, pos.z)
          this.scene.add(pl)
          this.objects.push(pl)
        }
      }
      })
    })

    this._startAnim()
  }

  /* ─── 起/终点标记：柱体 + 环 + 标签 ─── */
  _buildEndpointMarker(pt, isStart, color) {
    // 底座环
    const ringGeo = new THREE.RingGeometry(0.35, 0.55, 24)
    const ringMat = new THREE.MeshStandardMaterial({
      color, emissive: color, emissiveIntensity: 0.6,
      side: THREE.DoubleSide, transparent: true, opacity: 0.9,
    })
    const ring = new THREE.Mesh(ringGeo, ringMat)
    ring.rotation.x = -Math.PI / 2
    ring.position.set(pt.x, pt.y + 0.03, pt.z)
    this.scene.add(ring)
    this.objects.push(ring)
    this._animItems.push({ type: 'pulse', mesh: ring })

    // 柱体
    const pillar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.12, 2.5, 12),
      new THREE.MeshStandardMaterial({
        color, emissive: color, emissiveIntensity: 0.5,
        transparent: true, opacity: 0.7,
      })
    )
    pillar.position.set(pt.x, pt.y + 1.25, pt.z)
    this.scene.add(pillar)
    this.objects.push(pillar)

    // 顶部球
    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.25, 16, 16),
      new THREE.MeshStandardMaterial({
        color, emissive: color, emissiveIntensity: 0.8,
      })
    )
    sphere.position.set(pt.x, pt.y + 2.6, pt.z)
    this.scene.add(sphere)
    this.objects.push(sphere)

    // 点光
    const light = new THREE.PointLight(color, 2.5, 6)
    light.position.set(pt.x, pt.y + 2.8, pt.z)
    this.scene.add(light)
    this.objects.push(light)

    // 标签
    this._addMarkerLabel(pt, isStart ? 'Start' : 'Exit', color)
  }

  /* ─── 途经点小圆球 ─── */
  _buildWaypointDot(pt, color) {
    const dot = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 12, 12),
      new THREE.MeshStandardMaterial({
        color, emissive: color, emissiveIntensity: 0.5,
      })
    )
    dot.position.copy(pt)
    this.scene.add(dot)
    this.objects.push(dot)
  }

  /* ─── 文字标签 ─── */
  _addMarkerLabel(pt, text, color) {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 64
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, 256, 64)

    // 背景
    ctx.fillStyle = `rgba(0,0,0,0.7)`
    ctx.beginPath()
    ctx.roundRect(8, 8, 240, 48, 12)
    ctx.fill()

    // 文字
    const hex = '#' + new THREE.Color(color).getHexString()
    ctx.fillStyle = hex
    ctx.font = 'bold 28px "Arial", "Segoe UI", "Helvetica Neue", sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, 128, 34)

    const texture = new THREE.CanvasTexture(canvas)
    texture.minFilter = THREE.LinearFilter
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false })
    )
    sprite.position.set(pt.x, pt.y + 3.2, pt.z)
    sprite.scale.set(2.5, 0.65, 1)
    this.scene.add(sprite)
    this.objects.push(sprite)
  }

  /* ─── 动画 ─── */
  _startAnim() {
    if (this._animId) return
    const tick = () => {
      this._animId = requestAnimationFrame(tick)
      const t = this._clock.getElapsedTime()
      for (const item of this._animItems) {
        if (item.type === 'pulse' && item.mesh.material) {
          item.mesh.material.emissiveIntensity = 0.4 + Math.sin(t * 3) * 0.4
        }
      }
    }
    tick()
  }

  _stopAnim() {
    if (this._animId) {
      cancelAnimationFrame(this._animId)
      this._animId = null
    }
  }

  clear() {
    this._stopAnim()
    this._animItems = []
    for (const obj of this.objects) {
      this.scene.remove(obj)
      if (obj.geometry) obj.geometry.dispose()
      if (obj.material) {
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material]
        for (const m of mats) {
          if (m.map) m.map.dispose()
          m.dispose()
        }
      }
    }
    this.objects = []
  }
}
