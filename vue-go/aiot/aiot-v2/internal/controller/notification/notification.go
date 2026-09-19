package notification

import (
	v1 "aiot/api/notification/v1"
	"aiot/internal/errs"
	"aiot/internal/logic/notification"
	"context"
)

type ControllerV1 struct{}

func NewV1() *ControllerV1 { return &ControllerV1{} }

func (c *ControllerV1) ListNotification(ctx context.Context, req *v1.ListNotificationReq) (res *v1.ListNotificationRes, err error) {
	list, total, err := notification.List(ctx, req.Page, req.PageSize)
	if err != nil {
		return nil, errs.Wrap(ctx, err, "获取通知列表失败")
	}
	return &v1.ListNotificationRes{List: list, Total: total}, nil
}
