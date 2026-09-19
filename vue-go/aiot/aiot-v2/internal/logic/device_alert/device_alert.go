package device_alert

import (
	"aiot/internal/dao"
	"aiot/internal/model/do"
	"aiot/internal/model/entity"
	"context"

	"github.com/gogf/gf/v2/os/gtime"
)

// List returns device alerts with optional filters.
// status: -1 = all, 0 = pending, 1 = resolved, 2 = ignored
func List(ctx context.Context, status int, alertType int) (list []*entity.DeviceAlert, err error) {
	return dao.DeviceAlert.ListWithFilter(ctx, status, alertType)
}

// UpdateStatus updates a device alert's status.
func UpdateStatus(ctx context.Context, id int64, status int) error {
	data := do.DeviceAlert{Status: status}
	if status == 1 {
		data.ResolvedAt = gtime.Now()
	}
	_, err := dao.DeviceAlert.Ctx(ctx).WherePri(id).Data(data).Update()
	return err
}

// Create creates a new device alert.
func Create(ctx context.Context, alert *entity.DeviceAlert) (id int64, err error) {
	result, err := dao.DeviceAlert.Ctx(ctx).Data(&do.DeviceAlert{
		DeviceType: alert.DeviceType,
		DeviceId:   alert.DeviceId,
		MacAddress: alert.MacAddress,
		AlertType:  alert.AlertType,
		AlertDesc:  alert.AlertDesc,
		Status:     0,
	}).Insert()
	if err != nil {
		return 0, err
	}
	id, _ = result.LastInsertId()
	return id, nil
}

// CreateIfNotExists creates an alert only if no active alert of the same type exists.
func CreateIfNotExists(ctx context.Context, alert *entity.DeviceAlert) (id int64, err error) {
	exists, err := dao.DeviceAlert.HasActiveAlert(ctx, alert.MacAddress, alert.AlertType)
	if err != nil {
		return 0, err
	}
	if exists {
		return 0, nil
	}
	return Create(ctx, alert)
}
