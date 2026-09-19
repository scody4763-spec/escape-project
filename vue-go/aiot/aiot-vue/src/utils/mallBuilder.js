/**
 * MallBuilder - 将建筑图数据程序化生成 Three.js 3D 建筑场景
 * 用墙壁围合房间、门洞连接通道、走廊地砖、楼梯台阶、出口标识
 */
import * as THREE from 'three'

const WALL_H = 3.0        // 墙壁高度
const WALL_T = 0.15       // 墙壁厚度
const ROOM_W = 5           // 房间宽度
const ROOM_D = 4           // 房间深度
const DOOR_W = 1.2         // 门洞宽度
const DOOR_H = 2.4         // 门洞高度
const SLAB_T = 0.25        // 楼板厚度
const CORRIDOR_W = 1.8     // 走廊地面宽度

const COLORS = {
  slab:        0x2a2f3a,
  roomFloor:   0x3b4252,
  wall:        0xd8dee9,
  wallEdge:    0x4c566a,
  door:        0x88c0d0,
  doorFrame:   0x5e81ac,
  exit:        0xa3be8c,
  exitGlow:    0x22c55e,
  stair:       0xebcb8b,
  elevator:    0xb48ead,
  corridor:    0x434c5e,
  corLine:     0x5e81ac,
  label:       '#eceff4',
  labelBg:     'rgba(46,52,64,0.85)',
  // 新增颜色
  fireHydrant: 0xdc2626,
  monitorRoom: 0x0ea5e9,
  electrical:  0xeab308,
  furniture:   0x78716c,
  furnitureDk: 0x57534e,
  glass:       0x88c0d0,
  exteriorWall:0x94a3b8,
  window:      0x7dd3fc,
  roof:        0x475569,
  warningYellow:0xfbbf24,
  screen:      0x22d3ee,
  serverRack:  0x1e293b,
  sofa:        0x6366f1,
  desk:        0x92400e,
  carpet:      0x1e3a5f,
  indicatorGreen:  0x22c55e,
  indicatorYellow: 0xfbbf24,
  indicatorRed:    0xef4444,
  ceilingLight:    0xfff7ed,
}

export class MallBuilder {
  constructor(scene) {
    this.scene = scene
    this.floorGroups = new Map()
    this.nodePositions = new Map()
    this.nodeMeshes = new Map()
    this.allObjects = []
    this._nodeMap = new Map()
    this._edgeIndex = new Map()       // nodeKey → [connected nodeKeys]
    this._originalOpacities = new Map()
    this.indicatorLights = new Map()  // floorId → [{mesh, light, position}]
    this.ceilingLights = new Map()    // floorId → [{mesh, light, position}]
  }

  /* ─── normalize ──────────────────────────────────────────── */
  _normalize(nodes, edges) {
    const ns = nodes.map(n => ({
      ...n,
      floorId:  n.floorId  ?? n.floor_id,
      nodeKey:  n.nodeKey   ?? n.node_key,
      nodeType: n.nodeType  ?? n.node_type,
      isExit:   n.isExit    ?? n.is_exit,
      x: Number(n.x) || 0,
      y: Number(n.y) || 0,
      z: Number(n.z) || 0,
    }))
    const es = edges.map(e => ({
      ...e,
      fromNodeKey: e.fromNodeKey ?? e.from_node_key,
      toNodeKey:   e.toNodeKey   ?? e.to_node_key,
      width:       Number(e.width) || 2,
    }))
    return { ns, es }
  }

  /* ─── build ──────────────────────────────────────────────── */
  build(nodes, edges) {
    this.clear()
    const { ns, es } = this._normalize(nodes, edges)

    // 索引
    for (const n of ns) this._nodeMap.set(n.nodeKey, n)
    for (const e of es) {
      if (!this._edgeIndex.has(e.fromNodeKey)) this._edgeIndex.set(e.fromNodeKey, [])
      if (!this._edgeIndex.has(e.toNodeKey))   this._edgeIndex.set(e.toNodeKey, [])
      this._edgeIndex.get(e.fromNodeKey).push(e.toNodeKey)
      this._edgeIndex.get(e.toNodeKey).push(e.fromNodeKey)
    }

    // 按楼层分组
    const floorMap = new Map()
    for (const n of ns) {
      if (!floorMap.has(n.floorId)) floorMap.set(n.floorId, [])
      floorMap.get(n.floorId).push(n)
    }

    for (const [floorId, floorNodes] of floorMap) {
      const group = new THREE.Group()
      group.name = `floor-${floorId}`

      this._buildSlab(group, floorNodes, floorId)

      for (const node of floorNodes) {
        this._buildNodeArchitecture(group, node)
        // 为 room 类型节点添加内部家具
        if ((node.nodeType ?? node.node_type) === 'room') {
          this._buildRoomFurnishings(group, node)
        }
      }

      // 指示灯和吸顶灯
      this._buildIndicatorLights(group, floorNodes, floorId)
      this._buildCeilingLights(group, floorNodes, floorId)

      // 建筑外观壳体（外墙+窗户+屋顶）
      this._buildExteriorShell(group, floorNodes, floorId)

      this.scene.add(group)
      this.floorGroups.set(floorId, group)
    }

    // 走廊通道连线 + 走廊装饰
    for (const edge of es) {
      this._buildCorridor(edge)
      const fromNode = this._nodeMap.get(edge.fromNodeKey)
      const floorGroup = fromNode ? this.floorGroups.get(fromNode.floorId) : null
      this._buildCorridorFurnishings(floorGroup || this.scene, edge)
    }
  }

  /* ─── 楼板 ──────────────────────────────────────────────── */
  _buildSlab(group, nodes, floorId) {
    if (!nodes.length) return
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity
    let y = 0
    for (const n of nodes) {
      const hw = n.nodeType === 'room' ? ROOM_W / 2 + 1 : 2
      const hd = n.nodeType === 'room' ? ROOM_D / 2 + 1 : 2
      minX = Math.min(minX, n.x - hw)
      maxX = Math.max(maxX, n.x + hw)
      minZ = Math.min(minZ, n.z - hd)
      maxZ = Math.max(maxZ, n.z + hd)
      y = n.y
    }
    const pad = 3
    const w = (maxX - minX) + pad * 2
    const d = (maxZ - minZ) + pad * 2
    const cx = (minX + maxX) / 2
    const cz = (minZ + maxZ) / 2

    // 主楼板
    const slab = this._mesh(
      new THREE.BoxGeometry(w, SLAB_T, d),
      { color: COLORS.slab, roughness: 0.9 }
    )
    slab.position.set(cx, y - SLAB_T / 2, cz)
    slab.receiveShadow = true
    slab.name = `slab-${floorId}`
    group.add(slab)

    // 楼板边缘线
    const edgeGeo = new THREE.EdgesGeometry(slab.geometry)
    const edgeLine = new THREE.LineSegments(edgeGeo, new THREE.LineBasicMaterial({ color: COLORS.wallEdge, transparent: true, opacity: 0.3 }))
    edgeLine.position.copy(slab.position)
    group.add(edgeLine)
    this.allObjects.push(slab, edgeLine)
  }

  /* ─── 建筑化节点 ────────────────────────────────────────── */
  _buildNodeArchitecture(group, node) {
    const y = node.y
    switch (node.nodeType) {
      case 'room':           this._buildRoom(group, node); break
      case 'corridor':       this._buildCorridorNode(group, node); break
      case 'exit':           this._buildExit(group, node); break
      case 'stair':          this._buildStair(group, node); break
      case 'elevator':       this._buildElevator(group, node); break
      case 'fire_hydrant':   this._buildFireHydrant(group, node); break
      case 'monitor_room':   this._buildMonitorRoom(group, node); break
      case 'electrical_room':this._buildElectricalRoom(group, node); break
      default:               this._buildRoom(group, node); break
    }
    this.nodePositions.set(node.nodeKey, new THREE.Vector3(node.x, y + 0.15, node.z))
  }

  /* ─── 房间：地板 + 四面墙（有门洞） ──────────────────────── */
  _buildRoom(group, node) {
    const { x, y, z, nodeKey } = node
    const hw = ROOM_W / 2, hd = ROOM_D / 2

    // 房间地板
    const floor = this._mesh(
      new THREE.PlaneGeometry(ROOM_W, ROOM_D),
      { color: COLORS.roomFloor, roughness: 0.85, side: THREE.DoubleSide }
    )
    floor.rotation.x = -Math.PI / 2
    floor.position.set(x, y + 0.01, z)
    floor.receiveShadow = true
    group.add(floor)
    this.allObjects.push(floor)

    // 找到与本节点相连的邻居，确定门的方向
    const neighbors = this._edgeIndex.get(nodeKey) || []
    const doorDirs = new Set()
    for (const nk of neighbors) {
      const nb = this._nodeMap.get(nk)
      if (!nb) continue
      const dx = nb.x - x, dz = nb.z - z
      if (Math.abs(dx) > Math.abs(dz)) {
        doorDirs.add(dx > 0 ? 'east' : 'west')
      } else {
        doorDirs.add(dz > 0 ? 'south' : 'north')
      }
    }

    // 四面墙，有门洞的墙分成三段（左墙段 + 门楣 + 右墙段）
    const walls = [
      { dir: 'north', px: x, pz: z - hd, rx: 0,            len: ROOM_W, axis: 'x' },
      { dir: 'south', px: x, pz: z + hd, rx: 0,            len: ROOM_W, axis: 'x' },
      { dir: 'west',  px: x - hw, pz: z, rx: Math.PI / 2,  len: ROOM_D, axis: 'z' },
      { dir: 'east',  px: x + hw, pz: z, rx: Math.PI / 2,  len: ROOM_D, axis: 'z' },
    ]

    for (const w of walls) {
      if (doorDirs.has(w.dir)) {
        this._buildWallWithDoor(group, w, y)
      } else {
        this._buildSolidWall(group, w, y)
      }
    }

    // 标签
    const mainMesh = floor
    mainMesh.name = nodeKey
    mainMesh.userData = { node }
    this.nodeMeshes.set(nodeKey, mainMesh)

    this._addLabel(group, node.name, x, y + WALL_H + 0.6, z, 'room')
  }

  _buildSolidWall(group, w, y) {
    const wall = this._mesh(
      new THREE.BoxGeometry(w.len, WALL_H, WALL_T),
      { color: COLORS.wall, roughness: 0.7, transparent: true, opacity: 0.75 }
    )
    wall.rotation.y = w.rx
    wall.position.set(w.px, y + WALL_H / 2, w.pz)
    wall.castShadow = true
    group.add(wall)
    this.allObjects.push(wall)

    // 墙顶边线
    const edge = new THREE.LineSegments(
      new THREE.EdgesGeometry(wall.geometry),
      new THREE.LineBasicMaterial({ color: COLORS.wallEdge, transparent: true, opacity: 0.5 })
    )
    edge.rotation.y = w.rx
    edge.position.copy(wall.position)
    group.add(edge)
    this.allObjects.push(edge)
  }

  _buildWallWithDoor(group, w, y) {
    const halfDoor = DOOR_W / 2
    const sideLen = (w.len - DOOR_W) / 2

    // 左段
    if (sideLen > 0.01) {
      this._placeWallSegment(group, w, y, -halfDoor - sideLen / 2, sideLen)
    }

    // 右段
    if (sideLen > 0.01) {
      this._placeWallSegment(group, w, y, halfDoor + sideLen / 2, sideLen)
    }

    // 门楣（门洞上方）
    const lintelH = WALL_H - DOOR_H
    if (lintelH > 0.01) {
      this._placeWallSegment(group, w, y + DOOR_H, 0, DOOR_W, lintelH)
    }

    // 门框
    this._buildDoorFrame(group, w, y)
  }

  _placeWallSegment(group, w, y, localOffset, segLen, segH) {
    const h = segH || WALL_H
    const seg = this._mesh(
      new THREE.BoxGeometry(segLen, h, WALL_T),
      { color: COLORS.wall, roughness: 0.7, transparent: true, opacity: 0.75 }
    )
    seg.castShadow = true

    if (w.axis === 'x') {
      seg.position.set(w.px + localOffset, y + h / 2, w.pz)
    } else {
      seg.rotation.y = Math.PI / 2
      seg.position.set(w.px, y + h / 2, w.pz + localOffset)
    }
    group.add(seg)
    this.allObjects.push(seg)
  }

  _buildDoorFrame(group, w, y) {
    const frameMat = { color: COLORS.doorFrame, roughness: 0.4, metalness: 0.3 }
    const frameT = 0.08
    const frameW = 0.1

    // 左柱、右柱、横梁
    const parts = [
      { dx: -DOOR_W / 2, dy: DOOR_H / 2, w: frameW, h: DOOR_H, d: WALL_T + frameT },
      { dx: DOOR_W / 2,  dy: DOOR_H / 2, w: frameW, h: DOOR_H, d: WALL_T + frameT },
      { dx: 0,           dy: DOOR_H,     w: DOOR_W + frameW * 2, h: frameW, d: WALL_T + frameT },
    ]

    for (const p of parts) {
      const m = this._mesh(new THREE.BoxGeometry(p.w, p.h, p.d), frameMat)
      if (w.axis === 'x') {
        m.position.set(w.px + p.dx, y + p.dy, w.pz)
      } else {
        m.rotation.y = Math.PI / 2
        m.position.set(w.px, y + p.dy, w.pz + p.dx)
      }
      group.add(m)
      this.allObjects.push(m)
    }

    // 门板（半开）
    const doorPanel = this._mesh(
      new THREE.BoxGeometry(DOOR_W * 0.48, DOOR_H - 0.1, 0.06),
      { color: COLORS.door, roughness: 0.5, transparent: true, opacity: 0.6 }
    )
    const doorPivot = new THREE.Group()
    doorPivot.add(doorPanel)
    doorPanel.position.x = DOOR_W * 0.24
    doorPanel.position.y = DOOR_H / 2
    doorPivot.rotation.y = w.axis === 'x' ? -0.6 : (Math.PI / 2 - 0.6)

    if (w.axis === 'x') {
      doorPivot.position.set(w.px - DOOR_W / 2, y, w.pz)
    } else {
      doorPivot.position.set(w.px, y, w.pz - DOOR_W / 2)
    }
    group.add(doorPivot)
    this.allObjects.push(doorPanel)
  }

  /* ─── 走廊节点：地砖标记 ─────────────────────────────────── */
  _buildCorridorNode(group, node) {
    const tile = this._mesh(
      new THREE.CircleGeometry(0.6, 6),
      { color: COLORS.corridor, roughness: 0.8, side: THREE.DoubleSide }
    )
    tile.rotation.x = -Math.PI / 2
    tile.position.set(node.x, node.y + 0.02, node.z)
    tile.name = node.nodeKey
    tile.userData = { node }
    group.add(tile)
    this.allObjects.push(tile)
    this.nodeMeshes.set(node.nodeKey, tile)

    this._addLabel(group, node.name, node.x, node.y + 1.5, node.z, 'corridor')
  }

  /* ─── 出口：门框 + 绿色发光标识 + EXIT 指示牌 ──────────── */
  _buildExit(group, node) {
    const { x, y, z } = node

    // 出口地面标识
    const glow = this._mesh(
      new THREE.PlaneGeometry(2.2, 1.5),
      { color: COLORS.exitGlow, emissive: COLORS.exitGlow, emissiveIntensity: 0.3, roughness: 0.6, side: THREE.DoubleSide }
    )
    glow.rotation.x = -Math.PI / 2
    glow.position.set(x, y + 0.02, z)
    group.add(glow)
    this.allObjects.push(glow)

    // 门框
    const frameColor = { color: COLORS.exit, roughness: 0.4, metalness: 0.2 }
    const pillarGeo = new THREE.BoxGeometry(0.15, DOOR_H + 0.3, 0.3)
    const lintelGeo = new THREE.BoxGeometry(DOOR_W + 0.5, 0.2, 0.3)

    const lp = this._mesh(pillarGeo, frameColor)
    lp.position.set(x - DOOR_W / 2 - 0.2, y + (DOOR_H + 0.3) / 2, z)
    const rp = this._mesh(pillarGeo, frameColor)
    rp.position.set(x + DOOR_W / 2 + 0.2, y + (DOOR_H + 0.3) / 2, z)
    const lt = this._mesh(lintelGeo, frameColor)
    lt.position.set(x, y + DOOR_H + 0.3, z)
    group.add(lp, rp, lt)
    this.allObjects.push(lp, rp, lt)

    // EXIT 指示牌
    const signGeo = new THREE.BoxGeometry(1.6, 0.5, 0.06)
    const signMat = new THREE.MeshStandardMaterial({
      color: COLORS.exitGlow, emissive: COLORS.exitGlow, emissiveIntensity: 0.8,
      roughness: 0.3,
    })
    const sign = new THREE.Mesh(signGeo, signMat)
    sign.position.set(x, y + DOOR_H + 0.7, z)
    sign.name = node.nodeKey
    sign.userData = { node }
    group.add(sign)
    this.allObjects.push(sign)
    this.nodeMeshes.set(node.nodeKey, sign)

    // 点光源
    const light = new THREE.PointLight(COLORS.exitGlow, 2, 8)
    light.position.set(x, y + DOOR_H + 1, z)
    group.add(light)
    this.allObjects.push(light)

    this._addLabel(group, node.name, x, y + WALL_H + 1, z, 'exit')
  }

  /* ─── 楼梯：台阶几何 ───────────────────────────────────── */
  _buildStair(group, node) {
    const { x, y, z } = node
    const steps = 6
    const stepW = 2.0, stepD = 0.4, stepH = 0.25
    const stairGroup = new THREE.Group()

    for (let i = 0; i < steps; i++) {
      const step = this._mesh(
        new THREE.BoxGeometry(stepW, stepH, stepD),
        { color: COLORS.stair, roughness: 0.6 }
      )
      step.position.set(0, i * stepH + stepH / 2, i * stepD - steps * stepD / 2 + stepD / 2)
      step.castShadow = true
      stairGroup.add(step)
      this.allObjects.push(step)
    }

    // 扶手
    const railGeo = new THREE.BoxGeometry(0.06, steps * stepH + 0.5, steps * stepD + 0.4)
    const railMat = { color: 0x81a1c1, roughness: 0.3, metalness: 0.5 }
    const lRail = this._mesh(railGeo, railMat)
    lRail.position.set(-stepW / 2 - 0.05, steps * stepH / 2 + 0.25, 0)
    const rRail = this._mesh(railGeo, railMat)
    rRail.position.set(stepW / 2 + 0.05, steps * stepH / 2 + 0.25, 0)
    stairGroup.add(lRail, rRail)
    this.allObjects.push(lRail, rRail)

    stairGroup.position.set(x, y, z)
    stairGroup.name = node.nodeKey
    stairGroup.userData = { node }
    group.add(stairGroup)
    this.nodeMeshes.set(node.nodeKey, stairGroup)

    this._addLabel(group, node.name, x, y + steps * stepH + 1.5, z, 'stair')
  }

  /* ─── 电梯：箱体 + 门 ─────────────────────────────────── */
  _buildElevator(group, node) {
    const { x, y, z } = node
    const eW = 2.0, eD = 2.0, eH = WALL_H

    // 电梯井壁
    const wallMat = { color: COLORS.elevator, roughness: 0.5, transparent: true, opacity: 0.35 }
    const back = this._mesh(new THREE.BoxGeometry(eW, eH, WALL_T), wallMat)
    back.position.set(x, y + eH / 2, z - eD / 2)
    const left = this._mesh(new THREE.BoxGeometry(WALL_T, eH, eD), wallMat)
    left.position.set(x - eW / 2, y + eH / 2, z)
    const right = this._mesh(new THREE.BoxGeometry(WALL_T, eH, eD), wallMat)
    right.position.set(x + eW / 2, y + eH / 2, z)
    group.add(back, left, right)
    this.allObjects.push(back, left, right)

    // 电梯门（双开）
    const doorMat = { color: 0x81a1c1, roughness: 0.2, metalness: 0.6 }
    const ld = this._mesh(new THREE.BoxGeometry(eW / 2 - 0.1, DOOR_H, 0.05), doorMat)
    ld.position.set(x - eW / 4 - 0.05, y + DOOR_H / 2, z + eD / 2)
    const rd = this._mesh(new THREE.BoxGeometry(eW / 2 - 0.1, DOOR_H, 0.05), doorMat)
    rd.position.set(x + eW / 4 + 0.05, y + DOOR_H / 2, z + eD / 2)
    group.add(ld, rd)
    this.allObjects.push(ld, rd)

    ld.name = node.nodeKey
    ld.userData = { node }
    this.nodeMeshes.set(node.nodeKey, ld)

    this._addLabel(group, node.name, x, y + eH + 0.6, z, 'elevator')
  }

  /* ─── 消防栓：红色圆柱 + 接口管 + 底座 ────────────────── */
  _buildFireHydrant(group, node) {
    const { x, y, z } = node
    const hg = new THREE.Group()

    // 底座
    const base = this._mesh(
      new THREE.CylinderGeometry(0.35, 0.4, 0.15, 12),
      { color: 0x57534e, roughness: 0.7 }
    )
    base.position.set(0, 0.075, 0)
    hg.add(base)

    // 主体圆柱
    const body = this._mesh(
      new THREE.CylinderGeometry(0.18, 0.22, 1.2, 12),
      { color: COLORS.fireHydrant, roughness: 0.4, metalness: 0.3 }
    )
    body.position.set(0, 0.75, 0)
    hg.add(body)

    // 顶部帽盖
    const cap = this._mesh(
      new THREE.SphereGeometry(0.2, 12, 8),
      { color: COLORS.fireHydrant, roughness: 0.3, metalness: 0.4 }
    )
    cap.position.set(0, 1.4, 0)
    hg.add(cap)

    // 两侧接口管
    for (const side of [-1, 1]) {
      const pipe = this._mesh(
        new THREE.CylinderGeometry(0.06, 0.06, 0.25, 8),
        { color: 0x81a1c1, roughness: 0.2, metalness: 0.6 }
      )
      pipe.rotation.z = Math.PI / 2
      pipe.position.set(side * 0.3, 1.0, 0)
      hg.add(pipe)
    }

    hg.position.set(x, y, z)
    hg.name = node.nodeKey
    hg.userData = { node }
    group.add(hg)
    this.nodeMeshes.set(node.nodeKey, hg)
    this._addLabel(group, node.name, x, y + 2.2, z, 'fire_hydrant')
  }

  /* ─── 监控室：特殊地板 + 玻璃墙 + 显示屏 ──────────────── */
  _buildMonitorRoom(group, node) {
    const { x, y, z, nodeKey } = node
    const hw = ROOM_W / 2, hd = ROOM_D / 2

    // 特殊地板（蓝色调）
    const floor = this._mesh(
      new THREE.PlaneGeometry(ROOM_W, ROOM_D),
      { color: 0x1e3a5f, roughness: 0.7, side: THREE.DoubleSide }
    )
    floor.rotation.x = -Math.PI / 2
    floor.position.set(x, y + 0.01, z)
    floor.receiveShadow = true
    floor.name = nodeKey
    floor.userData = { node }
    group.add(floor)
    this.allObjects.push(floor)
    this.nodeMeshes.set(nodeKey, floor)

    // 玻璃墙面（朝走廊方向半透明）
    const glassMat = { color: COLORS.glass, roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.35 }
    const neighbors = this._edgeIndex.get(nodeKey) || []
    const glassDirs = new Set()
    for (const nk of neighbors) {
      const nb = this._nodeMap.get(nk)
      if (!nb) continue
      const dx = nb.x - x, dz = nb.z - z
      glassDirs.add(Math.abs(dx) > Math.abs(dz) ? (dx > 0 ? 'east' : 'west') : (dz > 0 ? 'south' : 'north'))
    }

    const walls = [
      { dir: 'north', px: x, pz: z - hd, rx: 0, len: ROOM_W, axis: 'x' },
      { dir: 'south', px: x, pz: z + hd, rx: 0, len: ROOM_W, axis: 'x' },
      { dir: 'west',  px: x - hw, pz: z, rx: Math.PI / 2, len: ROOM_D, axis: 'z' },
      { dir: 'east',  px: x + hw, pz: z, rx: Math.PI / 2, len: ROOM_D, axis: 'z' },
    ]
    for (const w of walls) {
      if (glassDirs.has(w.dir)) {
        // 玻璃墙
        const glass = this._mesh(new THREE.BoxGeometry(w.len, WALL_H, WALL_T), glassMat)
        glass.rotation.y = w.rx
        glass.position.set(w.px, y + WALL_H / 2, w.pz)
        group.add(glass)
        this.allObjects.push(glass)
      } else {
        this._buildSolidWall(group, w, y)
      }
    }

    // 显示屏组（北墙内侧）
    const screenCount = 3
    const screenW = 1.2, screenH = 0.8
    for (let i = 0; i < screenCount; i++) {
      const sx = x - (screenCount - 1) * 0.7 + i * 1.4
      const screen = this._mesh(
        new THREE.BoxGeometry(screenW, screenH, 0.05),
        { color: COLORS.screen, emissive: COLORS.screen, emissiveIntensity: 0.6, roughness: 0.2 }
      )
      screen.position.set(sx, y + 1.8, z - hd + 0.2)
      group.add(screen)
      this.allObjects.push(screen)
    }

    // 操作台
    const desk = this._mesh(
      new THREE.BoxGeometry(3.0, 0.75, 0.8),
      { color: COLORS.furnitureDk, roughness: 0.6 }
    )
    desk.position.set(x, y + 0.375, z + 0.5)
    group.add(desk)
    this.allObjects.push(desk)

    this._addLabel(group, node.name, x, y + WALL_H + 0.6, z, 'monitor_room')
  }

  /* ─── 配电间：黄色警示地板 + 电箱 + 警示标识 ─────────── */
  _buildElectricalRoom(group, node) {
    const { x, y, z, nodeKey } = node
    const hw = ROOM_W / 2, hd = ROOM_D / 2

    // 黄色警示地板
    const floor = this._mesh(
      new THREE.PlaneGeometry(ROOM_W, ROOM_D),
      { color: COLORS.warningYellow, roughness: 0.8, side: THREE.DoubleSide }
    )
    floor.rotation.x = -Math.PI / 2
    floor.position.set(x, y + 0.01, z)
    floor.receiveShadow = true
    floor.name = nodeKey
    floor.userData = { node }
    group.add(floor)
    this.allObjects.push(floor)
    this.nodeMeshes.set(nodeKey, floor)

    // 四面实体墙
    const walls = [
      { dir: 'north', px: x, pz: z - hd, rx: 0, len: ROOM_W, axis: 'x' },
      { dir: 'south', px: x, pz: z + hd, rx: 0, len: ROOM_W, axis: 'x' },
      { dir: 'west',  px: x - hw, pz: z, rx: Math.PI / 2, len: ROOM_D, axis: 'z' },
      { dir: 'east',  px: x + hw, pz: z, rx: Math.PI / 2, len: ROOM_D, axis: 'z' },
    ]
    const neighbors = this._edgeIndex.get(nodeKey) || []
    for (const w of walls) {
      const hasDoor = neighbors.some(nk => {
        const nb = this._nodeMap.get(nk)
        if (!nb) return false
        const dx = nb.x - x, dz = nb.z - z
        const dir = Math.abs(dx) > Math.abs(dz) ? (dx > 0 ? 'east' : 'west') : (dz > 0 ? 'south' : 'north')
        return dir === w.dir
      })
      if (hasDoor) this._buildWallWithDoor(group, w, y)
      else this._buildSolidWall(group, w, y)
    }

    // 电箱（靠墙排列）
    const cabinetCount = 3
    const cabW = 0.8, cabH = 1.8, cabD = 0.4
    for (let i = 0; i < cabinetCount; i++) {
      const cx = x - (cabinetCount - 1) * 0.5 + i * 1.0
      const cab = this._mesh(
        new THREE.BoxGeometry(cabW, cabH, cabD),
        { color: COLORS.serverRack, roughness: 0.5, metalness: 0.3 }
      )
      cab.position.set(cx, y + cabH / 2, z - hd + cabD / 2 + 0.1)
      group.add(cab)
      this.allObjects.push(cab)

      // （已移除电箱指示灯）
    }

    // 警示标识
    this._addLabel(group, 'Electrical Room', x, y + WALL_H + 0.6, z, 'electrical')
  }

  /* ─── 走廊通道：地面条带 + 中心线 ──────────────────────── */
  _buildCorridor(edge) {
    const fromNode = this._nodeMap.get(edge.fromNodeKey)
    const toNode   = this._nodeMap.get(edge.toNodeKey)
    if (!fromNode || !toNode) return

    // 跨层连接不画走廊
    if (fromNode.floorId !== toNode.floorId) return

    const from = new THREE.Vector3(fromNode.x, fromNode.y, fromNode.z)
    const to   = new THREE.Vector3(toNode.x, toNode.y, toNode.z)
    const dir  = new THREE.Vector3().subVectors(to, from)
    const len  = dir.length()
    if (len < 0.01) return
    dir.normalize()

    const mid = new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5)
    const angle = Math.atan2(dir.x, dir.z)
    const corridorWidth = Math.min(edge.width || CORRIDOR_W, 3)

    // 地面条带
    const strip = this._mesh(
      new THREE.PlaneGeometry(corridorWidth, len),
      { color: COLORS.corridor, roughness: 0.85, side: THREE.DoubleSide, transparent: true, opacity: 0.5 }
    )
    strip.rotation.x = -Math.PI / 2
    strip.rotation.z = -angle
    strip.position.set(mid.x, fromNode.y + 0.015, mid.z)
    strip.name = `corridor-${edge.fromNodeKey}-${edge.toNodeKey}`

    // 中心虚线
    const dashPoints = [
      new THREE.Vector3(from.x, from.y + 0.03, from.z),
      new THREE.Vector3(to.x, to.y + 0.03, to.z),
    ]
    const dashGeo = new THREE.BufferGeometry().setFromPoints(dashPoints)
    const dashMat = new THREE.LineDashedMaterial({
      color: COLORS.corLine, dashSize: 0.5, gapSize: 0.3, transparent: true, opacity: 0.7,
    })
    const dash = new THREE.Line(dashGeo, dashMat)
    dash.computeLineDistances()
    dash.name = `edge-${edge.fromNodeKey}-${edge.toNodeKey}`

    const floorGroup = this.floorGroups.get(fromNode.floorId)
    const target = floorGroup || this.scene
    target.add(strip)
    target.add(dash)
    this.allObjects.push(strip, dash)
  }

  /* ─── 房间内部家具装饰 ────────────────────────────────── */
  _buildRoomFurnishings(group, node) {
    const { x, y, z, nodeKey, name } = node
    const key = this._hashStr(nodeKey)

    // 根据节点名称判断布局类型
    const nl = (name || '').toLowerCase()
    if (nl.includes('商铺') || nl.includes('shop'))    return this._buildShopLayout(group, node, key)
    if (nl.includes('办公') || nl.includes('office'))  return this._buildOfficeLayout(group, node, key)
    if (nl.includes('会议') || nl.includes('meeting')) return this._buildMeetingLayout(group, node, key)
    if (nl.includes('展厅') || nl.includes('hall'))    return this._buildHallLayout(group, node, key)
    if (nl.includes('机房') || nl.includes('server'))  return this._buildServerLayout(group, node, key)
    if (nl.includes('休息') || nl.includes('lounge'))  return this._buildLoungeLayout(group, node, key)

    // 默认：随机摆放几件家具
    this._buildDefaultFurnishings(group, node, key)
  }

  /* ─── 商铺布局：展示柜 + 收银台 + 货架 ─────────────── */
  _buildShopLayout(group, node, key) {
    const { x, y, z } = node
    // 展示柜（两侧）
    for (const side of [-1, 1]) {
      const cabinet = this._mesh(
        new THREE.BoxGeometry(0.6, 1.2, 2.5),
        { color: 0xf5f5f4, roughness: 0.4, transparent: true, opacity: 0.85 }
      )
      cabinet.position.set(x + side * 1.8, y + 0.6, z)
      group.add(cabinet)
      this.allObjects.push(cabinet)
    }
    // 收银台（入口对面）
    const counter = this._mesh(
      new THREE.BoxGeometry(1.5, 0.9, 0.5),
      { color: COLORS.desk, roughness: 0.5 }
    )
    counter.position.set(x, y + 0.45, z + 1.2)
    group.add(counter)
    this.allObjects.push(counter)
  }

  /* ─── 办公布局：L型桌 + 显示器 + 文件柜 ────────────── */
  _buildOfficeLayout(group, node, key) {
    const { x, y, z } = node
    // 办公桌（L型）
    const deskMain = this._mesh(
      new THREE.BoxGeometry(1.8, 0.75, 0.8),
      { color: COLORS.desk, roughness: 0.5 }
    )
    deskMain.position.set(x - 0.3, y + 0.375, z - 0.5)
    group.add(deskMain)
    this.allObjects.push(deskMain)

    const deskSide = this._mesh(
      new THREE.BoxGeometry(0.8, 0.75, 1.2),
      { color: COLORS.desk, roughness: 0.5 }
    )
    deskSide.position.set(x + 0.7, y + 0.375, z - 0.1)
    group.add(deskSide)
    this.allObjects.push(deskSide)

    // 显示器
    const monitor = this._mesh(
      new THREE.BoxGeometry(0.6, 0.4, 0.04),
      { color: COLORS.screen, emissive: COLORS.screen, emissiveIntensity: 0.3, roughness: 0.2 }
    )
    monitor.position.set(x - 0.3, y + 1.0, z - 0.5)
    group.add(monitor)
    this.allObjects.push(monitor)

    // 文件柜
    const cabinet = this._mesh(
      new THREE.BoxGeometry(0.5, 1.2, 0.4),
      { color: 0x9ca3af, roughness: 0.6 }
    )
    cabinet.position.set(x + 1.5, y + 0.6, z - 1.2)
    group.add(cabinet)
    this.allObjects.push(cabinet)

    // 椅子
    const chair = this._mesh(
      new THREE.BoxGeometry(0.45, 0.45, 0.45),
      { color: 0x1e293b, roughness: 0.6 }
    )
    chair.position.set(x - 0.3, y + 0.225, z + 0.3)
    group.add(chair)
    this.allObjects.push(chair)
  }

  /* ─── 会议室：椭圆桌 + 围椅 ───────────────────────── */
  _buildMeetingLayout(group, node, key) {
    const { x, y, z } = node
    // 椭圆会议桌
    const table = this._mesh(
      new THREE.CylinderGeometry(1.5, 1.5, 0.08, 24),
      { color: COLORS.desk, roughness: 0.4, metalness: 0.1 }
    )
    table.scale.set(1, 1, 0.6)
    table.position.set(x, y + 0.76, z)
    group.add(table)
    this.allObjects.push(table)

    // 桌腿
    for (const [dx, dz] of [[-0.8, -0.3], [0.8, -0.3], [-0.8, 0.3], [0.8, 0.3]]) {
      const leg = this._mesh(
        new THREE.CylinderGeometry(0.04, 0.04, 0.72, 6),
        { color: 0x9ca3af, roughness: 0.3, metalness: 0.5 }
      )
      leg.position.set(x + dx, y + 0.36, z + dz)
      group.add(leg)
      this.allObjects.push(leg)
    }

    // 围绕的椅子
    const chairCount = 8
    for (let i = 0; i < chairCount; i++) {
      const angle = (i / chairCount) * Math.PI * 2
      const cr = 2.0
      const chair = this._mesh(
        new THREE.BoxGeometry(0.35, 0.4, 0.35),
        { color: 0x1e293b, roughness: 0.6 }
      )
      chair.position.set(x + Math.cos(angle) * cr, y + 0.2, z + Math.sin(angle) * cr * 0.6)
      group.add(chair)
      this.allObjects.push(chair)
    }
  }

  /* ─── 展厅：展台 + 展板 ────────────────────────────── */
  _buildHallLayout(group, node, key) {
    const { x, y, z } = node
    // 中央展台
    const podium = this._mesh(
      new THREE.CylinderGeometry(0.8, 1.0, 0.5, 8),
      { color: 0xf5f5f4, roughness: 0.3 }
    )
    podium.position.set(x, y + 0.25, z)
    group.add(podium)
    this.allObjects.push(podium)

    // 展板（四周）
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2 + Math.PI / 4
      const dist = 2.2
      const panel = this._mesh(
        new THREE.BoxGeometry(1.5, 1.8, 0.06),
        { color: 0xf8fafc, roughness: 0.5 }
      )
      panel.position.set(x + Math.cos(angle) * dist, y + 1.2, z + Math.sin(angle) * dist)
      panel.lookAt(x, y + 1.2, z)
      group.add(panel)
      this.allObjects.push(panel)
    }
  }

  /* ─── 机房：服务器机柜排列 ─────────────────────────── */
  _buildServerLayout(group, node, key) {
    const { x, y, z } = node
    // 两排机柜
    for (const row of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        const rack = this._mesh(
          new THREE.BoxGeometry(0.7, 1.9, 0.6),
          { color: COLORS.serverRack, roughness: 0.5, metalness: 0.2 }
        )
        rack.position.set(x - 1.0 + i * 1.0, y + 0.95, z + row * 1.2)
        group.add(rack)
        this.allObjects.push(rack)

        // 状态指示灯
        for (let j = 0; j < 4; j++) {
          const led = this._mesh(
            new THREE.SphereGeometry(0.025, 6, 6),
            { color: 0x22c55e, emissive: 0x22c55e, emissiveIntensity: 0.9 }
          )
          led.position.set(x - 1.0 + i * 1.0, y + 0.4 + j * 0.4, z + row * 1.2 + 0.31)
          group.add(led)
          this.allObjects.push(led)
        }
      }
    }
  }

  /* ─── 休息区：沙发 + 茶几 ──────────────────────────── */
  _buildLoungeLayout(group, node, key) {
    const { x, y, z } = node
    // 沙发（L型）
    const sofaMain = this._mesh(
      new THREE.BoxGeometry(2.0, 0.5, 0.8),
      { color: COLORS.sofa, roughness: 0.7 }
    )
    sofaMain.position.set(x, y + 0.25, z + 0.8)
    group.add(sofaMain)
    this.allObjects.push(sofaMain)

    const sofaSide = this._mesh(
      new THREE.BoxGeometry(0.8, 0.5, 1.5),
      { color: COLORS.sofa, roughness: 0.7 }
    )
    sofaSide.position.set(x + 1.2, y + 0.25, z + 0.2)
    group.add(sofaSide)
    this.allObjects.push(sofaSide)

    // 靠背
    const backrest = this._mesh(
      new THREE.BoxGeometry(2.0, 0.35, 0.12),
      { color: 0x4f46e5, roughness: 0.7 }
    )
    backrest.position.set(x, y + 0.67, z + 1.15)
    group.add(backrest)
    this.allObjects.push(backrest)

    // 茶几
    const table = this._mesh(
      new THREE.BoxGeometry(1.0, 0.4, 0.6),
      { color: 0xfafaf9, roughness: 0.3, metalness: 0.1 }
    )
    table.position.set(x, y + 0.2, z - 0.1)
    group.add(table)
    this.allObjects.push(table)
  }

  /* ─── 默认家具（通用房间） ─────────────────────────── */
  _buildDefaultFurnishings(group, node, key) {
    const { x, y, z } = node
    // 基于 hash 决定摆放几件
    const count = 2 + (key % 3)
    const positions = [
      [-1.2, -0.8], [1.2, -0.8], [-1.2, 0.8], [1.2, 0.8], [0, 0],
    ]
    for (let i = 0; i < count && i < positions.length; i++) {
      const [dx, dz] = positions[i]
      const desk = this._mesh(
        new THREE.BoxGeometry(0.8, 0.72, 0.5),
        { color: COLORS.furniture, roughness: 0.6 }
      )
      desk.position.set(x + dx, y + 0.36, z + dz)
      group.add(desk)
      this.allObjects.push(desk)
    }
  }

  /* ─── 走廊装饰：壁灯 + 消防标识 ────────────────────── */
  _buildCorridorFurnishings(group, edge) {
    const fromNode = this._nodeMap.get(edge.fromNodeKey)
    const toNode = this._nodeMap.get(edge.toNodeKey)
    if (!fromNode || !toNode) return
    if (fromNode.floorId !== toNode.floorId) return

    const from = new THREE.Vector3(fromNode.x, fromNode.y, fromNode.z)
    const to = new THREE.Vector3(toNode.x, toNode.y, toNode.z)
    const mid = new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5)
    const dir = new THREE.Vector3().subVectors(to, from).normalize()
    const len = from.distanceTo(to)

    // （已移除消防标识）
  }

  /* ─── 创建指示灯箭头 ─────────────────────────────── */
  _buildIndicatorArrow() {
    const group = new THREE.Group()
    const mat = { color: 0x22c55e, emissive: 0x22c55e, emissiveIntensity: 0.9, roughness: 0.3 }

    // 箭杆
    const rod = this._mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.4, 6), mat)
    rod.rotation.x = Math.PI / 2
    rod.position.z = -0.2
    group.add(rod)

    // 箭头（锥体）
    const cone = this._mesh(new THREE.ConeGeometry(0.12, 0.3, 6), mat)
    cone.rotation.x = -Math.PI / 2
    cone.position.z = 0.1
    group.add(cone)

    return group
  }

  /* ─── 指示灯：外围墙壁内侧 + 楼梯口，每层8个 ────── */
  _buildIndicatorLights(group, floorNodes, floorId) {
    const lights = []
    if (!floorNodes.length) return

    // 取楼层基准y坐标
    const y = floorNodes[0].y

    // 指示灯位置：贴在外围墙壁内侧 + 楼梯口
    const indicatorPositions = [
      // 北墙内侧
      { x: -3, z: -8, face: 'south', rot: 0 },
      { x:  3, z: -8, face: 'south', rot: 0 },
      // 南墙内侧
      { x: -3, z:  8, face: 'north', rot: 0 },
      { x:  3, z:  8, face: 'north', rot: 0 },
      // 西墙内侧
      { x: -9, z: -2, face: 'east',  rot: Math.PI / 2 },
      { x: -9, z:  2, face: 'east',  rot: Math.PI / 2 },
      // 东墙内侧
      { x:  9, z: -2, face: 'west',  rot: Math.PI / 2 },
      { x:  9, z:  2, face: 'west',  rot: Math.PI / 2 },
      // 东楼梯口
      { x:  8, z:  5, face: 'west',  rot: Math.PI / 2 },
      // 西楼梯口
      { x: -8, z:  5, face: 'east',  rot: Math.PI / 2 },
      // 北楼梯口
      { x: -1, z:  7, face: 'south', rot: 0 },
      // 南楼梯口
      { x:  1, z: -7, face: 'north', rot: 0 },
    ]

    for (const ip of indicatorPositions) {
      const pos = new THREE.Vector3(ip.x, y + 1.0, ip.z)

      // 绿色矩形指示灯
      const lightMesh = this._mesh(
        new THREE.BoxGeometry(0.3, 0.15, 0.06),
        { color: 0x22c55e, emissive: 0x22c55e, emissiveIntensity: 0.6, roughness: 0.3 }
      )
      lightMesh.position.copy(pos)
      lightMesh.rotation.y = ip.rot
      group.add(lightMesh)
      this.allObjects.push(lightMesh)

      // 绿色发光箭头（默认隐藏）
      const arrowGrp = this._buildIndicatorArrow()
      arrowGrp.position.copy(pos)
      arrowGrp.visible = false
      group.add(arrowGrp)
      this.allObjects.push(arrowGrp)

      lights.push({ mesh: lightMesh, arrow: arrowGrp, light: null, position: pos.clone(), floorId })
    }

    this.indicatorLights.set(floorId, lights)
  }

  /* ─── 吸顶灯：天花板安装，每层6个（2x3网格） ──────── */
  _buildCeilingLights(group, floorNodes, floorId) {
    const lights = []
    if (!floorNodes.length) return

    // 计算楼层包围盒
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity
    let y = 0
    for (const n of floorNodes) {
      const hw = n.nodeType === 'room' ? ROOM_W / 2 + 1 : 2
      const hd = n.nodeType === 'room' ? ROOM_D / 2 + 1 : 2
      minX = Math.min(minX, n.x - hw)
      maxX = Math.max(maxX, n.x + hw)
      minZ = Math.min(minZ, n.z - hd)
      maxZ = Math.max(maxZ, n.z + hd)
      y = n.y
    }

    const rows = 2, cols = 3
    const spacingX = (maxX - minX) / (cols + 1)
    const spacingZ = (maxZ - minZ) / (rows + 1)

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const px = minX + spacingX * (c + 1)
        const pz = minZ + spacingZ * (r + 1)
        const py = y + WALL_H - 0.1

        // 吸顶灯圆盘
        const disc = this._mesh(
          new THREE.CylinderGeometry(0.35, 0.35, 0.04, 16),
          { color: COLORS.ceilingLight, emissive: COLORS.ceilingLight, emissiveIntensity: 0.6, roughness: 0.3 }
        )
        disc.position.set(px, py, pz)
        group.add(disc)
        this.allObjects.push(disc)

        // 向下发光的点光源
        const ptLight = new THREE.PointLight(COLORS.ceilingLight, 0.8, 8)
        ptLight.position.set(px, py - 0.2, pz)
        group.add(ptLight)
        this.allObjects.push(ptLight)

        lights.push({ mesh: disc, light: ptLight, position: new THREE.Vector3(px, py, pz), floorId })

        // 标注
        this._addSmallLabel(group, 'Ceiling Light', px, py - 0.4, pz)
      }
    }

    this.ceilingLights.set(floorId, lights)
  }

  /* ─── 建筑外观壳体：外墙 + 窗户 + 屋顶 ────────────── */
  _buildExteriorShell(group, nodes, floorId) {
    if (!nodes.length) return

    // 计算包围盒
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity
    let y = 0
    for (const n of nodes) {
      const hw = n.nodeType === 'room' ? ROOM_W / 2 + 1.5 : 2.5
      const hd = n.nodeType === 'room' ? ROOM_D / 2 + 1.5 : 2.5
      minX = Math.min(minX, n.x - hw)
      maxX = Math.max(maxX, n.x + hw)
      minZ = Math.min(minZ, n.z - hd)
      maxZ = Math.max(maxZ, n.z + hd)
      y = n.y
    }

    const pad = 2
    minX -= pad; maxX += pad; minZ -= pad; maxZ += pad
    const w = maxX - minX, d = maxZ - minZ
    const cx = (minX + maxX) / 2, cz = (minZ + maxZ) / 2
    const shellH = WALL_H + 0.3

    const wallMat = { color: COLORS.exteriorWall, roughness: 0.6, transparent: true, opacity: 0.65 }
    const glassMat = { color: COLORS.window, roughness: 0.1, metalness: 0.15, transparent: true, opacity: 0.4 }

    // 四面外墙（带窗户开洞）
    const walls = [
      { px: cx, pz: minZ, rx: 0, len: w, axis: 'x' },
      { px: cx, pz: maxZ, rx: 0, len: w, axis: 'x' },
      { px: minX, pz: cz, rx: Math.PI / 2, len: d, axis: 'z' },
      { px: maxX, pz: cz, rx: Math.PI / 2, len: d, axis: 'z' },
    ]

    for (const wall of walls) {
      const winCount = Math.max(1, Math.floor(wall.len / 4))
      const segLen = wall.len / winCount
      const winW = segLen * 0.5, winH = 1.2, winY = y + 1.6

      for (let i = 0; i < winCount; i++) {
        const offset = -wall.len / 2 + segLen * (i + 0.5)

        // 墙体下段
        const lowerH = winY - y
        if (lowerH > 0.01) {
          const lower = this._mesh(
            new THREE.BoxGeometry(segLen * 0.9, lowerH, WALL_T),
            wallMat
          )
          lower.rotation.y = wall.rx
          if (wall.axis === 'x') lower.position.set(wall.px + offset, y + lowerH / 2, wall.pz)
          else lower.position.set(wall.px, y + lowerH / 2, wall.pz + offset)
          group.add(lower)
          this.allObjects.push(lower)
        }

        // 窗户玻璃
        const win = this._mesh(
          new THREE.BoxGeometry(winW, winH, 0.04),
          glassMat
        )
        win.rotation.y = wall.rx
        if (wall.axis === 'x') win.position.set(wall.px + offset, winY + winH / 2, wall.pz)
        else win.position.set(wall.px, winY + winH / 2, wall.pz + offset)
        group.add(win)
        this.allObjects.push(win)

        // 墙体上段
        const upperBottom = winY + winH
        const upperH = y + shellH - upperBottom
        if (upperH > 0.01) {
          const upper = this._mesh(
            new THREE.BoxGeometry(segLen * 0.9, upperH, WALL_T),
            wallMat
          )
          upper.rotation.y = wall.rx
          if (wall.axis === 'x') upper.position.set(wall.px + offset, upperBottom + upperH / 2, wall.pz)
          else upper.position.set(wall.px, upperBottom + upperH / 2, wall.pz + offset)
          group.add(upper)
          this.allObjects.push(upper)
        }
      }
    }

    // 屋顶
    const roofPad = 1
    const roofW = w + roofPad * 2, roofD = d + roofPad * 2
    const roof = this._mesh(
      new THREE.BoxGeometry(roofW, 0.15, roofD),
      { color: COLORS.roof, roughness: 0.7 }
    )
    roof.position.set(cx, y + shellH + 0.075, cz)
    roof.receiveShadow = true
    group.add(roof)
    this.allObjects.push(roof)

    // 屋顶边缘线
    const edgeGeo = new THREE.EdgesGeometry(roof.geometry)
    const edgeLine = new THREE.LineSegments(edgeGeo, new THREE.LineBasicMaterial({ color: COLORS.wallEdge, transparent: true, opacity: 0.4 }))
    edgeLine.position.copy(roof.position)
    group.add(edgeLine)
    this.allObjects.push(edgeLine)
  }

  /* ─── 确定性哈希（基于 nodeKey） ────────────────────── */
  _hashStr(str) {
    let h = 0
    for (let i = 0; i < str.length; i++) {
      h = ((h << 5) - h + str.charCodeAt(i)) | 0
    }
    return Math.abs(h)
  }

  /* ─── 标签（带背景色、根据类型调色） ───────────────────── */
  _addLabel(group, text, x, y, z, type) {
    const canvas = document.createElement('canvas')
    const scale = 2
    canvas.width = 512 * scale
    canvas.height = 80 * scale
    const ctx = canvas.getContext('2d')

    // 背景胶囊
    const bgColors = {
      room: 'rgba(94,129,172,0.9)',
      corridor: 'rgba(76,86,106,0.8)',
      exit: 'rgba(163,190,140,0.95)',
      stair: 'rgba(235,203,139,0.9)',
      elevator: 'rgba(180,142,173,0.9)',
      fire_hydrant: 'rgba(220,38,38,0.9)',
      monitor_room: 'rgba(14,165,233,0.9)',
      electrical_room: 'rgba(234,179,8,0.9)',
    }
    const bg = bgColors[type] || COLORS.labelBg
    const r = 24 * scale
    const pw = 40 * scale, ph = 10 * scale
    const bw = canvas.width - pw * 2
    const bh = canvas.height - ph * 2

    ctx.beginPath()
    ctx.roundRect(pw, ph, bw, bh, r)
    ctx.fillStyle = bg
    ctx.fill()

    ctx.fillStyle = COLORS.label
    ctx.font = `bold ${28 * scale}px "Arial", "Segoe UI", "Helvetica Neue", sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, canvas.width / 2, canvas.height / 2)

    const texture = new THREE.CanvasTexture(canvas)
    texture.minFilter = THREE.LinearFilter
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false, sizeAttenuation: true })
    )
    sprite.position.set(x, y, z)
    sprite.scale.set(5, 0.8, 1)
    group.add(sprite)
    this.allObjects.push(sprite)
  }

  /* ─── 小标签（用于指示灯/吸顶灯等小型物体标注） ──────── */
  _addSmallLabel(group, text, x, y, z) {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 48
    const ctx = canvas.getContext('2d')

    ctx.clearRect(0, 0, 256, 48)
    ctx.fillStyle = 'rgba(0,0,0,0.6)'
    ctx.beginPath()
    ctx.roundRect(4, 4, 248, 40, 8)
    ctx.fill()

    ctx.fillStyle = '#e2e8f0'
    ctx.font = 'bold 20px "Arial", "Segoe UI", "Helvetica Neue", sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, 128, 26)

    const texture = new THREE.CanvasTexture(canvas)
    texture.minFilter = THREE.LinearFilter
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false, sizeAttenuation: true })
    )
    sprite.position.set(x, y, z)
    sprite.scale.set(1.8, 0.35, 1)
    group.add(sprite)
    this.allObjects.push(sprite)
  }

  /* ─── 工具 ─────────────────────────────────────────────── */
  _mesh(geo, matOpts) {
    const mat = new THREE.MeshStandardMaterial(matOpts)
    return new THREE.Mesh(geo, mat)
  }

  /* ─── 楼层高亮 ─────────────────────────────────────────── */
  highlightFloor(floorId) {
    for (const [fid, group] of this.floorGroups) {
      const isCurrent = fid === floorId
      group.traverse(child => {
        if (!child.material) return
        if (child.name && child.name.startsWith('edge-')) return
        const mats = Array.isArray(child.material) ? child.material : [child.material]
        for (const m of mats) {
          if (m.opacity === undefined) continue
          // 存储原始 opacity
          const key = child.uuid + '-' + mats.indexOf(m)
          if (!this._originalOpacities.has(key)) {
            this._originalOpacities.set(key, m.opacity)
          }
          m.opacity = isCurrent ? this._originalOpacities.get(key) : 0.08
          m.transparent = true
          m.needsUpdate = true
        }
      })
    }
  }

  resetOpacity() {
    for (const [fid, group] of this.floorGroups) {
      group.traverse(child => {
        if (!child.material) return
        const mats = Array.isArray(child.material) ? child.material : [child.material]
        for (const m of mats) {
          const key = child.uuid + '-' + mats.indexOf(m)
          if (this._originalOpacities.has(key)) {
            m.opacity = this._originalOpacities.get(key)
            m.needsUpdate = true
          }
        }
      })
    }
  }

  /**
   * 火灾模式：电梯标红禁用 / 恢复正常
   */
  setFireMode(enabled) {
    for (const [key, node] of this._nodeMap) {
      if (node.nodeType !== 'elevator') continue
      const mesh = this.nodeMeshes.get(key)
      if (!mesh) continue

      // 仅遍历电梯自身及其直接子级，不要向上爬到整个楼层分组
      // 之前 mesh.parent?.isGroup 会匹配到 floor-X 分组，导致整层变红
      const target = mesh.isGroup ? mesh : mesh
      const targets = [target]
      // 同时找到同一电梯井的其他部件（同位置的 mesh）
      const floorGroup = this.floorGroups.get(node.floorId)
      if (floorGroup) {
        floorGroup.children.forEach(child => {
          if (child === target) return
          if (!child.isMesh) return
          // 判断是否属于同一电梯（位置接近）
          const dx = Math.abs(child.position.x - node.x)
          const dz = Math.abs(child.position.z - node.z)
          if (dx < 1.5 && dz < 1.5 && child.position.y > node.y - 0.5) {
            targets.push(child)
          }
        })
      }
      targets.forEach(t => t.traverse(child => {
        if (!child.material) return
        const mats = Array.isArray(child.material) ? child.material : [child.material]
        for (const m of mats) {
          if (enabled) {
            m._origColor = m._origColor || m.color.getHex()
            m._origOpacity = m._origOpacity ?? m.opacity
            m.color.set(0x991b1b)
            m.emissive?.set(0xef4444)
            m.emissiveIntensity = 0.4
            m.opacity = 0.25
            m.transparent = true
          } else {
            if (m._origColor !== undefined) m.color.set(m._origColor)
            if (m._origOpacity !== undefined) m.opacity = m._origOpacity
            if (m.emissive) { m.emissive.set(0x000000); m.emissiveIntensity = 0 }
          }
          m.needsUpdate = true
        }
      }))

      // 添加/移除禁用标记精灵
      const markerName = `fire-disabled-${key}`
      const existing = this.scene.getObjectByName(markerName)
      if (enabled && !existing) {
        const canvas = document.createElement('canvas')
        canvas.width = 128; canvas.height = 128
        const ctx = canvas.getContext('2d')
        ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 12; ctx.lineCap = 'round'
        ctx.beginPath(); ctx.moveTo(20, 20); ctx.lineTo(108, 108); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(108, 20); ctx.lineTo(20, 108); ctx.stroke()
        // 圆圈
        ctx.beginPath(); ctx.arc(64, 64, 50, 0, Math.PI * 2)
        ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 8; ctx.stroke()
        const tex = new THREE.CanvasTexture(canvas)
        const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }))
        sprite.position.set(node.x, node.y + 2, node.z)
        sprite.scale.set(2, 2, 1)
        sprite.name = markerName
        this.scene.add(sprite)
        this.allObjects.push(sprite)
      } else if (!enabled && existing) {
        this.scene.remove(existing)
        if (existing.material?.map) existing.material.map.dispose()
        if (existing.material) existing.material.dispose()
        this.allObjects = this.allObjects.filter(o => o !== existing)
      }
    }
  }

  getNodePositions() {
    return this.nodePositions
  }

  /**
   * 设置指示灯颜色（用于动态模拟）
   * lightStates: Map<floorId, [{index, color}]>
   */
  setIndicatorColors(states) {
    for (const [floorId, colorStates] of states) {
      const lights = this.indicatorLights.get(floorId)
      if (!lights) continue
      for (const { index, color, showArrow, arrowDir } of colorStates) {
        if (index >= lights.length) continue
        const { mesh, arrow } = lights[index]
        // 矩形变色
        if (mesh.material) {
          mesh.material.color.set(color)
          mesh.material.emissive.set(color)
          mesh.material.emissiveIntensity = (color === COLORS.indicatorGreen || color === COLORS.indicatorRed) ? 0.8 : 0
        }
        // 箭头：路径上的显示，其他隐藏
        if (arrow) {
          if (showArrow) {
            arrow.visible = true
            mesh.visible = false
            // 设置箭头朝向
            if (arrowDir) {
              const angle = Math.atan2(arrowDir.x, arrowDir.z)
              arrow.rotation.y = angle
            }
          } else {
            arrow.visible = false
            mesh.visible = true
          }
        }
      }
    }
  }

  /**
   * 重置所有指示灯为默认绿色
   */
  resetIndicatorColors() {
    for (const [floorId, lights] of this.indicatorLights) {
      for (const { mesh, arrow } of lights) {
        if (mesh.material) {
          mesh.material.color.set(COLORS.indicatorGreen)
          mesh.material.emissive.set(COLORS.indicatorGreen)
          mesh.material.emissiveIntensity = 0.6
        }
        mesh.visible = true
        if (arrow) arrow.visible = false
      }
    }
  }

  /**
   * 获取指示灯位置（用于模拟）
   */
  getIndicatorLights() {
    return this.indicatorLights
  }

  /**
   * 获取吸顶灯位置（用于模拟）
   */
  getCeilingLights() {
    return this.ceilingLights
  }

  /**
   * 恢复吸顶灯默认亮度
   */
  resetCeilingLightBrightness() {
    for (const [floorId, lights] of this.ceilingLights) {
      for (const { mesh, light } of lights) {
        if (mesh.material) {
          mesh.material.color.set(COLORS.ceilingLight)
          mesh.material.emissive.set(COLORS.ceilingLight)
          mesh.material.emissiveIntensity = 0.6
        }
        if (light) {
          light.color.set(COLORS.ceilingLight)
          light.intensity = 0.8
        }
      }
    }
  }

  /**
   * 设置吸顶灯亮度（用于起火点附近警告）
   * brightnessStates: Map<floorId, [{index, brightness}]>
   */
  setCeilingLightBrightness(brightnessStates) {
    for (const [floorId, states] of brightnessStates) {
      const lights = this.ceilingLights.get(floorId)
      if (!lights) continue
      for (const { index, brightness } of states) {
        if (index >= lights.length) continue
        const { mesh, light } = lights[index]
        if (mesh.material) {
          if (brightness > 0.8) {
            // 起火点附近：橙红色警告
            mesh.material.color.set(0xff4500)
            mesh.material.emissive.set(0xff4500)
            mesh.material.emissiveIntensity = brightness
          } else {
            // 正常亮度
            mesh.material.color.set(COLORS.ceilingLight)
            mesh.material.emissive.set(COLORS.ceilingLight)
            mesh.material.emissiveIntensity = brightness * 0.6
          }
        }
        if (light) {
          if (brightness > 0.8) {
            light.color.set(0xff4500)
            light.intensity = brightness * 2
          } else {
            light.color.set(COLORS.ceilingLight)
            light.intensity = brightness * 0.8
          }
        }
      }
    }
  }

  clear() {
    for (const obj of this.allObjects) {
      if (obj.parent) obj.parent.remove(obj)
      else this.scene.remove(obj)
      if (obj.geometry) obj.geometry.dispose()
      if (obj.material) {
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material]
        for (const m of mats) {
          if (m.map) m.map.dispose()
          m.dispose()
        }
      }
    }
    this.allObjects = []
    this.floorGroups.clear()
    this.nodePositions.clear()
    this.nodeMeshes.clear()
    this._nodeMap.clear()
    this._edgeIndex.clear()
    this._originalOpacities.clear()
  }
}
