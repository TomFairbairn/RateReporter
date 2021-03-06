RateReporter Solace Message Rate Reporting Library
==================================================

RateReporter is a simple Javascript library designed to make querying Solace routers for activity information simpler, especially from web pages.

RateReporter:
1. Opens a [Web Socket](https://en.wikipedia.org/wiki/WebSocket) client connection to the message router, using the Solace Javascript messaging API;
2. Periodically polls the message router with a pre-formatted SEMP v1 request, using SEMP over the message bus;
3. Parses the XML response;
4. Returns the parsed response result to you via a callback.  This is typically a message rate - say the message rate over a VPN bridge.

In order for the SEMP response to be visible via a client connection, ensure [SEMP over message bus](https://docs.solace.com/Configuring-and-Managing-Routers/Configuring-VPNs.htm#SEMP-MBus) is enabled in the Message VPN to which you are connecting. Some statistics, for instance MNR message rates, are considered system level.  In these cases you must make sure your message VPN is the [Management Message VPN.](https://docs.solace.com/Configuring-and-Managing-Routers/Configuring-VPNs.htm?#Designate-Mgmt-VPNs)

Installation
-----------

Download the Solace Javascript API - you will need to include this in your HTML. [test.html](test.html) shows you how to do this.

Then, Simply include RateReporter.js in your html or however you wish to reference it.  The file [test.html](test.html) shows a simple installation - you can either just download the file directory or clone the whole repo.

You will need to be able to connect the message VPN you want to use, and this message VPN must have the correct Semp over the message bus permissions mentioned above.

Query Types
-----------

There are two canned query types, and a user-defined query:
1. MNR.  This queries the MNR link to an OtherRouterPhysicalName for the message rates.  A list of physical router names is provided by calling RateReporter.addOtherRouterPhysicalName for each name.
2. VPN bridges.  Just as for MNR links, VPN bridge client statistics are returned for each VPN bridge added with RateReporter.addBridgeName
3. There is also a user defined query mechanism.  To use this, configure the query you wish to issue using RateReporter.addUserQuery.  These queries should be SEMP XML format strings, without the <rpc> tags.  You must then set the rate callback with RateReporter.setRateCb.

Using the library
-----------------

1. Configure the connection with methods such as RateReporter.setUrl.
2. Configure the SEMP queries using RateReporter.addOtherRouterPhysicalName, RateReporter.addBridgeName or RateReporter.addUserQuery.
3. If you're using a user defined query, set the rate callback to parse the response with RateReporter.setRateCb.
4. Set up the callback that will be invoked with the results with RateReporter.setCb.  This is where you'll do your work: updaing the DOM, for instance, with your rates.
5. Call connect.  This will start polling as soon as the connection is established
6. Once you've finished (if you have), you can either call RateReporter.finish to close the connection, or RateReporter.stopRequests if you want to stop the SEMP requests but continue using the connection.
7. To re-start polling, use RateReporter.request.  Use normal Javascript mechanisms to schedule this, e.g. setInterval(...).

Reference manual
---------

1. See [Github markdown reference](RateReporter.md)
2. Or you can generate HTML directly from the source using [jsdoc](http://usejsdoc.org/)

Notes on SEMP
----------

RateReporter uses SEMP v1.  This is because SEMP v2 isn't yet able to get the required statistics.  Once SEMP v2 is able to do this, I will re-write this library.  It will be a lot easier!

RateReporter uses SEMP over the message bus.  Rather than sending a SEMP request over http, it connects as a normal messaging client and uses the Javascript API to send in the SEMP requests just like a normal message, using the request-reply pattern.  This has the advantage of only needing normal client permissions, rather than the admin permissions needed for SEMP over http.
