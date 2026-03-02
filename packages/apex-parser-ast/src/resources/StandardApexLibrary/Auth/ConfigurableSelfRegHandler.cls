/**
 * Gives you more control over how customers or partners self-register for your Experience Cloud site by creating a class that implements Auth.ConfigurableSelfRegHandler . You choose the user information to collect, and how users identify themselves—with their email address, phone number, or another identifier. When verified, you create a customer or partner user and log in the user to your Experience Cloud site.
 */
public interface ConfigurableSelfRegHandler {

  /**
   * Create a community member from the information that the visitor provided on your community’s self-registration page.
   * @param accountId Default account with which the new user is associated. This value comes from the Account field setting on Login and Registration (L&R) page under Registration Page Configuration.
   * @param profileId 
   * @param registrationAttributes A map of attributes that the registering user entered on the self-registration page. The fields that appear on the self-registration page come from the User Fields selected on the L&R page when the registration type is Configurable Self-Reg Page.
   * @param password The password entered by the user if “Include Password” is selected on the L&R page. (If a password isn’t entered, the handler must generate one because a password is required to create a user.)
   * @return Id
   */
  Id createUser(Id accountId, Id profileId, String > registrationAttributes, String password);

}