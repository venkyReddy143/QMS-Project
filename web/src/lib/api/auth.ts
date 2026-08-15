import type { LoginRequest, LoginResponse, MeResponse } from '../../types/auth'
import { post, get } from './http'

export function loginApi(payload: LoginRequest) {
  return post<LoginResponse, LoginRequest>('/auth/login', payload)
}

export function fetchCurrentUserApi() {
  return get<MeResponse>('/auth/me')
}
