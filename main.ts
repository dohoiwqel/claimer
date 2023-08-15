import { InvalidPrivateKeyError } from "web3";
import { Web3Account } from 'web3-eth-accounts'
import * as readline from 'readline'
import * as fs from 'fs'
import { Login } from "./login.module";
import { ABI, recipient, tokenABI } from "./ABI";
import HttpsProxyAgent from 'https-proxy-agent'

import { web3 } from "./web3";
import { Claimer } from "./claim.module";

async function getProxie(proxie: string) {
    const [ip, port, username, password] = proxie.split(':')
    return new HttpsProxyAgent.HttpsProxyAgent(`http://${username}:${password}@${ip}:${port}`)
}

async function read(fileName: string): Promise<string[]> {
    const array: string[] = []
    const readInterface = readline.createInterface({
        input: fs.createReadStream(fileName),
        crlfDelay: Infinity,
    })
    for await (const line of readInterface) {
        array.push(line)
    }
    return array
}

function formatPrivateKey(privateKey: string): Web3Account {
    try {
        const account = web3.eth.accounts.privateKeyToAccount(privateKey)
        return account
    } catch(e: any) {
        if(e instanceof InvalidPrivateKeyError) {
            const account = web3.eth.accounts.privateKeyToAccount("0x" + privateKey)
            return account
        } 

        throw e
    }
}

function getCallData(arr: {merkleProof: any, amount: any, cyberAddress: any, index: any}) {
    const contract = new web3.eth.Contract(ABI)
    //@ts-ignore
    return contract.methods.claim(arr.index, arr.cyberAddress, arr.amount, arr.merkleProof).encodeABI()
}

function getTransferData(recipient: string, amount: string) {
    const contract = new web3.eth.Contract(tokenABI)
    //@ts-ignore
    return contract.methods.transfer(recipient, amount).encodeABI()
}

async function main() {

    const proxies = await read("proxies.txt")
    const privateKeys = await read("privateKeys.txt")

    for(let [i, privateKey] of privateKeys.entries()) {
        (async () => {
            const wallet = formatPrivateKey(privateKey)

            try{
                const proxy = await getProxie(proxies[i])
                const login = new Login(proxy)
                const authToken = await login.login(wallet)
                const claimer = new Claimer(proxy, authToken)

                let {merkleProof, amount, cyberAddress, index} = await claimer.getMerkleProof()
                
                //КЛЕЙМ
                let callData = getCallData({merkleProof, amount, cyberAddress, index})
                const intAmount = web3.utils.fromWei(parseInt(amount).toString(), 'ether')
                let {txData, credit} = await claimer.formatGas(cyberAddress, callData, wallet.address)
                
                const {fromatTxData, userOpHash} = await claimer.getSponsorHash(txData, wallet.address, cyberAddress, intAmount, credit)
                
                if(!userOpHash) {
                    console.log(`Не удалось получить userOpHash ${wallet.address}`)
                }
                
                const signature = wallet.sign(userOpHash).signature
    
                fromatTxData.signature = signature
                const hash = await claimer.sendTx(fromatTxData, wallet.address)
                console.log(await claimer.waiter(hash, 5, wallet.address))

                //ОТПРАВКА
                {
                    let counter = 0
                    let retry = 5
                    while(counter < retry) { 
                        try {
                            amount = parseInt(amount).toString()
                            const callData = getTransferData(recipient, amount)
                            const {txData, credit} = await claimer.formatGasTransfer(cyberAddress, callData, wallet.address)
                            const {fromatTxData, userOpHash} = await claimer.getSponsorHashForTransfer(txData, wallet.address, recipient, amount, credit)
        
                            if(!userOpHash) {
                                console.log(`Не удалось получить userOpHash ${wallet.address}`)
                            }
        
                            const signature = wallet.sign(userOpHash).signature
                
                            fromatTxData.signature = signature
                            const hash = await claimer.sendTx(fromatTxData, wallet.address)
                            console.log(await claimer.waiterTransaction(hash, 5, wallet.address))
                            break
                        
                        } catch(e) {
                            counter++
                            console.log(`${e} ${wallet}`)
                            await new Promise(resolve => setTimeout(() => resolve(' '), 5_000))
                        }
                    }
                }

            } catch(e) {
                console.log(`${e} ${wallet}`)
            }

        })()
    }
}

main()