/**
 * Creates Account records that will be associated with Chatter Answers users.
 * <p>Usage
 * The ChatterAnswers.AccountCreator is specified in the registrationClassName attribute of a chatteranswers:registration Visualforce component. This interface is called by Chatter Answers and allows for custom creation of Account records used for portal users.
 * To implement the ChatterAnswers.AccountCreator interface, you must first declare a class with the implements keyword as follows:
 * public class ChatterAnswersRegistration implements ChatterAnswers.AccountCreator {
 * Next, your class must provide an implementation for the following method:
 * public String createAccount(String firstname, String lastname, Id siteAdminId) {
 *     // Your code here
 * }
 * The implemented method must be declared as global or public.
 */
global interface AccountCreator {
    /**
     * Accepts basic user information and creates an Account record. The implementation of this method returns the account ID.
     */
    abstract String createAccount(String firstname, String lastname, Id siteAdminId);

    virtual Boolean equals(Object arg0);

    virtual Integer hashCode();

    virtual String toString();
}