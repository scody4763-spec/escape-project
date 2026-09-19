// ==========================================================================
// Code generated and maintained by GoFrame CLI tool. DO NOT EDIT.
// ==========================================================================

package internal

import (
	"context"

	"github.com/gogf/gf/v2/database/gdb"
	"github.com/gogf/gf/v2/frame/g"
)

// BoardDao is the data access object for the table board.
type BoardDao struct {
	table    string             // table is the underlying table name of the DAO.
	group    string             // group is the database configuration group name of the current DAO.
	columns  BoardColumns       // columns contains all the column names of Table for convenient usage.
	handlers []gdb.ModelHandler // handlers for customized model modification.
}

// BoardColumns defines and stores column names for the table board.
type BoardColumns struct {
	Id         string //
	Name       string //
	Status     string // 0-禁用 1-启用
	CreateTime string //
	UpdateTime string //
}

// boardColumns holds the columns for the table board.
var boardColumns = BoardColumns{
	Id:         "id",
	Name:       "name",
	Status:     "status",
	CreateTime: "create_time",
	UpdateTime: "update_time",
}

// NewBoardDao creates and returns a new DAO object for table data access.
func NewBoardDao(handlers ...gdb.ModelHandler) *BoardDao {
	return &BoardDao{
		group:    "default",
		table:    "board",
		columns:  boardColumns,
		handlers: handlers,
	}
}

// DB retrieves and returns the underlying raw database management object of the current DAO.
func (dao *BoardDao) DB() gdb.DB {
	return g.DB(dao.group)
}

// Table returns the table name of the current DAO.
func (dao *BoardDao) Table() string {
	return dao.table
}

// Columns returns all column names of the current DAO.
func (dao *BoardDao) Columns() BoardColumns {
	return dao.columns
}

// Group returns the database configuration group name of the current DAO.
func (dao *BoardDao) Group() string {
	return dao.group
}

// Ctx creates and returns a Model for the current DAO. It automatically sets the context for the current operation.
func (dao *BoardDao) Ctx(ctx context.Context) *gdb.Model {
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
func (dao *BoardDao) Transaction(ctx context.Context, f func(ctx context.Context, tx gdb.TX) error) (err error) {
	return dao.Ctx(ctx).Transaction(ctx, f)
}
