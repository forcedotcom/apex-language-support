/**
 * EmailFileAttachment is used in SingleEmailMessage to specify attachments passed in as part of the request, as opposed to existing documents in Salesforce.
 */
global class EmailFileAttachment {

  global EmailFileAttachment() {}

  public Blob body;

  public String contenttype;

  public String filename;

  public Id id;

  public Boolean inline;

  global Object clone() {}

}