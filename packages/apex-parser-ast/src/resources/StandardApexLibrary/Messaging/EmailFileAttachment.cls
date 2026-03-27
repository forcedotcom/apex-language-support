/**
 * EmailFileAttachment is used in SingleEmailMessage to specify attachments passed in as part of the request, as opposed to existing documents in Salesforce.
 */
global class EmailFileAttachment {

  global Blob body;

  global String contenttype;

  global String filename;

  global Id id;

  global Boolean inline;

}