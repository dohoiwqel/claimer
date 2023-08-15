import axios from 'axios'
import { AxiosInstance } from 'axios'
import HttpsProxyAgent from 'https-proxy-agent'
import { web3 } from './web3'
import { ethers } from 'ethers'

const claimerAddress = "0x0B1bbaC2A57F530C0454232082Ab061AF9cA724F"
const tokenAddress = "0xf191131dab798dd6c500816338d4b6ebc34825c7"

export class Claimer {

    private instance: AxiosInstance
    private headers: {}

    constructor(
        proxyAgent: HttpsProxyAgent.HttpsProxyAgent,
        authToken: string,
    ) {

        this.headers = {
            'authority': 'api.cyberconnect.dev',
            'accept': '*/*',
            'accept-language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
            'authorization': authToken,
            'content-type': 'application/json',
            'origin': 'https://next.wallet.cyber.co',
            'referer': 'https://next.wallet.cyber.co/',
            'sec-ch-ua': '"Not/A)Brand";v="99", "Google Chrome";v="115", "Chromium";v="115"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"',
            'sec-fetch-dest': 'empty',
            'sec-fetch-mode': 'cors',
            'sec-fetch-site': 'cross-site',
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
        }

        this.instance = axios.create(
            {
                headers: this.headers,
                proxy: false,
                httpsAgent: proxyAgent,
            }
        )
    }

    async getMerkleProof() {
        const response = await this.instance.post(
            'https://api.cyberconnect.dev/wallet/',
            {
              'query': '\n    query merkleProof {\n  me {\n    cyberRewardMerkleProof {\n      index\n      address\n      amountHex\n      proofs\n    }\n  }\n}\n    ',
              'operationName': 'merkleProof'
            },
            // {
            //   headers: this.headers
            // }
        );
        return {merkleProof: response.data.data.me.cyberRewardMerkleProof.proofs, amount: response.data.data.me.cyberRewardMerkleProof.amountHex, cyberAddress: response.data.data.me.cyberRewardMerkleProof.address, index: response.data.data.me.cyberRewardMerkleProof.index}
    }

    async formatGas(cyberAddress: string, callData: string, address: string) {
        const response = await this.instance.post(
            'https://api.cyberconnect.dev/paymaster/',
            {
              'jsonrpc': '2.0',
              'id': 2,
              'method': 'cc_estimateUserOperation',
              'params': [
                {
                  'sender': cyberAddress,
                  'callData': callData,
                  'to': claimerAddress, //заменить
                  'value': '0',
                  'nonce': null,
                  'maxFeePerGas': null,
                  'maxPriorityFeePerGas': null,
                  'ep': '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789'
                },
                {
                  'chainId': 10,
                  'owner': address
                }
              ]
            }
        )

        return {
            txData: {
                'sender': cyberAddress,
                'callData': callData,
                'to': claimerAddress, //заменить
                'value': '0',
                'nonce': null,
                'maxFeePerGas': response.data.result.fast.maxFeePerGas,
                'maxPriorityFeePerGas': response.data.result.fast.maxPriorityFeePerGas,
                'entryPoint': '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789'
            },
            credit: ethers.utils.formatUnits(response.data.result.credits, 6).toString()
        }
    }

    async formatGasTransfer(cyberAddress: string, callData: string, address: string) {
        const response = await this.instance.post(
            'https://api.cyberconnect.dev/paymaster/',
            {
              'jsonrpc': '2.0',
              'id': 2,
              'method': 'cc_estimateUserOperation',
              'params': [
                {
                  'sender': cyberAddress,
                  'callData': callData,
                  'to': tokenAddress, //заменить
                  'value': '0',
                  'nonce': null,
                  'maxFeePerGas': null,
                  'maxPriorityFeePerGas': null,
                  'ep': '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789'
                },
                {
                  'chainId': 10,
                  'owner': address
                }
              ]
            }
        )

        return {
            txData: {
                'sender': cyberAddress,
                'callData': callData,
                'to': tokenAddress, //заменить
                'value': '0',
                'nonce': null,
                'maxFeePerGas': response.data.result.fast.maxFeePerGas,
                'maxPriorityFeePerGas': response.data.result.fast.maxPriorityFeePerGas,
                'entryPoint': '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789'
            },
            credit: ethers.utils.formatUnits(response.data.result.credits, 6).toString()
        }
    }

    async getSponsorHash(data: any, address: string, cyberAddress: string, amount: string, credit: string) {
        const response = await this.instance.post(
            'https://api.cyberconnect.dev/wallet/',
            {
              'query': '\n    mutation sponsorUserOperation($input: SponsorUserOperationInput!) {\n  sponsorUserOperation(input: $input) {\n    userOperation {\n      sender\n      nonce\n      initCode\n      callData\n      callGasLimit\n      verificationGasLimit\n      preVerificationGas\n      maxFeePerGas\n      maxPriorityFeePerGas\n      paymasterAndData\n      signature\n    }\n    userOperationHash\n    errorCode\n  }\n}\n    ',
              'variables': {
                'input': {
                  'params': {
                    'sponsorUserOpParams': data,
                    'sponsorUserOpContext': {
                      'chainId': 10,
                      'owner': address
                    }
                  },
                  'type': 'CONTRACT_CALL',
                  'readableTransaction': `{"token":{"chainId":10,"decimals":18,"symbol":"Cyber","name":"CyberConnect","balance":"","cmcTokenId":"24781"},"recipient":"${cyberAddress}","amount":"${amount}","noTopUp":false,"estimatedFee":{"value":${credit},"tier":"gasPriceFast"}}`
                }
              },
              'operationName': 'sponsorUserOperation'
            },
        )

        return {fromatTxData: response.data.data.sponsorUserOperation.userOperation, userOpHash: response.data.data.sponsorUserOperation.userOperationHash}
    }

    async sendTx(txData: any, address: string) {
        const response = await this.instance.post(
            'https://api.cyberconnect.dev/paymaster/',
            {
              'jsonrpc': '2.0',
              'id': 8,
              'method': 'eth_sendUserOperation',
              'params': [
                txData,
                '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789',
                {
                  'chainId': 10,
                  'owner': address
                }
              ]
            }
        )
        
        return response.data.result
    }

    async waiter(hash: string, retry: number, address: string) {
        let counter = 0
        while(true) {
            const response = await this.instance.post(
                'https://api.cyberconnect.dev/wallet/',
                {
                  'query': '\n    query txHashByOperationHash($userOpHash: String!) {\n  userOperationByHash(userOpHash: $userOpHash) {\n    txHash\n    chainId\n  }\n}\n    ',
                  'variables': {
                    'userOpHash': hash
                  },
                  'operationName': 'txHashByOperationHash'
                }
            )

            if(response.data.data.userOperationByHash.txHash !== null) {
                return `${address} успешно заклеймил ${response.data.data.userOperationByHash.txHash}`
            }

            counter++

            if(counter === retry) {
                return `Ошибка при клейме ${address}`
            }
        }
    }

    async waiterTransaction(hash: string, retry: number, address: string) {
        let counter = 0
        while(true) {
            const response = await this.instance.post(
                'https://api.cyberconnect.dev/wallet/',
                {
                  'query': '\n    query txHashByOperationHash($userOpHash: String!) {\n  userOperationByHash(userOpHash: $userOpHash) {\n    txHash\n    chainId\n  }\n}\n    ',
                  'variables': {
                    'userOpHash': hash
                  },
                  'operationName': 'txHashByOperationHash'
                }
            )

            if(response.data.data.userOperationByHash.txHash !== null) {
                return `${address} успешно отправили ${response.data.data.userOperationByHash.txHash}`
            }

            counter++

            if(counter === retry) {
                return `Ошибка при отправке ${address}`
            }
        }
    }

    //ТУТ ПОМЕНЯТЬ КОНТРАКТ
    async getSponsorHashForTransfer(data: any, address: string, recipient: string, amount: string, credit: string) {
        const response = await this.instance.post(
            'https://api.cyberconnect.dev/wallet/',
            {
              'query': '\n    mutation sponsorUserOperation($input: SponsorUserOperationInput!) {\n  sponsorUserOperation(input: $input) {\n    userOperation {\n      sender\n      nonce\n      initCode\n      callData\n      callGasLimit\n      verificationGasLimit\n      preVerificationGas\n      maxFeePerGas\n      maxPriorityFeePerGas\n      paymasterAndData\n      signature\n    }\n    userOperationHash\n    errorCode\n  }\n}\n    ',
              'variables': {
                'input': {
                  'params': {
                    'sponsorUserOpParams': data,
                    'sponsorUserOpContext': {
                      'chainId': 10,
                      'owner': address
                    }
                  },
                  'type': 'CONTRACT_CALL',
                    
                  //ТУТ ЗАМНЕИТЬ КОНТРАКТ
                  'readableTransaction': `{"recipient":"${recipient}","amount":"${web3.utils.fromWei(amount, "ether")}","tokenIndex":0,"estimatedFee":{"value":"${credit}","tier":"gasPriceFast"},"token":{"name":"CyberConnect","contract":"${tokenAddress}","chainId":10,"decimals":18,"balance":"${amount}","symbol":"TEST CYBER","cmcTokenId":"24781","usdPrice":"","cmcUsdPrice":"","priceChange":""}}`
                }
              },
              'operationName': 'sponsorUserOperation'
            },
        )

        return {fromatTxData: response.data.data.sponsorUserOperation.userOperation, userOpHash: response.data.data.sponsorUserOperation.userOperationHash}
    }
    
}