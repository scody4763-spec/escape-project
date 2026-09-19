package dao

import (
	"aiot/internal/model/entity"
	"context"

	"github.com/gogf/gf/v2/frame/g"
)

// GraphEdgeDao is the data access object for graph_edge table.
type GraphEdgeDao struct{}

var GraphEdge = GraphEdgeDao{}

// ListAll returns all active edges.
func (d *GraphEdgeDao) ListAll(ctx context.Context) (list []*entity.GraphEdge, err error) {
	err = g.Model("graph_edge").Ctx(ctx).Where("status", 1).Scan(&list)
	return
}

// ListByNodes returns edges where from_node_key or to_node_key is in the given node keys.
func (d *GraphEdgeDao) ListByNodes(ctx context.Context, nodeKeys []string) (list []*entity.GraphEdge, err error) {
	err = g.Model("graph_edge").Ctx(ctx).
		Where("status", 1).
		Where("from_node_key IN(?) OR to_node_key IN(?)", nodeKeys, nodeKeys).
		Scan(&list)
	return
}
