package rssi

import (
	"aiot/internal/logic/rssi"

	"github.com/gogf/gf/v2/frame/g"
	"github.com/gogf/gf/v2/net/ghttp"
)

// HandleRSSI 处理手机上传的RSSI数据
func HandleRSSI(r *ghttp.Request) {
	var req struct {
		RSSI map[string]int `json:"rssI"`
	}

	if err := r.Parse(&req); err != nil {
		g.Log().Warningf(r.Context(), "rssi: invalid request: %v", err)
		r.Response.WriteJsonExit(map[string]interface{}{
			"success": false,
			"message": "请求格式错误",
		})
		return
	}

	result, err := rssi.ProcessRSSI(r.Context(), req.RSSI)
	if err != nil {
		g.Log().Warningf(r.Context(), "rssi process error: %v", err)
		r.Response.WriteJsonExit(map[string]interface{}{
			"success": false,
			"message": "定位失败: " + err.Error(),
		})
		return
	}

	r.Response.WriteJsonExit(map[string]interface{}{
		"success":   result.Success,
		"message":   result.Message,
		"deviceMac": result.DeviceMac,
		"nodeKey":   result.NodeKey,
		"floorId":   result.FloorId,
		"x":         result.X,
		"y":         result.Y,
		"exitNode":  result.ExitNode,
		"exitName":  result.ExitName,
		"direction": result.Direction,
		"pathNodes": result.PathNodes,
	})
}
