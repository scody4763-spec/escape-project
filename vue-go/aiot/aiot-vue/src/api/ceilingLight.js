import request from './request'
export const listCeilingLights     = ()       => request.get('/ceiling_lights')
export const getCeilingLight       = (id)     => request.get(`/ceiling_lights/${id}`)
export const createCeilingLight    = (data)   => request.post('/ceiling_lights', data)
export const updateCeilingLight    = (id, d)  => request.put(`/ceiling_lights/${id}`, d)
export const deleteCeilingLight    = (id)     => request.delete(`/ceiling_lights/${id}`)
export const getCeilingLightStatus = ()       => request.get('/ceiling_lights/status')
