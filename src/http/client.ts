import axios, { type AxiosInstance } from "axios"
import { apiBaseUrl } from '@/environment'
import { toast } from 'vue3-toastify'
const config = {
    baseURL: apiBaseUrl
}
class Client {
    errorHandler: any = {};
    client: AxiosInstance
    constructor() {
        this.client = axios.create(config)
        console.log('API BASE URL:', apiBaseUrl)
        this.client.interceptors.response.use(
            (response: any) => response,
            (error: any) => {
                if (this.errorHandler && this.errorHandler[error.response?.status]) {
                    this.errorHandler[error.response.status](error)
                } else {
                    toast.error(error.response?.data?.message || error.message || 'An error occurred')
                }
                return Promise.reject(error)
            }
        )
    }

    get(url: any, errorHandler = {}) {
        this.errorHandler = errorHandler
        return this.client.get(url)
    }
}
export default new Client()