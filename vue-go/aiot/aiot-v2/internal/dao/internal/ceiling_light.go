package internal

import (
	"context"
	"fmt"
	"aiot/internal/model/entity"

	"github.com/gogf/gf/v2/frame/g"
	"github.com/gogf/gf/v2/database/gdb"
)

type CeilingLightDao struct {
	Table   string
	Columns struct {
		Id         string
		DeviceId   string
		MacAddress string
		FloorId    string
		Zone       string
		Address    string
		Status     string
		CreateTime string
		UpdateTime string
	}
}

var CeilingLight = CeilingLightDao{
	Table: "ceiling_lights",
}

func init() {
	CeilingLight.Columns.Id         = "id"
	CeilingLight.Columns.DeviceId   = "device_id"
	CeilingLight.Columns.MacAddress = "mac_address"
	CeilingLight.Columns.FloorId    = "floor_id"
	CeilingLight.Columns.Zone       = "zone"
	CeilingLight.Columns.Address    = "address"
	CeilingLight.Columns.Status     = "status"
	CeilingLight.Columns.CreateTime = "create_time"
	CeilingLight.Columns.UpdateTime = "update_time"
}

func (d *CeilingLightDao) Ctx(ctx context.Context) *gdb.Model {
	return g.DB().Model(d.Table).Ctx(ctx)
}

func (d *CeilingLightDao) List(ctx context.Context, deviceId, macAddress, search string, page, size int) ([]*entity.CeilingLight, int64, error) {
	m := d.Ctx(ctx)
	
	if deviceId != "" {
		m = m.WhereLike(d.Columns.DeviceId, "%"+deviceId+"%")
	}
	if macAddress != "" {
		m = m.WhereLike(d.Columns.MacAddress, "%"+macAddress+"%")
	}
	if search != "" {
		m = m.Where(fmt.Sprintf("(%s LIKE ? OR %s LIKE ? OR %s LIKE ?)", 
			d.Columns.DeviceId, d.Columns.MacAddress, d.Columns.Address),
			"%"+search+"%", "%"+search+"%", "%"+search+"%")
	}
	
	total, err := m.Count()
	if err != nil {
		return nil, 0, err
	}
	
	var list []*entity.CeilingLight
	if page > 0 && size > 0 {
		err = m.Page(page, size).OrderDesc(d.Columns.Id).Scan(&list)
	} else {
		err = m.OrderDesc(d.Columns.Id).Scan(&list)
	}
	
	return list, int64(total), err
}

func (d *CeilingLightDao) GetById(ctx context.Context, id int64) (*entity.CeilingLight, error) {
	var entity *entity.CeilingLight
	err := d.Ctx(ctx).WherePri(id).Scan(&entity)
	return entity, err
}

func (d *CeilingLightDao) Create(ctx context.Context, data interface{}) (int64, error) {
	result, err := d.Ctx(ctx).Data(data).Insert()
	if err != nil {
		return 0, err
	}
	return result.LastInsertId()
}

func (d *CeilingLightDao) Update(ctx context.Context, id int64, data interface{}) error {
	_, err := d.Ctx(ctx).WherePri(id).Data(data).Update()
	return err
}

func (d *CeilingLightDao) Delete(ctx context.Context, id int64) error {
	_, err := d.Ctx(ctx).WherePri(id).Delete()
	return err
}

func (d *CeilingLightDao) GetAll(ctx context.Context) ([]*entity.CeilingLight, error) {
	var list []*entity.CeilingLight
	err := d.Ctx(ctx).Scan(&list)
	return list, err
}