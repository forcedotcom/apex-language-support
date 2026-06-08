/**
 * Contains header fields of Change Data Capture events.
 */
global class ChangeEventHeader {

  global ChangeEventHeader() {}

  public List<String> changedfields;

  public String changeorigin;

  public String changetype;

  public Long commitnumber;

  public Long committimestamp;

  public String commituser;

  public List<String> difffields;

  public String entityname;

  public List<String> nulledfields;

  public List<String> recordids;

  public Integer sequencenumber;

  public String transactionkey;

  global Object clone() {}

}