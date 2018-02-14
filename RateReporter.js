/**
 * @class 
 * @classdesc
 *  A Javascript library to query the message rate between to Solace routers using SEMP
 *  
 *  Pre-requsities:
 *  1. Your message router must have "SEMP over message bus" enabled for this vpn
 *  2. If you are using system wide statistics, for instance MNR rates,
 *     you must have "Management VPN" enabled for the message VPN you are connecting
 *     to (the vpn you specify with setVpnName()).
 *  3. You've already loaded the Solace Javascript library, version 10.0.
 *     
 *     @author Tom Fairbairn, tom.fairbairn@solace.com
 */

var RateReporter = function() {
	// To Do: check the MNR or bridge exists?  If not, delete from list.

	// Top level object
	var reporter = {};
	reporter.session = null;
	reporter.connected = false;
	reporter.receivedUnexpected = false;
	reporter.requests = [];
	reporter.cb = null;
	reporter.rateCb = null;
	reporter.parser = new DOMParser();
	reporter.solaceLogLevel = solace.LogLevel.WARN;
	reporter.internalSolaceFactory = true;
	reporter.interval = 1000;   //  In ms, 1000 = 1 per second
	reporter.timer = null;

	/**
	 * Enum of query type: MNR, Bridge or Callback (user defined query)
	 * @readonly
	 * @enum {number}
	 * @member {enum} RateReporter#queryTypeEnum
	 */
	reporter.queryTypeEnum = ({"MNR":1, "Bridge":2, "Callback":3});
	if (Object.freeze) { Object.freeze(reporter.queryTypeEnum); }
	reporter.queryType = reporter.queryTypeEnum.MNR;

	// Holds router configuration
	var routerConfig = {};
	routerConfig.url = null;
	routerConfig.vpnName = null;
	routerConfig.password = null;
	routerConfig.userName = null;
	routerConfig.myPhysicalName = "solace";
	routerConfig.otherRouterPhysicalNames = [];
	routerConfig.bridgeNames = [];
	routerConfig.userQueries = [];
	routerConfig.version = "soltr/8_7VMR";
	routerConfig.requestTimeOut = 1000; // In ms.

	// An error object for users to query what went wrong.
	var reporterError = {};
	reporterError.text = "";
	reporterError.exceptionText = "";

	/** 
	 * Set the URL of the message router to which you are connecting.  
	 * Required 
	 * @param {string} url - the url of the message router you wish to connect to.
	 * @function RateReporter#setUrl
	 */
	reporter.setUrl 			= function(url) 		{  routerConfig.url = url; };

	/** 
	 * Set the Message VPN name.  This is the Message VPN  that SEMP requests will be made in.
	 * This VPN MUST have SEMP over message bus enabled.  For any system wide statistics, 
	 * e.g. MNR statistics, this must be the "Management VPN"
	 * @param {string} name - the Message VPN name 
	 * @function RateReporter#setVpnName
	 */
	reporter.setVpnName		= function(name) 	{  routerConfig.vpnName = name; };

	/**
	 * Set the password for connecting to the Message VPN.  Only basic authentication is
	 * supported at the moment.  If you've set authentication to none, you can put anything
	 * in here.
	 * Required
	 * @param {string} pass - the Message VPN password
	 *  @function RateReporter#setPassword
	 */
	reporter.setPassword		= function(pass) 	{  routerConfig.password = pass; };

	/**
	 * Set the client username that will be used to connect to the Message VPN.
	 * This is NOT the same as the admin username - it's a messaging client.
	 * Required
	 * @param {string} username - the client user name.
	 * @function RateReporter#setUserName
	 */
	reporter.setUserName	 	= function(username)	{  routerConfig.userName = username; };

	/**
	 * Set the Physical Name of the message router to which you are connecting.  
	 * You can determine this by running the "show router-name" command on the CLI, 
	 * or looking at the name in the management pane of SolAdmin.  Required
	 * @param {string} name - the router's physical name
	 *  @function RateReporter#setPhysicalName
	 */
	reporter.setPhysicalName = function(name)    {  routerConfig.myPhysicalName = name ; };

	/**
	 * Set the SEMP polling period, i.e. how often the router will be queried for statistics.
	 * @default 1000ms = 1s
	 * @param interval {integer} interval - the number of milliseconds to wait before issung a new poll.
	 *  @function RateReporter#setRequestInterval
	 */

	reporter.setRequestInterval = function(interval) { reporter.interval = interval ; };
	/**
	 * Tell RateReporter that you have created your own solace.SolclientFactory.
	 * This is useful if you want to use the factory for all your other connections, or you
	 * wish to configure the factory differently to the defaults.
	 * @default disabled
	 *  @function RateReporter#useExternalSolclientFactory
	 */

	reporter.useExternalSolclientFactory = function() { 
		reporter.internalSolaceFactory = false;
		console.log("RateReporter: WARNING: you are using your own Solace SolclientFactory.  " +
		"Make sure you initialise it, or you will get uncaught exceptions.");
	}

	/**
	 * Adds the physical name of a message router linked to the current message router by MNR to the list
	 * of MNR links that are queried.  
	 * Automatically sets the type of query to MNR.
	 * @param {string} other - The physical name of the other message router whose MNR link you wish to query
	 *  @function RateReporter#addOtherRouterPhysicalName
	 */
	reporter.addOtherRouterPhysicalName = function(other) {
		reporter.queryType = reporter.queryTypeEnum.MNR;
		routerConfig.otherRouterPhysicalNames.push(other); 
	};

	/**
	 * Adds the name of the VPN bridge to the list of those queried.  Automatically sets the type of
	 * query to bridge.
	 * @param {string} bridge - the name of the bridge which will be queried.
	 *  @function RateReporter#addBridgeName
	 */
	reporter.addBridgeName = function(bridge) {
		reporter.queryType = reporter.queryTypeEnum.Bridge;
		routerConfig.bridgeNames.push(bridge); 
	};

	/**
	 * Adds a user defined SEMP query to the list.  The query should be a string of XML in SEMP format.  Omit the
	 * opening and closing <rpc> tags.
	 * Automatically sets the type of query to callback.
	 * @param {string} query - the query to be executed in SEMP v1 XML format without <rpc> tags
	 *  @function RateReporter#addUserQuery
	 */
	reporter.addUserQuery = function(query) {
		reporter.queryType = reporter.queryTypeEnum.Callback;
		routerConfig.userQueries.push(query); 
	};

	/**
	 * Manually override the query type.
	 * The query type is automatically set by {@linkcode RateReporter#addOtherRouterPhysicalName addOtherRouterPhysicalName},
	 * {@linkcode RateReporter#addBridgeName addBridgeName} and 
	 * {@linkcode RateReporter#addUserQuery addUserQuery}.  However, it is possible to have all 3 defined.  In this case
	 * the last method called overrides the others.  If you wish to select another query type, use this.
	 * @param {enum} type - One of {@linkcode RateReporter#queryTypeEnum queryTypeEnum}
	 * @function RateReporter#setQueryType
	 */
	reporter.setQueryType = function(type) {
		if (!reporter.queryTypeEnum.type) {
			reporter.debug("Attempt to set query type to an invalid value (" + type + 
					"), leaving it as " + reporter.queryType);
			console.log("RateReporter: Not a valid query type, ignoring: " + type);
			return;
		}
		reporter.queryType = type;
	};

	/**
	 * Set the callback that will be executed once the query has been parsed.  This is the exit point
	 * of RateReporter: a SEMP query has been issued, the response parsed and a result generated.  This
	 * result is passed to you in this callback.  Your callback prototype should be function(object, rate),
	 * where object is the object queried (bridge name, MNR other physical router, or the XML you specified
	 * in your user define query).  Rate is the result the parsing returned: for MNR and bridge it is the combined
	 * message rate across those, for your user defined query it is whatever you've returned from 
	 * {@linkcode RateReporter#setRateCb setRateCb}
	 * @param {function} cb - the callback function that should be invoked.
	 * @function RateReporter#setCb
	 */
	reporter.setCb 			= function(cb)		{	reporter.cb = cb; }

	/**
	 * Set the callback that is invoked when a user defined query response is received.  This callback should
	 * parse the response and generate a string result.  This string result is passed to
	 * {@linkcode @RateReporter#setCb setCb} along with the full query which generated it.
	 * @param {function} rateCB - a function that takes the SEMP response and parses it
	 * @returns {string} The parsing result, i.e. what output you'd like.  Fed to {@linkcode @RateReporter#setCb setCb}
	 * @function RateReporter#setRateCb
	 */
	reporter.setRateCb		= function(rateCb)	{	reporter.rateCb = rateCb; }

	/**
	 * Sets the Solace Javascript library logging level.  Passed directly to SolclientFactory.setLogLevel.
	 * At solace.LogLevel.DEBUG, extra information is created by RateReporter.
	 * @default solace.LogLevel.DEBUG
	 * @param {enum} level - the logging level from solace.LogLevel
	 * @function RateReporter#setSolaceLogLevel
	 */
	reporter.setSolaceLogLevel = function(level) {	reporter.solaceLogLevel = level; }

	/**
	 * Set the SEMP version string to use. This is used to construct the SEMP request XML.
	 * @default soltr/8_7VMR
	 * @param {string} version - the SEMP XML format version string.
	 * @function RateReporter#setSempVersion
	 */
	reporter.setSempVersion = function(version) 		{	
		if (version.match(/^soltr/)) {
			routerConfig.version = version; 
		} else {
			routerConfig.version = "soltr/" + version;
			reporter.debug("Massageing version string: " +  version + " to " + routerConfig.version);
		} 	  
	}

	/**
	 * Sets the timeout for SEMP requests. 
	 * @default 1000ms = 1s
	 * @param {number} timeOut - how long to wait for a SEMP response
	 * @function RateReporter#setRequestTimeout
	 */
	reporter.setRequestTimeout = function(timeOut) {  routerConfig.requestTimeOut = timeOut; }

	/** 
	 * Get the Router URL set by {@linkcode RateReporter#setUrl}
	 * @returns {string} The router URL
	 * @function RateReporter#getUrl
	 */
	reporter.getUrl 			= function() 	{  return routerConfig.url ; };

	/** 
	 * Get the Router VPN name set by {@linkcode RateReporter#setVpnName}
	 * @returns {string} The VPN name
	 * @function RateReporter#getVpnName
	 */
	reporter.getVpnName		= function() 	{  return routerConfig.vpnName; };

	/** 
	 * Get the Router URL set by {@linkcode RateReporter#setPassword}
	 * @returns {string} The password
	 * @function RateReporter#getPassword
	 */
	reporter.getPassword		= function() 	{  return routerConfig.password; };

	/** 
	 * Get the client user name set by {@linkcode RateReporter#setUserName}
	 * @returns {string} The client user name
	 * @function RateReporter#getUserName
	 */
	reporter.getUserName	 	= function() 	{  return routerConfig.username; };

	/** 
	 * Get the list of VPN bridge names set by {@linkcode RateReporter#addBridgeName}
	 * @returns {(string|list)} The list of VPN bridge names
	 * @function RateReporter#getBridgeNames
	 */
	reporter.getBridgeNames = function()     {  return routerConfig.bridgeNames; };

	/** 
	 * Get the Router SEMP version set by {@linkcode RateReporter#setVersion}
	 * @returns {string} The router SEMP version
	 * @function RateReporter#getVersion
	 */
	reporter.getVersion =     function()		{  return routerConfig.version; };

	/** 
	 * Get the SEMP request timeout value set by {@linkcode RateReporter#setRequestTimeout}
	 * @returns {number} The SEMP request timeout value
	 * @function RateReporter#getREquestTimeOut
	 */
	reporter.getRequestTimeOut =     function()		{  return routerConfig.requestTimeOut; };

	/** 
	 * Get the list of MNR other router physical names set by {@linkcode RateReporter#setOtherRouterPhysicalName}
	 * @returns {(string|list)} The list of other router physical names
	 * @function RateReporter#getOtherRouterPhysicalName
	 */
	reporter.getOtherRouterPhysicalName = function() {  return routerConfig.otherRouterPhysicalNames; };

	/** 
	 * Get the physical name of this router set by {@linkcode RateReporter#setPhysicalName}
	 * @returns {string} This router's physical name
	 * @function RateReporter#getMyPhysicalName
	 */		
	reporter.getMyPhysicalMame = function() {  return routerConfig.myPhysicalName; };

	/** 
	 * Get the error information from the last call.  In the event of an error, call this method to get more 
	 * information.  
	 * @returns {(string|list)} A list of 2 elements: error text, and extended text or exception report
	 * @function RateReporter#getError
	 */
	reporter.getError = function() {  return([reporterError.text, reporterError.exceptionText]); };

	/**
	 * Stops all further SEMP requests.
	 * @function RateReporter#stopRequests
	 */
	reporter.stopRequests = function() {
		if (reporter.timer != null) clearInterval(reporter.timer);
	}

	reporter.debug = function(text) {
		if (reporter.solaceLogLevel == solace.LogLevel.DEBUG) {
			console.log("RateReporter DEBUG: " + text);
		}
	}

	/**
	 * Creates the connection to the Solace message router, then starts polling.
	 * @function RateReporter#connect
	 */
	reporter.connect = function () {

		if (reporter.session !== null) {
			reporter.debug('Already connected.');
			return;
		}
		if (reporter.internalSolaceFactory)  reporter.createSolaceFactory(); 

		// check for valid protocols
		if (routerConfig.url.lastIndexOf('ws://', 0) !== 0 && routerConfig.url.lastIndexOf('wss://', 0) !== 0 &&
				routerConfig.url.lastIndexOf('http://', 0) !== 0 && routerConfig.url.lastIndexOf('https://', 0) !== 0) {
			console.log('RateReporter: Invalid protocol - please use one of ws://, wss://, http://, https://');
			return;
		}

		if (!routerConfig.userName) {
			reporterError.text = "No username specified.  Call RateReporter.setUserName(...)";
			reporterError.exceptionText = "";
			console.log('RateReporter: Cannot connect: please specify username.');
			return;
		} 
		if (!routerConfig.password) {
			reporterError.text = "No password specified.  Call RateReporter.Password(...).  If your VPN doesn't have a password configured, use nonsense.";
			reporterError.exceptionText = "";
			console.log('RateReporter: Cannot connect: please specify password.');
			return;
		} 
		if (!routerConfig.vpnName) {
			reporterError.text = "No VPN specified.  Call RateReporter.setVpnName(...)";
			reporterError.exceptionText = "";
			console.log('RateReporter: Cannot connect: please specify vpn.');
			return;
		}
		if (reporter.queryType == reporter.queryTypeEnum.Callback
				&& reporter.rateCb == null) {
			console.log("RateReporter: You've asked for a user callback query but haven't specified a rate callback.  Call RateReporter.setRateCb first");
			reporterError.text = "No rate callback specified.  Call RateReporter.setRateCb";
			reporterError.text = "";
			return;
		}
		// Create request messages
		reporter.createRequests();

		console.log('RateReporter: Connecting to Solace message router using url: ' + routerConfig.url);
		console.log('RateReporter: Client username: ' + routerConfig.userName);
		console.log('RateReporter: Solace message router VPN name: ' + routerConfig.vpnName);
		// create session
		try {
			reporter.session = solace.SolclientFactory.createSession({
				// solace.SessionProperties
				url:      routerConfig.url,
				vpnName:  routerConfig.vpnName,
				userName: routerConfig.userName,
				password: routerConfig.password,
			});
		} catch (error) {
			reporterError.text = "Failed to create session.  This is unusual - are you out of memory?";
			reporterError.exceptionText = error.toString();
			console.log("RateReporter: Session create failed, exception: " + error.toString());
			return;
		}
		// define session event listeners
		reporter.session.on(solace.SessionEventCode.UP_NOTICE, function (sessionEvent) {        	
			reporter.connected = true;
			console.log('RateReporter: Successfully connected and ready to start the polling statistics');        
			// Start the rate requester
			reporter.timer = setInterval(function() { 
				reporter.request(); 
			}, reporter.interval);
		})

		reporter.session.on(solace.SessionEventCode.CONNECT_FAILED_ERROR, function (sessionEvent) {
			reporter.connected = false;
			reporterError.text = "Failed to connect session.  Check your address, username, password, VPN etc.";
			reporterError.exceptionText = sessionEvent.infoStr;
			console.log('RateReporter: Connection failed to the message router: ' + sessionEvent.infoStr +
			' - check correct parameter values and connectivity!');
		});

		reporter.session.on(solace.SessionEventCode.DISCONNECTED, function (sessionEvent) {
			reporter.debug('Disconnected.');
			reporter.connected = false;
		});

		reporter.session.on(solace.SessionEventCode.SUBSCRIPTION_ERROR, function (sessionEvent) {
			reporter.debug('Cannot subscribe to topic - I wasn\'t expecting to subscribe to anything?: ' + sessionEvent.correlationKey);
		});
		reporter.session.on(solace.SessionEventCode.SUBSCRIPTION_OK, function (sessionEvent) { 
		}); 

		// define message event listener
		reporter.session.on(solace.SessionEventCode.MESSAGE, function (message) {
			if (!reporter.receivedUnexpected) {
				reporter.debug("Received messages, and I wasn't expecting to.  Have I subscribed to something?");
				reporter.receivedUnexpected = true;
			}
		});

		try {
			reporter.session.connect();
		} catch (error) {
			reporterError.text = "Tried to connect the session but got an exception.";
			reporterError.exceptionText = error.toString();
			console.log("RateReporter: error connecting session to Solace router: " + error.toString());
			return;
		}
	};

	/**
	 * Issue the SEMP requests.  Assumes the connection is in place.  You can manuall call this 
	 * to issue individual requests, or call it via setTimeout (delay) or setInterval (polling)
	 * @function RateReporter#request
	 */
	reporter.request = function() {
		if (!reporter.connected) {
			reporter.debug("Session disconnected, not sending SEMP requests");
			return;
		}
		reporter.debug("Process " + reporter.requests.length + " requests");
		var reportedOn = null;
		reporter.requests.forEach(function(request) {
			try {
				reporter.session.sendRequest(
						request.message, 
						routerConfig.requestTimeOut, 
						function(session, message) {
							reporter.debug("SEMP Response: " + message.getBinaryAttachment());
							switch (reporter.queryType) {
							case reporter.queryTypeEnum.MNR:
								rate = reporter.parseResponseMnr(message.getBinaryAttachment());
								reportedOn = request.router;
								break;
							case reporter.queryTypeEnum.Bridge:
								rate = reporter.parseResponseBridge(message.getBinaryAttachment());
								reportedOn = request.bridge;
								break;
							case reporter.queryTypeEnum.Callback:
								rate = reporter.rateCb(message.getBinaryAttachment());
								reportedOn = request.query;
								break;
							}

							reporter.debug("Extracted rate: " + rate);
							reporter.cb(reportedOn, rate);
						},
						// Failure Callback
						function(session, error) {
							console.log("Request fail callback failed for message: " + request.message.dump() + 
									" error: " + error.toString());
							reporterError.text = "Request fail callback failed for message: " + request.message.dump();
							reporterError.exceptionText = error.toString();
						}
				);
			} catch (error) {
				reporterError.text = "Failed to send SEMP request";
				reporterError.exceptionText = error.toString();
				console.log("RateReporter: Failed to send SEMP request: " + error.toString());
				return;
			}
		}); 	 
	}

	/** 
	 * Call when you have no more need of the connection to the router.
	 * @function RateReporter#finish
	 */
	reporter.finish = function() {
		reporter.stopRequests();
		reporter.session.disconnect();
		reporter.session.dispose();
	}

	reporter.createRequests = function() { 
		var msg = null;
		if (reporter.queryType == reporter.queryTypeEnum.MNR) {
			routerConfig.otherRouterPhysicalNames.forEach(function(router) {
				reporter.debug("SEMP query for router: " + router);
				msg = reporter.creqteQueryMessage("<rpc semp-version='" + routerConfig.version + 
						"'> <show> <cspf> <neighbor> <physical-router-name>" + 
						router + "</physical-router-name> <stats></stats> </neighbor> </cspf> </show> </rpc>");
				reporter.requests.push({"router" : router, "message" : msg});
			}) ;
		}
		if (reporter.queryType == reporter.queryTypeEnum.Bridge) {
			routerConfig.bridgeNames.forEach(function(bridge) {
				reporter.debug("SEMP query for bridge: " + bridge);
				msg = reporter.createQueryMessage(
						"<rpc semp-version='" + routerConfig.version + 
						"'> <show> <bridge> <bridge-name-pattern>" + bridge + "</bridge-name-pattern>"+
						"<vpn-name-pattern>" + routerConfig.vpnName + "</vpn-name-pattern><stats/></bridge></show> </rpc>"
				);
				reporter.requests.push({"bridge" : bridge, "message" : msg});
			}) ;
		}
		if (reporter.queryType == reporter.queryTypeEnum.Callback) {
			// Call user code to create query
			routerConfig.userQueries.forEach(function(query) {
				reporter.debug("SEMP query for user callback: " + query);
				var fullQuery = "<rpc semp-version='" + routerConfig.version + "'>" + query + "</rpc>";
				msg = reporter.createQueryMessage(fullQuery);
				reporter.requests.push({"query" : query, "message" : msg});
			});
		}
	}
	
	// Internal functions.

	reporter.createQueryMessage = function(query) {
		reporter.debug("Message text: " + query);
		var msg = solace.SolclientFactory.createMessage();
		msg.setDestination(solace.SolclientFactory.createTopic('#SEMP/' + routerConfig.myPhysicalName + '/SHOW'));
		msg.setDeliveryMode(solace.MessageDeliveryModeType.DIRECT);
		msg.setBinaryAttachment(query);
		return msg;
	}

	reporter.parseResponseMnr = function(xml) {
		var xmlDoc = reporter.parser.parseFromString(xml, "text/xml");
		if (xmlDoc == null) { 
			reporterError.text = "Failed to parse SEMP xml MNR response";
			reporterError.exceptionText = xml;
			console.log ("RateReporter: Can't parse MNR reply: " + xml); 
			return 0; 
		}
		var rateTag = xmlDoc.getElementsByTagName("current-message-rate-messages-per-second")[0];
		if (rateTag == null) { 
			reporterError.text = "Failed to parse SEMP xml MNR Rate Tag";
			reporterError.exceptionText = xml;
			console.log ("RateReporter: Can't parse MNR Rate Tag.  Do you have any objects (e.g. CSPF neighbours/bridges?" + xml); 
			return 0; 
		}
		var ingressRate = rateTag.childNodes[1].childNodes[0].nodeValue;
		if (ingressRate == null) { 
			reporterError.text = "Failed to parse SEMP xml MNR ingressRate";
			reporterError.exceptionText = xml;
			console.log ("RateReporter: Can't parse MNR ingressRate"); 
			return 0; 
		}
		var egressRate = rateTag.childNodes[3].childNodes[0].nodeValue;
		if (egressRate == null) { 
			reporterError.text = "Failed to parse SEMP xml MNR response";
			reporterError.exceptionText = xml;
			console.log ("RateReporter: Can't parse MNR egressRate"); 
			return 0; 
		}
		var rate = parseInt(ingressRate) + parseInt(egressRate);
		return rate; 
	}

	reporter.parseResponseBridge = function(xml) {
		reporter.debug("XML response: " + xml);
		var xmlDoc = reporter.parser.parseFromString(xml, "text/xml");
		if (xmlDoc == null) { 
			reporterError.text = "Failed to parse SEMP xml bridge response";
			reporterError.exceptionText = xml;
			console.log ("RateReporter: Can't parse bridge reply: " + xml); 
			return 0; 
		}
		var ingressRateTag = xmlDoc.getElementsByTagName("current-ingress-rate-per-second")[0];
		if (ingressRateTag == null) { 
			reporterError.text = "RateReporter: Failed to parse SEMP xml Bridge Ingress Rate Tag";
			reporterError.exceptionText = xml;
			console.log ("RateReporter: Can't parse Bridge Ingress Rate Tag.  Do you have any objects (e.g. CSPF neighbours/bridges?" + xml); 
			return 0; 
		}
		var ingressRate = ingressRateTag.childNodes[0].nodeValue;

		var egressRateTag = xmlDoc.getElementsByTagName("current-egress-rate-per-second")[0];
		if (egressRateTag == null) { 
			reporterError.text = "Failed to parse SEMP xml Bridge Egress Rate Tag";
			reporterError.exceptionText = xml;
			console.log ("RateReporter: Can't parse Bridge Egress Rate Tag.  Do you have any objects (e.g. CSPF neighbours/bridges?" + xml); 
			return 0; 
		}
		var egressRate = egressRateTag.childNodes[0].nodeValue;
		reporter.debug("Ingress rate: " + ingressRate + " egress rate: " + egressRate);
		return parseInt(ingressRate) + parseInt(egressRate);
	}

	reporter.createSolaceFactory = function() {
		// Initialize factory with the most recent API defaults
		var factoryProps = new solace.SolclientFactoryProperties();
		// This library is written against version 10.0 of the Solace Javascript API.  Previous versions
		// aren't supported.
		factoryProps.profile = solace.SolclientFactoryProfiles.version10;
		try {
			solace.SolclientFactory.init(factoryProps);
		} catch (error) {
			console.log("RateReporter: Failed to initialise the Solace SolclientFactory: " + error.toString());
			reporterError.text = "Failed to initialise the Solace library";
			reporterError.exceptionText = error.toString();
			return;
		}

		// enable logging to JavaScript console at WARN level
		// NOTICE: works only with "solclientjs-debug.js"
		solace.SolclientFactory.setLogLevel(reporter.solaceLogLevel);
		reporter.internalSolaceFactory = true;
	}

	return reporter;
}