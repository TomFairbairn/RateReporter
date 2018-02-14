# Global





* * *

## Class: RateReporter


**queryTypeEnum**: `number` , Enum of query type: MNR, Bridge or Callback (user defined query)
### RateReporter.setUrl(url) 

Set the URL of the message router to which you are connecting.  
Required

**Parameters**

**url**: `string`, the url of the message router you wish to connect to.


### RateReporter.setVpnName(name) 

Set the Message VPN name.  This is the Message VPN  that SEMP requests will be made in.
This VPN MUST have SEMP over message bus enabled.  For any system wide statistics, 
e.g. MNR statistics, this must be the "Management VPN"

**Parameters**

**name**: `string`, the Message VPN name


### RateReporter.setPassword(pass) 

Set the password for connecting to the Message VPN.  Only basic authentication is
supported at the moment.  If you've set authentication to none, you can put anything
in here.
Required

**Parameters**

**pass**: `string`, the Message VPN password


### RateReporter.setUserName(username) 

Set the client username that will be used to connect to the Message VPN.
This is NOT the same as the admin username - it's a messaging client.
Required

**Parameters**

**username**: `string`, the client user name.


### RateReporter.setPhysicalName(name) 

Set the Physical Name of the message router to which you are connecting.  
You can determine this by running the "show router-name" command on the CLI, 
or looking at the name in the management pane of SolAdmin.  Required

**Parameters**

**name**: `string`, the router's physical name


### RateReporter.setRequestInterval(interval) 

Set the SEMP polling period, i.e. how often the router will be queried for statistics.

**Parameters**

**interval**: `integer`, interval - the number of milliseconds to wait before issung a new poll.


### RateReporter.useExternalSolclientFactory() 

Tell RateReporter that you have created your own solace.SolclientFactory.
This is useful if you want to use the factory for all your other connections, or you
wish to configure the factory differently to the defaults.


### RateReporter.addOtherRouterPhysicalName(other) 

Adds the physical name of a message router linked to the current message router by MNR to the list
of MNR links that are queried.  
Automatically sets the type of query to MNR.

**Parameters**

**other**: `string`, The physical name of the other message router whose MNR link you wish to query


### RateReporter.addBridgeName(bridge) 

Adds the name of the VPN bridge to the list of those queried.  Automatically sets the type of
query to bridge.

**Parameters**

**bridge**: `string`, the name of the bridge which will be queried.


### RateReporter.addUserQuery(query) 

Adds a user defined SEMP query to the list.  The query should be a string of XML in SEMP format.  Omit the
opening and closing <rpc> tags.
Automatically sets the type of query to callback.

**Parameters**

**query**: `string`, the query to be executed in SEMP v1 XML format without <rpc> tags


### RateReporter.setQueryType(type) 

Manually override the query type.
The query type is automatically set by {@linkcode RateReporter#addOtherRouterPhysicalName addOtherRouterPhysicalName},
{@linkcode RateReporter#addBridgeName addBridgeName} and 
{@linkcode RateReporter#addUserQuery addUserQuery}.  However, it is possible to have all 3 defined.  In this case
the last method called overrides the others.  If you wish to select another query type, use this.

**Parameters**

**type**: `enum`, One of {@linkcode RateReporter#queryTypeEnum queryTypeEnum}


### RateReporter.setCb(cb) 

Set the callback that will be executed once the query has been parsed.  This is the exit point
of RateReporter: a SEMP query has been issued, the response parsed and a result generated.  This
result is passed to you in this callback.  Your callback prototype should be function(object, rate),
where object is the object queried (bridge name, MNR other physical router, or the XML you specified
in your user define query).  Rate is the result the parsing returned: for MNR and bridge it is the combined
message rate across those, for your user defined query it is whatever you've returned from 
{@linkcode RateReporter#setRateCb setRateCb}

**Parameters**

**cb**: `function`, the callback function that should be invoked.


### RateReporter.setRateCb(rateCB) 

Set the callback that is invoked when a user defined query response is received.  This callback should
parse the response and generate a string result.  This string result is passed to
{@linkcode @RateReporter#setCb setCb} along with the full query which generated it.

**Parameters**

**rateCB**: `function`, a function that takes the SEMP response and parses it

**Returns**: `string`, The parsing result, i.e. what output you'd like.  Fed to {@linkcode @RateReporter#setCb setCb}

### RateReporter.setSolaceLogLevel(level) 

Sets the Solace Javascript library logging level.  Passed directly to SolclientFactory.setLogLevel.
At solace.LogLevel.DEBUG, extra information is created by RateReporter.

**Parameters**

**level**: `enum`, the logging level from solace.LogLevel


### RateReporter.setSempVersion(version) 

Set the SEMP version string to use. This is used to construct the SEMP request XML.

**Parameters**

**version**: `string`, the SEMP XML format version string.


### RateReporter.setRequestTimeout(timeOut) 

Sets the timeout for SEMP requests.

**Parameters**

**timeOut**: `number`, how long to wait for a SEMP response


### RateReporter.getUrl() 

Get the Router URL set by {@linkcode RateReporter#setUrl}

**Returns**: `string`, The router URL

### RateReporter.getVpnName() 

Get the Router VPN name set by {@linkcode RateReporter#setVpnName}

**Returns**: `string`, The VPN name

### RateReporter.getPassword() 

Get the Router URL set by {@linkcode RateReporter#setPassword}

**Returns**: `string`, The password

### RateReporter.getUserName() 

Get the client user name set by {@linkcode RateReporter#setUserName}

**Returns**: `string`, The client user name

### RateReporter.getBridgeNames() 

Get the list of VPN bridge names set by {@linkcode RateReporter#addBridgeName}

**Returns**: `string | list`, The list of VPN bridge names

### RateReporter.getVersion() 

Get the Router SEMP version set by {@linkcode RateReporter#setVersion}

**Returns**: `string`, The router SEMP version

### RateReporter.getREquestTimeOut() 

Get the SEMP request timeout value set by {@linkcode RateReporter#setRequestTimeout}

**Returns**: `number`, The SEMP request timeout value

### RateReporter.getOtherRouterPhysicalName() 

Get the list of MNR other router physical names set by {@linkcode RateReporter#setOtherRouterPhysicalName}

**Returns**: `string | list`, The list of other router physical names

### RateReporter.getMyPhysicalName() 

Get the physical name of this router set by {@linkcode RateReporter#setPhysicalName}

**Returns**: `string`, This router's physical name

### RateReporter.getError() 

Get the error information from the last call.  In the event of an error, call this method to get more 
information.

**Returns**: `string | list`, A list of 2 elements: error text, and extended text or exception report

### RateReporter.stopRequests() 

Stops all further SEMP requests.


### RateReporter.connect() 

Creates the connection to the Solace message router, then starts polling.


### RateReporter.request() 

Issue the SEMP requests.  Assumes the connection is in place.  You can manuall call this 
to issue individual requests, or call it via setTimeout (delay) or setInterval (polling)


### RateReporter.finish() 

Call when you have no more need of the connection to the router.




* * *










