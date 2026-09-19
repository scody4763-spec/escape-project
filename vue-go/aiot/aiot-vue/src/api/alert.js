import request from './request'
export const listAlerts  = (params)    => request.get('/device-alerts', { params })
export const updateAlert = (id, data)  => request.put(`/device-alerts/${id}`, data)
