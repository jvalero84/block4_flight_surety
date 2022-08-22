
import DOM from './dom';
import Contract from './contract';
import './flightsurety.css';


(async() => {

    let result = null;

    let contract = new Contract('localhost', () => {

        // Read transaction
        contract.isOperational((error, result) => {
            console.log(error,result);
            display('Operational Status', 'Check if contract is operational', [ { label: 'Operational Status', error: error, value: result} ]);
        });


        // Add flight
        //DOM.elid('get-airlines').addEventListener('click', () => {
            let activeAirlines = contract.getAirlines();
            populateAirlinesDD(activeAirlines);
            let passengers = contract.getPassengers();
            populatePassengersDD(passengers, 'passenger-list');
            populateFlightsDD(contract, 'flight-list');
            populatePassengersDD(passengers, 'insurees-list');
            populateFlightsDD(contract, 'or-flight-list');
            DOM.elid('withdraw-funds').disabled = true;
            DOM.elid('submit-oracle').disabled = true;
        //});

        // Add flight
        DOM.elid('register-flight').addEventListener('click', () => {
            let flight = DOM.elid('new-flight-number').value;
            let airline = DOM.elid('airlines-list').value;
            // Write transaction
            contract.registerFlight(airline, flight, (error, result) => {
              console.log('registerFlightresult!!', error, result);
                display('Fligh registration', '', [ { label: 'New Flight Registered:', error: error, value: result.flight} ]);
                console.log(error, result);
                if(error == null){
                  contract.addFlight(flight, airline);
                  let airlineName = activeAirlines.find(x => x.account === result.airline).name;
                  displayFlight(airlineName, result.flight, result.timestamp);
                  populateFlightsDD(contract, 'flight-list');
                  populateFlightsDD(contract, 'or-flight-list');
                  DOM.elid('new-flight-number').value = '';
                  DOM.elid('submit-oracle').disabled = false;
                }
            });
        });

        // Purchase Insurance
        DOM.elid('buy-insurance').addEventListener('click', () => {
          let passenger = DOM.elid('passenger-list').value;
          let flight = DOM.elid('flight-list').value;
          let insuranceAmount = DOM.elid('insurance-amount').value;

          contract.getInsureeInfoByFlight((err, res) => {
            if(err != null){
              console.log(err);
            } else {
              displayInsurancePurchases(res.passenger, res.airline, res.flight, res.amount);
              console.log(JSON.stringify(res));
            }
          });

          contract.purchaseInsurance(passenger, flight, insuranceAmount, (error, result) => {
            console.log('Buy insurance', error, result);
          });

        });


        DOM.elid('insurees-list').addEventListener('change', () => {
            let passengerAddress = DOM.elid('insurees-list').value;
            contract.getInsureeFunds(passengerAddress, (error, result) => {

                if(result > 0) {
                  DOM.elid('withdraw-funds').disabled = false;
                } else {
                  DOM.elid('withdraw-funds').disabled = true;
                }
            });
        });
        DOM.elid('withdraw-funds').addEventListener('click', () => {
            let passengerAddress = DOM.elid('insurees-list').value;
            contract.withdrawInsureeFunds(passengerAddress, (error, result) => {
              if(error === null){
                console.log('withdrawInsureeFunds', error, result);
                DOM.elid('withdraw-funds').disabled = true;
              }
            });

            contract.getWithdrawnFunds((error, result)=> {
              if(error === null) {
                display('Insuree', 'Withdrawn funds', [ { label: 'Passenger funds withdrawn', error: error, value: result.passenger + ' - ' + result.withdrawnAmount + ' (ETH) withdrawn!'} ]);
              }
            });

        });


        // User-submitted transaction
        DOM.elid('submit-oracle').addEventListener('click', () => {
            let flight = DOM.elid('or-flight-list').value;
            // Write transaction
            contract.fetchFlightStatus(flight, (error, result) => {
                if(result.eventId == 'FlightStatusInfo') {
                  display('Oracles', 'Trigger oracles', [ { label: 'Fetch Flight Status', error: error, value: result.flight + ' - ' + result.status} ]);
                } else {
                  display('Passengers', 'Insurance payout clause triggered', [ { label: 'Insurees credited', error: error, value: result.flight + ' - ' + result.insureesCredited + ' insuree(s) credited' } ]);
                }

            });
        })

        DOM.elid('clear-notifications').addEventListener('click', () => {
          DOM.elid('display-wrapper').innerHTML='';
        })

    });


})();


function populatePassengersDD(passengers, dropdownId) {
  let passengersDD = DOM.elid(dropdownId);
  let passengerOpt;
  passengers.forEach((passenger, i) => {
      passengerOpt = document.createElement('option');
      passengerOpt.text = passenger;
      passengerOpt.value = passenger;
      passengersDD.add(passengerOpt);
    }
  );
}

function populateAirlinesDD(activeAirlines) {
  let airlinesDD = DOM.elid('airlines-list');
  let airlineOpt;
  //let airlines = contract.getAirlines();
  console.log(`airlines ${activeAirlines}`);
  activeAirlines.forEach((airline, i) => {
      airlineOpt = document.createElement('option');
      airlineOpt.text = airline.name;
      airlineOpt.value = airline.account;
      airlinesDD.add(airlineOpt);
    }
  );
}

 async function populateFlightsDD(contract, dropdownId) {
  let flightsDD = DOM.elid(dropdownId);
  flightsDD.options.length = 0;
  let flightOpt;
  let flightsList = await contract.getRegisteredFlights();
  console.log(`flights ${flightsList}`);
  flightsList.forEach((flight, i) => {
      flightOpt = document.createElement('option');
      flightOpt.text = flight;
      flightOpt.value = flight;
      flightsDD.add(flightOpt);
    }
  );
}

function displayFlight(_airline, flight, tstamp){
  let flightsTable = DOM.elid("flights-board");
  let flightRow = document.createElement("tr");
  let flightnumber = document.createElement("td");
  let airline = document.createElement("td");
  let timestamp = document.createElement("td");

  airline.appendChild(document.createTextNode(_airline));
  flightRow.appendChild(airline);

  flightnumber.appendChild(document.createTextNode(flight));
  flightRow.appendChild(flightnumber);

  let formattedTS = new Date().toString();
  timestamp.appendChild(document.createTextNode(formattedTS));
  flightRow.appendChild(timestamp);

  flightsTable.appendChild(flightRow);

}

function displayInsurancePurchases(_passenger, _airline, _flight, _amount){
  let insurancesTable = DOM.elid("insurances-purchased-board");
  let insuranceRow = document.createElement("tr");
  let passenger = document.createElement("td");
  let flightnumber = document.createElement("td");
  let airline = document.createElement("td");
  let amount = document.createElement("td");

  passenger.appendChild(document.createTextNode(_passenger));
  insuranceRow.appendChild(passenger);

  airline.appendChild(document.createTextNode(_airline));
  insuranceRow.appendChild(airline);

  flightnumber.appendChild(document.createTextNode(_flight));
  insuranceRow.appendChild(flightnumber);

  amount.appendChild(document.createTextNode(_amount));
  insuranceRow.appendChild(amount);

  insurancesTable.appendChild(insuranceRow);
}

function display(title, description, results) {
    let displayDiv = DOM.elid("display-wrapper");
    let section = DOM.section();
    section.appendChild(DOM.h2(title));
    section.appendChild(DOM.h5(description));
    results.map((result) => {
        let row = section.appendChild(DOM.div({className:'row'}));
        row.appendChild(DOM.div({className: 'col-sm-4 field'}, result.label));
        row.appendChild(DOM.div({className: 'col-sm-8 field-value'}, result.error ? String(result.error) : String(result.value)));
        section.appendChild(row);
    })
    displayDiv.append(section);

}
