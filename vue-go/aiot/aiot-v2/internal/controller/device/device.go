package device

import (
	v1 "aiot/api/device/v1"
	"aiot/internal/errs"
	"aiot/internal/logic/device"
	"context"
)

type ControllerV1 struct{}

func NewV1() *ControllerV1 {
	return &ControllerV1{}
}

func (c *ControllerV1) DeviceList(ctx context.Context, req *v1.DeviceListReq) (res *v1.DeviceListRes, err error) {
	data, err := device.List(ctx, req.BoardId, req.MacAddress)
	if err != nil {
		return nil, errs.Wrap(ctx, err, "获取设备列表失败")
	}
	return &v1.DeviceListRes{List: data}, nil
}

func (c *ControllerV1) DeviceDetails(ctx context.Context, req *v1.DeviceDetailsReq) (res *v1.DeviceDetailsRes, err error) {
	data, err := device.GetDetails(ctx, req.MacAddress)
	if err != nil {
		return nil, errs.Wrap(ctx, err, "获取设备详情失败")
	}
	return &v1.DeviceDetailsRes{Info: data}, nil
}

func (c *ControllerV1) DeviceTemperature(ctx context.Context, req *v1.DeviceTemperatureReq) (res *v1.DeviceTemperatureRes, err error) {
	data, err := device.GetTemperatureData(ctx, req.MacAddress, req.BeginTime, req.EndTime)
	if err != nil {
		return nil, errs.Wrap(ctx, err, "获取温度数据失败")
	}
	return &v1.DeviceTemperatureRes{Data: data}, nil
}

func (c *ControllerV1) DeviceHumidity(ctx context.Context, req *v1.DeviceHumidityReq) (res *v1.DeviceHumidityRes, err error) {
	data, err := device.GetHumidityData(ctx, req.MacAddress, req.BeginTime, req.EndTime)
	if err != nil {
		return nil, errs.Wrap(ctx, err, "获取湿度数据失败")
	}
	return &v1.DeviceHumidityRes{Data: data}, nil
}

func (c *ControllerV1) DeviceTVOC(ctx context.Context, req *v1.DeviceTVOCReq) (res *v1.DeviceTVOCRes, err error) {
	data, err := device.GetTVOCData(ctx, req.MacAddress, req.BeginTime, req.EndTime)
	if err != nil {
		return nil, errs.Wrap(ctx, err, "获取TVOC数据失败")
	}
	return &v1.DeviceTVOCRes{Data: data}, nil
}

func (c *ControllerV1) DeviceEco2(ctx context.Context, req *v1.DeviceEco2Req) (res *v1.DeviceEco2Res, err error) {
	data, err := device.GetEco2Data(ctx, req.MacAddress, req.BeginTime, req.EndTime)
	if err != nil {
		return nil, errs.Wrap(ctx, err, "获取ECO2数据失败")
	}
	return &v1.DeviceEco2Res{Data: data}, nil
}
