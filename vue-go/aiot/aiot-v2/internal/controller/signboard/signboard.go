package signboard

import (
	v1 "aiot/api/signboard/v1"
	"aiot/internal/errs"
	"aiot/internal/logic/signboard"
	"aiot/internal/model/entity"
	"context"
)

type ControllerV1 struct{}

func NewV1() *ControllerV1 { return &ControllerV1{} }

func (c *ControllerV1) ListSignboard(ctx context.Context, req *v1.ListSignboardReq) (res *v1.ListSignboardRes, err error) {
	list, err := signboard.List(ctx)
	if err != nil {
		return nil, errs.Wrap(ctx, err, "获取显示板列表失败")
	}
	return &v1.ListSignboardRes{List: list}, nil
}

func (c *ControllerV1) GetSignboard(ctx context.Context, req *v1.GetSignboardReq) (res *v1.GetSignboardRes, err error) {
	info, err := signboard.GetById(ctx, req.Id)
	if err != nil {
		return nil, errs.Wrap(ctx, err, "获取显示板信息失败")
	}
	return &v1.GetSignboardRes{Info: info}, nil
}

func (c *ControllerV1) CreateSignboard(ctx context.Context, req *v1.CreateSignboardReq) (res *v1.CreateSignboardRes, err error) {
	id, err := signboard.Create(ctx, &entity.Signboard{
		MacAddress:        req.MacAddress,
		DisplayLeft:       req.DisplayLeft,
		DisplayMid:        req.DisplayMid,
		DisplayRight:      req.DisplayRight,
		RgbLeft:           req.RgbLeft,
		RgbMid:            req.RgbMid,
		RgbRight:          req.RgbRight,
		Led:               req.Led,
		Buzzer:            req.Buzzer,
		Flame:             req.Flame,
		ElectricitySwitch: req.ElectricitySwitch,
		Address:           req.Address,
		Remark:            req.Remark,
	})
	if err != nil {
		return nil, errs.Wrap(ctx, err, "创建显示板失败")
	}
	return &v1.CreateSignboardRes{Id: id}, nil
}

func (c *ControllerV1) UpdateSignboard(ctx context.Context, req *v1.UpdateSignboardReq) (res *v1.UpdateSignboardRes, err error) {
	if err = signboard.Update(ctx, req); err != nil {
		return nil, errs.Wrap(ctx, err, "更新显示板失败")
	}
	return &v1.UpdateSignboardRes{}, nil
}

func (c *ControllerV1) DeleteSignboard(ctx context.Context, req *v1.DeleteSignboardReq) (res *v1.DeleteSignboardRes, err error) {
	if err = signboard.Delete(ctx, req.Id); err != nil {
		return nil, errs.Wrap(ctx, err, "删除显示板失败")
	}
	return &v1.DeleteSignboardRes{}, nil
}

func (c *ControllerV1) GetSignboardStatus(ctx context.Context, req *v1.GetSignboardStatusReq) (res *v1.GetSignboardStatusRes, err error) {
	status, err := signboard.GetStatus(ctx)
	if err != nil {
		return nil, errs.Wrap(ctx, err, "获取显示板状态失败")
	}
	return &v1.GetSignboardStatusRes{Status: status}, nil
}
