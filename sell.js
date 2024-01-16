import http from 'http';
import ethers from 'ethers';
import express from 'express';
import chalk from 'chalk';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const app = express();

const httpServer = http.createServer(app);
var data;

try {
    data = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
} catch (error) {
    console.error(error)
}


data.WBNB    = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c";
data.factory = "0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73";
data.router  = "0x10ED43C718714eb63d5aA57B78B54704E256024E";

// const mainnetUrl = 'https://bsc-dataseed.binance.org/';
const mainnetUrl = 'https://kovan.infura.io/v3/425f5a1afd324cd7aee344bd02a8c2d0'
//const mainnetUrl = 'https://mainnet.infura.io/v3/5fd436e2291c47fe9b20a17372ad8057'

const provider = new ethers.providers.JsonRpcProvider(mainnetUrl);
// const provider = new ethers.providers.HttpProvider(data.provider)

var wallet = new ethers.Wallet(data.privateKey);
const account = wallet.connect(provider);
var botStatus = true;

var tokenList = [];

function setBotStatus(obj) {
  botStatus = obj.botStatus;
  //data.recipient = obj.walletAddr;
  //data.privateKey = obj.privateKey;
  data.AMOUNT_OF_WBNB = obj.inAmount;
  data.Slippage = obj.slippage;
  data.gasPrice = obj.gasPrice;
  data.gasLimit = obj.gasLimit 
}


const router = new ethers.Contract(
  data.router,
  [
    'function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)',
    'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)',
    'function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)',
    'function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)'
  ],
  account
);

const erc = new ethers.Contract(
  data.WBNB,
  [{"constant": true,"inputs": [{"name": "_owner","type": "address"}],"name": "balanceOf","outputs": [{"name": "balance","type": "uint256"}],"payable": false,"type": "function"}],
  account
);


const ERC20_ABI = [{ "constant": false, "inputs": [{ "name": "_spender", "type": "address" }, { "name": "_value", "type": "uint256" }], "name": "approve", "outputs": [{ "name": "success", "type": "bool" }], "payable": false, "stateMutability": "nonpayable", "type": "function" }, { "constant": true, "inputs": [], "name": "totalSupply", "outputs": [{ "name": "supply", "type": "uint256" }], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": false, "inputs": [{ "name": "_from", "type": "address" }, { "name": "_to", "type": "address" }, { "name": "_value", "type": "uint256" }], "name": "transferFrom", "outputs": [{ "name": "success", "type": "bool" }], "payable": false, "stateMutability": "nonpayable", "type": "function" }, { "constant": true, "inputs": [], "name": "decimals", "outputs": [{ "name": "digits", "type": "uint256" }], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": true, "inputs": [{ "name": "_owner", "type": "address" }], "name": "balanceOf", "outputs": [{ "name": "balance", "type": "uint256" }], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": false, "inputs": [{ "name": "_to", "type": "address" }, { "name": "_value", "type": "uint256" }], "name": "transfer", "outputs": [{ "name": "success", "type": "bool" }], "payable": false, "stateMutability": "nonpayable", "type": "function" }, { "constant": true, "inputs": [{ "name": "_owner", "type": "address" }, { "name": "_spender", "type": "address" }], "name": "allowance", "outputs": [{ "name": "remaining", "type": "uint256" }], "payable": false, "stateMutability": "view", "type": "function" }, { "anonymous": false, "inputs": [{ "indexed": true, "name": "_owner", "type": "address" }, { "indexed": true, "name": "_spender", "type": "address" }, { "indexed": false, "name": "_value", "type": "uint256" }], "name": "Approval", "type": "event" }];


// const tokenAddresses = [
//     '0x123',
//     '0x456',
// ];
// const myAddress = '0x789';

// for (let tokenAddress of tokenAddresses) {
//     const contract = new web3.eth.Contract(erc20AbiJson, tokenAddress);
//     const tokenBalance = await contract.methods.balanceOf(myAddress).call();
// }


tokenList = getTokenList();

function getTokenList() {
    var array = fs.readFileSync('tokenlist.txt').toString().split("\n");
    for(let i in array) {
        array[i] = array[i].replace(/(\r\n|\n|\r)/gm, "");
    }
    console.log(array);
    return array;
}




const getTokenBalance = async () => {

    for (let tokenAddress of tokenList) {
      const contract = new ethers.Contract(tokenAddress, ERC20_ABI, account);
      const tokenBalance = await contract.balanceOf(data.recipient)
      console.log(chalk.red(`tokenaddress ${tokenAddress} : ${tokenBalance}`));
  }
}

const run = async () => {
  const pairCreated = new ethers.Contract(data.factory, ['event PairCreated(address indexed token0, address indexed token1, address pair, uint pairNums)'], account);
  pairCreated.on('PairCreated', async (token0Addr, token1Addr, pairAddr, pairNums) => {
    console.log('New Pair Create detected : ', token0Addr, token1Addr, pairAddr, pairNums);
    fs.appendFile('log.txt', new Date().toISOString() + ': New Pair Created ' + token0Addr + ' ' + token1Addr + ' ' + pairAddr + '\n', function (err) {
      if (err) throw err;
    });

    let pairAddress = pairAddr;

    if (pairAddress !== null && pairAddress !== undefined) {
      console.log("pairAddress.toString().indexOf('0x0000000000000')", pairAddress.toString().indexOf('0x0000000000000'));
      if (pairAddress.toString().indexOf('0x0000000000000') > -1) {
        console.log(chalk.red(`pairAddress ${pairAddress} not detected. Restart me!`));
        return;
      }
    }
    

    if (token0Addr !== data.WBNB && token1Addr !== data.WBNB) {
      return;
    }
  
    let initialLiquidityDetected = false;
    //const pair = new ethers.Contract(pairAddress, ['event Mint(address indexed sender, uint amount0, uint amount1)'], account);
    const pair = new ethers.Contract(pairAddress, ['event Sync(uint112 reserve1, uint112 reserve2)'], account);

    //pair.on('Mint', async (sender, amount0, amount1) => {
    pair.on('Sync', async (amount0, amount1) => {
      if (initialLiquidityDetected === true) {
        return;
      }


      initialLiquidityDetected = true;
      const tokenIn = data.WBNB;
      const tokenOut = (token0Addr === data.WBNB) ? token1Addr : token0Addr;


      //We buy x amount of the new token for our wbnb
      const amountIn = ethers.utils.parseUnits(`${data.AMOUNT_OF_WBNB}`, 'ether');
      console.log(amountIn, data.WBNB, tokenOut)
      const amounts = await router.getAmountsOut(amountIn, [tokenIn, tokenOut]);

      //Our execution price will be a bit different, we need some flexbility
      const amountOutMin = amounts[1].sub(amounts[1].mul(`${data.Slippage}`).div(100));
      //const amountOutMin = amounts[1].sub(amounts[1].div(`${data.Slippage}`)); 
      console.log('slippage', amountOutMin, amounts[1])

      console.log(
        chalk.green.inverse(`Liquidity Addition Detected\n`)
        +
        `Buying Token
        =================
        tokenIn: ${amountIn.toString()} ${tokenIn} (WBNB)
        tokenOut: ${amountOutMin.toString()} ${tokenOut}
      `);


      let price = amountIn/amountOutMin;

      console.log('Processing Transaction.....');
      console.log(chalk.yellow(`price: ${price}`));
      console.log(chalk.yellow(`amountIn: ${amountIn}`));
      console.log(chalk.yellow(`amountOutMin: ${amountOutMin}`));
      console.log(chalk.yellow(`tokenIn: ${tokenIn}`));
      console.log(chalk.yellow(`tokenOut: ${tokenOut}`));
      console.log(chalk.yellow(`data.recipient: ${data.recipient}`));
      console.log(chalk.yellow(`data.gasLimit: ${data.gasLimit}`));
      console.log(chalk.yellow(`data.gasPrice: ${ethers.utils.parseUnits(`${data.gasPrice}`, 'gwei')}`));

      fs.appendFile('log.txt', new Date().toISOString() + ': Preparing to buy token ' + tokenIn + ' ' + amountIn + ' ' + tokenOut + ' ' + amountOutMin + '\n', function (err) {
        if (err) throw err;
      });


      if (botStatus === true) {
        const tx = await router.swapExactETHForTokens(
          amountOutMin,
          [tokenIn, tokenOut],
          data.recipient,
          Date.now() + 1000 * 60 * 10, //10 minutes
          {
            'gasLimit': data.gasLimit,
            'gasPrice': ethers.utils.parseUnits(`${data.gasPrice}`, 'gwei'),
            'value': amountIn
          }).catch((err) => {
            console.log('transaction failed...')
          });

        await tx.wait();
      }


        let cur_amounts = await router.getAmountsOut(amountIn, [tokenIn, tokenOut]);
        let cur_price = amountIn/cur_amounts;
        if (cur_price > (price * data.profit/100)) {
          console.log(
          chalk.green.inverse(`Selling tokens: \n`)
          +
          `=================
          tokenIn:  ${tokenOut}
        `);

          const tx_sell = await router.swapExactTokensForETH(
          amountOutMin,
          0,
          [tokenOut, tokenIn],
          data.recipient,
          Date.now() + 1000 * 60 * 10, //10 minutes
          {
            'gasLimit': data.gasLimit,
            'gasPrice': ethers.utils.parseUnits(`${data.gasPrice}`, 'gwei'),
            'value':"0"
          }).catch((err) => {
            console.log('transaction failed...')
          });

        await tx_sell.wait();

        }



    });
  })
}

// run();
getTokenBalance();

const PORT = 5000;

httpServer.listen(PORT, (console.log(chalk.yellow(`Listening for Selling token...`))));
