/**
 * Contains event information that the evaluate method uses to evaluate a transaction security policy.
 */
global class Event {

  global Event() {}

  public String action;

  public Map<String,String> data;

  public String entityId;

  public String entityName;

  public String organizationId;

  public String resourceType;

  public Datetime timeStamp;

  public String userId;

  global Object clone() {}

}