import request from './request'
export const listAdmins   = (params) => request.get('/users', { params })
export const getAdmin     = (id)     => request.get(`/users/${id}`)
export const createAdmin  = (data)   => request.post('/users', data)
export const updateAdmin  = (id, d)  => request.put(`/users/${id}`, d)
export const deleteAdmin  = (id)     => request.delete(`/users/${id}`)
