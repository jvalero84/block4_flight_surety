import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import Config from './config.json';
import Web3 from 'web3';
import express from 'express';


let config = Config['localhost'];
let web3 = new Web3(new Web3.providers.WebsocketProvider(config.url.replace('http', 'ws')));
web3.eth.defaultAccount = web3.eth.accounts[0];
let flightSuretyApp = new web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);

const ORACLES_IN_POOL = 20;

const STATUS_CODE_UNKNOWN = 0;
const STATUS_CODE_ON_TIME = 10;
const STATUS_CODE_LATE_AIRLINE = 20;
const STATUS_CODE_LATE_WEATHER = 30;
const STATUS_CODE_LATE_TECHNICAL = 40;
const STATUS_CODE_LATE_OTHER = 50;

let flightStatusCodes = [STATUS_CODE_UNKNOWN, STATUS_CODE_ON_TIME, STATUS_CODE_LATE_AIRLINE, STATUS_CODE_LATE_WEATHER, STATUS_CODE_LATE_TECHNICAL, STATUS_CODE_LATE_OTHER];

async function registerPoolOfOracles() {

   let accounts = await web3.eth.getAccounts();

   for (let i = 40; i < 40 + ORACLES_IN_POOL; i++){ //Pick the set number of accounts from pool keeping the first 40 for other roles/users.
      let account = accounts[i];

      await flightSuretyApp.methods.registerOracle().send(
        {
          from:account,
          value:web3.utils.toWei('1'),
          gas:2000000,
          gasPrice:10000000000
        }
      );

      let regResult = await flightSuretyApp.methods.getMyIndexes().call(
                        {
                          from:account
                        }
                      );
      console.log(`Oracle ${i} registered: [${regResult[0]}][${regResult[1]}][${regResult[2]}]`);


   }

}

flightSuretyApp.events.OracleRequest({
    fromBlock: 0
  }, function (error, event) {
    if (error) console.log(error)
    console.log(`event ${event.returnValues.index} - ${event.returnValues.airline} - ${event.returnValues.flight}`);
    submitOracleResponse(event.returnValues);
    //console.log(event)
});

async function submitOracleResponse(requestedFlightData) {
  let accounts = await web3.eth.getAccounts();
  let index = requestedFlightData.index;

  for (let i = 40; i < 40 + ORACLES_IN_POOL; i++){ //Pick the set number of accounts from pool keeping the first 40 for other roles/users.
     let account = accounts[i];

     let regResult = await flightSuretyApp.methods.getMyIndexes().call(
                       {
                         from:account
                       }
                     );

    if(regResult[0] == index || regResult[1] == index || regResult[2] == index) { // This oracle is elegible to supply data for this flight
      //Get a random response code
      let randomIndex = Math.floor(Math.random() * (flightStatusCodes.length -1));
      console.log(`oracle ${i} producing response with index ${randomIndex} and code ${flightStatusCodes[randomIndex]}`);
      await flightSuretyApp.methods.submitOracleResponse(
                                                          index,
                                                          requestedFlightData.airline,
                                                          requestedFlightData.flight,
                                                          requestedFlightData.timestamp,
                                                          flightStatusCodes[randomIndex]
                                                        );
    }


   }
}

const app = express();
app.get('/api', (req, res) => {
    res.send({
      message: 'An API for use with your Dapp!'
    })
})

registerPoolOfOracles();

export default app;
