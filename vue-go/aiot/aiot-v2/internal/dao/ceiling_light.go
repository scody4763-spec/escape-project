package dao

import (
	"aiot/internal/dao/internal"
	"aiot/internal/model/entity"
	"context"
	"encoding/json"
	"fmt"

	"github.com/gogf/gf/v2/frame/g"
)

type ceilingLightDao struct {
	*internal.CeilingLightDao
}

var (
	CeilingLight = ceilingLightDao{&internal.CeilingLight}
)

const ceilingLightCacheTTL = 300

func ceilingLightRedisKey(id int64) string {
	return fmt.Sprintf("ceiling_light:%d", id)
}

const ceilingLightListRedisKey = "ceiling_light:list"

func (d *ceilingLightDao) ListWithCache(ctx context.Context, deviceId, macAddress, search string, page, size int) ([]*entity.CeilingLight, int64, error) {
	list, total, err := d.CeilingLightDao.List(ctx, deviceId, macAddress, search, page, size)
	return list, total, err
}

func (d *ceilingLightDao) GetByIdWithCache(ctx context.Context, id int64) (*entity.CeilingLight, error) {
	redis := g.Redis()
	key := ceilingLightRedisKey(id)
	v, _ := redis.Do(ctx, "GET", key)
	if v != nil && !v.IsNil() && v.String() != "" {
		out := &entity.CeilingLight{}
		if e := json.Unmarshal(v.Bytes(), out); e == nil {
			return out, nil
		}
	}
	out, err := d.CeilingLightDao.GetById(ctx, id)
	if err != nil || out == nil {
		return nil, err
	}
	b, _ := json.Marshal(out)
	redis.Do(ctx, "SETEX", key, ceilingLightCacheTTL, string(b))
	return out, nil
}

func (d *ceilingLightDao) InvalidateCache(ctx context.Context, id int64) {
	redis := g.Redis()
	if id > 0 {
		redis.Do(ctx, "DEL", ceilingLightRedisKey(id))
	}
	redis.Do(ctx, "DEL", ceilingLightListRedisKey)
}

func (d *ceilingLightDao) GetAllMacs(ctx context.Context) (macs []string, err error) {
	list, err := d.CeilingLightDao.GetAll(ctx)
	if err != nil {
		return nil, err
	}
	for _, cl := range list {
		macs = append(macs, cl.MacAddress)
	}
	return macs, nil
}
