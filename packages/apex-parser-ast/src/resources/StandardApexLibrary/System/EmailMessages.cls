/**
 * Use the methods in the EmailMessages class to interact with emails and email threading.
 */
global class EmailMessages {

  global EmailMessages() {}

  global Object clone() {}

  global static String getFormattedThreadingToken(Id recordId) {}

  global static Id getRecordIdFromEmail(String subject, String textBody, String htmlBody) {}

}