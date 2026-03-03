/**
 * Creates customer and partner users during the Headless Registration Flow.
 */
global interface HeadlessSelfRegistrationHandler {

  User createUser(Id profileId, Auth.UserData data, String customUserDataMap, String experienceId, String password);

}