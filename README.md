RateReporter Solace Message Rate Reporting Library
==================================================

RateReporter is a simple Javascript library designed to make querying Solace routers for activity information simpler, especially from web pages.

RateReporter:
1. Opens a client connection to the message router;
2. Periodically polls the message router with a pre-formatted SEMP v1 request;
3. Parses the XML response;
4. Returns the parsed response result to you via a callback.  This is typically a message rate - say the message rate over a VPN bridge.

In order for the SEMP response to be visible via a client connection, ensure [SEMP over message bus](https://docs.solace.com/Configuring-and-Managing-Routers/Configuring-VPNs.htm#SEMP-MBus) is enabled in the Message VPN to which you are connecting. Some statistics, for instance MNR message rates, are considered system level.  In these cases you must make sure your message VPN is the [Management Message VPN.](https://docs.solace.com/Configuring-and-Managing-Routers/Configuring-VPNs.htm?#Designate-Mgmt-VPNs)

Query Types
-----------

There are two canned query types:
1. MNR.  This queries the MNR link to an OtherRouterPhysicalName for the message rates.  A list of physical router names is provided by calling <RateReporter.html#addOtherRouterPhysicalName> for each name.
2. VPN bridges.  Just as for MNR links, VPN bridge client statistics are returned for each VPN bridge added with <RateReporter.html#addBridgeName>

There is also a user defined query mechanism.  To use this, configure the query you wish to issue using <RateReporter.html#addUserQuery>.  These queries should be SEMP XML format strings, without the <rpc> tags.  You must then set the rate callback with <RateReporter.html#setRateCb>.

Using the library
-----------------

1. Configure the connection with methods such as <RateReporter.html#setUrl>.
2. Configure the SEMP queries using <RateReporter.html#addOtherRouterPhysicalName>, <RateReporter.html#addBridgeName> or <RateReporter.html#addUserQuery>.
3. If you're using a user defined query, set the rate callback to parse the response with <RateReporter.html#setRateCb>.
4. Set up the callback that will be invoked with the results with <RateReporter.html#setCb>.  This is where you'll do your work: updaing the DOM, for instance, with your rates.
5. Call connect.  This will start polling as soon as the connection is established
6. Once you've finished (if you have), you can either call <RateReporter.html#finish> to close the connection, or <RateReporter.html#stopRequests> if you want to stop the SEMP requests but continue using the connection.
7. To re-start polling, use <RateReporter.html#request>.  Use normal Javascript mechanisms to schedule this, e.g. setInterval(...).

