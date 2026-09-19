package notification

import (
	"aiot/internal/dao"
	"aiot/internal/model/do"
	"aiot/internal/model/entity"
	"context"
)

// List returns notification logs with pagination.
func List(ctx context.Context, page, pageSize int) (list []*entity.NotificationLog, total int, err error) {
	return dao.NotificationLog.List(ctx, page, pageSize)
}

// Create records a notification log entry.
func Create(ctx context.Context, log *entity.NotificationLog) (id int64, err error) {
	result, err := dao.NotificationLog.Ctx(ctx).Data(&do.NotificationLog{
		AlertId:    log.AlertId,
		Location:   log.Location,
		EventDesc:  log.EventDesc,
		FromEmail:  log.FromEmail,
		ToEmail:    log.ToEmail,
		SendStatus: log.SendStatus,
		FailReason: log.FailReason,
		SendTime:   log.SendTime,
	}).Insert()
	if err != nil {
		return 0, err
	}
	id, _ = result.LastInsertId()
	return id, nil
}
