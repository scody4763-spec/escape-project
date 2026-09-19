package ceiling_light

import (
	"context"
	"strconv"

	v1 "aiot/api/ceilingLight/v1"
	"aiot/internal/logic/ceilingLight"

	"github.com/gogf/gf/v2/frame/g"
)

func List(ctx context.Context, req *v1.CeilingLightListReq) (res *v1.CeilingLightListRes, err error) {
	list, total, err := ceilingLight.List(ctx, req.DeviceId, req.MacAddress, req.Search, req.Page, req.Size)
	if err != nil {
		return nil, err
	}
	return &v1.CeilingLightListRes{
		List:  list,
		Total: total,
	}, nil
}

func Get(ctx context.Context, req *v1.CeilingLightGetReq) (res *v1.CeilingLightGetRes, err error) {
	item, err := ceilingLight.GetById(ctx, int(req.Id))
	if err != nil {
		return nil, err
	}

	res = &v1.CeilingLightGetRes{
		CeilingLightItem: &v1.CeilingLightItem{
			Id:         uint(item.Id),
			DeviceId:   item.DeviceId,
			MacAddress: item.MacAddress,
			Address:    item.Address,
			FloorId:    strconv.Itoa(item.FloorId),
			Zone:       item.Zone,
			Status:     getStatusString(item.Status),
			CreatedAt:  item.CreateTime.Format("2006-01-02 15:04:05"),
			UpdatedAt:  item.UpdateTime.Format("2006-01-02 15:04:05"),
		},
	}
	return res, nil
}

func Create(ctx context.Context, req *v1.CeilingLightCreateReq) (res *v1.CeilingLightCreateRes, err error) {
	floorId := parseFloorId(req.FloorId)
	status := parseStatus(req.Status)

	id, err := ceilingLight.Create(ctx, req.DeviceId, req.MacAddress, floorId, req.Zone, req.Address, status)
	if err != nil {
		return nil, err
	}
	return &v1.CeilingLightCreateRes{Id: id}, nil
}

func Update(ctx context.Context, req *v1.CeilingLightUpdateReq) (res *v1.CeilingLightUpdateRes, err error) {
	floorId := parseFloorId(req.FloorId)
	status := parseStatus(req.Status)

	err = ceilingLight.Update(ctx, int(req.Id), req.DeviceId, req.MacAddress, floorId, req.Zone, req.Address, status)
	return nil, err
}

func Delete(ctx context.Context, req *v1.CeilingLightDeleteReq) (res *v1.CeilingLightDeleteRes, err error) {
	err = ceilingLight.Delete(ctx, int(req.Id))
	return nil, err
}

func Status(ctx context.Context, req *v1.CeilingLightStatusReq) (res *v1.CeilingLightStatusRes, err error) {
	result, err := ceilingLight.GetStatus(ctx)
	if err != nil {
		return nil, err
	}

	res = &v1.CeilingLightStatusRes{
		Total:   int(result["total"].(int64)),
		Online:  int(result["online"].(int64)),
		Offline: int(result["offline"].(int64)),
	}

	g.Log().Infof(ctx, "Ceiling light status: online=%d offline=%d total=%d",
		res.Online, res.Offline, res.Total)

	return res, nil
}

func getStatusString(status int) string {
	switch status {
	case 1:
		return "online"
	case 0:
		return "offline"
	default:
		return "unknown"
	}
}

func parseFloorId(floorIdStr string) int {
	if floorIdStr == "" {
		return 0
	}
	floorId, err := strconv.Atoi(floorIdStr)
	if err != nil {
		return 0
	}
	return floorId
}

func parseStatus(statusStr string) int {
	switch statusStr {
	case "online", "1":
		return 1
	case "offline", "0":
		return 0
	default:
		return 1
	}
}
