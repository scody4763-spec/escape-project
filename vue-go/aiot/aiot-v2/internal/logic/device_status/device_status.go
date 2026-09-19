package device_status

import (
	"aiot/internal/dao"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/gogf/gf/v2/frame/g"
)

type emqxClient struct {
	ClientID string `json:"clientid"`
}

type emqxResponse struct {
	Data []emqxClient `json:"data"`
}

// StartPoller starts the device-status polling loop (every 30 seconds).
func StartPoller(ctx context.Context) {
	go func() {
		ticker := time.NewTicker(30 * time.Second)
		defer ticker.Stop()
		// Run immediately on start
		poll(ctx)
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				poll(ctx)
			}
		}
	}()
}

func poll(ctx context.Context) {
	apiUrl := g.Cfg().MustGet(ctx, "emqx.apiUrl").String()
	username := g.Cfg().MustGet(ctx, "emqx.username").String()
	password := g.Cfg().MustGet(ctx, "emqx.password").String()

	onlineMacs, err := fetchOnlineClients(apiUrl, username, password)
	if err != nil {
		g.Log().Warningf(ctx, "emqx poll error: %v", err)
		return
	}

	// Get all sensor MACs from MySQL
	allMacs, err := dao.Sensor.GetAllMacs(ctx)
	if err != nil {
		g.Log().Warningf(ctx, "get sensor macs error: %v", err)
		return
	}

	// Build online set
	onlineSet := make(map[string]bool, len(onlineMacs))
	for _, mac := range onlineMacs {
		onlineSet[mac] = true
	}

	// Write to Redis
	redis := g.Redis()
	for _, mac := range allMacs {
		key := fmt.Sprintf("sensor:status:%s", mac)
		status := "0"
		if onlineSet[mac] {
			status = "1"
		}
		redis.Do(ctx, "SETEX", key, 60, status)
	}
}

func fetchOnlineClients(apiUrl, username, password string) ([]string, error) {
	req, err := http.NewRequest("GET", apiUrl+"/api/v5/clients?limit=1000", nil)
	if err != nil {
		return nil, err
	}
	req.SetBasicAuth(username, password)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var result emqxResponse
	if err = json.Unmarshal(body, &result); err != nil {
		return nil, err
	}

	macs := make([]string, 0, len(result.Data))
	for _, c := range result.Data {
		macs = append(macs, c.ClientID)
	}
	return macs, nil
}
