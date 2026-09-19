// ==========================================================================
// Code generated and maintained by GoFrame CLI tool. DO NOT EDIT.
// ==========================================================================

package internal

import (
	"context"

	"github.com/gogf/gf/v2/database/gdb"
	"github.com/gogf/gf/v2/frame/g"
)

// DeviceAlertDao is the data access object for the table device_alert.
type DeviceAlertDao struct {
	table    string             // table is the underlying table name of the DAO.
	group    string             // group is the database configuration group name of the current DAO.
	columns  DeviceAlertColumns // columns contains all the column names of Table for convenient usage.
	handlers []gdb.ModelHandler // handlers for customized model modification.
}

// DeviceAlertColumns defines and stores column names for the table device_alert.
type DeviceAlertColumns struct {
	Id         string //
	DeviceType string // 设备类型：1-sensor 2-signboard
	DeviceId   string // 对应设备的 id
	MacAddress string // 设备 MAC 地址
	AlertType  string // 异常类型：1-离线 2-火焰报警 3-电流异常 4-其他
	AlertDesc  string // 异常描述
	Status     string // 处理状态：0-未处理 1-已处理 2-已忽略
	ResolvedAt string // 处理时间
	CreateTime string // 异常发生时间
	UpdateTime string //
}

// deviceAlertColumns holds the columns for the table device_alert.
var deviceAlertColumns = DeviceAlertColumns{
	Id:         "id",
	DeviceType: "device_type",
	DeviceId:   "device_id",
	MacAddress: "mac_address",
	AlertType:  "alert_type",
	AlertDesc:  "alert_desc",
	Status:     "status",
	ResolvedAt: "resolved_at",
	CreateTime: "create_time",
	UpdateTime: "update_time",
}

// NewDeviceAlertDao creates and returns a new DAO object for table data access.
func NewDeviceAlertDao(handlers ...gdb.ModelHandler) *DeviceAlertDao {
	return &DeviceAlertDao{
		group:    "default",
		table:    "device_alert",
		columns:  deviceAlertColumns,
		handlers: handlers,
	}
}

// DB retrieves and returns the underlying raw database management object of the current DAO.
func (dao *DeviceAlertDao) DB() gdb.DB {
	return g.DB(dao.group)
}

// Table returns the table name of the current DAO.
func (dao *DeviceAlertDao) Table() string {
	return dao.table
}

// Columns returns all column names of the current DAO.
func (dao *DeviceAlertDao) Columns() DeviceAlertColumns {
	return dao.columns
}

// Group returns the database configuration group name of the current DAO.
func (dao *DeviceAlertDao) Group() string {
	return dao.group
}

// Ctx creates and returns a Model for the current DAO. It automatically sets the context for the current operation.
func (dao *DeviceAlertDao) Ctx(ctx context.Context) *gdb.Model {
	model := dao.DB().Model(dao.table)
	for _, handler := range dao.handlers {
		model = handler(model)
	}
	return model.Safe().Ctx(ctx)
}

// Transaction wraps the transaction logic using function f.
// It rolls back the transaction and returns the error if function f returns a non-nil error.
// It commits the transaction and returns nil if function f returns nil.
//
// Note: Do not commit or roll back the transaction in function f,
// as it is automatically handled by this function.
func (dao *DeviceAlertDao) Transaction(ctx context.Context, f func(ctx context.Context, tx gdb.TX) error) (err error) {
	return dao.Ctx(ctx).Transaction(ctx, f)
}
