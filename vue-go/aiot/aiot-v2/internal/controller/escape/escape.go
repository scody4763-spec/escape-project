package escape

import (
	"context"

	v1 "aiot/api/escape/v1"
	"aiot/internal/dao"
	"aiot/internal/errs"
	escapeLogic "aiot/internal/logic/escape"
)

type ControllerV1 struct{}

func NewV1() *ControllerV1 { return &ControllerV1{} }

func (c *ControllerV1) CalculateEscape(ctx context.Context, req *v1.CalculateEscapeReq) (res *v1.CalculateEscapeRes, err error) {
	opts := escapeLogic.CalculateOptions{
		Algorithm:  req.Algorithm,
		StartNode:  req.StartNode,
		FloorId:    req.FloorId,
		FireMode:   req.FireMode,
		FirePoints: req.FirePoints,
		Density:    req.Density,
		Safety:     req.Safety,
		Compare:    req.Compare,
		Params:     req.Params,
	}
	result, err := escapeLogic.CalculateWithOptions(ctx, opts)
	if err != nil {
		return nil, errs.Wrap(ctx, err, "逃生路径计算失败")
	}

	// MQTT direction dispatch uses the IACO result when comparing algorithms.
	mqttResult := result
	if req.Compare && result != nil {
		for i := range result.Results {
			if result.Results[i].Algorithm == "iaco" {
				mqttResult = &result.Results[i]
				break
			}
		}
	}
	if req.FireMode {
		escapeLogic.DispatchResultDirections(ctx, mqttResult)
	}

	res = &v1.CalculateEscapeRes{
		Algorithm:     result.Algorithm,
		Paths:         result.Paths,
		ComputeTimeMs: result.ComputeTimeMs,
		Convergence:   result.Convergence,
		ConvergenceCost:    result.ConvergenceCost,
		ConvergenceSafety:  result.ConvergenceSafety,
		ConvergenceIterationCost:   result.ConvergenceIterationCost,
		ConvergenceIterationSafety: result.ConvergenceIterationSafety,
		Results:       result.Results,
	}
	return res, nil
}

func (c *ControllerV1) GetGraphNodes(ctx context.Context, req *v1.GetGraphNodesReq) (res *v1.GetGraphNodesRes, err error) {
	var list interface{}
	if req.FloorId > 0 {
		list, err = dao.GraphNode.ListByFloor(ctx, req.FloorId)
	} else {
		list, err = dao.GraphNode.ListAll(ctx)
	}
	if err != nil {
		return nil, errs.Wrap(ctx, err, "获取图节点失败")
	}
	return &v1.GetGraphNodesRes{List: list}, nil
}

func (c *ControllerV1) GetGraphEdges(ctx context.Context, req *v1.GetGraphEdgesReq) (res *v1.GetGraphEdgesRes, err error) {
	list, err := dao.GraphEdge.ListAll(ctx)
	if err != nil {
		return nil, errs.Wrap(ctx, err, "获取图边失败")
	}
	return &v1.GetGraphEdgesRes{List: list}, nil
}

func (c *ControllerV1) ReportLocation(ctx context.Context, req *v1.ReportLocationReq) (res *v1.ReportLocationRes, err error) {
	// 将 API 层的 BeaconInfo 转为 logic 层的 BeaconInfo
	beacons := make([]escapeLogic.BeaconInfo, len(req.Beacons))
	for i, b := range req.Beacons {
		beacons[i] = escapeLogic.BeaconInfo{
			Major: b.Major,
			Minor: b.Minor,
			RSSI:  b.RSSI,
		}
	}
	result, err := escapeLogic.ProcessLocation(ctx, req.OpenID, beacons)
	if err != nil {
		return nil, errs.Wrap(ctx, err, "定位处理失败")
	}
	return &v1.ReportLocationRes{
		Success:       result.Success,
		Floor:         result.Floor,
		NodeID:        result.NodeID,
		Direction:     result.Direction,
		ExitName:      result.ExitName,
		Distance:      result.Distance,
		EstimatedTime: result.EstimatedTime,
	}, nil
}

func (c *ControllerV1) SubscribeDevice(ctx context.Context, req *v1.SubscribeDeviceReq) (res *v1.SubscribeDeviceRes, err error) {
	err = escapeLogic.Subscribe(ctx, req.OpenID, req.DeviceID, req.Location)
	if err != nil {
		return nil, errs.Wrap(ctx, err, "订阅失败")
	}
	return &v1.SubscribeDeviceRes{
		Success: true,
		Message: "订阅成功",
	}, nil
}

func (c *ControllerV1) CheckDirection(ctx context.Context, req *v1.CheckDirectionReq) (res *v1.CheckDirectionRes, err error) {
	direction, err := escapeLogic.CheckDirection(ctx, req.From, req.To)
	if err != nil {
		return nil, errs.Wrap(ctx, err, "方向计算失败")
	}
	return &v1.CheckDirectionRes{
		From:      req.From,
		To:        req.To,
		Direction: direction,
	}, nil
}
