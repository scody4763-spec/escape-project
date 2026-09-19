package global

import (
	"sync"

	influxdb2 "github.com/influxdata/influxdb-client-go/v2"
	mqtt "github.com/eclipse/paho.mqtt.golang"
	"github.com/gorilla/websocket"
)

var (
	// InfluxDB 是全局 InfluxDB v2 客户端。
	InfluxDB influxdb2.Client

	// InfluxDBOrg 是 InfluxDB 组织名。
	InfluxDBOrg string

	// InfluxDBBucket 是 InfluxDB bucket 名。
	InfluxDBBucket string

	// MQTTClient is the global MQTT client.
	MQTTClient mqtt.Client

	// WsHub 存储活跃的 WebSocket 连接，key 为 mac_address。
	// value type: *WsConn
	WsHub sync.Map
)

// WsConn 封装 websocket 连接，带写锁。
type WsConn struct {
	Conn *websocket.Conn
	mu   sync.Mutex
}

// WriteJSON 线程安全地向 websocket 写入 JSON。
func (w *WsConn) WriteJSON(v interface{}) error {
	w.mu.Lock()
	defer w.mu.Unlock()
	return w.Conn.WriteJSON(v)
}

// Close 关闭 websocket 连接。
func (w *WsConn) Close() {
	w.mu.Lock()
	defer w.mu.Unlock()
	w.Conn.Close()
}

// NewWsConn 创建一个新的 WsConn。
func NewWsConn(conn *websocket.Conn) *WsConn {
	return &WsConn{Conn: conn}
}
