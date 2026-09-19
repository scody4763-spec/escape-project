package device_alert

import (
	v1 "aiot/api/device_alert/v1"
	"aiot/internal/errs"
	"aiot/internal/logic/device_alert"
	"context"
)

type ControllerV1 struct{}

func NewV1() *ControllerV1 { return &ControllerV1{} }

func (c *ControllerV1) ListDeviceAlert(ctx context.Context, req *v1.ListDeviceAlertReq) (res *v1.ListDeviceAlertRes, err error) {
	list, err := device_alert.List(ctx, req.Status, req.AlertType)
	if err != nil {
		return nil, errs.Wrap(ctx, err, "获取告警列表失败")
	}
	return &v1.ListDeviceAlertRes{List: list}, nil
}

func (c *ControllerV1) UpdateDeviceAlert(ctx context.Context, req *v1.UpdateDeviceAlertReq) (res *v1.UpdateDeviceAlertRes, err error) {
	if err = device_alert.UpdateStatus(ctx, req.Id, req.Status); err != nil {
		return nil, errs.Wrap(ctx, err, "更新告警状态失败")
	}
	return &v1.UpdateDeviceAlertRes{}, nil
}
