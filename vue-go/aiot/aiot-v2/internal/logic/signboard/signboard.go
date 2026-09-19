package signboard

import (
	v1 "aiot/api/signboard/v1"
	"aiot/internal/dao"
	"aiot/internal/global"
	"aiot/internal/model/do"
	"aiot/internal/model/entity"
	"context"
	"encoding/json"
	"fmt"

	"github.com/gogf/gf/v2/frame/g"
)

// List returns all signboards.
func List(ctx context.Context) (list []*entity.Signboard, err error) {
	return dao.Signboard.ListWithCache(ctx)
}

// GetById returns a signboard by ID.
func GetById(ctx context.Context, id int64) (out *entity.Signboard, err error) {
	return dao.Signboard.GetByIdWithCache(ctx, id)
}

// Create creates a new signboard.
func Create(ctx context.Context, req *entity.Signboard) (id int64, err error) {
	result, err := dao.Signboard.Ctx(ctx).Data(&do.Signboard{
		MacAddress:        req.MacAddress,
		DisplayLeft:       req.DisplayLeft,
		DisplayMid:        req.DisplayMid,
		DisplayRight:      req.DisplayRight,
		RgbLeft:           req.RgbLeft,
		RgbMid:            req.RgbMid,
		RgbRight:          req.RgbRight,
		Led:               req.Led,
		Buzzer:            req.Buzzer,
		Flame:             req.Flame,
		ElectricitySwitch: req.ElectricitySwitch,
		Address:           req.Address,
		Remark:            req.Remark,
	}).Insert()
	if err != nil {
		return 0, err
	}
	id, _ = result.LastInsertId()
	dao.Signboard.InvalidateCache(ctx, 0)
	return id, nil
}

// Update updates a signboard and asynchronously publishes MQTT control message.
func Update(ctx context.Context, req *v1.UpdateSignboardReq) error {
	sb, err := dao.Signboard.GetByIdWithCache(ctx, req.Id)
	if err != nil {
		return err
	}
	if sb == nil {
		return nil
	}

	data := g.Map{}
	if req.MacAddress != nil {
		data["mac_address"] = *req.MacAddress
		sb.MacAddress = *req.MacAddress
	}
	if req.DisplayLeft != nil {
		data["display_left"] = *req.DisplayLeft
		sb.DisplayLeft = *req.DisplayLeft
	}
	if req.DisplayMid != nil {
		data["display_mid"] = *req.DisplayMid
		sb.DisplayMid = *req.DisplayMid
	}
	if req.DisplayRight != nil {
		data["display_right"] = *req.DisplayRight
		sb.DisplayRight = *req.DisplayRight
	}
	if req.RgbLeft != nil {
		data["rgb_left"] = *req.RgbLeft
		sb.RgbLeft = *req.RgbLeft
	}
	if req.RgbMid != nil {
		data["rgb_mid"] = *req.RgbMid
		sb.RgbMid = *req.RgbMid
	}
	if req.RgbRight != nil {
		data["rgb_right"] = *req.RgbRight
		sb.RgbRight = *req.RgbRight
	}
	if req.Led != nil {
		data["led"] = *req.Led
		sb.Led = *req.Led
	}
	if req.Buzzer != nil {
		data["buzzer"] = *req.Buzzer
		sb.Buzzer = *req.Buzzer
	}
	if req.Flame != nil {
		data["flame"] = *req.Flame
		sb.Flame = *req.Flame
	}
	if req.ElectricitySwitch != nil {
		data["electricity_switch"] = *req.ElectricitySwitch
		sb.ElectricitySwitch = *req.ElectricitySwitch
	}
	if req.Address != nil {
		data["address"] = *req.Address
		sb.Address = *req.Address
	}
	if req.Remark != nil {
		data["remark"] = *req.Remark
		sb.Remark = *req.Remark
	}
	if len(data) == 0 {
		return nil
	}

	_, err = dao.Signboard.Ctx(ctx).WherePri(req.Id).Data(data).Update()
	if err != nil {
		return err
	}
	dao.Signboard.InvalidateCache(ctx, req.Id)

	go func(updated *entity.Signboard) {
		publishControl(updated)
	}(sb)
	return nil
}

// GetStatus reads signboard online status from Redis.
func GetStatus(ctx context.Context) (map[string]int, error) {
	macs, err := dao.Signboard.GetAllMacs(ctx)
	if err != nil {
		return nil, err
	}
	result := make(map[string]int, len(macs))
	redis := g.Redis()
	for _, mac := range macs {
		key := fmt.Sprintf("signboard:status:%s", mac)
		v, _ := redis.Do(ctx, "GET", key)
		if v != nil && !v.IsNil() {
			result[mac] = v.Int()
		} else {
			result[mac] = 0
		}
	}
	return result, nil
}

// 指示牌int->具体显示内容的映射
// 1-Left 2-Right 3- Down 4-Up 5-left 6-right 7-down 8-up 9-style 10-motifs
var displayMap = map[int]string{
	1:  "Left",
	2:  "Right",
	3:  "Down",
	4:  "Up",
	5:  "left",
	6:  "right",
	7:  "down",
	8:  "up",
	9:  "style",
	10: "motifs",
}

// publishControl sends a signboard control command via MQTT.
func publishControl(sb *entity.Signboard) {
	if global.MQTTClient == nil || !global.MQTTClient.IsConnected() {
		return
	}
	payload := map[string]interface{}{
		sb.MacAddress: map[string]interface{}{
			"display_left":  displayMap[sb.DisplayLeft],
			"display_mid":   displayMap[sb.DisplayMid],
			"display_right": displayMap[sb.DisplayRight],
			"RGB_left":      sb.RgbLeft,
			"RGB_mid":       sb.RgbMid,
			"RGB_right":     sb.RgbRight,
			"led":           sb.Led,
			"buzzer":        sb.Buzzer,
			"flame": func() string {
				if sb.Flame == 1 {
					return "True"
				}
				return "False"
			}(),
			"electricity_switch": func() string {
				if sb.ElectricitySwitch == 1 {
					return "ON"
				}
				return "OFF"
			}(),
		},
	}
	b, _ := json.Marshal(payload)
	g.Log().Infof(context.Background(), "publish control: %s", string(b))
	global.MQTTClient.Publish("signboard/control", 0, false, b)
}

// Delete deletes a signboard.
func Delete(ctx context.Context, id int64) error {
	_, err := dao.Signboard.Ctx(ctx).WherePri(id).Delete()
	if err == nil {
		dao.Signboard.InvalidateCache(ctx, id)
	}
	return err
}
