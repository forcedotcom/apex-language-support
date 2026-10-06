/**
 * Contains methods to obtain the request ID and Quiddity value of the current Salesforce request.
 * Usage
 * Use the Request class to detect the current Apex context at runtime. The methods in the Request class obtain a unique request ID and the Quiddity value that represent the current Apex execution type. These values can also be used to correlate with debug and event logs.
 * The request ID represents an individual transaction, but may not be universally unique. The request ID is present in the debug logs that are triggered by the request.
 * The request ID and Quiddity values are the same as in the event log files of the Apex Execution event type used in Event Monitoring.
 * Example
 * This example code shows how to obtain current Apex code context by retrieving the request ID and Quiddity value of the current request.
 * //Get info about the current request
 * Request reqInfo = Request.getCurrent();
 *
 * //Get the identifier for this request, which is universally unique
 * //Same as REQUEST_ID in event monitoring
 * String currentRequestId = reqInfo.getRequestId();
 *
 * //Enum representing how Apex is running. e.g. BULK_API vs LIGHTNING
 * Quiddity currentType = reqInfo.getQuiddity();
 * //Use this with a switch statement,
 * //instead of checking System.isFuture() || System.isQueueable() || ...
 */
global abstract with sharing class Request {
    global Request() { }

    global virtual Boolean equals(Object o) { return false; }

    /**
     * Returns the current Request object that contains the request ID and Quiddity value.
     */
    global static System.Request getCurrent() { return null; }

    /**
     * Returns the Quiddity value of the current Request object.
     * @return Uses the values from the Quiddity enum. This value identifies the type of execution event associated with the current request.
     */
    global abstract System.Quiddity getQuiddity();

    /**
     * Returns the request ID of the current Request object.
     */
    global abstract String getRequestId();

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}