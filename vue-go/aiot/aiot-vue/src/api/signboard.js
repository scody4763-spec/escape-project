import request from './request'
export const listSignboards      = ()       => request.get('/signboards')
export const getSignboard        = (id)     => request.get(`/signboards/${id}`)
export const createSignboard     = (data)   => request.post('/signboards', data)
export const updateSignboard     = (id, d)  => request.put(`/signboards/${id}`, d)
export const deleteSignboard     = (id)     => request.delete(`/signboards/${id}`)
export const getSignboardStatus  = ()       => request.get('/signboards/status')
