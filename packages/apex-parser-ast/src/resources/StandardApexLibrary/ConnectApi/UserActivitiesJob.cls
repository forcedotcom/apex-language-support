/**
 * User activities job.
 */
global class UserActivitiesJob {

  /**
   * Token that identifies the user activities job.
   */
  global String jobToken;

  /**
   * Type of user activities job. Value is export or purge .
   */
  global String jobType;

  /**
   * Message describing the status and expected outcome of the job. When the job completes, you receive an email with information about the Salesforce file that contains ConnectApi.UserActivityCollection .
   */
  global String message;

}