package dao

import (
	"aiot/internal/model/entity"
	"context"

	"github.com/gogf/gf/v2/frame/g"
)

// SensorNodeBindingDao is the data access object for sensor_node_binding table.
type SensorNodeBindingDao struct{}

var SensorNodeBinding = SensorNodeBindingDao{}

// ListAll returns all sensor-node bindings.
func (d *SensorNodeBindingDao) ListAll(ctx context.Context) (list []*entity.SensorNodeBinding, err error) {
	err = g.Model("sensor_node_binding").Ctx(ctx).Scan(&list)
	return
}
