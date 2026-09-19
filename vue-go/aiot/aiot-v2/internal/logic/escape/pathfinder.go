package escape

import (
	"context"
	"fmt"

	"github.com/gogf/gf/v2/frame/g"
)

// CalculateEscapePath 从指定节点计算逃生路径，默认使用改进蚁群算法
// 返回: exitNode(出口节点), exitName(出口名称), pathNodes(路径节点列表), error
func CalculateEscapePath(ctx context.Context, startNode string, floorId int) (string, string, []string, error) {
	result, err := Calculate(ctx, "iaco", startNode, floorId, true, nil)
	if err != nil {
		return "", "", nil, fmt.Errorf("calculate escape path: %w", err)
	}

	if len(result.Paths) == 0 {
		return "", "", nil, fmt.Errorf("no escape path found")
	}

	bestPath := result.Paths[0]

	g.Log().Infof(ctx, "escape path calculated: start=%s, exit=%s, steps=%d, cost=%.2f, time=%s",
		startNode, bestPath.ExitNode, len(bestPath.Nodes), bestPath.TotalCost, bestPath.EstimatedTime)

	return bestPath.ExitNode, bestPath.ExitName, bestPath.Nodes, nil
}
