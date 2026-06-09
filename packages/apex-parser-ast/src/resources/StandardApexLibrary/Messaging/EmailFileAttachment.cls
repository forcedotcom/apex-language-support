/**
 * EmailFileAttachment is used in SingleEmailMessage to specify attachments passed in as part of the request, as opposed to existing documents in Salesforce.
 */
global class EmailFileAttachment {

  global EmailFileAttachment() {}

  global Blob body;

  global String contenttype;

  global String filename;

  global Id id;

  global Boolean inline;

  global Blob getBody() {}

  global String getContentType() {}

  global String getFileName() {}

  global Id getId() {}

  global Boolean getInline() {}

  global void setBody(Blob arg0) {}

  global void setContentType(String arg0) {}

  global void setFileName(String arg0) {}

  global void setInline(Boolean arg0) {}

  global Object clone() {}

}