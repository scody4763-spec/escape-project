package report

import (
	"aiot/internal/global"
	"context"
	"encoding/csv"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/gogf/gf/v2/frame/g"
	"github.com/influxdata/influxdb-client-go/v2/api/query"
)

// OverviewData 保存聚合后的传感器概览统计数据。
type OverviewData struct {
	MacAddress string  `json:"macAddress"`
	AvgTemp    float64 `json:"avgTemp"`
	AvgHum     float64 `json:"avgHum"`
	AvgAQI     float64 `json:"avgAqi"`
	MaxTemp    float64 `json:"maxTemp"`
	MinTemp    float64 `json:"minTemp"`
}

// TrendPoint 是趋势图的单个数据点。
type TrendPoint struct {
	Time  string  `json:"time"`
	Value float64 `json:"value"`
}

// Overview 从 InfluxDB v2 查询聚合统计数据。
func Overview(ctx context.Context, mac string, hours int) ([]OverviewData, error) {
	if global.InfluxDB == nil {
		return nil, fmt.Errorf("influxdb not initialized")
	}

	macFilter := ""
	if mac != "" {
		macFilter = fmt.Sprintf(`|> filter(fn: (r) => r["mac_address"] == "%s")`, mac)
	}

	fluxQuery := fmt.Sprintf(`
from(bucket: "%s")
  |> range(start: -%dh)
  |> filter(fn: (r) => r._measurement == "sensor_data")
  |> filter(fn: (r) => r._field == "temp" or r._field == "hum" or r._field == "AQI")
  %s
  |> pivot(rowKey: ["_time", "mac_address"], columnKey: ["_field"], valueColumn: "_value")
  |> sort(columns: ["_time"], desc: false)
`, global.InfluxDBBucket, hours, macFilter)

	queryAPI := global.InfluxDB.QueryAPI(global.InfluxDBOrg)
	result, err := queryAPI.Query(ctx, fluxQuery)
	if err != nil {
		return nil, err
	}
	defer result.Close()

	type overviewAccumulator struct {
		data      OverviewData
		tempCount int
		humCount  int
		aqiCount  int
		initTemp  bool
	}

	dataMap := map[string]*overviewAccumulator{}
	for result.Next() {
		record := result.Record()
		macAddr := fmt.Sprintf("%v", record.ValueByKey("mac_address"))
		if macAddr == "" || macAddr == "<nil>" {
			continue
		}
		item, ok := dataMap[macAddr]
		if !ok {
			item = &overviewAccumulator{data: OverviewData{MacAddress: macAddr}}
			dataMap[macAddr] = item
		}
		if v := recordValue(record, "temp"); v != nil {
			temp := toFloat64(v)
			item.data.AvgTemp += temp
			item.tempCount++
			if !item.initTemp {
				item.data.MaxTemp = temp
				item.data.MinTemp = temp
				item.initTemp = true
			} else {
				if temp > item.data.MaxTemp {
					item.data.MaxTemp = temp
				}
				if temp < item.data.MinTemp {
					item.data.MinTemp = temp
				}
			}
		}
		if v := recordValue(record, "hum"); v != nil {
			item.data.AvgHum += toFloat64(v)
			item.humCount++
		}
		if v := recordValue(record, "AQI"); v != nil {
			item.data.AvgAQI += toFloat64(v)
			item.aqiCount++
		}
	}
	if err := result.Err(); err != nil {
		return nil, err
	}

	results := make([]OverviewData, 0, len(dataMap))
	for _, item := range dataMap {
		if item.tempCount > 0 {
			item.data.AvgTemp /= float64(item.tempCount)
		}
		if item.humCount > 0 {
			item.data.AvgHum /= float64(item.humCount)
		}
		if item.aqiCount > 0 {
			item.data.AvgAQI /= float64(item.aqiCount)
		}
		results = append(results, item.data)
	}
	return results, nil
}

// Trend 从 InfluxDB v2 查询指定字段的时序数据（5分钟聚合）。
func Trend(ctx context.Context, mac, field string, hours int) ([]TrendPoint, error) {
	if global.InfluxDB == nil {
		return nil, fmt.Errorf("influxdb not initialized")
	}

	macFilter := ""
	if mac != "" {
		macFilter = fmt.Sprintf(`|> filter(fn: (r) => r["mac_address"] == "%s")`, mac)
	}

	// 对字段名做基本校验，防止注入
	if strings.ContainsAny(field, `"'`) {
		return nil, fmt.Errorf("invalid field name")
	}

	fluxQuery := fmt.Sprintf(`
from(bucket: "%s")
  |> range(start: -%dh)
  |> filter(fn: (r) => r._measurement == "sensor_data" and r._field == "%s")
  %s
  |> aggregateWindow(every: 30s, fn: mean, createEmpty: false)
  |> yield(name: "mean")
`,
		global.InfluxDBBucket, hours, field, macFilter,
	)

	queryAPI := global.InfluxDB.QueryAPI(global.InfluxDBOrg)
	result, err := queryAPI.Query(ctx, fluxQuery)
	if err != nil {
		return nil, err
	}
	defer result.Close()

	var results []TrendPoint
	for result.Next() {
		record := result.Record()
		p := TrendPoint{
			Time:  record.Time().Format(time.RFC3339),
			Value: toFloat64(record.Value()),
		}
		results = append(results, p)
	}
	if err := result.Err(); err != nil {
		return nil, err
	}
	return results, nil
}

// AlarmStats 从 MySQL 按天统计告警数量。
func AlarmStats(ctx context.Context, days int) (interface{}, error) {
	g.Log().Infof(ctx, "alarm stats for last %d days", days)
	type DayStat struct {
		Day   string `json:"day"`
		Count int    `json:"count"`
	}
	var stats []DayStat
	rows, err := g.DB().GetAll(ctx, fmt.Sprintf(`
		SELECT DATE(create_time) AS day, COUNT(*) AS count
		FROM device_alert
		WHERE create_time >= NOW() - INTERVAL %d DAY
		GROUP BY day
		ORDER BY day
	`, days))
	if err != nil {
		return nil, err
	}
	for _, row := range rows {
		stats = append(stats, DayStat{
			Day:   row["day"].String(),
			Count: row["count"].Int(),
		})
	}
	return stats, nil
}

// Export 将传感器数据导出为 CSV 并写入 http.ResponseWriter。
func Export(ctx context.Context, w http.ResponseWriter, mac string, hours int) error {
	if global.InfluxDB == nil {
		return fmt.Errorf("influxdb not initialized")
	}

	macFilter := ""
	if mac != "" {
		macFilter = fmt.Sprintf(`|> filter(fn: (r) => r["mac_address"] == "%s")`, mac)
	}

	// 查询所有需要导出的字段
	fields := []string{"temp", "hum", "AQI", "TVOC", "ECO2", "electricity"}
	fluxQuery := fmt.Sprintf(`
from(bucket: "%s")
  |> range(start: -%dh)
  |> filter(fn: (r) => r._measurement == "sensor_data")
  |> filter(fn: (r) => r._field == "temp" or r._field == "hum" or r._field == "AQI" or r._field == "TVOC" or r._field == "ECO2" or r._field == "electricity")
  %s
  |> pivot(rowKey: ["_time", "mac_address"], columnKey: ["_field"], valueColumn: "_value")
  |> sort(columns: ["_time"], desc: true)
  |> limit(n: 10000)
`,
		global.InfluxDBBucket, hours, macFilter,
	)

	queryAPI := global.InfluxDB.QueryAPI(global.InfluxDBOrg)
	result, err := queryAPI.Query(ctx, fluxQuery)
	if err != nil {
		return err
	}
	defer result.Close()

	w.Header().Set("Content-Type", "text/csv; charset=utf-8")
	w.Header().Set("Content-Disposition", "attachment; filename=sensor_data.csv")

	// 写入 BOM，兼容 Excel UTF-8
	w.Write([]byte("\xEF\xBB\xBF"))

	writer := csv.NewWriter(w)
	writer.Write([]string{"Time", "MAC", "Temp", "Hum", "AQI", "TVOC", "ECO2", "Electricity"})

	for result.Next() {
		record := result.Record()
		row := []string{
			record.Time().Format(time.RFC3339),
			fmt.Sprintf("%v", record.ValueByKey("mac_address")),
		}
		for _, f := range fields {
			row = append(row, fmt.Sprintf("%.2f", toFloat64(record.ValueByKey(f))))
		}
		writer.Write(row)
	}
	if err := result.Err(); err != nil {
		return err
	}

	writer.Flush()
	return writer.Error()
}

// toFloat64 将任意数值类型转换为 float64。
func toFloat64(v interface{}) float64 {
	if v == nil {
		return 0
	}
	switch val := v.(type) {
	case float64:
		return val
	case float32:
		return float64(val)
	case int64:
		return float64(val)
	case int:
		return float64(val)
	default:
		return 0
	}
}

// recordValue 从 query.FluxRecord 中安全获取字段值（辅助函数）。
func recordValue(record *query.FluxRecord, key string) interface{} {
	return record.ValueByKey(key)
}
