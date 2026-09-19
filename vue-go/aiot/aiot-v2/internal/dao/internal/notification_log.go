// ==========================================================================
// Code generated and maintained by GoFrame CLI tool. DO NOT EDIT.
// ==========================================================================

package internal

import (
	"context"

	"github.com/gogf/gf/v2/database/gdb"
	"github.com/gogf/gf/v2/frame/g"
)

// NotificationLogDao is the data access object for the table notification_log.
type NotificationLogDao struct {
	table    string                 // table is the underlying table name of the DAO.
	group    string                 // group is the database configuration group name of the current DAO.
	columns  NotificationLogColumns // columns contains all the column names of Table for convenient usage.
	handlers []gdb.ModelHandler     // handlers for customized model modification.
}

// NotificationLogColumns defines and stores column names for the table notification_log.
type NotificationLogColumns struct {
	Id         string //
	AlertId    string // 关联的 device_alert.id
	Location   string // 火灾发生地点
	EventDesc  string // 事件描述，如：检测到火焰，温度异常
	FromEmail  string // 发件方邮箱
	ToEmail    string // 收件方邮箱
	SendStatus string // 发送状态：1-发送成功 2-发送失败
	FailReason string // 失败原因
	SendTime   string // 实际发送时间
	CreateTime string //
	UpdateTime string //
}

// notificationLogColumns holds the columns for the table notification_log.
var notificationLogColumns = NotificationLogColumns{
	Id:         "id",
	AlertId:    "alert_id",
	Location:   "location",
	EventDesc:  "event_desc",
	FromEmail:  "from_email",
	ToEmail:    "to_email",
	SendStatus: "send_status",
	FailReason: "fail_reason",
	SendTime:   "send_time",
	CreateTime: "create_time",
	UpdateTime: "update_time",
}

// NewNotificationLogDao creates and returns a new DAO object for table data access.
func NewNotificationLogDao(handlers ...gdb.ModelHandler) *NotificationLogDao {
	return &NotificationLogDao{
		group:    "default",
		table:    "notification_log",
		columns:  notificationLogColumns,
		handlers: handlers,
	}
}

// DB retrieves and returns the underlying raw database management object of the current DAO.
func (dao *NotificationLogDao) DB() gdb.DB {
	return g.DB(dao.group)
}

// Table returns the table name of the current DAO.
func (dao *NotificationLogDao) Table() string {
	return dao.table
}

// Columns returns all column names of the current DAO.
func (dao *NotificationLogDao) Columns() NotificationLogColumns {
	return dao.columns
}

// Group returns the database configuration group name of the current DAO.
func (dao *NotificationLogDao) Group() string {
	return dao.group
}

// Ctx creates and returns a Model for the current DAO. It automatically sets the context for the current operation.
func (dao *NotificationLogDao) Ctx(ctx context.Context) *gdb.Model {
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
func (dao *NotificationLogDao) Transaction(ctx context.Context, f func(ctx context.Context, tx gdb.TX) error) (err error) {
	return dao.Ctx(ctx).Transaction(ctx, f)
}
