pragma solidity ^0.4.24;

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

contract FlightSuretyData {
    using SafeMath for uint256;
    using SafeMath for uint8;

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    // Flight status codees
    uint8 private constant STATUS_CODE_UNKNOWN = 0;
    uint8 private constant STATUS_CODE_ON_TIME = 10;
    uint8 private constant STATUS_CODE_LATE_AIRLINE = 20;
    uint8 private constant STATUS_CODE_LATE_WEATHER = 30;
    uint8 private constant STATUS_CODE_LATE_TECHNICAL = 40;
    uint8 private constant STATUS_CODE_LATE_OTHER = 50;

    address private contractOwner;                                      // Account used to deploy contract
    bool private operational = true;                                    // Blocks all state changes throughout the contract if false
    uint8 private activeAirlinesCounter;
    uint256 private regAirlinesCounter;

    uint256 private constant AIRLINE_FUNDING_FEE = 1; //TODO: change to 10 eth
    uint256 private constant AIRLINE_REGISTRATION_CONSENSUS_PERCENT = 50;
    uint256 private constant FLIGHT_MAX_INSURANCE_FEE = 1;
    uint8 private constant MIN_ACTIVE_AIRLINES_TO_APPLY_MULTIPARTY_CONSENSUS = 4;

    struct Airline {
      bool isRegistered;
      bool isActive; // isRegistered == true and balance >= AIRLINE_FUNDING_FEE
      string name;
      address account;
      uint256 balance;
    }

    struct Passenger {
      address account;
      uint256 insuranceAmount;
      uint256 payoutAmount;
      bool isCredited;
    }

    struct Flight {
        bool isRegistered;
        bytes32 flightNumber;
        uint8 statusCode;
        uint256 updatedTimestamp;
        address airline;
        address[] insureeAddresses;
        mapping(address => Passenger) insurees;
    }

    mapping(bytes32 => Flight) private flights;

    mapping(address => bool) private authorizedCallers;
    mapping(address => Airline) private airlines;
    mapping(address => uint256) private registrationVotes;
    mapping(address => mapping(address => bool)) private votingHistory; // Voting airlines => (airline pending registration => already voted?)

    /********************************************************************************************/
    /*                                       EVENT DEFINITIONS                                  */
    /********************************************************************************************/


    event airlineRegistered(string airline, uint256 regAirlinesCounter);

    /**
    * @dev Constructor
    *      The deploying account becomes contractOwner
    */
    // constructor
    //                             (
    //                             )
    //                             public
    // {
    //     contractOwner = msg.sender;
    // }

    constructor(address _firstAirline, string _name) public
    {
        contractOwner = msg.sender;
        airlines[_firstAirline] = Airline({
          isRegistered: true,
          isActive: true,
          name: _name,
          account: _firstAirline,
          balance: AIRLINE_FUNDING_FEE
        });
        regAirlinesCounter = 1;
        activeAirlinesCounter = 1;
    }

    /********************************************************************************************/
    /*                                       FUNCTION MODIFIERS                                 */
    /********************************************************************************************/

    // Modifiers help avoid duplication of code. They are typically used to validate something
    // before a function is allowed to be executed.

    /**
    * @dev Modifier that requires the "operational" boolean variable to be "true"
    *      This is used on all state changing functions to pause the contract in
    *      the event there is an issue that needs to be fixed
    */
    modifier requireIsOperational()
    {
        require(operational, "Contract is currently not operational");
        _;  // All modifiers require an "_" which indicates where the function body will be added
    }

    /**
    * @dev Modifier that requires the "ContractOwner" account to be the function caller
    */
    modifier requireContractOwner()
    {
        require(msg.sender == contractOwner, "Caller is not contract owner");
        _;
    }

    modifier isCallerAbleToRegisterAirline()
    {
      require(activeAirlinesCounter >= MIN_ACTIVE_AIRLINES_TO_APPLY_MULTIPARTY_CONSENSUS || (activeAirlinesCounter < MIN_ACTIVE_AIRLINES_TO_APPLY_MULTIPARTY_CONSENSUS && airlines[msg.sender].isRegistered == true), "Caller not able to register airline");
      _;
    }

    modifier requireAirlineIsRegistered(address airline)
    {
      require(airlines[airline].isRegistered == true, "The airline you are trying to fund is not registered yet.");
      _;
    }

    modifier requireAirlineIsActiveToVote()
    {
      require(airlines[msg.sender].isActive == true, "Airline has to be active to be able to vote for registration of airlines.");
      _;
    }

    modifier requireAirlineNotRegisteredAlready(address airline)
    {
      require(airlines[airline].isRegistered == false, "The airline for which you are voting is already registered.");
      _;
    }

    modifier requireDuplicateVoteNotAllowed(address airline)
    {
      require(votingHistory[msg.sender][airline] == false, "You already voted to register this airline.");
      _;
    }

    modifier requireIsActiveAirline(address airline)
    {
      require(isAirline(airline) == true, "The airline is not active.");
      _;
    }

    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    /**
    * @dev Get operating status of contract
    *
    * @return A bool that is the current operating status
    */
    function isOperational()
                            public
                            view
                            returns(bool)
    {
        return operational;
    }


    /**
    * @dev Sets contract operations on/off
    *
    * When operational mode is disabled, all write transactions except for this one will fail
    */
    function setOperatingStatus
                            (
                                bool mode
                            )
                            external
                            requireContractOwner
    {
        operational = mode;
    }

    function authorizeCaller(address caller)
                            external
                            requireContractOwner
                            requireIsOperational
    {
      authorizedCallers[caller] = true;
    }

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

   /**
    * @dev Add an airline to the registration queue
    *      Can only be called from FlightSuretyApp contract
    *
    */
    function registerAirline
                            (
                              address airline,
                              string name
                            )
                            external
                            requireIsOperational
    {
        if(activeAirlinesCounter < MIN_ACTIVE_AIRLINES_TO_APPLY_MULTIPARTY_CONSENSUS ){ // First MIN_ACTIVE_AIRLINES_TO_APPLY_MULTIPARTY_CONSENSUS airlines are registered if submitted by a registered airline
          require(airlines[tx.origin].isRegistered, "The airline submitting this request is not registered!");
          airlines[airline]= Airline({
            isRegistered: true,
            isActive: false,
            name: name,
            account: airline,
            balance: 0
          });
          regAirlinesCounter.add(1);
          emit airlineRegistered(name, regAirlinesCounter);
        } else {
          airlines[airline]= Airline({
            isRegistered: false,
            isActive: false,
            name: name,
            account: airline,
            balance: 0
          });
          registrationVotes[airline] = 0;
        }

    }

    function fundAirline (
                          address airline
                          )
                          external
                          payable
                          requireIsOperational
                          requireAirlineIsRegistered(airline)
                          returns (string, uint256)
   {
      require(msg.value >= AIRLINE_FUNDING_FEE, "Insuficients funds provided to fund the airline.");

      airlines[airline].balance = airlines[airline].balance.add(msg.value);
      airlines[airline].isActive = true;
      activeAirlinesCounter.add(1);

      return (airlines[airline].name, airlines[airline].balance);
   }

   function voteToRegisterAirline
                           (
                             address airline
                           )
                           external
                           requireIsOperational
                           requireAirlineIsActiveToVote
                           requireAirlineNotRegisteredAlready(airline)
                           requireDuplicateVoteNotAllowed(airline)
   {
        require(activeAirlinesCounter > MIN_ACTIVE_AIRLINES_TO_APPLY_MULTIPARTY_CONSENSUS, "Not enough active airlines to allow voting..");
        votingHistory[msg.sender][airline] = true;
        registrationVotes[airline].add(1);
        uint8 registrationThreshold = uint8(AIRLINE_REGISTRATION_CONSENSUS_PERCENT.mul(activeAirlinesCounter).div(100));

        if(registrationVotes[airline] >= registrationThreshold) {
          airlines[airline].isRegistered = true;
          regAirlinesCounter.add(1);
          emit airlineRegistered(airlines[airline].name, regAirlinesCounter);
        }

   }

   function getAirline(address airline)
                      public
                      view
                      returns (bool,bool,string,address,uint256)
   {
     return (airlines[airline].isRegistered,airlines[airline].isActive,airlines[airline].name,airlines[airline].account,airlines[airline].balance);
   }

   function isAirline (address airline)
                      view
                      public
                      returns (bool)
   {
     return airlines[airline].isActive;
   }

   function registerFlight
                               (
                                 bytes32 flightNumber,
                                 uint256 timestamp
                               )
                               external
                               requireIsOperational
                               requireIsActiveAirline(tx.origin)
   {
     bytes32 key = getFlightKey(tx.origin, flightNumber, timestamp);
     flights[key].isRegistered = true;
     flights[key].flightNumber = flightNumber;
     flights[key].updatedTimestamp = timestamp;
     flights[key].airline = tx.origin;
     flights[key].statusCode = STATUS_CODE_UNKNOWN;
     //registeredFlights.push(key);
   }


   /**
    * @dev Buy insurance for a flight
    *
    */
    function buyInsurance
                            (
                              bytes32 flight,
                              address airline
                            )
                            external
                            payable
                            requireIsOperational
                            returns (string, bytes32)
    {
        require(msg.value <= FLIGHT_MAX_INSURANCE_FEE, "Insurance can't be purchased for more than 1 ether");

        bytes32 flightKey = getFlightKey(airline, flight, 0);

        Passenger memory buyer = Passenger({
                    account: tx.origin,
                    insuranceAmount: msg.value,
                    payoutAmount: 0,
                    isCredited: false
                });

        flights[flightKey].insurees[tx.origin] = buyer;
        flights[flightKey].insureeAddresses.push(tx.origin);
        airlines[airline].balance = airlines[airline].balance.add(msg.value);
        return (airlines[airline].name, flight);

    }

    /**
     *  @dev Credits payouts to insurees
    */
    function creditInsurees
                                (
                                  string flightNumber,
                                  address airlineAddress
                                )
                                external
                                requireIsOperational
                                returns (string, uint256)
    {
      bytes32 flightKey = getFlightKey(airlineAddress, flightNumber, 0);
      Flight storage flight = flights[flightKey];
      Airline storage airline = airlines[airlineAddress];
      uint256 accountsTargetedForCredit = flight.insureeAddresses.length;

      for (uint256 i = 0; i < accountsTargetedForCredit; i++) {
        Passenger storage passenger = flight.insurees[flight.insureeAddresses[i]];

        if(!passenger.isCredited) {
          uint256 amountToCredit = passenger.insuranceAmount.mul(15).div(10);
          passenger.isCredited = true;
          passenger.payoutAmount = amountToCredit;
          airline.balance = airline.balance.sub(amountToCredit);
        }
      }

      return (airlines[airlineAddress].name, accountsTargetedForCredit);
    }


    /**
     *  @dev Transfers eligible payout funds to insuree
     *
    */
    function pay
                            (
                            )
                            external
                            pure
    {
    }

   /**
    * @dev Initial funding for the insurance. Unless there are too many delayed flights
    *      resulting in insurance payouts, the contract should be self-sustaining
    *
    */
    function fund
                            (
                            )
                            public
                            payable
    {
    }

    function getFlightKey
                        (
                            address airline,
                            bytes32 flight,
                            uint256 timestamp
                        )
                        pure
                        internal
                        returns(bytes32)
    {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

    function getFlightKey
                        (
                            address airline,
                            string memory flight,
                            uint256 timestamp
                        )
                        pure
                        internal
                        returns(bytes32)
    {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

    /**
    * @dev Fallback function for funding smart contract.
    *
    */
    function()
                            external
                            payable
    {
        fund();
    }


}
