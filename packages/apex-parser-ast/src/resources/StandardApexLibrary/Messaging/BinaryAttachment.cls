/**
 * An InboundEmail object stores binary attachments in an InboundEmail.BinaryAttachment object.
 */
global class BinaryAttachment {

  global Blob body;

  global String fileName;

  global List headers;

  global String mimeTypeSubType;

}