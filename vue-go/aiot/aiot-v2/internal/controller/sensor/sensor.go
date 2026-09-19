package sensor

import (
	v1 "aiot/api/sensor/v1"
	"aiot/internal/errs"
	"aiot/internal/logic/sensor"
	"aiot/internal/model/do"
	"aiot/internal/model/entity"
	"context"
)

type ControllerV1 struct{}

func NewV1() *ControllerV1 { return &ControllerV1{} }

func (c *ControllerV1) ListSensor(ctx context.Context, req *v1.ListSensorReq) (res *v1.ListSensorRes, err error) {
	list, err := sensor.List(ctx)
	if err != nil {
		return nil, errs.Wrap(ctx, err, "获取传感器列表失败")
	}
	return &v1.ListSensorRes{List: list}, nil
}

func (c *ControllerV1) GetSensor(ctx context.Context, req *v1.GetSensorReq) (res *v1.GetSensorRes, err error) {
	info, err := sensor.GetById(ctx, req.Id)
	if err != nil {
		return nil, errs.Wrap(ctx, err, "获取传感器信息失败")
	}
	return &v1.GetSensorRes{Info: info}, nil
}

func (c *ControllerV1) CreateSensor(ctx context.Context, req *v1.CreateSensorReq) (res *v1.CreateSensorRes, err error) {
	id, err := sensor.Create(ctx, &entity.Sensor{
		MacAddress: req.MacAddress,
		Address:    req.Address,
		BoardId:    req.BoardId,
		Img:        req.Img,
		Status:     req.Status,
	})
	if err != nil {
		return nil, errs.Wrap(ctx, err, "创建传感器失败")
	}
	return &v1.CreateSensorRes{Id: id}, nil
}

func (c *ControllerV1) UpdateSensor(ctx context.Context, req *v1.UpdateSensorReq) (res *v1.UpdateSensorRes, err error) {

	s := &do.Sensor{
		MacAddress: req.MacAddress,
		Address:    req.Address,
		BoardId:    req.BoardId,
		Img:        req.Img,
		Status:     nil,
	}
	if req.Status != nil {
		s.Status = *req.Status
	}
	if err = sensor.Update(ctx, req.Id, s); err != nil {
		return nil, errs.Wrap(ctx, err, "更新传感器失败")
	}
	return &v1.UpdateSensorRes{}, nil
}

func (c *ControllerV1) DeleteSensor(ctx context.Context, req *v1.DeleteSensorReq) (res *v1.DeleteSensorRes, err error) {
	if err = sensor.Delete(ctx, req.Id); err != nil {
		return nil, errs.Wrap(ctx, err, "删除传感器失败")
	}
	return &v1.DeleteSensorRes{}, nil
}

func (c *ControllerV1) GetSensorStatus(ctx context.Context, req *v1.GetSensorStatusReq) (res *v1.GetSensorStatusRes, err error) {
	status, err := sensor.GetStatus(ctx)
	if err != nil {
		return nil, errs.Wrap(ctx, err, "获取传感器状态失败")
	}
	return &v1.GetSensorStatusRes{Status: status}, nil
}
