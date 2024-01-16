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


data.WBNB    = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
data.factory = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f";
data.router  = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";

const mainnetUrl = data.provider;
//const mainnetUrl = 'https://kovan.infura.io/v3/425f5a1afd324cd7aee344bd02a8c2d0'
//const mainnetUrl = 'https://mainnet.infura.io/v3/5fd436e2291c47fe9b20a17372ad8057'

const provider = new ethers.providers.JsonRpcProvider(mainnetUrl);
// const provider = new ethers.providers.HttpProvider(data.provider)

var wallet = new ethers.Wallet(data.privateKey);
const account = wallet.connect(provider);


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
  
    
}

run();

const PORT = 5000;

httpServer.listen(PORT, (console.log(chalk.yellow(`Listening for new Liquidity Addition to token...`))));
