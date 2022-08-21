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
        this.flights = [];
        //this.web3 = new Web3(new Web3.providers.HttpProvider(config.url));
        this.web3 = new Web3(new Web3.providers.WebsocketProvider(config.url.replace('http', 'ws')));
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

async purchaseInsurance(passenger, flightNumber, amount, callback) {
  let self = this;
  var fNumber = flightNumber;
  console.log(`purchaseInsurance flight: ${flightNumber}`);
  console.log(`self.flights: ${JSON.stringify(self.flights)}`);
  let insuranceFeeInWei = self.web3.utils.toWei(amount, "ether");
  let flightInfo = self.flights.find(obj => obj.flight === fNumber);
  console.log(`purchaseInsurance insFeeInwei: ${insuranceFeeInWei}`);
  await self.flightSuretyApp.methods
        .buyInsurance(self.web3.utils.asciiToHex(flightNumber), flightInfo.airline)
        .send({
          from: passenger,
          value: insuranceFeeInWei,
          gas: self.web3.utils.toWei("5", "mwei")
          //gasPrice: 100000000000
        }, (error, result) => {
            console.log(error);
            callback(error, result);
        });

}

async getInsureeInfoByFlight(callback) {

  let self = this;
  let payload = {
      airline: '',
      flight: '',
      passenger: '',
      amount: 0
  }

  await self.flightSuretyApp.once('insurancePurchased',{
    fromBlock: "pending"
  }, function (error, evento) {
      if (error) {
          console.log(error)
      }
      console.log('insurancePurchased!!',evento);
      //Lets override with the actual data..
      payload.airline = evento.returnValues.airline;
      payload.flight = self.web3.utils.hexToUtf8(evento.returnValues.flight);
      payload.passenger = evento.returnValues.passenger;
      payload.amount = self.web3.utils.fromWei(evento.returnValues.amount, 'ether');
      callback(error, payload);
  });

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

    getPassengers() {
      let self = this;
      return self.passengers;
    }

    addFlight(flight, airline){
      let self = this;
      self.flights.push({flight: flight, airline: airline});
    }

    getFlight(flightNumber) {
      let self = this;
      console.log(`getFlight param: ${flightNumber}`);
      console.log(`getFlight flights: ${self.flights}`);
      let flight = self.flights.find(x => x.flight === flightNumber);
      console.log(`getFlight ${flight}`);
      return flight;
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
  async registerFlight(airline, flightNumber, callback) {
        let self = this;
        //let timestamp = Math.floor(Date.now() / 1000);
        let timestamp = 0;
        let flightInfo = {
            airline: airline,
            flight: flightNumber,
            timestamp: timestamp
        }
        console.log(`registerFlight self.flights: ${JSON.stringify(self.flights)}`);
        //console.log(`from airline ${airline} with flightNumber ${flightNumber}`);
        await self.flightSuretyApp.methods
            .registerFlight(self.web3.utils.utf8ToHex(flightNumber), timestamp)
            .send({
                from: airline,
                gas: 2000000,
                gasPrice: 100000000000
            }, (error, result) => {
                if (error === null) {
                  //self.flights.push({flight: flightNumber, airline: airline});
                  console.log(self.flights);
                }
                callback(error, flightInfo);
            });

    }

    async getRegisteredFlights() {
      let self = this;
      const flightList = await self.flightSuretyApp.methods
                                 .getFlights().call({ from: self.owner});
      flightList.forEach(function(part, index) {
          this[index] = self.web3.utils.hexToUtf8(this[index]);
        }, flightList);
      return flightList;
    }

    async getInsureeFunds(passenger, callback) {
      let self = this;
      const insureeFunds = await self.flightSuretyApp.methods
                                 .getInsureeFunds(passenger)
                                 .call({
                                    from: self.owner
                                  }, (error, result) => {
                                      if (error === null) {
                                        //self.flights.push({flight: flightNumber, airline: airline});
                                        console.log(result);
                                      }
                                      callback(error, result);
                                  });
    }

    async withdrawInsureeFunds(passenger, callback) {
      let self = this;
      await self.flightSuretyApp.methods
            .withdrawInsureeCredit()
            .send({
                    from: passenger,
                    gas: 2000000,
                    gasPrice: 100000000000
            }, (error, result) => {
                callback(error, result);
            });
    }

    async getWithdrawnFunds(callback) {

      let self = this;
      let payload = {
          passenger: '',
          withdrawnAmount: 0
      }

      self.flightSuretyApp.getPastEvents('insureeCreditWithdrawn',{
          fromBlock: "latest"
      }, function (error, events) {
          if (error) {
              console.log(error)
          }
          console.log(events[0]);
          //Lets override with the actual data..
          payload.passenger = events[0].returnValues.passenger;
          payload.withdrawnAmount = self.web3.utils.fromWei(events[0].returnValues.withdrawnAmount, 'ether');
          callback(error, payload);
      });

    }

    async fetchFlightStatus(fNumber, callback) {
        let self = this;

        let flightInfo = self.flights.find(obj => obj.flight === fNumber);


        let payload = {
            eventId: 'FlightStatusInfo',
            airline: flightInfo.airline,
            flight: fNumber,
            timestamp: Math.floor(Date.now() / 1000),
            status: ''
        }

        self.flightSuretyApp.once('FlightStatusInfo',{
          fromBlock: "pending"
        }, function (error, evento) {
            if (error) {
                console.log(error)
            }
            console.log(evento);
            //Lets override with the actual data..
            payload.airline = evento.returnValues.airline;
            payload.flight = evento.returnValues.flight;
            payload.timestamp = evento.returnValues.timestamp;

            let flightStatus;
            switch(evento.returnValues.status){
              case '0':
                  flightStatus = 'Unknown';
                  break;
              case '10':
                  flightStatus = 'On Time';
                  break;
              case '20':
                  flightStatus = 'Delayed airline';
                  break;
              case '30':
                  flightStatus = 'Delayed weather';
                  break;
              case '40':
                  flightStatus = 'Delayed technical';
                  break;
              case '50':
                  flightStatus = 'Delayed unknown reason';
                  break;
              default:
                  flightStatus = "Unknown";
            }

            payload.status = flightStatus;

            callback(error, payload);
        });

        let res = {
            eventId: 'flightInsureesCredited',
            airline: flightInfo.airline,
            flight: fNumber,
            insureesCredited: 0
        }

        self.flightSuretyApp.once('flightInsureesCredited',{
          fromBlock: "pending"
        }, function (error, evento) {
            if (error) {
                console.log(error)
            }
            console.log(evento);
            res.insureesCredited = evento.returnValues.passengersCredited;

            callback(error, res);

            }
        );

        await self.flightSuretyApp.methods
            .fetchFlightStatus(payload.airline, payload.flight, 0)
            .send({
                    from: self.owner,
                    gas: self.web3.utils.toWei("5", "mwei")
                  });


            /*self.flightSuretyApp.getPastEvents('FlightStatusInfo',{
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
            });*/

        //let eventReturnValues = self.flightSuretyApp.events.FlightStatusInfo().returnValues;
        //console.log(`eventReturnValues ${eventReturnValues}`);

    }
}
