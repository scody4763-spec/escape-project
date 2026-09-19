import request from './request'
export const getOverview    = (params) => request.get('/reports/overview', { params })
export const getTrend       = (params) => request.get('/reports/trend', { params })
export const getAlarmStats  = (params) => request.get('/reports/alarm-stats', { params })
export const exportReport   = (params) => request.get('/reports/export', { params, responseType: 'blob' })
