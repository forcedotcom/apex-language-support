/**
 * Contains header fields of Change Data Capture events.
 */
global class ChangeEventHeader {

  global ChangeEventHeader() {}

  global List<String> changedfields;

  global String changeorigin;

  global String changetype;

  global Long commitnumber;

  global Long committimestamp;

  global String commituser;

  global List<String> difffields;

  global String entityname;

  global List<String> nulledfields;

  global List<String> recordids;

  global Integer sequencenumber;

  global String transactionkey;

  global Object clone() {}

}