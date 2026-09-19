package board

import (
	v1 "aiot/api/board/v1"
	"aiot/internal/errs"
	"aiot/internal/logic/board"
	"context"
)

type ControllerV1 struct{}

func NewV1() *ControllerV1 { return &ControllerV1{} }

func (c *ControllerV1) ListBoard(ctx context.Context, req *v1.ListBoardReq) (res *v1.ListBoardRes, err error) {
	list, err := board.List(ctx)
	if err != nil {
		return nil, errs.Wrap(ctx, err, "获取控制板列表失败")
	}
	return &v1.ListBoardRes{List: list}, nil
}

func (c *ControllerV1) GetBoard(ctx context.Context, req *v1.GetBoardReq) (res *v1.GetBoardRes, err error) {
	info, err := board.GetById(ctx, req.Id)
	if err != nil {
		return nil, errs.Wrap(ctx, err, "获取控制板信息失败")
	}
	return &v1.GetBoardRes{Info: info}, nil
}

func (c *ControllerV1) CreateBoard(ctx context.Context, req *v1.CreateBoardReq) (res *v1.CreateBoardRes, err error) {
	id, err := board.Create(ctx, req.Name, req.Status)
	if err != nil {
		return nil, errs.Wrap(ctx, err, "创建控制板失败")
	}
	return &v1.CreateBoardRes{Id: id}, nil
}

func (c *ControllerV1) UpdateBoard(ctx context.Context, req *v1.UpdateBoardReq) (res *v1.UpdateBoardRes, err error) {
	if err = board.Update(ctx, req.Id, req.Name, req.Status); err != nil {
		return nil, errs.Wrap(ctx, err, "更新控制板失败")
	}
	return &v1.UpdateBoardRes{}, nil
}

func (c *ControllerV1) DeleteBoard(ctx context.Context, req *v1.DeleteBoardReq) (res *v1.DeleteBoardRes, err error) {
	if err = board.Delete(ctx, req.Id); err != nil {
		return nil, errs.Wrap(ctx, err, "删除控制板失败")
	}
	return &v1.DeleteBoardRes{}, nil
}
