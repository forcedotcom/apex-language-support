/**
 * An InboundEmail object stores text attachments in an InboundEmail.TextAttachment object.
 */
global class TextAttachment {

  global String body;

  global Boolean bodyIsTruncated;

  global String charset;

  global String fileName;

  global List headers;

  global String mimeTypeSubType;

}