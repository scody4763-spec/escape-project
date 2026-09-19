import request from './request'
export const listSensors     = ()       => request.get('/sensors')
export const getSensor       = (id)     => request.get(`/sensors/${id}`)
export const createSensor    = (data)   => request.post('/sensors', data)
export const updateSensor    = (id, d)  => request.put(`/sensors/${id}`, d)
export const deleteSensor    = (id)     => request.delete(`/sensors/${id}`)
export const getSensorStatus = ()       => request.get('/sensors/status')
