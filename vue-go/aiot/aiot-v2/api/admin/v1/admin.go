package v1

import "github.com/gogf/gf/v2/frame/g"

// Login
type LoginReq struct {
	g.Meta      `path:"/api/auth/login" method:"post" tags:"Admin" summary:"Admin login"`
	UserAccount string `json:"userAccount" v:"required"`
	Password    string `json:"password"    v:"required"`
}
type LoginRes struct {
	Token    string `json:"token"`
	AdminId  int64  `json:"adminId"`
	Identity int    `json:"identity"`
}

// List admins
type ListAdminReq struct {
	g.Meta `path:"/api/users" method:"get" tags:"Admin" summary:"List admins"`
	Page   int `json:"page"     in:"query" d:"1"`
	Size   int `json:"pageSize" in:"query" d:"20"`
}
type ListAdminRes struct {
	List  interface{} `json:"list"`
	Total int         `json:"total"`
}

// Get admin
type GetAdminReq struct {
	g.Meta `path:"/api/users/{id}" method:"get" tags:"Admin" summary:"Get admin by id"`
	Id     int64 `json:"id" in:"path" v:"required"`
}
type GetAdminRes struct {
	Info interface{} `json:"info"`
}

// Create admin
type CreateAdminReq struct {
	g.Meta      `path:"/api/users" method:"post" tags:"Admin" summary:"Create admin"`
	UserAccount string `json:"userAccount" v:"required"`
	Password    string `json:"password"    v:"required"`
	Name        string `json:"name"`
	Phone       string `json:"phone"`
	Email       string `json:"email"`
	Identity    int    `json:"identity" d:"1"`
}
type CreateAdminRes struct {
	Id int64 `json:"id"`
}

// Update admin
type UpdateAdminReq struct {
	g.Meta    `path:"/api/users/{id}" method:"put" tags:"Admin" summary:"Update admin"`
	Id        int64  `json:"id"        in:"path" v:"required"`
	Name      string `json:"name"`
	Phone     string `json:"phone"`
	Email     string `json:"email"`
	Password  string `json:"password"`
	AvatarUrl string `json:"avatarUrl"`
	Identity  int    `json:"identity"`
}
type UpdateAdminRes struct{}

// Delete admin
type DeleteAdminReq struct {
	g.Meta `path:"/api/users/{id}" method:"delete" tags:"Admin" summary:"Delete admin"`
	Id     int64 `json:"id" in:"path" v:"required"`
}
type DeleteAdminRes struct{}
