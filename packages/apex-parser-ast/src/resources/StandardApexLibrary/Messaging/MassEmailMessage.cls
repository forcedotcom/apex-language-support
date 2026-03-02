/**
 * Contains methods for sending mass email.
 */
public class MassEmailMessage {

  /**
   * The description of the email.
   * @param description 
   * @return Void
   */
  public Void setDescription(String description) {}

  /**
   * A list of IDs of the contacts, leads, or users to which the email will be sent. The IDs you specify set the context and ensure that merge fields in the template contain the correct data. The objects must be of the same type (all contacts, all leads, or all users).
   * @param targetObjectIds 
   * @return Void
   */
  public Void setTargetObjectIds(ID [] targetObjectIds) {}

  /**
   * Optional. If you specify a list of contacts for the targetObjectIds field, you can specify a list of whatIds as well. This helps to further ensure that merge fields in the template contain the correct data.
   * @param whatIds 
   * @return Void
   */
  public Void setWhatIds(ID [] whatIds) {}

}