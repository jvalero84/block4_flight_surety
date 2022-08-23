
var Test = require('../config/testConfig.js');
var BigNumber = require('bignumber.js');

contract('Flight Surety Tests', async (accounts) => {

  var config;
  before('setup contract', async () => {
    config = await Test.Config(accounts);
    await config.flightSuretyData.authorizeCaller(config.flightSuretyApp.address);
  });

  /****************************************************************************************/
  /* Operations and Settings                                                              */
  /****************************************************************************************/

  it(`(multiparty) has correct initial isOperational() value`, async function () {

    // Get operating status
    let status = await config.flightSuretyData.isOperational.call();
    assert.equal(status, true, "Incorrect initial operating status value");

  });

  it(`(multiparty) can block access to setOperatingStatus() for non-Contract Owner account`, async function () {

      // Ensure that access is denied for non-Contract Owner account
      let accessDenied = false;
      try
      {
          await config.flightSuretyData.setOperatingStatus(false, { from: config.testAddresses[2] });
      }
      catch(e) {
          accessDenied = true;
      }
      assert.equal(accessDenied, true, "Access not restricted to Contract Owner");

  });

  it(`(multiparty) can allow access to setOperatingStatus() for Contract Owner account`, async function () {

      // Ensure that access is allowed for Contract Owner account
      let accessDenied = false;
      try
      {
          await config.flightSuretyData.setOperatingStatus(false);
      }
      catch(e) {
          accessDenied = true;
      }
      assert.equal(accessDenied, false, "Access not restricted to Contract Owner");

  });

  it(`(multiparty) can block access to functions using requireIsOperational when operating status is false`, async function () {

      await config.flightSuretyData.setOperatingStatus(false);

      let reverted = false;
      try
      {
          await config.flightSuretyData.authorizeCaller(config.testAddresses[2], { from: config.owner });
      }
      catch(e) {
          reverted = true;
      }
      assert.equal(reverted, true, "Access not blocked for requireIsOperational");

      // Set it back for other tests to work
      await config.flightSuretyData.setOperatingStatus(true);

  });

  it('(airline) cannot register an Airline using registerAirline() if it is not funded', async () => {

    // ARRANGE
    let newAirline = accounts[2];

    // ACT
    try {
        await config.flightSuretyApp.registerAirline(newAirline, 'newAirline', {from: config.firstAirline});
    }
    catch(e) {

    }
    let result = await config.flightSuretyData.isAirline.call(newAirline);

    // ASSERT
    assert.equal(result, false, "Airline should not be able to register another airline if it hasn't provided funding");


    await config.flightSuretyApp.fundAirline(newAirline, {from: newAirline, value: 1000000000000000000});

    let result2 = await config.flightSuretyData.isAirline.call(newAirline);

    assert.equal(result2, true, "Airline should become active once funding provided");

    //let fundedAirline = await config.flightSuretyData.getAirline.call(newAirline);
    //console.log(`fundedAirline ${fundedAirline}`);

    let newerAirline = accounts[3];

    try {
        await config.flightSuretyApp.registerAirline(newerAirline, 'newerAirline', {from: newAirline});
    }
    catch(e) {

    }

    let res2 = await config.flightSuretyData.getAirline.call(newerAirline);
    assert.equal(res2[0], true, 'Airline should have been registered'); //res[0] --> isRegistered
    assert.equal(res2[1], false, 'Airline should not be active until funding provided'); //res[1] --> isActive

  });

  it('(airline) Only existing airline may register a new airline until there are at least four airlines registered', async () => {

    // ARRANGE
    let newAirline = accounts[4];

    // ACT
    try {
        await config.flightSuretyApp.registerAirline(newAirline, 'airlineNew', {from: accounts[3]});
    }
    catch(e) {
      //console.log(e);
    }
    //The above attempt of registration should have failed, lets check the airline was not registered..
    let airlineCheck = await config.flightSuretyData.getAirline.call(newAirline);
    assert.equal(airlineCheck[2], '', 'Airline should not be registered.'); //res[0] --> isRegistered

    // Register 2 more airlines...
    try {
        await config.flightSuretyApp.registerAirline(accounts[5], 'airline2', {from: config.firstAirline});
        await config.flightSuretyApp.registerAirline(accounts[6], 'airline3', {from: config.firstAirline});
        //await config.flightSuretyApp.registerAirline(accounts[6], 'airline4', {from: config.firstAirline});
    }
    catch(e) {
      console.log(e);
    }

    // Fund the just registered airlines so that they become active..
    try {
      await config.flightSuretyApp.fundAirline(accounts[5], {from: accounts[5], value: 1000000000000000000});
      //let actAirlinesCounter = await config.flightSuretyData.getActiveAirlinesCounter.call();
      //console.log(`actAirlinesCounter ${actAirlinesCounter}`);
      await config.flightSuretyApp.fundAirline(accounts[6], {from: accounts[6], value: 1000000000000000000});
      // actAirlinesCounter = await config.flightSuretyData.getActiveAirlinesCounter.call();
      //console.log(`actAirlinesCounter ${actAirlinesCounter}`);
      //await config.flightSuretyApp.fundAirline(accounts[4], {from: accounts[4], value: 1000000000000000000});
      // actAirlinesCounter = await config.flightSuretyData.getActiveAirlinesCounter.call();
      //console.log(`actAirlinesCounter ${actAirlinesCounter}`);
    }
    catch(e) {
      console.log(e);
    }

    try {
        await config.flightSuretyApp.registerAirline(accounts[7], 'airline7', {from: accounts[7]});
    }
    catch(e) {
      console.log(e);
    }

    actAirlinesCounter = await config.flightSuretyData.getActiveAirlinesCounter.call();
    console.log(`actAirlinesCounter ${actAirlinesCounter}`);

    let lastAirline = await config.flightSuretyData.getAirline.call(accounts[7]);
    assert.equal(lastAirline[0], false, 'Airline should have not been registered'); //res[0] --> isRegistered
    assert.equal(lastAirline[1], false, 'Airline should not be active until funding provided and consensus reached'); //res[1] --> isActive
    assert.equal(lastAirline[3], accounts[7], 'Airline should not be yet active not registered but open for consensus voting'); //res[1] --> isActive



  });

  it('Registration of fifth and subsequent airlines requires multi-party consensus of 50% of registered airlines', async () => {

    // ARRANGE: At this stage we should have already 4 active airlines from previous test.


    // ACT
    // Register the next airline that will have to get consensus from the existing active airlines to become active.
    // As we already have 4 active airlines, this same airline should be able to call itself the registration method to become open for voting...
    try {
        await config.flightSuretyApp.registerAirline(accounts[8], 'airline8', {from: accounts[8]});
    }
    catch(e) {
      console.log(e);
    }

    let lastAirline = await config.flightSuretyData.getAirline.call(accounts[8]);
    assert.equal(lastAirline[3], accounts[8], 'Airline should be open for consensus voting');

    //Since we need 50% of consensus to register the airline and we have 4 active airlines, two active airlines voting for our last added airline should suffice.

    await config.flightSuretyData.voteToRegisterAirline(accounts[8], {from: accounts[5]});

    //Lets check that the same active airline cannot vote again for the same airline..
    try{
      await config.flightSuretyData.voteToRegisterAirline(accounts[8], {from: accounts[5]});
    }
    catch(e){
      //console.log(e);
    }

    await config.flightSuretyData.voteToRegisterAirline(accounts[8], {from: accounts[6]});
    lastAirline = await config.flightSuretyData.getAirline.call(accounts[8]);
    assert.equal(lastAirline[0], true, 'Airline should be registered after consensus reached'); //res[0] --> isRegistered
    assert.equal(lastAirline[1], false, 'Airline should not be active until funding provided'); //res[1] --> isActive

    await config.flightSuretyApp.fundAirline(accounts[8], {from: accounts[8], value: 1000000000000000000});

    lastAirline = await config.flightSuretyData.getAirline.call(accounts[8]);
    assert.equal(lastAirline[1], true, 'Airline should be active'); //res[1] --> isActive

    let actAirlinesCounter = await config.flightSuretyData.getActiveAirlinesCounter.call();
    console.log(`actAirlinesCounter ${actAirlinesCounter}`);

  });


});
