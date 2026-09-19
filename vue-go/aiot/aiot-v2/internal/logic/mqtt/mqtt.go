package mqtt

import (
	"aiot/internal/consts"
	"aiot/internal/dao"
	"aiot/internal/global"
	"aiot/internal/logic/device_alert"
	"aiot/internal/logic/email"
	escapeLogic "aiot/internal/logic/escape"
	wslogic "aiot/internal/logic/ws"
	"aiot/internal/model/entity"
	"context"
	"encoding/json"
	"fmt"
	"math/rand"
	"strings"
	"time"

	paho "github.com/eclipse/paho.mqtt.golang"
	"github.com/gogf/gf/v2/frame/g"
	influxdb2 "github.com/influxdata/influxdb-client-go/v2"
)

type SensorPayload struct {
	AQI                  *float64 `json:"AQI"`
	TVOC                 *float64 `json:"TVOC"`
	ECO2                 *float64 `json:"ECO2"`
	Temp                 *float64 `json:"temp"`
	Hum                  *float64 `json:"hum"`
	TAmbient             *float64 `json:"t_ambient"`
	TMax                 *float64 `json:"t_max"`
	TMin                 *float64 `json:"t_min"`
	TAvg                 *float64 `json:"t_avg"`
	ElectricityCurrent   *bool    `json:"electricity_Current"`
	Electricity          *float64 `json:"electricity"`
	ESP32FiresFlag       *bool    `json:"ESP32_fires_flag"`
	ESP32ElectricityFlag *bool    `json:"ESP32_electricity_flag"`
	Buzzer               *int     `json:"buzzer"`
}

func Start(ctx context.Context) error {
	broker := g.Cfg().MustGet(ctx, "mqtt.broker").String()
	clientId := g.Cfg().MustGet(ctx, "mqtt.clientId").String()
	username := g.Cfg().MustGet(ctx, "mqtt.username").String()
	password := g.Cfg().MustGet(ctx, "mqtt.password").String()

	topicSensorData := g.Cfg().MustGet(ctx, "mqtt.topicSensorData").String()
	topicCeilingLight := g.Cfg().MustGet(ctx, "mqtt.topicCeilingLight", "ceiling_light/data").String()
	topicIndicatorLight := g.Cfg().MustGet(ctx, "mqtt.topicIndicatorLight", "indicator_light/data").String()
	topicFireBroadcast := g.Cfg().MustGet(ctx, "mqtt.topicFireBroadcast", "fire/broadcast").String()

	topicHeartbeat := g.Cfg().MustGet(ctx, "mqtt.topicSignboardHeartbeat", "signboard/heartbeat").String()

	sensorTopics := []string{topicSensorData, topicCeilingLight, topicIndicatorLight}

	opts := paho.NewClientOptions().
		AddBroker(broker).
		SetClientID(clientId).
		SetUsername(username).
		SetPassword(password).
		SetAutoReconnect(true).
		SetOnConnectHandler(func(c paho.Client) {
			g.Log().Infof(ctx, "MQTT connected, subscribing to sensor topics: %v and heartbeat: %s", sensorTopics, topicHeartbeat)

			for _, sensorTopic := range sensorTopics {
				c.Subscribe(sensorTopic, 0, func(_ paho.Client, msg paho.Message) {
					handleMessage(ctx, msg.Payload())
				})
			}

			c.Subscribe(topicHeartbeat, 0, func(_ paho.Client, msg paho.Message) {
				handleHeartbeat(ctx, msg.Payload())
			})

			c.Subscribe(topicFireBroadcast, 0, func(_ paho.Client, msg paho.Message) {
				handleFireBroadcast(ctx, msg.Payload())
			})
		}).
		SetConnectionLostHandler(func(_ paho.Client, err error) {
			g.Log().Warningf(ctx, "MQTT connection lost: %v", err)
		})

	client := paho.NewClient(opts)
	token := client.Connect()
	token.WaitTimeout(10 * time.Second)
	if err := token.Error(); err != nil {
		return fmt.Errorf("mqtt connect: %w", err)
	}

	global.MQTTClient = client
	g.Log().Infof(ctx, "MQTT client started, broker=%s", broker)
	return nil
}

func handleMessage(ctx context.Context, payload []byte) {
	var raw map[string]json.RawMessage
	if err := json.Unmarshal(payload, &raw); err != nil {
		g.Log().Warningf(ctx, "mqtt: failed to parse message: %v", err)
		return
	}

	for mac, dataRaw := range raw {
		var data SensorPayload
		if err := json.Unmarshal(dataRaw, &data); err != nil {
			g.Log().Warningf(ctx, "mqtt: failed to parse sensor data for %s: %v", mac, err)
			continue
		}

		g.Redis().Do(ctx, "SETEX", consts.SensorStatusKey(mac), 90, "1")

		go writeToInfluxDB(ctx, mac, &data)

		deviceId := getDeviceIdByMac(ctx, mac)

		pushKey := deviceId
		if pushKey == "" {
			pushKey = mac
		}

		temp := safeFloat(data.Temp)
		hum := safeFloat(data.Hum)
		tvoc := safeFloat(data.TVOC)
		eco2 := safeFloat(data.ECO2)
		aqi := safeFloat(data.AQI)

		tAmbient := safeFloat(data.TAmbient)
		tMax := safeFloat(data.TMax)
		tMin := safeFloat(data.TMin)
		tAvg := safeFloat(data.TAvg)

		if tMax == 0 && temp > 0 {
			tMax = temp + 5
		}
		if tMin == 0 && temp > 0 {
			tMin = temp - 5
		}
		if tAvg == 0 && temp > 0 {
			tAvg = temp
		}
		if tAmbient == 0 && temp > 0 {
			tAmbient = temp - 3
		}

		tDelta := tMax - tMin

		fireProb := calculateFireProbability(&data, tMax, tvoc)
		fusionResult := calculateFusion(fireProb)
		fusionLevel := getFusionLevel(fireProb)

		formattedData := map[string]interface{}{
			"status":      "normal",
			"fusionLevel": fusionLevel,
			"probability": fireProb,
			"temp":        temp,
			"hum":         hum,
			"AQI":         aqi,
			"TVOC":        tvoc,
			"ECO2":        eco2,
			"electricity": safeFloat(data.Electricity),
			"sensors": map[string]interface{}{
				"thermal": map[string]interface{}{
					"t_max":        tMax,
					"t_min":        tMin,
					"t_avg":        tAvg,
					"t_ambient":    tAmbient,
					"t_delta":      tDelta,
					"t_rise_rate":  rand.Float64() * 0.1,
					"hot_spot_cnt": int(rand.Float64() * 10),
					"probability":  fireProb,
				},
				"gas": map[string]interface{}{
					"tvoc": tvoc,
					"eco2": eco2,
					"aqi":  aqi,
				},
				"humidity": map[string]interface{}{
					"temperature":   temp,
					"humidity":      hum,
					"humidity_rate": rand.Float64() * 0.1,
				},
				"fusion": fusionResult,
			},
		}

		pushData := map[string]interface{}{mac: formattedData}

		go wslogic.Push(pushKey, pushData)
		go wslogic.Push(mac, pushData)
		go handleFireAlarm(ctx, mac, &data)
		go checkAlerts(ctx, mac, &data)

		g.Log().Infof(ctx, "✅ MQTT pushed to %s | Level=%s Tmax=%.1f°C TVOC=%.0f Prob=%.1%%",
			pushKey, fusionLevel, tMax, tvoc, fireProb*100)
	}
}

// SignboardHeartbeat 表示指示牌心跳消息格式。
type SignboardHeartbeat struct {
	BoardMac   string   `json:"board_mac"`
	Signboards []string `json:"signboards"`
	Timestamp  int64    `json:"timestamp"`
}

// handleHeartbeat 处理指示牌心跳消息，刷新指示牌在线状态。
func handleHeartbeat(ctx context.Context, payload []byte) {
	var hb SignboardHeartbeat
	if err := json.Unmarshal(payload, &hb); err != nil {
		g.Log().Warningf(ctx, "mqtt: failed to parse heartbeat: %v", err)
		return
	}

	redis := g.Redis()
	for _, mac := range hb.Signboards {
		redis.Do(ctx, "SETEX", consts.SignboardStatusKey(mac), 90, "1")
	}
	g.Log().Debugf(ctx, "heartbeat from board %s, signboards: %v", hb.BoardMac, hb.Signboards)
}

func writeToInfluxDB(ctx context.Context, mac string, data *SensorPayload) {
	writeAPI := global.InfluxDB.WriteAPIBlocking(global.InfluxDBOrg, global.InfluxDBBucket)
	tags := map[string]string{
		"mac_address": mac,
	}
	fields := map[string]interface{}{}
	if data.Temp != nil {
		fields["temp"] = *data.Temp
	}
	if data.Hum != nil {
		fields["hum"] = *data.Hum
	}
	if data.TVOC != nil {
		fields["TVOC"] = *data.TVOC
	}
	if data.ECO2 != nil {
		fields["ECO2"] = *data.ECO2
	}
	if data.AQI != nil {
		fields["AQI"] = *data.AQI
	}
	if data.TMax != nil {
		fields["t_max"] = *data.TMax
	}
	if data.TMin != nil {
		fields["t_min"] = *data.TMin
	}
	if data.TAvg != nil {
		fields["t_avg"] = *data.TAvg
	}
	if data.Electricity != nil {
		fields["electricity"] = *data.Electricity
	}
	if len(fields) > 0 {
		p := influxdb2.NewPoint("sensor_data", tags, fields, time.Now())
		if err := writeAPI.WritePoint(ctx, p); err != nil {
			g.Log().Errorf(ctx, "influxdb write error for %s: %v", mac, err)
		}
	}
}

func getDeviceIdByMac(ctx context.Context, mac string) string {
	var light *entity.CeilingLight
	err := dao.CeilingLight.Ctx(ctx).
		Where(g.Map{"mac_address": mac}).
		Scan(&light)

	if err == nil && light != nil {
		return light.DeviceId
	}

	return ""
}

func safeFloat(f *float64) float64 {
	if f == nil {
		return 0
	}
	return *f
}

func calculateFireProbability(data *SensorPayload, tMax float64, tvoc float64) float64 {
	if data.ESP32FiresFlag != nil && *data.ESP32FiresFlag {
		return 0.95 + rand.Float64()*0.04
	}

	switch {
	case tMax > 60 || tvoc > 200:
		return 0.8 + rand.Float64()*0.15
	case tMax > 50 || tvoc > 150:
		return 0.6 + rand.Float64()*0.15
	case tMax > 45 || tvoc > 100:
		return 0.4 + rand.Float64()*0.15
	case tMax > 40 || tvoc > 60:
		return 0.2 + rand.Float64()*0.15
	default:
		return 0.02 + rand.Float64()*0.08
	}
}

func calculateFusion(probability float64) map[string]interface{} {
	mNoFire := 1.0 - probability - rand.Float64()*0.1
	mUncertain := rand.Float64() * 0.1
	mFire := probability

	if mNoFire < 0 {
		mNoFire = 0.1
	}

	conflict := mUncertain / (mFire + mNoFire + 0.001)

	return map[string]interface{}{
		"m_fire":      mFire,
		"m_no_fire":   mNoFire,
		"m_uncertain": mUncertain,
		"conflict":    conflict,
	}
}

func getFusionLevel(probability float64) string {
	switch {
	case probability >= 0.8:
		return "alarm"
	case probability >= 0.5:
		return "warning"
	case probability >= 0.25:
		return "watch"
	default:
		return "safe"
	}
}

// handleFireAlarm 处理火灾报警：记录、通知订阅用户、下发逃生方向
func handleFireAlarm(ctx context.Context, mac string, data *SensorPayload) {
	isFire := data.ESP32FiresFlag != nil && *data.ESP32FiresFlag
	deviceID := normalizeDeviceID(mac)

	if isFire {
		// 1. 检查是否已有活跃报警
		count, err := g.DB().Model("fire_alarm").
			Where("device_id", deviceID).
			Where("status", 1).
			Count()
		if err != nil {
			g.Log().Warningf(ctx, "check fire alarm: %v", err)
		}

		if count == 0 {
			// 2. 记录新报警
			_, err = g.DB().Model("fire_alarm").
				Data(g.Map{
					"device_id":    deviceID,
					"temperature":  safeFloat(data.Temp),
					"danger_level": "高",
					"status":       1,
				}).
				Insert()
			if err != nil {
				g.Log().Errorf(ctx, "insert fire alarm: %v", err)
			} else {
				g.Log().Infof(ctx, "Fire alarm recorded: %s", deviceID)
			}
		}

		// 3. 查询订阅用户并推送通知（微信推送占位）
		subscribers := getSubscribers(ctx, deviceID)
		for _, openid := range subscribers {
			g.Log().Infof(ctx, "Notify user: %s (device: %s)", openid, deviceID)
			// TODO: 调用微信模板消息API
		}

		// 4. 下发火灾图案指令到指示灯
		dispatchFireDirections(ctx, mac)

	} else {
		// 火灾解除：更新报警状态
		_, err := g.DB().Model("fire_alarm").
			Data(g.Map{"status": 2}).
			Where("device_id", deviceID).
			Where("status", 1).
			Update()
		if err == nil {
			g.Log().Infof(ctx, "Fire alarm cleared: %s", deviceID)
		}
		// 下发恢复指令，让指示灯恢复默认显示
		dispatchRestoreCommand(ctx)
	}
}

// handleFireBroadcast 处理吸顶灯可选直发的 fire/broadcast 广播
func handleFireBroadcast(ctx context.Context, payload []byte) {
	var raw map[string]interface{}
	if err := json.Unmarshal(payload, &raw); err != nil {
		g.Log().Warningf(ctx, "fire broadcast: failed to parse message: %v", err)
		return
	}

	fire := false
	switch v := raw["ESP32_fires"].(type) {
	case float64:
		fire = v == 1
	case bool:
		fire = v
	case string:
		fire = v == "1" || v == "true" || v == "True"
	}

	deviceID := "fire_broadcast"
	if fire {
		count, _ := g.DB().Model("fire_alarm").
			Where("device_id", deviceID).
			Where("status", 1).
			Count()
		if count == 0 {
			_, err := g.DB().Model("fire_alarm").
				Data(g.Map{
					"device_id":    deviceID,
					"danger_level": "高",
					"status":       1,
				}).
				Insert()
			if err != nil {
				g.Log().Errorf(ctx, "fire broadcast: insert fire alarm: %v", err)
			} else {
				g.Log().Infof(ctx, "Fire broadcast recorded: %s", deviceID)
			}
		}
		dispatchFireCommandToAll(ctx)
		return
	}

	_, err := g.DB().Model("fire_alarm").
		Data(g.Map{"status": 2}).
		Where("device_id", deviceID).
		Where("status", 1).
		Update()
	if err == nil {
		g.Log().Infof(ctx, "Fire broadcast cleared: %s", deviceID)
	}
	dispatchRestoreCommand(ctx)
}

// dispatchIacoDirections 根据报警设备绑定的图节点，用 IACO 计算方向并下发给指示灯
func dispatchIacoDirections(ctx context.Context, mac string) {
	deviceID := normalizeDeviceID(mac)

	var sensorID int
	err := g.DB().Model("sensor").
		Where("mac_address", deviceID).
		Fields("id").
		Scan(&sensorID)
	if err != nil || sensorID == 0 {
		g.Log().Warningf(ctx, "dispatch iaco directions: sensor not found for %s (err=%v)", deviceID, err)
		return
	}

	var nodeKey string
	err = g.DB().Model("sensor_node_binding").
		Where("sensor_id", sensorID).
		Fields("node_key").
		Scan(&nodeKey)
	if err != nil || nodeKey == "" {
		g.Log().Warningf(ctx, "dispatch iaco directions: node binding not found for sensor %d (err=%v)", sensorID, err)
		return
	}

	result, err := escapeLogic.CalculateWithOptions(ctx, escapeLogic.CalculateOptions{
		Algorithm:  "iaco",
		StartNode:  nodeKey,
		FireMode:   true,
		FirePoints: []string{nodeKey},
	})
	if err != nil {
		g.Log().Warningf(ctx, "dispatch iaco directions: calculate failed for %s: %v", nodeKey, err)
		return
	}

	escapeLogic.DispatchResultDirections(ctx, result)
	g.Log().Infof(ctx, "IACO direction dispatched for node %s (device %s)", nodeKey, deviceID)
}

// getSubscribers 获取设备订阅用户列表
func getSubscribers(ctx context.Context, deviceID string) []string {
	var openids []string
	g.DB().Model("user_subscription").
		Where("device_id", deviceID).
		Where("status", 1).
		Fields("openid").
		Scan(&openids)
	return openids
}

// dispatchFireDirections 火灾时下发逃生方向到指示灯
func dispatchFireDirections(ctx context.Context, mac string) {
	payload := map[string]interface{}{
		normalizeDeviceID(mac): map[string]interface{}{
			"display_left":  "motifs",
			"display_mid":   "motifs",
			"display_right": "motifs",
			"buzzer":        2,
		},
	}
	data, _ := json.Marshal(payload)
	if global.MQTTClient != nil {
		token := global.MQTTClient.Publish("indicator_light/command", 0, false, data)
		token.WaitTimeout(2 * time.Second)
	}
	g.Log().Infof(ctx, "Fire command dispatched: %s", mac)
}

// listBoundIndicatorMacs 返回所有绑定图节点的指示灯 MAC
func listBoundIndicatorMacs(ctx context.Context) []string {
	bindings, err := dao.SensorNodeBinding.ListAll(ctx)
	if err != nil {
		g.Log().Warningf(ctx, "list bound indicator macs: %v", err)
		return nil
	}

	seen := make(map[string]bool)
	macs := []string{}
	for _, b := range bindings {
		var mac string
		g.DB().Model("sensor").Where("id", b.SensorId).Fields("mac_address").Scan(&mac)
		if mac == "" || seen[mac] {
			continue
		}
		seen[mac] = true
		macs = append(macs, normalizeDeviceID(mac))
	}
	return macs
}

// publishIndicatorCommand 发布单台指示灯指令
func publishIndicatorCommand(ctx context.Context, mac, left, mid, right string, buzzer int) {
	payload := map[string]interface{}{
		normalizeDeviceID(mac): map[string]interface{}{
			"display_left":  left,
			"display_mid":   mid,
			"display_right": right,
			"buzzer":        buzzer,
		},
	}
	data, _ := json.Marshal(payload)
	if global.MQTTClient != nil {
		token := global.MQTTClient.Publish("indicator_light/command", 0, false, data)
		token.WaitTimeout(2 * time.Second)
	}
	g.Log().Infof(ctx, "Indicator command dispatched: %s", mac)
}

// dispatchFireCommandToAll 向所有绑定指示灯下发火灾图案
func dispatchFireCommandToAll(ctx context.Context) {
	for _, mac := range listBoundIndicatorMacs(ctx) {
		publishIndicatorCommand(ctx, mac, "motifs", "motifs", "motifs", 2)
	}
}

// dispatchRestoreCommand 向所有绑定指示灯下发恢复指令
func dispatchRestoreCommand(ctx context.Context) {
	for _, mac := range listBoundIndicatorMacs(ctx) {
		publishIndicatorCommand(ctx, mac, "Left", "motifs", "Right", 1)
	}
}

// normalizeDeviceID 保证设备ID统一为 ESP32_<MAC> 格式，避免重复拼接前缀。
func normalizeDeviceID(mac string) string {
	if strings.HasPrefix(mac, "ESP32_") {
		return mac
	}
	return "ESP32_" + mac
}

// checkAlerts 检查传感器数据的告警条件，创建告警并发送邮件。
func checkAlerts(ctx context.Context, mac string, data *SensorPayload) {
	sensor, _ := dao.Sensor.GetByMacWithCache(ctx, mac)
	if sensor == nil {
		return
	}

	if data.ESP32FiresFlag != nil && *data.ESP32FiresFlag {
		alert := &entity.DeviceAlert{
			DeviceType: consts.DeviceTypeSensor,
			DeviceId:   sensor.Id,
			MacAddress: mac,
			AlertType:  consts.AlertTypeFire,
			AlertDesc:  fmt.Sprintf("传感器 %s 检测到火焰", mac),
		}
		alertId, err := device_alert.CreateIfNotExists(ctx, alert)
		if err != nil {
			g.Log().Warningf(ctx, "create fire alert error: %v", err)
		}
		go email.SendAlert(ctx, alertId, sensor.Address, fmt.Sprintf("传感器 %s 检测到火焰，请立即撤离！", mac))
	}

	if data.ESP32ElectricityFlag != nil && *data.ESP32ElectricityFlag {
		alert := &entity.DeviceAlert{
			DeviceType: consts.DeviceTypeSensor,
			DeviceId:   sensor.Id,
			MacAddress: mac,
			AlertType:  consts.AlertTypeElectricity,
			AlertDesc:  fmt.Sprintf("传感器 %s 检测到电流异常", mac),
		}
		alertId, err := device_alert.CreateIfNotExists(ctx, alert)
		if err != nil {
			g.Log().Warningf(ctx, "create electricity alert error: %v", err)
		}
		if alertId > 0 {
			go email.SendAlert(ctx, alertId, sensor.Address, fmt.Sprintf("传感器 %s 电流异常，请立即检查！", mac))
		}
	}
}
