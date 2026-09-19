package sensor

import (
	"aiot/internal/dao"
	"aiot/internal/model/do"
	"aiot/internal/model/entity"
	"context"
	"fmt"

	"github.com/gogf/gf/v2/frame/g"
)

// List returns all sensors.
func List(ctx context.Context) (list []*entity.Sensor, err error) {
	return dao.Sensor.ListWithCache(ctx)
}

// GetById returns a sensor by ID.
func GetById(ctx context.Context, id int64) (out *entity.Sensor, err error) {
	return dao.Sensor.GetByIdWithCache(ctx, id)
}

// Create creates a new sensor.
func Create(ctx context.Context, req *entity.Sensor) (id int64, err error) {
	result, err := dao.Sensor.Ctx(ctx).Data(&do.Sensor{
		MacAddress: req.MacAddress,
		Address:    req.Address,
		BoardId:    req.BoardId,
		Img:        req.Img,
		Status:     req.Status,
	}).Insert()
	if err != nil {
		return 0, err
	}
	id, _ = result.LastInsertId()
	dao.Sensor.InvalidateCache(ctx, 0, req.MacAddress)
	return id, nil
}

// Update updates a sensor.
func Update(ctx context.Context, id int64, req *do.Sensor) error {
	oldInfo, _ := dao.Sensor.GetByIdWithCache(ctx, id)
	data := g.Map{}
	if req.MacAddress != nil && req.MacAddress != "" {
		data[dao.Sensor.Columns().MacAddress] = req.MacAddress
	}
	if req.Address != nil && req.Address != "" {
		data[dao.Sensor.Columns().Address] = req.Address
	}
	if req.BoardId != nil && req.BoardId != 0 {
		data[dao.Sensor.Columns().BoardId] = req.BoardId
	}
	if req.Img != nil && req.Img != "" {
		data[dao.Sensor.Columns().Img] = req.Img
	}
	if req.Status != nil {
		data[dao.Sensor.Columns().Status] = req.Status
	}
	_, err := dao.Sensor.Ctx(ctx).WherePri(id).Data(data).Update()
	if err == nil {
		macs := make([]string, 0, 2)
		if oldInfo != nil && oldInfo.MacAddress != "" {
			macs = append(macs, oldInfo.MacAddress)
		}
		if req.MacAddress != nil {
			if newMac, ok := req.MacAddress.(string); ok && newMac != "" {
				macs = append(macs, newMac)
			}
		}
		dao.Sensor.InvalidateCache(ctx, id, macs...)
	}
	return err
}

// Delete deletes a sensor.
func Delete(ctx context.Context, id int64) error {
	oldInfo, _ := dao.Sensor.GetByIdWithCache(ctx, id)
	_, err := dao.Sensor.Ctx(ctx).WherePri(id).Delete()
	if err == nil {
		macs := make([]string, 0, 1)
		if oldInfo != nil && oldInfo.MacAddress != "" {
			macs = append(macs, oldInfo.MacAddress)
		}
		dao.Sensor.InvalidateCache(ctx, id, macs...)
	}
	return err
}

// GetStatus reads sensor online status from Redis.
func GetStatus(ctx context.Context) (map[string]int, error) {
	macs, err := dao.Sensor.GetAllMacs(ctx)
	if err != nil {
		return nil, err
	}
	result := make(map[string]int, len(macs))
	redis := g.Redis()
	for _, mac := range macs {
		key := fmt.Sprintf("sensor:status:%s", mac)
		v, _ := redis.Do(ctx, "GET", key)
		if v != nil && !v.IsNil() {
			result[mac] = v.Int()
		} else {
			result[mac] = 0
		}
	}
	return result, nil
}
