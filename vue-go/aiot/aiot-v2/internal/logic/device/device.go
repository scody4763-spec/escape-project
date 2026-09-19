package device

import (
	"aiot/internal/dao"
	"aiot/internal/model/entity"
	"context"
	"fmt"

	"github.com/gogf/gf/v2/database/gdb"
)

// List returns all devices (sensors and signboards).
func List(ctx context.Context, boardId int, macAddress string) ([]interface{}, error) {
	var devices []interface{}

	// Get sensors
	sensors, err := getSensorList(ctx, macAddress)
	if err != nil {
		return nil, err
	}
	devices = append(devices, sensors...)

	// Get signboards
	signboards, err := getSignboardList(ctx, boardId, macAddress)
	if err != nil {
		return nil, err
	}
	devices = append(devices, signboards...)

	return devices, nil
}

// getSensorList returns sensor list based on filters.
func getSensorList(ctx context.Context, macAddress string) ([]interface{}, error) {
	var sensors []*entity.Sensor
	var result []interface{}

	if macAddress != "" {
		// Get specific sensor by MAC
		var sensor *entity.Sensor
		_, err := dao.Sensor.Ctx(ctx).Where("mac_address = ?", macAddress).One(&sensor)
		if err != nil {
			return nil, err
		}
		if sensor != nil {
			result = append(result, sensor)
		}
	} else {
		// Get all sensors
		err := dao.Sensor.Ctx(ctx).Scan(&sensors)
		if err != nil {
			return nil, err
		}
		for _, s := range sensors {
			result = append(result, s)
		}
	}

	return result, nil
}

// getSignboardList returns signboard list based on filters.
func getSignboardList(ctx context.Context, boardId int, macAddress string) ([]interface{}, error) {
	var signboards []*entity.Signboard
	var result []interface{}

	query := dao.Signboard.Ctx(ctx)

	// Filter by boardId if specified
	if boardId > 0 {
		query = query.Where("board_id", boardId)
	}

	// Filter by macAddress if specified
	if macAddress != "" {
		query = query.Where("mac_address", macAddress)
	}

	err := query.Scan(&signboards)
	if err != nil {
		return nil, err
	}

	for _, s := range signboards {
		result = append(result, s)
	}

	return result, nil
}

// GetDetails returns device details (sensor or signboard) based on MAC address.
func GetDetails(ctx context.Context, macAddress string) (interface{}, error) {
	// Try to get as sensor first
	var sensor *entity.Sensor
	_, err := dao.Sensor.Ctx(ctx).Where("mac_address = ?", macAddress).One(&sensor)
	if err == nil && sensor != nil {
		return sensor, nil
	}

	// If not found, try as signboard
	var signboard *entity.Signboard
	_, err = dao.Signboard.Ctx(ctx).Where("mac_address = ?", macAddress).One(&signboard)
	if err != nil {
		return nil, fmt.Errorf("device not found: %s", macAddress)
	}
	if signboard == nil {
		return nil, fmt.Errorf("device not found: %s", macAddress)
	}

	return signboard, nil
}

// GetTemperatureData returns temperature data from database.
func GetTemperatureData(ctx context.Context, macAddress, beginTime, endTime string) (map[string]interface{}, error) {
	var results []*gdb.Record

	query := dao.Sensor.Ctx(ctx).
		Fields("temperature, create_time").
		Where("mac_address = ?", macAddress)

	if beginTime != "" {
		query = query.WhereGTE("create_time", beginTime)
	}
	if endTime != "" {
		query = query.WhereLTE("create_time", endTime)
	}

	err := query.OrderAsc("create_time").Scan(&results)
	if err != nil {
		return nil, err
	}

	data := map[string]interface{}{
		"temperature": []float64{},
		"createTime":  []string{},
	}

	for _, r := range results {
		record := r.Map()
		if val, ok := record["temperature"].(float64); ok {
			data["temperature"] = append(data["temperature"].([]float64), val)
		}
		if val, ok := record["create_time"].(string); ok {
			data["createTime"] = append(data["createTime"].([]string), val)
		}
	}

	return data, nil
}

// GetHumidityData returns humidity data from database.
func GetHumidityData(ctx context.Context, macAddress, beginTime, endTime string) (map[string]interface{}, error) {
	var results []*gdb.Record

	query := dao.Sensor.Ctx(ctx).
		Fields("humidity, create_time").
		Where("mac_address = ?", macAddress)

	if beginTime != "" {
		query = query.WhereGTE("create_time", beginTime)
	}
	if endTime != "" {
		query = query.WhereLTE("create_time", endTime)
	}

	err := query.OrderAsc("create_time").Scan(&results)
	if err != nil {
		return nil, err
	}

	data := map[string]interface{}{
		"humidity":    []float64{},
		"createTime":  []string{},
	}

	for _, r := range results {
		record := r.Map()
		if val, ok := record["humidity"].(float64); ok {
			data["humidity"] = append(data["humidity"].([]float64), val)
		}
		if val, ok := record["create_time"].(string); ok {
			data["createTime"] = append(data["createTime"].([]string), val)
		}
	}

	return data, nil
}

// GetTVOCData returns TVOC data from database.
func GetTVOCData(ctx context.Context, macAddress, beginTime, endTime string) (map[string]interface{}, error) {
	var results []*gdb.Record

	query := dao.Sensor.Ctx(ctx).
		Fields("tvoc, create_time").
		Where("mac_address = ?", macAddress)

	if beginTime != "" {
		query = query.WhereGTE("create_time", beginTime)
	}
	if endTime != "" {
		query = query.WhereLTE("create_time", endTime)
	}

	err := query.OrderAsc("create_time").Scan(&results)
	if err != nil {
		return nil, err
	}

	data := map[string]interface{}{
		"tvoc":        []float64{},
		"createTime":  []string{},
	}

	for _, r := range results {
		record := r.Map()
		if val, ok := record["tvoc"].(float64); ok {
			data["tvoc"] = append(data["tvoc"].([]float64), val)
		}
		if val, ok := record["create_time"].(string); ok {
			data["createTime"] = append(data["createTime"].([]string), val)
		}
	}

	return data, nil
}

// GetEco2Data returns ECO2 data from database.
func GetEco2Data(ctx context.Context, macAddress, beginTime, endTime string) (map[string]interface{}, error) {
	var results []*gdb.Record

	query := dao.Sensor.Ctx(ctx).
		Fields("eco2, create_time").
		Where("mac_address = ?", macAddress)

	if beginTime != "" {
		query = query.WhereGTE("create_time", beginTime)
	}
	if endTime != "" {
		query = query.WhereLTE("create_time", endTime)
	}

	err := query.OrderAsc("create_time").Scan(&results)
	if err != nil {
		return nil, err
	}

	data := map[string]interface{}{
		"eco2":        []float64{},
		"createTime":  []string{},
	}

	for _, r := range results {
		record := r.Map()
		if val, ok := record["eco2"].(float64); ok {
			data["eco2"] = append(data["eco2"].([]float64), val)
		}
		if val, ok := record["create_time"].(string); ok {
			data["createTime"] = append(data["createTime"].([]string), val)
		}
	}

	return data, nil
}
