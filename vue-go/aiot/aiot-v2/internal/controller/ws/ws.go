package ws

import (
	wslogic "aiot/internal/logic/ws"

	"github.com/gogf/gf/v2/net/ghttp"
)

// HandleWs handles WebSocket upgrade and subscription.
func HandleWs(r *ghttp.Request) {
	wslogic.Handle(r.Response.Writer, r.Request)
}
