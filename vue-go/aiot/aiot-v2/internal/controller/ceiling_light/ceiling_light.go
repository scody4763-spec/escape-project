package ceiling_light

import (
	v1 "aiot/api/ceilingLight/v1"
	"aiot/internal/errs"
	"aiot/internal/handler/ceiling_light"
	"context"
)

type ControllerV1 struct{}

func NewV1() *ControllerV1 { return &ControllerV1{} }

func (c *ControllerV1) List(ctx context.Context, req *v1.CeilingLightListReq) (res *v1.CeilingLightListRes, err error) {
	res, err = ceiling_light.List(ctx, req)
	if err != nil {
		return nil, errs.Wrap(ctx, err, "获取吸顶灯列表失败")
	}
	return res, nil
}

func (c *ControllerV1) Get(ctx context.Context, req *v1.CeilingLightGetReq) (res *v1.CeilingLightGetRes, err error) {
	res, err = ceiling_light.Get(ctx, req)
	if err != nil {
		return nil, errs.Wrap(ctx, err, "获取吸顶灯详情失败")
	}
	return res, nil
}

func (c *ControllerV1) Create(ctx context.Context, req *v1.CeilingLightCreateReq) (res *v1.CeilingLightCreateRes, err error) {
	res, err = ceiling_light.Create(ctx, req)
	if err != nil {
		return nil, errs.Wrap(ctx, err, "创建吸顶灯失败")
	}
	return res, nil
}

func (c *ControllerV1) Update(ctx context.Context, req *v1.CeilingLightUpdateReq) (res *v1.CeilingLightUpdateRes, err error) {
	res, err = ceiling_light.Update(ctx, req)
	if err != nil {
		return nil, errs.Wrap(ctx, err, "更新吸顶灯失败")
	}
	return res, nil
}

func (c *ControllerV1) Delete(ctx context.Context, req *v1.CeilingLightDeleteReq) (res *v1.CeilingLightDeleteRes, err error) {
	res, err = ceiling_light.Delete(ctx, req)
	if err != nil {
		return nil, errs.Wrap(ctx, err, "删除吸顶灯失败")
	}
	return res, nil
}

func (c *ControllerV1) Status(ctx context.Context, req *v1.CeilingLightStatusReq) (res *v1.CeilingLightStatusRes, err error) {
	res, err = ceiling_light.Status(ctx, req)
	if err != nil {
		return nil, errs.Wrap(ctx, err, "获取吸顶灯状态失败")
	}
	return res, nil
}
