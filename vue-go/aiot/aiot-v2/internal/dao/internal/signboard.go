// ==========================================================================
// Code generated and maintained by GoFrame CLI tool. DO NOT EDIT.
// ==========================================================================

package internal

import (
	"context"

	"github.com/gogf/gf/v2/database/gdb"
	"github.com/gogf/gf/v2/frame/g"
)

// SignboardDao is the data access object for the table signboard.
type SignboardDao struct {
	table    string             // table is the underlying table name of the DAO.
	group    string             // group is the database configuration group name of the current DAO.
	columns  SignboardColumns   // columns contains all the column names of Table for convenient usage.
	handlers []gdb.ModelHandler // handlers for customized model modification.
}

// SignboardColumns defines and stores column names for the table signboard.
type SignboardColumns struct {
	Id                string //
	MacAddress        string //
	DisplayLeft       string // 0-motifs 1-Left 2-Right 3- Down 4-Up 5-left 6-right 7-down 8-up 9-style
	DisplayMid        string // 0-motifs 1-Left 2-Right 3- Down 4-Up 5-left 6-right 7-down 8-up 9-style
	DisplayRight      string // 0-motifs 1-Left 2-Right 3- Down 4-Up 5-left 6-right 7-down 8-up 9-style
	RgbLeft           string //
	RgbMid            string //
	RgbRight          string //
	Led               string // 亮度 1-1024
	Buzzer            string // 蜂鸣器 1-关 2-开
	Flame             string // 火焰检测？ 1-True触发警报 2-False停止
	ElectricitySwitch string // 电流检测开关 1-ON 2-OFF
	Address           string //
	Remark            string //
	CreateTime        string //
	UpdateTime        string //
}

// signboardColumns holds the columns for the table signboard.
var signboardColumns = SignboardColumns{
	Id:                "id",
	MacAddress:        "mac_address",
	DisplayLeft:       "display_left",
	DisplayMid:        "display_mid",
	DisplayRight:      "display_right",
	RgbLeft:           "rgb_left",
	RgbMid:            "rgb_mid",
	RgbRight:          "rgb_right",
	Led:               "led",
	Buzzer:            "buzzer",
	Flame:             "flame",
	ElectricitySwitch: "electricity_switch",
	Address:           "address",
	Remark:            "remark",
	CreateTime:        "create_time",
	UpdateTime:        "update_time",
}

// NewSignboardDao creates and returns a new DAO object for table data access.
func NewSignboardDao(handlers ...gdb.ModelHandler) *SignboardDao {
	return &SignboardDao{
		group:    "default",
		table:    "signboard",
		columns:  signboardColumns,
		handlers: handlers,
	}
}

// DB retrieves and returns the underlying raw database management object of the current DAO.
func (dao *SignboardDao) DB() gdb.DB {
	return g.DB(dao.group)
}

// Table returns the table name of the current DAO.
func (dao *SignboardDao) Table() string {
	return dao.table
}

// Columns returns all column names of the current DAO.
func (dao *SignboardDao) Columns() SignboardColumns {
	return dao.columns
}

// Group returns the database configuration group name of the current DAO.
func (dao *SignboardDao) Group() string {
	return dao.group
}

// Ctx creates and returns a Model for the current DAO. It automatically sets the context for the current operation.
func (dao *SignboardDao) Ctx(ctx context.Context) *gdb.Model {
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
func (dao *SignboardDao) Transaction(ctx context.Context, f func(ctx context.Context, tx gdb.TX) error) (err error) {
	return dao.Ctx(ctx).Transaction(ctx, f)
}
