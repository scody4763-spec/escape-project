import request from './request'
export const listNotifications = (params) => request.get('/notification-logs', { params })
