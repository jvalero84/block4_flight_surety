
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
            populatePassengersDD(passengers);
        //});

        // Add flight
        DOM.elid('register-flight').addEventListener('click', () => {
            let flight = DOM.elid('new-flight-number').value;
            let airline = DOM.elid('airlines-list').value;
            // Write transaction
            contract.registerFlight(airline, flight, (error, result) => {
              console.log('registerFlightresult!!', error, result);
                display('Fligh registration', '', [ { label: 'New Flight Generated:', error: error, value: result.flight} ]);
                console.log(error, result);
                if(error == null){
                  let airlineName = activeAirlines.find(x => x.account === result.airline).name;
                  displayFlight(airlineName, result.flight, result.timestamp);
                  populateFlightsDD(contract);
                }

            });
        });

        // User-submitted transaction
        DOM.elid('submit-oracle').addEventListener('click', () => {
            let flight = DOM.elid('flight-number').value;
            // Write transaction
            contract.fetchFlightStatus(flight, (error, result) => {
                display('Oracles', 'Trigger oracles', [ { label: 'Fetch Flight Status', error: error, value: result.flight + ' - ' + result.timestamp + ' - ' + result.status} ]);
            });
        })

    });


    // async function getAirlines(contract) {
    //   const airlines = await contract.getAirlines();
    //   console.log(airlines);
    //
    //   airlines.forEach((airline) => {
    //     console.log(airline);
    //     //display('Airlines', '', [{ label: 'Airline -->', value: airline.}])
    //
    //   });
    //
    //
    //   return airlines;
    // }


})();


function populatePassengersDD(passengers) {
  let passengersDD = DOM.elid('passenger-list');
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

 async function populateFlightsDD(contract) {
  let flightsDD = DOM.elid('flight-list');
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

function displayFlight(_airline, flight, timestamp){
  let flightsTable = DOM.elid("flights-board");
  let flightRow = document.createElement("tr");
  let flightnumber = document.createElement("td");
  let airline = document.createElement("td");
  let departure = document.createElement("td");

  airline.appendChild(document.createTextNode(_airline));
  flightRow.appendChild(airline);

  flightnumber.appendChild(document.createTextNode(flight));
  flightRow.appendChild(flightnumber);

  let formattedDep = new Date(parseInt(timestamp)).toString().substring(0,28)
  departure.appendChild(document.createTextNode(formattedDep));
  flightRow.appendChild(departure);

  flightsTable.appendChild(flightRow);

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
