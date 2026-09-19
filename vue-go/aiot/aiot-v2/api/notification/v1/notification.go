package v1

import "github.com/gogf/gf/v2/frame/g"

type ListNotificationReq struct {
	g.Meta   `path:"/api/notification-logs" method:"get" tags:"Notification" summary:"List notification logs"`
	Page     int `json:"page"     in:"query" d:"1"`
	PageSize int `json:"pageSize" in:"query" d:"20"`
}
type ListNotificationRes struct {
	List  interface{} `json:"list"`
	Total int         `json:"total"`
}
