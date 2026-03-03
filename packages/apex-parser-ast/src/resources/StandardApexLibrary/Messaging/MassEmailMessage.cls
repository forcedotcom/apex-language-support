/**
 * Contains methods for sending mass email.
 */
global class MassEmailMessage {

  /**
   * The description of the email.
   * @param description 
   */
  public void setDescription(String description) {}

  /**
   * A list of IDs of the contacts, leads, or users to which the email will be sent. The IDs you specify set the context and ensure that merge fields in the template contain the correct data. The objects must be of the same type (all contacts, all leads, or all users).
   * @param targetObjectIds 
   */
  public void setTargetObjectIds(ID [] targetObjectIds) {}

  /**
   * Optional. If you specify a list of contacts for the targetObjectIds field, you can specify a list of whatIds as well. This helps to further ensure that merge fields in the template contain the correct data.
   * @param whatIds 
   */
  public void setWhatIds(ID [] whatIds) {}

}