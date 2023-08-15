export const ABI = [{
    "inputs": [{
        "internalType": "uint256",
        "name": "index",
        "type": "uint256"
    }, {
        "internalType": "address",
        "name": "account",
        "type": "address"
    }, {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
    }, {
        "internalType": "bytes32[]",
        "name": "merkleProof",
        "type": "bytes32[]"
    }],
    "name": "claim",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
}]

export const tokenABI = [{
    type: "function",
    name: "transfer",
    stateMutability: "nonpayable",
    inputs: [{
        name: "recipient",
        type: "address"
    }, {
        name: "amount",
        type: "uint256"
    }],
    outputs: [{
        name: "",
        type: "bool"
    }]
}]

export const recipient = "" //АДРЕС КУДА ОТПРАВЯТСЯ ТОКЕНЫ