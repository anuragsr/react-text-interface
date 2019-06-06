import axios from 'axios'
import { l } from '../helpers/common'

const apiHost = 'https://api-admin-staging.oyster.ai'
let call

export default class HttpService {
  
  get(url, params, auth) {
    let config = {
      method: "get",
      url: apiHost + url,
      params,
      auth
    }
    
    // if (params && params.newBaseUrl) {
    //   config.url = url      
    //   delete config.params.newBaseUrl
    // }

    return this.doRequest(config)
  }
  
  post(url, data, auth) {
    let config = {
      method: "post",
      url: apiHost + url,
      data,
      auth
    }

    if (data.newBaseUrl) {
      config.url = url
      config.data = data.file
      delete config.data.newBaseUrl
    }
    
    return this.doRequest(config)
  }

  put(url, data, auth) {
    let config = {
      method: "put",
      url: apiHost + url,
      data,
      auth
    }
    return this.doRequest(config)
  }
  
  doRequest = config => {
    // l(config)
    if (config.params && config.params.series){
      delete config.params.series
      if(call){
        call.cancel('One request at a time, fellas!')
      }
      call = axios.CancelToken.source()
      config.cancelToken = call.token
    }
    return axios(config)
  }
}