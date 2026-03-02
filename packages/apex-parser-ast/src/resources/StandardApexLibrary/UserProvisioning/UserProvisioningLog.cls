/**
 * Provides methods for writing messages to monitor outbound user provisioning requests.
 */
public class UserProvisioningLog {

  /**
   * Writes a specific message, such as an error message, to monitor the progress of a user provisioning request.
   * @param userProvisioningRequestId A unique identifier for the user provisioning request.
   * @param details The text for the message.
   */
  public void log(String userProvisioningRequestId, String details) {}

  /**
   * Writes a specific message, such as an error message, to monitor the progress of a user provisioning request.
   * @param userProvisioningRequestId A unique identifier for the user provisioning request.
   * @param status 
   * @param details The text for the message.
   */
  public void log(String userProvisioningRequestId, String status, String details) {}

  /**
   * Writes a specific message, such as an error message, to monitor the progress of a user provisioning request.
   * @param userProvisioningRequestId A unique identifier for the user provisioning request.
   * @param externalUserId 
   * @param externalUserName 
   * @param userId 
   * @param details The text for the message.
   */
  public void log(String userProvisioningRequestId, String externalUserId, String externalUserName, String userId, String details) {}

}