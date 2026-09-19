package do

type CeilingLight struct {
	DeviceId   string `json:"deviceId"    orm:"device_id"`
	MacAddress string `json:"macAddress"  orm:"mac_address"`
	FloorId    int    `json:"floorId"     orm:"floor_id"`
	Zone       string `json:"zone"        orm:"zone"`
	Address    string `json:"address"     orm:"address"`
	Status     int    `json:"status"      orm:"status"`
}