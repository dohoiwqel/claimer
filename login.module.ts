import axios from 'axios'
import { BigNumber} from 'ethers'
import HttpsProxyAgent from 'https-proxy-agent'
import { Web3Account } from 'web3-eth-accounts'
import { AxiosInstance } from 'axios'

export class Login {

    private instance: AxiosInstance

    constructor(
        proxyAgent: HttpsProxyAgent.HttpsProxyAgent,
    ) {
        
        this.instance = axios.create(
            {
                headers: {
                    'authority': 'api.cyberconnect.dev',
                    'accept': '*/*',
                    'accept-language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
                    'authorization': '',
                    'content-type': 'application/json',
                    // 'origin': 'https://next.wallet.cyber.co',
                    // 'referer': 'https://next.wallet.cyber.co/',
                    'sec-ch-ua': '"Not/A)Brand";v="99", "Google Chrome";v="115", "Chromium";v="115"',
                    'sec-ch-ua-mobile': '?0',
                    'sec-ch-ua-platform': '"Windows"',
                    'sec-fetch-dest': 'empty',
                    'sec-fetch-mode': 'cors',
                    'sec-fetch-site': 'cross-site',
                    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
                },
                proxy: false,
                httpsAgent: proxyAgent,
            }
        )
    }

    private async getNonce(walletAddress: string): Promise<string> {
        const response = await this.instance.post(
            'https://api.cyberconnect.dev/wallet/',
            {
              'query': '\n    mutation nonce($address: EVMAddress!) {\n  nonce(input: {address: $address}) {\n    status\n    message\n    data\n  }\n}\n    ',
              'variables': {
                'address': walletAddress
              },
              'operationName': 'nonce'
            }
        )

        return response.data.data.nonce.data
    }

    async login(account: Web3Account): Promise<any> { 
        const nonce = await this.getNonce(account.address)
        const walletAddress = account.address
        const issuedAt = new Date().toISOString()
        const expirationTime = new Date(BigNumber.from(Date.now().toString()).add(BigNumber.from(7.776 * 10**8)).toNumber()).toISOString()
        const msg = `wallet.cyber.co wants you to sign in with your Ethereum account:\n${walletAddress}\n\n\nURI: https://wallet.cyber.co\nVersion: 1\nChain ID: 56\nNonce: ${nonce}\nIssued At: ${issuedAt}\nExpiration Time: ${expirationTime}\nNot Before: ${issuedAt}`
        
        const signature = account.sign(msg).signature
        const response = await this.instance.post(
            'https://api.cyberconnect.dev/wallet/',
            {
              'query': '\n    mutation login($request: LoginInput!) {\n  login(input: $request) {\n    status\n    message\n    data {\n      accessToken\n      address\n      cyberAccount\n    }\n  }\n}\n    ',
              'variables': {
                'request': {
                  'address': walletAddress,
                  'signature': signature,
                  'signedMessage': msg
                }
              },
              'operationName': 'login'
            },
        )

        if(response.data.data.login.status === 'SUCCESS'){
            return response.data.data.login.data.accessToken
        }
        else
            throw(response.data)
    }
}
