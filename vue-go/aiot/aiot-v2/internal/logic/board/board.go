package board

import (
	"aiot/internal/dao"
	"aiot/internal/model/do"
	"aiot/internal/model/entity"
	"context"

	"github.com/gogf/gf/v2/frame/g"
)

// List returns all boards.
func List(ctx context.Context) (list []*entity.Board, err error) {
	return dao.Board.ListWithCache(ctx)
}

// GetById returns a board by ID.
func GetById(ctx context.Context, id int) (out *entity.Board, err error) {
	return dao.Board.GetByIdWithCache(ctx, id)
}

// Create creates a new board.
func Create(ctx context.Context, name string, status int) (id int64, err error) {
	result, err := dao.Board.Ctx(ctx).Data(&do.Board{
		Name:   name,
		Status: status,
	}).Insert()
	if err != nil {
		return 0, err
	}
	id, _ = result.LastInsertId()
	dao.Board.InvalidateCache(ctx, 0)
	return id, nil
}

// Update updates a board.
func Update(ctx context.Context, id int, name string, status *int) error {
	data := g.Map{}
	if name != "" {
		data["name"] = name
	}
	if status != nil {
		data["status"] = status
	}
	_, err := dao.Board.Ctx(ctx).WherePri(id).Data(data).Update()
	if err == nil {
		dao.Board.InvalidateCache(ctx, id)
	}
	return err
}

// Delete deletes a board.
func Delete(ctx context.Context, id int) error {
	_, err := dao.Board.Ctx(ctx).WherePri(id).Delete()
	if err == nil {
		dao.Board.InvalidateCache(ctx, id)
	}
	return err
}
