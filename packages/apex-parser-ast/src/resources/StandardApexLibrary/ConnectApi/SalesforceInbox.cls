/**
 * Access information about Automated Activity Capture, which is available in Einstein and Salesforce Inbox.
 */
global class SalesforceInbox {

  global SalesforceInbox() {}

  global static ConnectApi.ActivitySharingResult shareActivity(String activityId, ConnectApi.ActivitySharingInput sharingInfo) {}

  global Object clone() {}

}