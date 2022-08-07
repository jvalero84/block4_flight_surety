import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import Config from './config.json';
import Web3 from 'web3';

export default class Contract {

    constructor(network, callback) {

        let config = Config[network];
        //this.web3 = new Web3(new Web3.providers.HttpProvider(config.url));
        // use the following, otherwise event listener are not responding
        //this.web3 = new Web3(new Web3.providers.WebsocketProvider(config.url.replace('http', 'ws')));
        //window.ethereum.enable();
        this.accounts;
        this.owner = null;
        this.airlines = [];
        this.passengers = [];
        this.web3 = new Web3(new Web3.providers.HttpProvider(config.url));
        //this.initializeWeb3();
        this.flightSuretyApp = new this.web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);
        this.airlineFundingFee = 1;

        this.initializeAccounts(callback);

        console.log('After intitializing accounts');

    }


    //async initializeWeb3() {


      // let web3Provider;
      //
      // if (typeof window.ethereum !== "undefined") {
      //   console.log("MetaMask is installed!");
      // }
      //
      // if (window.ethereum) {
      //   web3Provider = window.ethereum;
      //   this.web3 = new Web3(web3Provider);
      //   try {
      //     // Request account access
      //     console.log("request account access");
      //     window.ethereum.enable();
      //     console.log("ethereum window enabled");
      //   } catch (error) {
      //     // User denied account access...
      //     console.error("User denied account access");
      //   }
      // }
      // // Legacy dapp browsers...
      // else if (window.web3) {
      //   web3Provider = window.web3.currentProvider;
      //   this.web3 = new Web3(web3Provider);
      //   console.log("currrent provider web3: " + web3Provider);
      // }
      // // If no injected web3 instance is detected, fall back to Ganache
      // else {
      //   //   web3Provider = new Web3.providers.WebsocketProvider(
      //   //     this.config.url.replace("http", "ws")
      //   //   ); // WS
      //   web3Provider = new Web3(new Web3.providers.HttpProvider(this.config.url)); // HTTP
      // }

      // web3Provider = new Web3(new Web3.providers.HttpProvider(this.config.url)); // HTTP
      // web3Provider = new Web3.providers.WebsocketProvider(
      //   this.config.url.replace("http", "ws")
      // ); // WS
      // this.web3 = new Web3(web3Provider);

      // console.log(
      //   "web3: " + JSON.stringify(this.web3.eth.Contract.defaultAccount)
      // );
      //console.log("web3 instantiated in contract");

      // return web3;
      // this.initializeAccounts();
  //}

  async initializeAccounts(callback) {
  const accounts = await this.web3.eth.getAccounts((error, accounts) => {
    // console.log("contract.js, initializeAccounts", { error, accounts });
    if (error) console.error(error);

    this.accounts = accounts;
    this.owner = accounts[0];
  });
  console.log({ accounts });


  let counter = 2; //Lets keep the first account for the owner and the second for the first airline registered when the contract is instantiated
  let self = this;

  //check that the first airline has been registered when the contract was deployed..
  //let {fAirlineRegistered, fAirlineActive, fAirlineName, fAirlineAcct, fAirlineBalance}
  let firstAirline = await self.flightSuretyApp.methods.getAirline(accounts[1])
        .call({
            from: self.owner
        });

  console.log(`firstAirline ${firstAirline[0]} ${firstAirline[1]} ${firstAirline[2]} ${firstAirline[3]} ${firstAirline[4]}`);

  this.airlines.push({account: accounts[1], name: firstAirline[2]});


  // await self.flightSuretyApp.methods
  //     .registerAirline(this.accounts[counter],`AERO${counter}`)
  //     .send({
  //       from: accounts[1],
  //       gas: 4712388,
  //       gasPrice: 100000000000
  //     }, (error, result) => {
  //         console.log(error);
  //     });
  //
  //     console.log(`regAirlinesCounter: ${regAirlinesCounter}`);
  //
  //     let addedAirline = await self.flightSuretyApp.methods.getAirline(accounts[counter])
  //           .call({
  //               from: self.owner
  //           });
  //
  //     console.log(`addedAirline${this.airlines.length}: ${addedAirline[0]} ${addedAirline[1]} ${addedAirline[2]} ${addedAirline[3]} ${addedAirline[4]}`);
  //
  // console.log(accounts[1]);

  while(this.airlines.length < 5) {
      await self.flightSuretyApp.methods
          .registerAirline(this.accounts[counter],`AERO${counter}`)
          .send({
            from: accounts[1],
            gas: 4712388,
            gasPrice: 100000000000
          }, (error, result) => {
              //console.log(error);
          });



      let addedAirline = await self.flightSuretyApp.methods.getAirline(accounts[counter])
            .call({
                from: self.owner
            });

      console.log(`addedAirline${this.airlines.length}: ${addedAirline[0]} ${addedAirline[1]} ${addedAirline[2]} ${addedAirline[3]} ${addedAirline[4]}`);
      this.airlines.push({account: accounts[counter++], name: addedAirline[2]});

      await this.fundAirline(addedAirline[3], callback);

  }
  console.log(`airlines: ${this.airlines}`);

  while(this.passengers.length < 5) {
      this.passengers.push(accounts[counter++]);
  }

  console.log(`passengers: ${this.passengers}`);

  callback();

}

async fundAirline(airline, callback) {

  let self = this;
  let feeInWei = self.web3.utils.toWei(self.airlineFundingFee.toString(), "ether")
  console.log(`feeInWei ${feeInWei}`);

  //for(var i=1; i <= self.airlines.length; i++){
      await self.flightSuretyApp.methods
          .fundAirline(airline)
          .send({
            from: airline,
            value: feeInWei,
            gas: 4712388,
            gasPrice: 100000000000
          }, (error, result) => {
              console.log(error);
          });

          let fundedAirline = await self.flightSuretyApp.methods.getAirline(airline)
                .call({
                    from: airline
                });

          console.log(`fundedAirline ${fundedAirline[2]}: ${fundedAirline[0]} ${fundedAirline[1]} ${fundedAirline[3]} ${fundedAirline[4]}`);

  //}

}

  //   getMetaskAccountID() {
  //   // Retrieving metamask accounts
  //   this.web3.eth.getAccounts(function (err, res) {
  //       if (err) {
  //           console.log('Error:', err)
  //           return
  //       }
  //       //this.metamaskAccountID = res[0]
  //       this.owner = res[0];
  //   })
  // }

    // initialize(callback) {
    //
    //     //this.getMetaskAccountID();
    //
    //     this.web3.eth.getAccounts((error, accts) => {
    //
    //         this.owner = accts[0];
    //
    //         let counter = 1;
    //         let self = this;
    //
    //         while(this.airlines.length < 5) {
    //             self.flightSuretyApp.methods
    //                 .registerAirline(accts[counter],`AERO${counter}`)
    //                 .send({
    //                   from: "0xf17f52151EbEF6C7334FAD080c5704D77216b732",
    //                   gas: 4712388,
    //                   gasPrice: 100000000000
    //                 })
    //             this.airlines.push(accts[counter++]);
    //
    //             //console.log(`airlineData: ${airlineData}`);
    //         }
    //
    //         while(this.passengers.length < 5) {
    //             this.passengers.push(accts[counter++]);
    //         }
    //
    //         callback();
    //     });
    // }

    isOperational(callback) {
       let self = this;
       self.flightSuretyApp.methods
            .isOperational()
            .call({ from: self.owner}, callback);
    }

    getAirlines() {
      let self = this;
      return self.airlines;
    }

  //   async getAirlines(callback) {
  //     let self = this;
  //     const airlinesData = [];
  //     return new Promise((res, rej) => {
  //         self.airlines.forEach((airline, i) => {
  //            self.flightSuretyApp.methods.getAirline(airline).call({
  //             from: self.owner}, (error, result) => {
  //                 if (error) {
  //                   console.log(error)
  //                   rej(error)
  //                 } else {
  //                   airlinesData.push(result);
  //                 }
  //           });
  //         }
  //
  //       );
  //       res(airlinesData);
  //   })
  // }



    // Function for registering a new flight
    registerFlight(airline, flightNumber, callback) {
        let self = this;
        let timestamp = Math.floor(Date.now() / 1000);
        let flightInfo = {
            airline: airline,
            flight: flightNumber,
            timestamp: timestamp
        }
        console.log(`from airline ${airline}`);
        self.flightSuretyApp.methods
            .registerFlight(flightNumber, timestamp)
            .send({
                from: airline,
                gas: 2000000,
                gasPrice: 100000000000
            }, (error, result) => {
                callback(error, flightInfo);
            });
    }

    fetchFlightStatus(flight, callback) {
        let self = this;
        let payload = {
            airline: self.airlines[0],
            flight: flight,
            timestamp: Math.floor(Date.now() / 1000),
            status: ''
        }
        self.flightSuretyApp.methods
            .fetchFlightStatus(payload.airline, payload.flight, payload.timestamp)
            .send({ from: self.owner});


            self.flightSuretyApp.getPastEvents('FlightStatusInfo',{
                fromBlock: "latest"
            }, function (error, events) {
                if (error) {
                    console.log(error)
                }
                console.log(events[0]);
                //Lets override with the actual data..
                payload.airline = events[0].returnValues.airline;
                payload.flight = events[0].returnValues.flight;
                payload.timestamp = events[0].returnValues.timestamp;
                payload.status = events[0].returnValues.status;
                callback(error, payload);
            });

        //let eventReturnValues = self.flightSuretyApp.events.FlightStatusInfo().returnValues;
        //console.log(`eventReturnValues ${eventReturnValues}`);

    }
}
