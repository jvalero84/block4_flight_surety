pragma solidity ^0.4.24;

// It's important to avoid vulnerabilities due to numeric overflow bugs
// OpenZeppelin's SafeMath library, when used correctly, protects agains such bugs
// More info: https://www.nccgroup.trust/us/about-us/newsroom-and-events/blog/2018/november/smart-contract-insecurity-bad-arithmetic/

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

/************************************************** */
/* FlightSurety Smart Contract                      */
/************************************************** */
contract FlightSuretyApp {
    using SafeMath for uint256; // Allow SafeMath functions to be called for all uint256 types (similar to "prototype" in Javascript)

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/



    address private contractOwner;          // Account used to deploy contract
    FlightSuretyData flightSuretyData;

    struct Flight {
        bool isRegistered;
        string flightNumber;
        uint8 statusCode;
        uint256 updatedTimestamp;
        address airline;
    }
    mapping(bytes32 => Flight) private flights;
    bytes32[] private flightNames;

    //uint8[] private flightStatusCodes = [STATUS_CODE_UNKNOWN, STATUS_CODE_ON_TIME, STATUS_CODE_LATE_AIRLINE, STATUS_CODE_LATE_WEATHER, STATUS_CODE_LATE_TECHNICAL, STATUS_CODE_LATE_OTHER];

    event airlineFunded(string airline, uint256 balance);
    event insurancePurchased(bytes32 flight, string airline, uint256 airlineBalance, address passenger, uint256 amount);
    event flightInsureesCredited(string flight, string airline, uint256 passengersCredited);
    event insureeCreditWithdrawn(address passenger, uint256 withdrawnAmount);

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
         // Modify to call data contract's status
        require(true, "Contract is currently not operational");
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

    modifier requireOracleRequestSubmitted(uint8 index,
                                            address airline,
                                            string flight,
                                            uint256 timestamp)
    {
      bytes32 key = keccak256(abi.encodePacked(index, airline, flight, timestamp));
      require(oracleResponses[key].isOpen, "No request has been submitted for this flight.");
      _;
    }

    /********************************************************************************************/
    /*                                       CONSTRUCTOR                                        */
    /********************************************************************************************/

    /**
    * @dev Contract constructor
    *
    */
    constructor
                                (
                                  address dataContract
                                )
                                public
    {
        contractOwner = msg.sender;
        flightSuretyData = FlightSuretyData(dataContract);
    }

    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    function isOperational()
                            public
                            pure
                            returns(bool)
    {
        return true;  // Modify to call data contract's status
    }

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/


   /**
    * @dev Add an airline to the registration queue
    *
    */
    function registerAirline
                            (
                              address airline,
                              string name
                            )
                            external
    {
        flightSuretyData.registerAirline(airline, name);
    }

    function fundAirline (
                          address airline
                          )
                          public
                          payable
   {
     var (airlineName, airlineBalance) = flightSuretyData.fundAirline.value(msg.value)(airline);
     emit airlineFunded(airlineName, airlineBalance);
   }

   function voteToRegisterAirline
                           (
                             address airline
                           )
                           public
  {
     flightSuretyData.voteToRegisterAirline(airline);
  }

  function getAirline(address airline)
                      public view
                      returns (bool,bool,string,address,uint256)
  {
    return flightSuretyData.getAirline(airline);
  }


   /**
    * @dev Register a future flight for insuring.
    *
    */
    function registerFlight
                                (
                                  bytes32 flight,
                                  uint256 timestamp
                                )
                                requireIsOperational()
                                public
    {
      flightNames.push(flight);
      flightSuretyData.registerFlight(flight, timestamp);
    }

    function getFlights()
                        requireIsOperational()
                        public view
                        returns (bytes32[])
    {
        return flightNames;
    }

    function buyInsurance (
                              bytes32 flight,
                              address airline
                          )
                          requireIsOperational()
                          public
                          payable
    {
        var (airlineName, flightNumber, airlineBalance) = flightSuretyData.buyInsurance.value(msg.value)(flight, airline);
        emit insurancePurchased(flightNumber, airlineName, airlineBalance, tx.origin, msg.value);
    }

    function withdrawInsureeCredit()
                                    requireIsOperational()
                                    payable
    {
      uint256 withdrawnAmount = flightSuretyData.pay(tx.origin);
      emit insureeCreditWithdrawn(tx.origin, withdrawnAmount);
    }

    function getInsureeFunds(
                                address passengerAddress
                            )
                            requireIsOperational()
                            returns (uint256)
    {
        uint256 insureeFunds = flightSuretyData.getInsureeFunds(passengerAddress);
        return insureeFunds;
    }


   /**
    * @dev Called after oracle has updated flight status
    *
    */
    function processFlightStatus
                                (
                                    uint8 index,
                                    address airline,
                                    string memory flight,
                                    uint256 timestamp,
                                    uint8 statusCode
                                )
                                internal
    {
      //bytes32 key = keccak256(abi.encodePacked(airline, flight, timestamp));
      bytes32 key = keccak256(abi.encodePacked(index, airline, flight, timestamp));
      oracleResponses[key].isOpen = false;
      if(statusCode == 20) {
        var (airlineName, passengersCredited) = flightSuretyData.creditInsurees(flight, airline);
        emit flightInsureesCredited(flight, airlineName, passengersCredited);
      }
    }


    // Generate a request for oracles to fetch flight information
    function fetchFlightStatus
                        (
                            address airline,
                            string flight,
                            uint256 timestamp
                        )
                        external
    {
        uint8 index = getRandomIndex(msg.sender);

        // Generate a unique key for storing the request
        bytes32 key = keccak256(abi.encodePacked(index, airline, flight, timestamp));
        oracleResponses[key] = ResponseInfo({
                                                requester: msg.sender,
                                                isOpen: true
                                            });

        emit OracleRequest(index, airline, flight, timestamp);
    }


// region ORACLE MANAGEMENT

    // Incremented to add pseudo-randomness at various points
    uint8 private nonce = 0;

    // Fee to be paid when registering oracle
    uint256 public constant REGISTRATION_FEE = 1 ether;

    // Number of oracles that must respond for valid status
    uint256 private constant MIN_RESPONSES = 2;


    struct Oracle {
        bool isRegistered;
        uint8[3] indexes;
    }

    // Track all registered oracles
    mapping(address => Oracle) private oracles;

    // Model for responses from oracles
    struct ResponseInfo {
        address requester;                              // Account that requested status
        bool isOpen;                                    // If open, oracle responses are accepted
        mapping(uint8 => address[]) responses;          // Mapping key is the status code reported
                                                        // This lets us group responses and identify
                                                        // the response that majority of the oracles
    }

    // Track all oracle responses
    // Key = hash(index, flight, timestamp)
    mapping(bytes32 => ResponseInfo) private oracleResponses;

    // Event fired each time an oracle submits a response
    event FlightStatusInfo(address airline, string flight, uint256 timestamp, uint8 status);

    event OracleReport(address airline, string flight, uint256 timestamp, uint8 status);

    // Event fired when flight status request is submitted
    // Oracles track this and if they have a matching index
    // they fetch data and submit a response
    event OracleRequest(uint8 index, address airline, string flight, uint256 timestamp);


    // Register an oracle with the contract
    function registerOracle
                            (
                            )
                            external
                            payable
    {
        // Require registration fee
        require(msg.value >= REGISTRATION_FEE, "Registration fee is required");

        uint8[3] memory indexes = generateIndexes(msg.sender);

        oracles[msg.sender] = Oracle({
                                        isRegistered: true,
                                        indexes: indexes
                                    });
    }

    function getMyIndexes
                            (
                            )
                            view
                            external
                            returns (uint8[3])
    {
        require(oracles[msg.sender].isRegistered, "Not registered as an oracle");

        return oracles[msg.sender].indexes;
    }

    function hasConsensusBeenReached (
                                    uint8 index,
                                    address airline,
                                    string flight,
                                    uint256 timestamp,
                                    uint8 statusCode
                                    )
                                    external
                                    returns (bool)
    {
        bytes32 key = keccak256(abi.encodePacked(index, airline, flight, timestamp));
        uint256 responsesCount = oracleResponses[key].responses[statusCode].length;
        if (responsesCount >= MIN_RESPONSES){
          //Once the OracleResponses info will not be needed anymore is time to cleanup for potential subsequent requests of same key..
          cleanupOracleResponses(key);
          return true;
        } else {
          return false;
        }

    }


    // Called by oracle when a response is available to an outstanding request
    // For the response to be accepted, there must be a pending request that is open
    // and matches one of the three Indexes randomly assigned to the oracle at the
    // time of registration (i.e. uninvited oracles are not welcome)
    function submitOracleResponse
                        (
                            uint8 index,
                            address airline,
                            string flight,
                            uint256 timestamp,
                            uint8 statusCode
                        )
                        external
                        //requireOracleRequestSubmitted(index, airline, flight, timestamp)
                        //returns (bool)
    {
        require((oracles[msg.sender].indexes[0] == index) || (oracles[msg.sender].indexes[1] == index) || (oracles[msg.sender].indexes[2] == index), "Index does not match oracle request");


        bytes32 key = keccak256(abi.encodePacked(index, airline, flight, timestamp));
        require(oracleResponses[key].isOpen, "Flight or timestamp do not match oracle request");

        oracleResponses[key].responses[statusCode].push(msg.sender);

        // Information isn't considered verified until at least MIN_RESPONSES
        // oracles respond with the *** same *** information
        emit OracleReport(airline, flight, timestamp, statusCode);
        if (oracleResponses[key].responses[statusCode].length >= MIN_RESPONSES) {

            emit FlightStatusInfo(airline, flight, timestamp, statusCode);

            // Handle flight status as appropriate
            processFlightStatus(index, airline, flight, timestamp, statusCode);

        }
    }

    function emitEventOracleConsensusNotReached(
                                                  uint8 index,
                                                  address airline,
                                                  string flight,
                                                  uint256 timestamp,
                                                  uint8 statusCode
                                               )
                                               external
                                               requireIsOperational()
    {
        emit FlightStatusInfo(airline, flight, timestamp, statusCode);
        bytes32 key = keccak256(abi.encodePacked(index, airline, flight, timestamp));
        cleanupOracleResponses(key);

    }

    function cleanupOracleResponses(
                                      bytes32 flightkey
                                   )
                                   internal
                                   requireIsOperational()
    {
      oracleResponses[flightkey].responses[0] = [address(0)];
      oracleResponses[flightkey].responses[10] = [address(0)];
      oracleResponses[flightkey].responses[20] = [address(0)];
      oracleResponses[flightkey].responses[30] = [address(0)];
      oracleResponses[flightkey].responses[40] = [address(0)];
      oracleResponses[flightkey].responses[50] = [address(0)];
    }


    function getFlightKey
                        (
                            address airline,
                            string flight,
                            uint256 timestamp
                        )
                        pure
                        internal
                        returns(bytes32)
    {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

    // Returns array of three non-duplicating integers from 0-9
    function generateIndexes
                            (
                                address account
                            )
                            internal
                            returns(uint8[3])
    {
        uint8[3] memory indexes;
        indexes[0] = getRandomIndex(account);

        indexes[1] = indexes[0];
        while(indexes[1] == indexes[0]) {
            indexes[1] = getRandomIndex(account);
        }

        indexes[2] = indexes[1];
        while((indexes[2] == indexes[0]) || (indexes[2] == indexes[1])) {
            indexes[2] = getRandomIndex(account);
        }

        return indexes;
    }

    // Returns array of three non-duplicating integers from 0-9
    function getRandomIndex
                            (
                                address account
                            )
                            internal
                            returns (uint8)
    {
        uint8 maxValue = 10;

        // Pseudo random number...the incrementing nonce adds variation
        nonce = nonce + 1;
        uint8 random = uint8(uint256(keccak256(abi.encodePacked(block.timestamp, nonce, account))) % maxValue);

        if (nonce > 250) {
            nonce = 0;  // Can only fetch blockhashes for last 256 blocks so we adapt
        }

        return random;
    }

// endregion

}

contract FlightSuretyData {
  function setOperatingStatus (bool mode) external;
  function registerAirline (address airline, string name) external;
  function fundAirline (address airline) external payable returns (string, uint256);
  function voteToRegisterAirline (address airline) external;
  function registerFlight (bytes32 flightNumber, uint256 timestamp) external;
  function getAirline(address airline) public view returns (bool,bool,string,address,uint256);
  function buyInsurance(bytes32 flight, address airline) external payable returns (string, bytes32, uint256);
  function creditInsurees(string flightNumber, address airlineAddress) external returns (string, uint256);
  function pay(address passenger) external payable returns(uint256);
  function getInsureeFunds(address insureeAddress) view public returns(uint256);

}
