package report

import (
	v1 "aiot/api/report/v1"
	"aiot/internal/errs"
	"aiot/internal/logic/report"
	"context"

	"github.com/gogf/gf/v2/net/ghttp"
)

type ControllerV1 struct{}

func NewV1() *ControllerV1 { return &ControllerV1{} }

func (c *ControllerV1) ReportOverview(ctx context.Context, req *v1.ReportOverviewReq) (res *v1.ReportOverviewRes, err error) {
	data, err := report.Overview(ctx, req.MacAddress, req.Hours)
	if err != nil {
		return nil, errs.Wrap(ctx, err, "获取报表概览失败")
	}
	return &v1.ReportOverviewRes{Data: data}, nil
}

func (c *ControllerV1) ReportTrend(ctx context.Context, req *v1.ReportTrendReq) (res *v1.ReportTrendRes, err error) {
	data, err := report.Trend(ctx, req.MacAddress, req.Field, req.Hours)
	if err != nil {
		return nil, errs.Wrap(ctx, err, "获取趋势数据失败")
	}
	return &v1.ReportTrendRes{Data: data}, nil
}

func (c *ControllerV1) ReportAlarmStats(ctx context.Context, req *v1.ReportAlarmStatsReq) (res *v1.ReportAlarmStatsRes, err error) {
	data, err := report.AlarmStats(ctx, req.Days)
	if err != nil {
		return nil, errs.Wrap(ctx, err, "获取告警统计失败")
	}
	return &v1.ReportAlarmStatsRes{Data: data}, nil
}

func (c *ControllerV1) ReportExport(ctx context.Context, req *v1.ReportExportReq) (res *v1.ReportExportRes, err error) {
	r := ghttp.RequestFromCtx(ctx)
	if err = report.Export(ctx, r.Response.Writer, req.MacAddress, req.Hours); err != nil {
		return nil, errs.Wrap(ctx, err, "导出报表失败")
	}
	return &v1.ReportExportRes{}, nil
}
