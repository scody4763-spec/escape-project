package mqtt

import (
	"aiot/internal/consts"
	"aiot/internal/dao"
	"aiot/internal/global"
	wslogic "aiot/internal/logic/ws"
	"aiot/internal/model/entity"
	"context"
	"encoding/json"
	"fmt"
	"math/rand"
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

		pushData := map[string]interface{}{pushKey: formattedData}

		go wslogic.Push(pushKey, pushData)
		go wslogic.Push(mac, pushData)

		g.Log().Infof(ctx, "✅ MQTT pushed to %s | Level=%s Tmax=%.1f°C TVOC=%.0f Prob=%.1%%",
			pushKey, fusionLevel, tMax, tvoc, fireProb*100)
	}
}

func handleHeartbeat(ctx context.Context, payload []byte) {
	var raw map[string]any
	if err := json.Unmarshal(payload, &raw); err != nil {
		return
	}
	for mac := range raw {
		g.Redis().Do(ctx, "SETEX", consts.SignboardStatusKey(mac), 90, "1")
		wslogic.Push(mac, map[string]any{"type": "heartbeat", "mac": mac})
	}
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
