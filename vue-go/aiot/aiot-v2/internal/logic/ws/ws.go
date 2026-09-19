package ws

import (
	"aiot/internal/global"
	"context"
	"encoding/json"
	"net/http"

	"github.com/gogf/gf/v2/frame/g"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

type subscribeMsg struct {
	Subscribe []string `json:"subscribe"`
}

// Handle upgrades the HTTP connection to WebSocket and registers subscriptions.
func Handle(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		g.Log().Warningf(ctx, "ws upgrade error: %v", err)
		return
	}

	wsConn := global.NewWsConn(conn)
	var subscribedMacs []string

	defer func() {
		for _, mac := range subscribedMacs {
			if v, ok := global.WsHub.Load(mac); ok && v == wsConn {
				global.WsHub.Delete(mac)
			}
		}
		wsConn.Close()
	}()

	// Read the first message as subscribe list
	_, msg, err := conn.ReadMessage()
	if err != nil {
		return
	}
	var sub subscribeMsg
	if err = json.Unmarshal(msg, &sub); err != nil || len(sub.Subscribe) == 0 {
		return
	}

	subscribedMacs = sub.Subscribe
	for _, mac := range subscribedMacs {
		global.WsHub.Store(mac, wsConn)
	}
	g.Log().Infof(ctx, "ws client subscribed to: %v", subscribedMacs)

	// Keep connection alive; read until error (client disconnect)
	for {
		_, _, err = conn.ReadMessage()
		if err != nil {
			break
		}
	}
}

// Push sends data to the websocket connection subscribed to the given mac.
func Push(mac string, data interface{}) {
	g.Log().Infof(context.Background(), "ws push attempt for mac=%s", mac)
	v, ok := global.WsHub.Load(mac)
	if !ok {
		g.Log().Warningf(context.Background(), "ws push failed: no subscriber for mac=%s", mac)
		return
	}
	if wsConn, ok := v.(*global.WsConn); ok {
		if err := wsConn.WriteJSON(data); err != nil {
			if current, exists := global.WsHub.Load(mac); exists && current == wsConn {
				global.WsHub.Delete(mac)
			}
		}
	}
}
