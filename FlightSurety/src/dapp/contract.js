import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import Config from './config.json';
import Web3 from 'web3';

export default class Contract {
    constructor(network, callback) {

        let config = Config[network];
        this.web3 = new Web3(new Web3.providers.HttpProvider(config.url));
        this.flightSuretyApp = new this.web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);
        this.initialize(callback);
        this.owner = null;
        this.airlines = [];
        this.passengers = [];
    }

    initialize(callback) {
        this.web3.eth.getAccounts((error, accts) => {

            this.owner = accts[0];

            let counter = 1;
            let self = this;

            while(this.airlines.length < 5) {
                self.flightSuretyApp.methods
                    .registerAirline(accts[counter],`AERO${counter}`)
                    .send({
                      from: "0xf17f52151EbEF6C7334FAD080c5704D77216b732",
                      gas: 4712388,
                      gasPrice: 100000000000
                    })
                this.airlines.push(accts[counter++]);
            }

            while(this.passengers.length < 5) {
                this.passengers.push(accts[counter++]);
            }

            callback();
        });
    }

    isOperational(callback) {
       let self = this;
       self.flightSuretyApp.methods
            .isOperational()
            .call({ from: self.owner}, callback);
    }

    // Function for registering a new flight
    registerFlight(flightNumber, callback) {
        let self = this;
        let timestamp = Math.floor(Date.now() / 1000);
        console.log(`from airline ${self.airlines[0]}`);
        self.flightSuretyApp.methods
            .registerFlight(flightNumber, timestamp)
            .send({
                from: self.airlines[0],
                gas: 2000000,
                gasPrice: 100000000000
            }, (error, result) => {
                callback(error, flightNumber);
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
