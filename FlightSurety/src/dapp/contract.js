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

            while(this.airlines.length < 5) {
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
