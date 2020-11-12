const axios = require('axios')

axios.defaults.xsrfCookieName = 'csrftoken'
axios.defaults.xsrfHeaderName = 'X-CSRFToken'
axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';

let errorLogKey = 'EXP_LOG'
const TOKEN_NAME = '_____________e2p_'
const DEFAULT_SERVER_URL = 'https://e2payments.explicador.co.mz'

function handlePostRequest (params) {	
    try {

        const axiosRequestSession = (params.method === 'put')
        ? axios.put(params.API_ENDPOINT, params.payload, params.header) 
        : axios.post(params.API_ENDPOINT, params.payload, params.header)
         
         return axiosRequestSession.then(response => {
                return response
            }).catch(error => {
                return error
            })

    } catch(e) {
        console.error (errorLogKey + ': ' + e.message)
        return e;
    }

}

// Chamado de forma externa.
async function handleMpesaC2bPayment (params) {

    params.SERVER_URL = params.SERVER_URL ? params.SERVER_URL : DEFAULT_SERVER_URL

    //  $validEndPoint = 'https://e2payments.explicador.co.mz/v1/c2b/mpesa-payment/2';
    params.API_ENDPOINT = `${ params.SERVER_URL }/v1/c2b/mpesa-payment/${ params.walletId }`

    if (isTokenAvailableOnBrowser()) {
        return makePayment (params)
    }
    return autenticateAndGetBearerToken (params)
        .then(successResponse => {
            if (successResponse) {
                return makePayment (params)
            }
        })
        .catch(error => {
            return error
        })

}

function makePayment (params) {
    let payload = {...params}

    delete payload.CLIENT_SECRET
    delete payload.CLIENT_ID

    payload.client_id = params.CLIENT_ID

    return handlePostRequest({
        API_ENDPOINT: params.API_ENDPOINT,
        payload: payload,
        header: composeHeader()
    })
    .then(response => {
        return response
    })
    .catch(error => {
        console.error(errorLogKey + ' - ', error)
        return error
    })

}

// Chamado de forma externa.
function isTokenAvailableOnBrowser() {
    let token = getToken(TOKEN_NAME)
    return !!token
}

// Chamado de forma externa.
function getMyWallets (params) {

    let payload = {...params}
    delete payload.CLIENT_SECRET

    payload.client_id = params.CLIENT_ID
    params.SERVER_URL = params.SERVER_URL ? params.SERVER_URL : DEFAULT_SERVER_URL

    return handlePostRequest({
        API_ENDPOINT: `${ params.SERVER_URL }/v1/wallets/mpesa/get/all`,
        payload: payload,
        header: composeHeader()
    })
    .then(response => {
        return response
    })
    .catch(error => {
        console.error(errorLogKey + ' - ', error)
        return error
    })
}

// Chamado de forma externa.
function getMyWalletDetails (params) {

    let payload = {...params}
    let walletId = params.walletId
    payload.client_id = params.CLIENT_ID
    params.SERVER_URL = params.SERVER_URL ? params.SERVER_URL : DEFAULT_SERVER_URL

    delete payload.CLIENT_SECRET

    return handlePostRequest({
        API_ENDPOINT: `${ params.SERVER_URL }/v1/wallets/mpesa/get/${ walletId }`,
        payload: payload,
        header: composeHeader()
    })
    .then(response => {
        return response
    })
    .catch(error => {
        console.error(errorLogKey + ' - ', error)
        return error
    })
}

// Chamado de forma externa.
function getPaymentHistory (params) {

    let payload = {...params}
    delete payload.CLIENT_SECRET
    payload.client_id = params.CLIENT_ID
    params.SERVER_URL = params.SERVER_URL ? params.SERVER_URL : DEFAULT_SERVER_URL

    return handlePostRequest({
        API_ENDPOINT: `${ params.SERVER_URL }/v1/payments/mpesa/get/all`,
        payload: payload,
        header: composeHeader()
    })
    .then(response => {
        return response
    })
    .catch(error => {
        console.error(errorLogKey + ' - ', error)
        return error
    })

}

// Chamado de forma externa.
function getPaymentHistoryPaginated (params) {

    let payload = {...params}
    let perPageQtd = params.perPageQtd
    payload.client_id = params.CLIENT_ID

    params.SERVER_URL = params.SERVER_URL ? params.SERVER_URL : DEFAULT_SERVER_URL

    delete payload.CLIENT_SECRET

    return handlePostRequest({
        API_ENDPOINT: `${ params.SERVER_URL }/v1/payments/mpesa/get/all/paginate/${ perPageQtd }`,
        payload: payload,
        header: composeHeader()
    })
    .then(response => {
        return response
    })
    .catch(error => {
        console.error(errorLogKey + ' - ', error)
        return error
    })

}

// Chamado de forma externa.
function autenticateAndGetBearerToken (params) {

    params.SERVER_URL = params.SERVER_URL ? params.SERVER_URL : DEFAULT_SERVER_URL

    return handlePostRequest({
        API_ENDPOINT: params.SERVER_URL + '/oauth/token',
        payload: {
            grant_type:     'client_credentials',
            client_id:      params.CLIENT_ID,
            client_secret:  params.CLIENT_SECRET,
        },
        header: {}
    })
    .then(async r => {
        let token = await storeTokenInBrowser (r.data)
        return token
    })
    .catch(error => {
        console.error(errorLogKey + ' - ', error)
        return false
    })

}

function addSomeDaysToToken(totalDays) {

    Date.prototype.addDays = function(days) {
        var date = new Date(this.valueOf());
        date.setDate(date.getDate() + days);
        return date;
    }

    var date = new Date();

    return date.addDays(totalDays)
}

// Armazena o token no browser
function storeTokenInBrowser (responseData) {

    if (!responseData) return null//interrompe a execução

    let token = responseData.token_type + ' ' + responseData.access_token
    let expiration_date = addSomeDaysToToken(90)

    storeToken({
        name: TOKEN_NAME,
        token: token,
        date: expiration_date,
    })

    return token

}

function storeToken({ name, token, date }) {

    var expires = "; expires=" + date.toUTCString();

    document.cookie = name + "=" + (token || "")  + expires + "; path=/";

}

function composeHeader () {
    return {
        headers: {
            'Authorization': getToken(TOKEN_NAME),
            'Content-Type' : 'application/json',
            'Accept': 'application/json'
        }
    };
}

// Recupera o token usado para autenticação
function getToken(name) {
    var nameEQ = name + "=";
    var ca = document.cookie.split(';');
    for(var i=0;i < ca.length;i++) {
        var c = ca[i];
        while (c.charAt(0)==' ') c = c.substring(1,c.length);
        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
    }
    return null;
}

function deleteToken() {
    document.cookie = TOKEN_NAME +'=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
}

module.exports.isTokenAvailableOnBrowser    = isTokenAvailableOnBrowser;
module.exports.deleteToken                  = deleteToken;
module.exports.autenticateAndGetBearerToken = autenticateAndGetBearerToken;
module.exports.handleMpesaC2bPayment        = handleMpesaC2bPayment;
module.exports.getMyWallets                 = getMyWallets;
module.exports.getMyWalletDetails           = getMyWalletDetails;
module.exports.getPaymentHistory            = getPaymentHistory;
module.exports.getPaymentHistoryPaginated   = getPaymentHistoryPaginated;

