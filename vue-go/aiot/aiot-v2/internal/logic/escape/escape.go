package escape

import (
	"aiot/internal/dao"
	"aiot/internal/global"
	"aiot/internal/model/entity"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"math"
	"net/http"
	"strings"
	"time"

	"github.com/gogf/gf/v2/frame/g"
)

// AlgoNode mirrors the Python GraphNode model.
type AlgoNode struct {
	NodeKey           string  `json:"node_key"`
	Name              string  `json:"name"`
	NodeType          string  `json:"node_type"`
	X                 float64 `json:"x"`
	Y                 float64 `json:"y"`
	Z                 float64 `json:"z"`
	FloorId           int     `json:"floor_id"`
	IsExit            bool    `json:"is_exit"`
	Capacity          *int    `json:"capacity,omitempty"`
	PopulationDensity float64 `json:"population_density,omitempty"`
}

// AlgoEdge mirrors the Python GraphEdge model.
type AlgoEdge struct {
	FromNodeKey       string  `json:"from_node_key"`
	ToNodeKey         string  `json:"to_node_key"`
	Distance          float64 `json:"distance"`
	BaseWeight        float64 `json:"base_weight"`
	Width             float64 `json:"width,omitempty"`
	Bidirectional     bool    `json:"bidirectional"`
	SafetyCoefficient float64 `json:"safety_coefficient,omitempty"`
}

// AlgoSensorReading mirrors the Python SensorReading model.
type AlgoSensorReading struct {
	Mac             string   `json:"mac"`
	NodeKey         string   `json:"node_key"`
	Temperature     *float64 `json:"temperature,omitempty"`
	Humidity        *float64 `json:"humidity,omitempty"`
	AQI             *float64 `json:"aqi,omitempty"`
	Flame           bool     `json:"flame"`
	InfluenceRadius float64  `json:"influence_radius"`
}

// CalculateRequest is the request to the algorithm service.
type CalculateRequest struct {
	Algorithm  string                 `json:"algorithm"`
	StartNode  string                 `json:"start_node"`
	FloorId    int                    `json:"floor_id"`
	Nodes      []AlgoNode             `json:"nodes"`
	Edges      []AlgoEdge             `json:"edges"`
	SensorData []AlgoSensorReading    `json:"sensor_data"`
	FirePoints []string               `json:"fire_points"`
	Density    map[string]float64     `json:"density"`
	Safety     map[string]float64     `json:"safety"`
	Compare    bool                   `json:"compare"`
	Params     map[string]interface{} `json:"params,omitempty"`
}

// PathResult mirrors the Python PathResult.
type PathResult struct {
	ExitNode              string   `json:"exit_node"`
	ExitName              string   `json:"exit_name"`
	Nodes                 []string `json:"nodes"`
	TotalCost             float64  `json:"total_cost"`
	EstimatedTime         string   `json:"estimated_time"`
	SafetySum             float64  `json:"safety_sum"`
	DensitySum            float64  `json:"density_sum"`
	ConvergenceIteration  int      `json:"convergence_iteration"`
}

// CalculateResponse is the response from the algorithm service.
type CalculateResponse struct {
	Algorithm     string              `json:"algorithm"`
	Paths         []PathResult        `json:"paths"`
	ComputeTimeMs int                 `json:"compute_time_ms"`
	Convergence   []float64           `json:"convergence,omitempty"`
	ConvergenceCost    []float64      `json:"convergence_cost,omitempty"`
	ConvergenceSafety  []float64      `json:"convergence_safety,omitempty"`
	ConvergenceIterationCost   int    `json:"convergence_iteration_cost,omitempty"`
	ConvergenceIterationSafety int    `json:"convergence_iteration_safety,omitempty"`
	Results       []CalculateResponse `json:"results,omitempty"`
}

// BeaconInfo 小程序上报的 BLE 信标信息
type BeaconInfo struct {
	Major int `json:"major"`
	Minor int `json:"minor"`
	RSSI  int `json:"rssi"`
}

// LocationResult 定位结果
type LocationResult struct {
	Success       bool    `json:"success"`
	Floor         int     `json:"floor"`
	NodeID        string  `json:"node_id"`
	Direction     string  `json:"direction"`
	ExitName      string  `json:"exit_name"`
	Distance      float64 `json:"distance"`
	EstimatedTime int     `json:"estimated_time"`
}

// ProcessLocation 处理 BLE 信标扫描结果，执行加权质心定位
func ProcessLocation(ctx context.Context, openid string, beacons []BeaconInfo) (*LocationResult, error) {
	if len(beacons) == 0 {
		return &LocationResult{Success: false}, fmt.Errorf("beacons 为空")
	}

	// 1. 查询每个 beacon 对应的节点，同时收集有效节点
	type matchedNode struct {
		Node  *entity.GraphNode
		RSSI  int
	}
	var matched []matchedNode
	floorCount := make(map[int]int)

	for _, b := range beacons {
		node, err := dao.GraphNode.GetByMajorMinor(ctx, b.Major, b.Minor)
		if err != nil {
			g.Log().Warningf(ctx, "查询节点 (major=%d, minor=%d) 失败: %v", b.Major, b.Minor, err)
			continue
		}
		if node == nil {
			g.Log().Debugf(ctx, "未找到节点 (major=%d, minor=%d)", b.Major, b.Minor)
			continue
		}
		matched = append(matched, matchedNode{Node: node, RSSI: b.RSSI})
		floorCount[node.FloorId]++
	}

	if len(matched) == 0 {
		return &LocationResult{Success: false}, fmt.Errorf("未匹配到任何已知节点")
	}

	// 2. 加权质心计算
	// 权重 = RSSI + 100 (避免负数)，信号越强权重越大
	const rssiOffset = 100
	var totalWeight, sumX, sumZ float64
	for _, m := range matched {
		weight := float64(m.RSSI + rssiOffset)
		if weight < 1 {
			weight = 1
		}
		totalWeight += weight
		sumX += m.Node.X * weight
		sumZ += m.Node.Z * weight
	}

	estX := sumX / totalWeight
	estZ := sumZ / totalWeight

	// 3. 取楼层：多数节点所在的楼层
	floor := 1
	maxCount := 0
	for f, c := range floorCount {
		if c > maxCount {
			maxCount = c
			floor = f
		}
	}

	// 4. 找离质心最近的节点作为起始节点
	nearestNode := matched[0].Node
	minDist := math.MaxFloat64
	for _, m := range matched {
		dx := m.Node.X - estX
		dz := m.Node.Z - estZ
		dist := math.Sqrt(dx*dx + dz*dz)
		if dist < minDist {
			minDist = dist
			nearestNode = m.Node
		}
	}

	// 构建节点列表供后续查找用
	allMatchedNodes := make([]*entity.GraphNode, len(matched))
	for i, m := range matched {
		allMatchedNodes[i] = m.Node
	}

	// 5. 检查是否有活跃火灾
	fireActive := isFireActive(ctx)
	result := &LocationResult{
		Success:  true,
		Floor:    floor,
		NodeID:   nearestNode.NodeKey,
		Distance: minDist,
	}

	if !fireActive {
		return result, nil
	}

	// 6. 有火灾：计算逃生路径
	algoResult, err := Calculate(ctx, "iaco", nearestNode.NodeKey, floor, true, nil)
	if err != nil {
		g.Log().Warningf(ctx, "calculate escape path: %v", err)
		return result, nil
	}

	// 7. 取最优路径，计算方向和出口
	if len(algoResult.Paths) > 0 {
		bestPath := algoResult.Paths[0]
		result.ExitName = bestPath.ExitName
		result.Distance = bestPath.TotalCost
		result.EstimatedTime = estimateEscapeTime(bestPath.TotalCost)

		if len(bestPath.Nodes) >= 2 {
			nextNode := findNodeByKey(allMatchedNodes, bestPath.Nodes[1])
			if nextNode != nil {
				result.Direction = calculateNodeDirection(nearestNode, nextNode)
			}
		}

		// 下发方向指令到指示灯
		go dispatchDirections(ctx, algoResult.Paths[0], allMatchedNodes)
		go publishDirectionCommand(ctx, "D8:BC:38:78:21:98", result.Direction)
	}

	return result, nil
}

// findNodeByKey 按节点Key查找节点
func findNodeByKey(nodes []*entity.GraphNode, key string) *entity.GraphNode {
	for _, n := range nodes {
		if n.NodeKey == key {
			return n
		}
	}
	return nil
}

// calculateNodeDirection 计算从current到next的方向
func calculateNodeDirection(current, next *entity.GraphNode) string {
	dx := next.X - current.X
	dz := next.Z - current.Z
	dy := next.Y - current.Y

	absX := math.Abs(dx)
	absZ := math.Abs(dz)

	// 同层斜向：X/Z 都有明显位移时返回斜向
	if absX > 0 && absZ > 0 {
		small, big := absX, absZ
		if small > big {
			small, big = big, small
		}
		if small/big >= 0.20 {
			switch {
			case dx > 0 && dz < 0:
				return "RUp"
			case dx < 0 && dz < 0:
				return "LUp"
			case dx > 0 && dz > 0:
				return "RDown"
			case dx < 0 && dz > 0:
				return "LDown"
			}
		}
	}

	// 主方向优先
	if absX > absZ {
		if dx > 0 {
			return "Right"
		}
		return "Left"
	}
	if absZ > 0 {
		if dz > 0 {
			return "Down"
		}
		return "Up"
	}

	// 同一位置跨楼层时按 Y 判断上下
	if dy > 0 {
		return "Down"
	}
	return "Up"
}

// CheckDirection 返回两个节点之间的方向，用于验证斜向箭头。
func CheckDirection(ctx context.Context, fromKey, toKey string) (string, error) {
	nodes, err := dao.GraphNode.ListAll(ctx)
	if err != nil {
		return "", err
	}

	var from, to *entity.GraphNode
	for _, n := range nodes {
		if n.NodeKey == fromKey {
			from = n
		}
		if n.NodeKey == toKey {
			to = n
		}
	}
	if from == nil || to == nil {
		return "", fmt.Errorf("node not found: %s -> %s", fromKey, toKey)
	}
	return calculateNodeDirection(from, to), nil
}

// estimateEscapeTime 估算逃生时间（按1.5m/s，与算法服务 estimate_time 一致）
func estimateEscapeTime(distance float64) int {
	return int(distance / 1.5)
}

// isFireActive 检查是否有活跃火灾
func isFireActive(ctx context.Context) bool {
	count, err := g.DB().Model("fire_alarm").
		Where("status", 1).
		Count()
	if err != nil {
		g.Log().Warningf(ctx, "check fire alarm: %v", err)
		return false
	}
	g.Log().Infof(ctx, "active fire alarms: %d", count)
	return count > 0
}

// dispatchDirections 下发方向指令到指示灯
func dispatchDirections(ctx context.Context, path PathResult, nodes []*entity.GraphNode) {
	// 遍历路径上的每个节点
	for i := 0; i < len(path.Nodes)-1; i++ {
		currentKey := path.Nodes[i]
		nextKey := path.Nodes[i+1]

		currentNode := findNodeByKey(nodes, currentKey)
		nextNode := findNodeByKey(nodes, nextKey)
		if currentNode == nil || nextNode == nil {
			continue
		}

		direction := calculateNodeDirection(currentNode, nextNode)

		// 查找该节点绑定的设备MAC
		allBindings, err := dao.SensorNodeBinding.ListAll(ctx)
		if err != nil {
			continue
		}
		for _, b := range allBindings {
			if b.NodeKey != currentKey {
				continue
			}
			mac := findSensorMac(ctx, b.SensorId)
			if mac == "" {
				continue
			}
			publishDirectionCommand(ctx, mac, direction)
		}
	}
}

// findSensorMac 根据传感器ID查找MAC地址
func findSensorMac(ctx context.Context, sensorId int) string {
	var mac string
	g.DB().Model("sensor").
		Where("id", sensorId).
		Fields("mac_address").
		Scan(&mac)
	return mac
}

// publishDirectionCommand 通过MQTT下发方向指令
func publishDirectionCommand(ctx context.Context, mac, direction string) {
	deviceKey := mac
	if !strings.HasPrefix(deviceKey, "ESP32_") {
		deviceKey = "ESP32_" + deviceKey
	}
	payload := map[string]interface{}{
		deviceKey: map[string]interface{}{
			"display_left":  direction,
			"display_mid":   direction,
			"display_right": direction,
			"buzzer":        2,
		},
	}
	data, _ := json.Marshal(payload)
	if global.MQTTClient != nil {
		token := global.MQTTClient.Publish("indicator_light/command", 0, false, data)
		token.WaitTimeout(2 * time.Second)
	}
	g.Log().Infof(ctx, "方向指令下发: %s -> %s", mac, direction)
}

// Subscribe 用户扫码订阅设备火灾通知
// DispatchResultDirections sends the first path of the given result to bound indicator lights via MQTT.
func DispatchResultDirections(ctx context.Context, result *CalculateResponse) {
	if result == nil || len(result.Paths) == 0 {
		return
	}
	nodes, err := dao.GraphNode.ListAll(ctx)
	if err != nil {
		g.Log().Warningf(ctx, "dispatch directions: load nodes: %v", err)
		return
	}
	go dispatchDirections(ctx, result.Paths[0], nodes)
}

func Subscribe(ctx context.Context, openid, deviceID, location string) error {
	// 检查是否已订阅
	count, err := g.DB().Model("user_subscription").
		Where("openid", openid).
		Where("device_id", deviceID).
		Count()
	if err != nil {
		return fmt.Errorf("check subscription: %w", err)
	}

	if count > 0 {
		// 已存在，更新状态为订阅中
		_, err = g.DB().Model("user_subscription").
			Data(g.Map{
				"status":          1,
				"device_location": location,
			}).
			Where("openid", openid).
			Where("device_id", deviceID).
			Update()
		return err
	}

	// 新增订阅
	_, err = g.DB().Model("user_subscription").
		Data(g.Map{
			"openid":          openid,
			"device_id":       deviceID,
			"device_location": location,
			"status":          1,
		}).
		Insert()
	if err != nil {
		return fmt.Errorf("insert subscription: %w", err)
	}
	g.Log().Infof(ctx, "用户订阅成功: openid=%s device=%s location=%s", openid, deviceID, location)
	return nil
}

// CalculateOptions 逃生路径计算参数
type CalculateOptions struct {
	Algorithm  string
	StartNode  string
	FloorId    int
	FireMode   bool
	FirePoints []string
	Density    map[string]float64
	Safety     map[string]float64
	Compare    bool
	Params     map[string]interface{}
}

// Calculate loads graph data from DB, calls the Python algorithm service, and returns the result.
func Calculate(ctx context.Context, algorithm string, startNode string, floorId int, fireMode bool, params map[string]interface{}) (*CalculateResponse, error) {
	return CalculateWithOptions(ctx, CalculateOptions{
		Algorithm: algorithm,
		StartNode: startNode,
		FloorId:   floorId,
		FireMode:  fireMode,
		Params:    params,
	})
}

// CalculateWithOptions 支持起火点、密集度、安全系数和算法对比的路径计算。
// When fireMode is true, elevator nodes and their connected edges are excluded (fire safety: stairs only).
func CalculateWithOptions(ctx context.Context, opts CalculateOptions) (*CalculateResponse, error) {
	if opts.FirePoints == nil {
		opts.FirePoints = []string{}
	}
	if opts.Density == nil {
		opts.Density = map[string]float64{}
	}
	if opts.Safety == nil {
		opts.Safety = map[string]float64{}
	}

	// 1. Load graph nodes and edges from DB
	allNodes, err := dao.GraphNode.ListAll(ctx)
	if err != nil {
		return nil, fmt.Errorf("load graph nodes: %w", err)
	}
	allEdges, err := dao.GraphEdge.ListAll(ctx)
	if err != nil {
		return nil, fmt.Errorf("load graph edges: %w", err)
	}

	// Convert to algorithm request format, filtering out elevators in fire mode
	excludedKeys := make(map[string]bool)
	nodes := make([]AlgoNode, 0, len(allNodes))
	for _, n := range allNodes {
		// 火灾模式：禁止使用电梯（垂直电梯、扶手电梯等）
		// g.Log().Info(ctx, "11111", fireMode, n.NodeType)
		if opts.FireMode && n.NodeType == "elevator" {
			excludedKeys[n.NodeKey] = true
			continue
		}
		nodes = append(nodes, AlgoNode{
			NodeKey:           n.NodeKey,
			Name:              n.Name,
			NodeType:          n.NodeType,
			X:                 n.X,
			Y:                 n.Y,
			Z:                 n.Z,
			FloorId:           n.FloorId,
			IsExit:            n.IsExit == 1,
			Capacity:          n.Capacity,
			PopulationDensity: opts.Density[n.NodeKey],
		})
	}

	edges := make([]AlgoEdge, 0, len(allEdges))
	for _, e := range allEdges {
		// 跳过连接到被排除节点的边
		if excludedKeys[e.FromNodeKey] || excludedKeys[e.ToNodeKey] {
			continue
		}
		safety := 1.0
		if v, ok := opts.Safety[e.FromNodeKey+"->"+e.ToNodeKey]; ok {
			safety = v
		} else if v, ok := opts.Safety[e.ToNodeKey+"->"+e.FromNodeKey]; ok {
			safety = v
		}
		edges = append(edges, AlgoEdge{
			FromNodeKey:       e.FromNodeKey,
			ToNodeKey:         e.ToNodeKey,
			Distance:          e.Distance,
			BaseWeight:        e.BaseWeight,
			Width:             e.Width,
			Bidirectional:     e.Bidirectional == 1,
			SafetyCoefficient: safety,
		})
	}

	// 2. Load sensor-node bindings and build sensor readings (placeholder, can be enriched with real-time data)
	bindings, _ := dao.SensorNodeBinding.ListAll(ctx)
	sensorData := make([]AlgoSensorReading, 0, len(bindings))
	for _, b := range bindings {
		sensorData = append(sensorData, AlgoSensorReading{
			Mac:             fmt.Sprintf("sensor-%d", b.SensorId),
			NodeKey:         b.NodeKey,
			InfluenceRadius: b.InfluenceRadius,
		})
	}

	// 3. Build request
	req := CalculateRequest{
		Algorithm:  opts.Algorithm,
		StartNode:  opts.StartNode,
		FloorId:    opts.FloorId,
		Nodes:      nodes,
		Edges:      edges,
		SensorData: sensorData,
		FirePoints: opts.FirePoints,
		Density:    opts.Density,
		Safety:     opts.Safety,
		Compare:    opts.Compare,
		Params:     opts.Params,
	}

	// 4. Call algorithm service
	algoURL := g.Cfg().MustGet(ctx, "algorithm.url").String()
	timeout := g.Cfg().MustGet(ctx, "algorithm.timeout", 30).Int()

	body, _ := json.Marshal(req)
	endpoint := fmt.Sprintf("%s/api/escape/calculate", algoURL)

	client := &http.Client{Timeout: time.Duration(timeout) * time.Second}
	resp, err := client.Post(endpoint, "application/json", bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("algorithm service call failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read algorithm response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("algorithm service error (status %d): %s", resp.StatusCode, string(respBody))
	}

	var result CalculateResponse
	if err = json.Unmarshal(respBody, &result); err != nil {
		return nil, fmt.Errorf("parse algorithm response: %w", err)
	}
	return &result, nil
}
