package v1

import "github.com/gogf/gf/v2/frame/g"

type ListBoardReq struct {
	g.Meta `path:"/api/boards" method:"get" tags:"Board" summary:"List boards"`
}
type ListBoardRes struct {
	List interface{} `json:"list"`
}

type GetBoardReq struct {
	g.Meta `path:"/api/boards/{id}" method:"get" tags:"Board" summary:"Get board"`
	Id     int `json:"id" in:"path" v:"required"`
}
type GetBoardRes struct {
	Info interface{} `json:"info"`
}

type CreateBoardReq struct {
	g.Meta `path:"/api/boards" method:"post" tags:"Board" summary:"Create board"`
	Name   string `json:"name"   v:"required"`
	Status int    `json:"status" d:"1"`
}
type CreateBoardRes struct {
	Id int64 `json:"id"`
}

type UpdateBoardReq struct {
	g.Meta `path:"/api/boards/{id}" method:"put" tags:"Board" summary:"Update board"`
	Id     int    `json:"id"   in:"path" v:"required"`
	Name   string `json:"name"`
	Status *int   `json:"status"`
}
type UpdateBoardRes struct{}

type DeleteBoardReq struct {
	g.Meta `path:"/api/boards/{id}" method:"delete" tags:"Board" summary:"Delete board"`
	Id     int `json:"id" in:"path" v:"required"`
}
type DeleteBoardRes struct{}
