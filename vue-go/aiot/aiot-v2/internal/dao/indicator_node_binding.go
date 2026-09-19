package dao

import (
	"aiot/internal/model/entity"
	"context"
	"encoding/json"
	"fmt"

	"github.com/gogf/gf/v2/frame/g"
)

// indicatorNodeBindingDao is the data access object for the table indicator_node_binding.
type indicatorNodeBindingDao struct{}

var (
	IndicatorNodeBinding = indicatorNodeBindingDao{}
)

const indicatorNodeBindingCacheTTL = 300

func indicatorNodeBindingKey(id int64) string       { return fmt.Sprintf("indicator_binding:%d", id) }
func indicatorNodeBindingMacKey(mac string) string   { return fmt.Sprintf("indicator_binding:mac:%s", mac) }
const indicatorNodeBindingListKey = "indicator_binding:list"

// GetByMacWithCache reads binding by MAC from Redis first, falls back to MySQL.
func (d *indicatorNodeBindingDao) GetByMacWithCache(ctx context.Context, mac string) (out *entity.IndicatorNodeBinding, err error) {
	if mac == "" {
		return nil, nil
	}
	redis := g.Redis()
	key := indicatorNodeBindingMacKey(mac)
	v, _ := redis.Do(ctx, "GET", key)
	if v != nil && !v.IsNil() && v.String() != "" {
		id := v.Int64()
		return d.GetByIdWithCache(ctx, id)
	}
	var list []*entity.IndicatorNodeBinding
	err = g.DB().Model("indicator_node_binding").Where("mac_address", mac).Where("status", 1).Limit(1).Scan(&list)
	if err != nil || len(list) == 0 {
		return nil, err
	}
	out = list[0]
	b, _ := json.Marshal(out)
	redis.Do(ctx, "SETEX", key, indicatorNodeBindingCacheTTL, string(b))
	return out, nil
}

// GetByIdWithCache reads from Redis first, falls back to MySQL.
func (d *indicatorNodeBindingDao) GetByIdWithCache(ctx context.Context, id int64) (out *entity.IndicatorNodeBinding, err error) {
	redis := g.Redis()
	key := indicatorNodeBindingKey(id)
	v, _ := redis.Do(ctx, "GET", key)
	if v != nil && !v.IsNil() && v.String() != "" {
		out = &entity.IndicatorNodeBinding{}
		if e := json.Unmarshal(v.Bytes(), out); e == nil {
			return out, nil
		}
	}
	var list []*entity.IndicatorNodeBinding
	err = g.DB().Model("indicator_node_binding").WherePri(id).Scan(&list)
	if err != nil || len(list) == 0 {
		return nil, err
	}
	out = list[0]
	b, _ := json.Marshal(out)
	redis.Do(ctx, "SETEX", key, indicatorNodeBindingCacheTTL, string(b))
	return out, nil
}

// ListWithCache reads all active bindings.
func (d *indicatorNodeBindingDao) ListWithCache(ctx context.Context) (list []*entity.IndicatorNodeBinding, err error) {
	redis := g.Redis()
	v, _ := redis.Do(ctx, "GET", indicatorNodeBindingListKey)
	if v != nil && !v.IsNil() && v.String() != "" {
		if e := json.Unmarshal(v.Bytes(), &list); e == nil {
			return list, nil
		}
	}
	err = g.DB().Model("indicator_node_binding").Where("status", 1).Scan(&list)
	if err != nil {
		return nil, err
	}
	b, _ := json.Marshal(list)
	redis.Do(ctx, "SETEX", indicatorNodeBindingListKey, indicatorNodeBindingCacheTTL, string(b))
	return list, nil
}

// GetByNodeKey returns all bindings for a specific node.
func (d *indicatorNodeBindingDao) GetByNodeKey(ctx context.Context, nodeKey string) (list []*entity.IndicatorNodeBinding, err error) {
	err = g.DB().Model("indicator_node_binding").Where("node_key", nodeKey).Where("status", 1).Scan(&list)
	return
}

// InvalidateCache deletes cache for a binding.
func (d *indicatorNodeBindingDao) InvalidateCache(ctx context.Context, id int64, macs ...string) {
	redis := g.Redis()
	if id > 0 {
		redis.Do(ctx, "DEL", indicatorNodeBindingKey(id))
	}
	redis.Do(ctx, "DEL", indicatorNodeBindingListKey)
	for _, mac := range macs {
		if mac != "" {
			redis.Do(ctx, "DEL", indicatorNodeBindingMacKey(mac))
		}
	}
}
