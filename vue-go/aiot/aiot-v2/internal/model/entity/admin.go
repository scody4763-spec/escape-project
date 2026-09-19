// =================================================================================
// Code generated and maintained by GoFrame CLI tool. DO NOT EDIT.
// =================================================================================

package entity

// Admin is the golang structure for table admin.
type Admin struct {
	Id          int64  `json:"id"          orm:"id"           description:""`              //
	UserAccount string `json:"userAccount" orm:"user_account" description:""`              //
	Password    string `json:"password"    orm:"password"     description:""`              //
	Name        string `json:"name"        orm:"name"         description:""`              //
	Phone       string `json:"phone"       orm:"phone"        description:""`              //
	Email       string `json:"email"       orm:"email"        description:""`              //
	DeleteState int    `json:"deleteState" orm:"delete_state" description:"0-正常 1-注销"`     // 0-正常 1-注销
	Identity    int    `json:"identity"    orm:"identity"     description:"1-管理员 2-超级管理员"` // 1-管理员 2-超级管理员
	AvatarUrl   string `json:"avatarUrl"   orm:"avatar_url"   description:""`              //
}
