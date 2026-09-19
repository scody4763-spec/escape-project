package ceilingLight

import (
	"context"
	"fmt"

	"aiot/internal/dao"
	"aiot/internal/model/do"
	"aiot/internal/model/entity"

	"github.com/gogf/gf/v2/frame/g"
)

func List(ctx context.Context, deviceId, macAddress, search string, page, size int) ([]map[string]interface{}, int64, error) {
	list, total, err := dao.CeilingLight.ListWithCache(ctx, deviceId, macAddress, search, page, size)
	if err != nil {
		return nil, 0, err
	}

	result := make([]map[string]interface{}, len(list))
	for i, item := range list {
		onlineStatus := getOnlineStatus(ctx, item.MacAddress)
		result[i] = map[string]interface{}{
			"id":           item.Id,
			"deviceId":     item.DeviceId,
			"macAddress":   item.MacAddress,
			"floorId":      item.FloorId,
			"zone":         item.Zone,
			"address":      item.Address,
			"status":       item.Status,
			"onlineStatus": onlineStatus,
			"createTime":   item.CreateTime,
			"updateTime":   item.UpdateTime,
		}
	}

	return result, total, nil
}

func Create(ctx context.Context, deviceId, macAddress string, floorId int, zone, address string, status int) (uint, error) {
	id, err := dao.CeilingLight.Create(ctx, &do.CeilingLight{
		DeviceId:   deviceId,
		MacAddress: macAddress,
		FloorId:    floorId,
		Zone:       zone,
		Address:    address,
		Status:     status,
	})
	if err != nil {
		return 0, err
	}
	dao.CeilingLight.InvalidateCache(ctx, id)
	return uint(id), nil
}

func GetById(ctx context.Context, id int) (*entity.CeilingLight, error) {
	var light entity.CeilingLight
	err := dao.CeilingLight.Ctx(ctx).Where("id", id).Scan(&light)
	if err != nil {
		return nil, err
	}
	return &light, nil
}

func Update(ctx context.Context, id int, deviceId, macAddress string, floorId int, zone, address string, status int) error {
	data := g.Map{}
	if deviceId != "" {
		data["device_id"] = deviceId
	}
	if macAddress != "" {
		data["mac_address"] = macAddress
	}
	if floorId > 0 {
		data["floor_id"] = floorId
	}
	if zone != "" {
		data["zone"] = zone
	}
	if address != "" {
		data["address"] = address
	}
	if status >= 0 {
		data["status"] = status
	}

	err := dao.CeilingLight.Update(ctx, int64(id), data)
	if err != nil {
		return err
	}
	dao.CeilingLight.InvalidateCache(ctx, int64(id))
	return nil
}

func Delete(ctx context.Context, id int) error {
	err := dao.CeilingLight.Delete(ctx, int64(id))
	if err != nil {
		return err
	}
	dao.CeilingLight.InvalidateCache(ctx, int64(id))
	return nil
}

func GetStatus(ctx context.Context) (map[string]interface{}, error) {
	list, err := dao.CeilingLight.GetAllMacs(ctx)
	if err != nil {
		return nil, err
	}

	var onlineCount int64 = 0
	var offlineCount int64 = 0
	totalCount := int64(len(list))

	redis := g.Redis()
	for _, mac := range list {
		key := fmt.Sprintf("ceiling_light:status:%s", mac)
		v, _ := redis.Do(ctx, "GET", key)
		if v != nil && !v.IsNil() && v.Int() == 1 {
			onlineCount++
		} else {
			offlineCount++
		}
	}

	return map[string]interface{}{
		"total":   totalCount,
		"online":  onlineCount,
		"offline": offlineCount,
	}, nil
}

func getOnlineStatus(ctx context.Context, macAddress string) int {
	redis := g.Redis()
	key := fmt.Sprintf("ceiling_light:status:%s", macAddress)
	v, _ := redis.Do(ctx, "GET", key)
	if v != nil && !v.IsNil() && v.Int() == 1 {
		return 1
	}
	return 0
}
