import request from './request'
export const listBoards   = ()       => request.get('/boards')
export const getBoard     = (id)     => request.get(`/boards/${id}`)
export const createBoard  = (data)   => request.post('/boards', data)
export const updateBoard  = (id, d)  => request.put(`/boards/${id}`, d)
export const deleteBoard  = (id)     => request.delete(`/boards/${id}`)
