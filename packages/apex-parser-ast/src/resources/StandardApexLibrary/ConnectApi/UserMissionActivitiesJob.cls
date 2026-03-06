/**
 * User mission activities job.
 */
global class UserMissionActivitiesJob {

  /**
   * Token that identifies the mission user activities job.
   */
  global String jobToken;

  /**
   * Type of user activities job, either export or purge .
   */
  global String jobType;

  /**
   * Message describing the status and expected outcome of the job. When the job completes, you receive an email with information about the Salesforce file that contains ConnectApi.UserMissionActivityCollection .
   */
  global String message;

}