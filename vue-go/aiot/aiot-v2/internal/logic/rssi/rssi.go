package rssi

import (
	"aiot/internal/dao"
	"aiot/internal/logic/escape"
	"aiot/internal/model/entity"
	"context"
	"fmt"
	"math"
	"sort"

	"github.com/gogf/gf/v2/frame/g"
)

// RSSIResult 定位结果
type RSSIResult struct {
	Success   bool
	Message   string
	DeviceMac string
	NodeKey   string
	FloorId   int
	X         float64
	Y         float64
	ExitNode  string
	ExitName  string
	Direction string
	PathNodes []string
}

// ProcessRSSI 处理手机上传的RSSI数据
func ProcessRSSI(ctx context.Context, rssiData map[string]int) (*RSSIResult, error) {
	if len(rssiData) == 0 {
		return &RSSIResult{
			Success: false,
			Message: "未检测到任何WiFi信号",
		}, nil
	}

	// 1. 查询所有指示灯绑定信息
	bindings, err := dao.IndicatorNodeBinding.ListWithCache(ctx)
	if err != nil {
		return nil, fmt.Errorf("查询绑定信息失败: %w", err)
	}

	// 2. 匹配RSSI数据与已知设备
	type matchedDevice struct {
		Binding *entity.IndicatorNodeBinding
		RSSI    int
		Dist    float64 // 估算距离
	}

	var matched []matchedDevice
	for bssid, rssi := range rssiData {
		for _, binding := range bindings {
			if binding.MacAddress == bssid {
				// RSSI转距离估算 (自由空间路径损耗模型简化版)
				// 距离 = 10^((27.55 - (20*log10(2.4GHz)) - RSSI) / 20)
				dist := math.Pow(10, (27.55-float64(rssi))/20.0)
				matched = append(matched, matchedDevice{
					Binding: binding,
					RSSI:    rssi,
					Dist:    dist,
				})
				break
			}
		}
	}

	// 3. 如果没有匹配到任何已知设备
	if len(matched) == 0 {
		return &RSSIResult{
			Success: false,
			Message: "未检测到已部署的指示灯设备",
		}, nil
	}

	// 4. 按RSSI强度排序（越强越近）
	sort.Slice(matched, func(i, j int) bool {
		return matched[i].RSSI > matched[j].RSSI
	})

	nearest := matched[0]

	// 5. 如果只有1台设备，返回基础信息
	if len(matched) == 1 {
		// 尝试计算逃生路径
		exitNode, exitName, pathNodes, err := escape.CalculateEscapePath(ctx, nearest.Binding.NodeKey, nearest.Binding.FloorId)
		if err != nil {
			g.Log().Warningf(ctx, "calculate escape path error: %v", err)
			return &RSSIResult{
				Success:   true,
				Message:   fmt.Sprintf("您在 %s 附近（信号强度: %d）", nearest.Binding.NodeKey, nearest.RSSI),
				DeviceMac: nearest.Binding.MacAddress,
				NodeKey:   nearest.Binding.NodeKey,
				FloorId:   nearest.Binding.FloorId,
				X:         nearest.Binding.X,
				Y:         nearest.Binding.Y,
			}, nil
		}

		direction := parseDirection(pathNodes)
		arrowDir := calculateArrowDirection(ctx, pathNodes)

		return &RSSIResult{
			Success:   true,
			Message:   fmt.Sprintf("您在 %s 附近，请%s", nearest.Binding.NodeKey, direction),
			DeviceMac: nearest.Binding.MacAddress,
			NodeKey:   nearest.Binding.NodeKey,
			FloorId:   nearest.Binding.FloorId,
			X:         nearest.Binding.X,
			Y:         nearest.Binding.Y,
			ExitNode:  exitNode,
			ExitName:  exitName,
			Direction: arrowDir,
			PathNodes: pathNodes,
		}, nil
	}

	// 6. 多台设备：加权质心法定位
	var weightedX, weightedY, totalWeight float64
	for _, m := range matched {
		// RSSI越强，权重越大
		weight := float64(m.RSSI+100) // 加100避免负数
		if weight < 1 {
			weight = 1
		}
		weightedX += m.Binding.X * weight
		weightedY += m.Binding.Y * weight
		totalWeight += weight
	}

	estX := weightedX / totalWeight
	estY := weightedY / totalWeight

	// 找最近的节点作为起始点
 nearestNode := nearest.Binding.NodeKey
	nearestDist := math.MaxFloat64
	for _, m := range matched {
		dx := m.Binding.X - estX
		dy := m.Binding.Y - estY
		d := math.Sqrt(dx*dx + dy*dy)
		if d < nearestDist {
			nearestDist = d
			nearestNode = m.Binding.NodeKey
		}
	}

	// 7. 计算逃生路径
	exitNode, exitName, pathNodes, err := escape.CalculateEscapePath(ctx, nearestNode, nearest.Binding.FloorId)
	if err != nil {
		g.Log().Warningf(ctx, "calculate escape path error: %v", err)
		return &RSSIResult{
			Success:   true,
			Message:   fmt.Sprintf("您在坐标 (%.1f, %.1f) 附近", estX, estY),
			NodeKey:   nearestNode,
			FloorId:   nearest.Binding.FloorId,
			X:         estX,
			Y:         estY,
		}, nil
	}

	direction := parseDirection(pathNodes)
	arrowDir := calculateArrowDirection(ctx, pathNodes)

	return &RSSIResult{
		Success:   true,
		Message:   fmt.Sprintf("定位成功，请%s", direction),
		NodeKey:   nearestNode,
		FloorId:   nearest.Binding.FloorId,
		X:         estX,
		Y:         estY,
		ExitNode:  exitNode,
		ExitName:  exitName,
		Direction: arrowDir,
		PathNodes: pathNodes,
	}, nil
}

// parseDirection 将路径节点列表解析为方向描述
func parseDirection(pathNodes []string) string {
	if len(pathNodes) < 2 {
		return "请寻找最近的安全出口"
	}

	// 简单的方向判断：根据路径长度给出提示
	steps := len(pathNodes) - 1
	if steps <= 3 {
		return fmt.Sprintf("直走 %d 步到达出口", steps)
	} else if steps <= 6 {
		return fmt.Sprintf("沿路径走约 %d 步到达出口", steps)
	}
	return fmt.Sprintf("请沿指示方向走约 %d 步到达安全出口", steps)
}

// calculateArrowDirection 根据路径节点坐标计算箭头方向 (left/right/up/down)
func calculateArrowDirection(ctx context.Context, pathNodes []string) string {
	if len(pathNodes) < 2 {
		return "寻找最近出口"
	}

	// 加载所有节点获取坐标
	allNodes, err := dao.GraphNode.ListAll(ctx)
	if err != nil || len(allNodes) == 0 {
		return "寻找最近出口"
	}

	// 建立 nodeKey -> 坐标的映射
	nodeMap := make(map[string]struct{ X, Z float64 })
	for _, n := range allNodes {
		nodeMap[n.NodeKey] = struct{ X, Z float64 }{X: n.X, Z: n.Z}
	}

	start, ok1 := nodeMap[pathNodes[0]]
	next, ok2 := nodeMap[pathNodes[1]]
	if !ok1 || !ok2 {
		return "寻找最近出口"
	}

	// 计算方向：根据下一个节点相对于当前位置的坐标差
	dx := next.X - start.X
	dz := next.Z - start.Z

	// Z轴正方向为"前"(up)，X轴正方向为"右"(right)
	if abs(dz) > abs(dx) {
		// 主要沿Z轴移动
		if dz > 0 {
			return "up"
		}
		return "down"
	}
	// 主要沿X轴移动
	if dx > 0 {
		return "right"
	}
	return "left"
}

func abs(x float64) float64 {
	if x < 0 {
		return -x
	}
	return x
}
