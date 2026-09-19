package dao

import (
	"aiot/internal/model/entity"
	"context"

	"github.com/gogf/gf/v2/frame/g"
)

// GraphNodeDao is the data access object for graph_node table.
type GraphNodeDao struct{}

var GraphNode = GraphNodeDao{}

// ListByFloor returns all nodes for a given floor.
func (d *GraphNodeDao) ListByFloor(ctx context.Context, floorId int) (list []*entity.GraphNode, err error) {
	err = g.Model("graph_node").Ctx(ctx).Where("floor_id", floorId).Where("status", 1).Scan(&list)
	return
}

// ListAll returns all active nodes.
func (d *GraphNodeDao) ListAll(ctx context.Context) (list []*entity.GraphNode, err error) {
	err = g.Model("graph_node").Ctx(ctx).Where("status", 1).Scan(&list)
	return
}

// GetByMajorMinor returns the node matching the given BLE major/minor pair.
func (d *GraphNodeDao) GetByMajorMinor(ctx context.Context, major, minor int) (*entity.GraphNode, error) {
	var list []*entity.GraphNode
	err := g.Model("graph_node").Ctx(ctx).
		Where("major", major).
		Where("minor", minor).
		Where("status", 1).
		Limit(1).
		Scan(&list)
	if err != nil {
		return nil, err
	}
	if len(list) == 0 {
		return nil, nil
	}
	return list[0], nil
}
