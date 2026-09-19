package consts

import "fmt"

// Redis key patterns
const (
	RedisKeyBoardFmt        = "board:%d"
	RedisKeyBoardList       = "board:list"
	RedisKeySensorFmt       = "sensor:%d"
	RedisKeySensorList      = "sensor:list"
	RedisKeySignboardFmt    = "signboard:%d"
	RedisKeySignboardList   = "signboard:list"
	RedisKeyAdminFmt        = "admin:%d"
	RedisKeySensorStatusFmt    = "sensor:status:%s"
	RedisKeySignboardStatusFmt = "signboard:status:%s"

	RedisTTL = 300 // seconds
)

// Alert types
const (
	AlertTypeOffline     = 1 // 离线
	AlertTypeFire        = 2 // 火焰报警
	AlertTypeElectricity = 3 // 电流异常
	AlertTypeOther       = 4 // 其他
)

// Device types
const (
	DeviceTypeSensor    = 1
	DeviceTypeSignboard = 2
)

// Device alert status
const (
	AlertStatusPending  = 0 // 未处理
	AlertStatusResolved = 1 // 已处理
	AlertStatusIgnored  = 2 // 已忽略
)

// Helper functions
func BoardKey(id int) string       { return fmt.Sprintf(RedisKeyBoardFmt, id) }
func SensorKey(id int64) string    { return fmt.Sprintf(RedisKeySensorFmt, id) }
func SignboardKey(id int64) string { return fmt.Sprintf(RedisKeySignboardFmt, id) }
func AdminKey(id int64) string     { return fmt.Sprintf(RedisKeyAdminFmt, id) }
func SensorStatusKey(mac string) string {
	return fmt.Sprintf(RedisKeySensorStatusFmt, mac)
}
func SignboardStatusKey(mac string) string {
	return fmt.Sprintf(RedisKeySignboardStatusFmt, mac)
}
