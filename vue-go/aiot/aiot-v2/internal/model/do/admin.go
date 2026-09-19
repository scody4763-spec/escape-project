// =================================================================================
// Code generated and maintained by GoFrame CLI tool. DO NOT EDIT.
// =================================================================================

package do

import (
	"github.com/gogf/gf/v2/frame/g"
)

// Admin is the golang structure of table admin for DAO operations like Where/Data.
type Admin struct {
	g.Meta      `orm:"table:admin, do:true"`
	Id          any //
	UserAccount any //
	Password    any //
	Name        any //
	Phone       any //
	Email       any //
	DeleteState any // 0-正常 1-注销
	Identity    any // 1-管理员 2-超级管理员
	AvatarUrl   any //
}
