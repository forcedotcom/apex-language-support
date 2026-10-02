/**
 * Gives you more control over how customers or partners self-register for your Experience Cloud site by creating a class that implements Auth.ConfigurableSelfRegHandler. You choose the user information to collect, and how users identify themselves—with their email address, phone number, or another identifier. When verified, you create a customer or partner user and log in the user to your Experience Cloud site.
 * <p>Usage
 * You set up site self-registration declaratively on the Login & Registration (L&R) page of the Administration workspace. When combined with a configurable self-registration setup, the handler class can programmatically fill in user fields, including custom fields, and determine how to create a user and log them in.
 * When you select the Configurable Self-Reg Page registration page, you choose the user fields to collect from the self-registration form, such as last name, first name, username, nickname, mobile, or email. You also determine the verification method that the user identifies themselves with, which can be email, mobile, or neither. Salesforce generates the Auth.ConfigurableSelfRegHandler handler, which contains logic on how to create an Experience Cloud site member. Modify the handler to change how users are created, and how collected user information is used.
 * You can add custom logic to ensure that the email or phone number is unique to the customer or partner who's registering. For example, you can add a custom unique field, and write a copy of the email or phone number to it. You can also change how the user is created. By default, the user is created as a contact associated with the account that you select on the L&R page.
 * The generated ConfigurableSelfRegHandler is located on the Setup Apex Classes page, and begins with AutocreatedConfigSelfReg, for example, AutocreatedConfigSelfReg1532475901849.
 * For an example, see ConfigurableSelfRegHandler Example Implementation. For more details, see <a class="xref" href="https://help.salesforce.com/articleView?id=identity_about_customers_partners.htm&amp;language=en_US" target="_blank" title="HTML (New Window)">Salesforce Customer Identity</a> in Salesforce Help.
 */
global interface ConfigurableSelfRegHandler {
    /**
     * Create a community member from the information that the visitor provided on your community’s self-registration page.
     * @return Returns an identifier for the created User object. Auth.ConfigurableSelfRegHandler inserts a user and then returns the ID of that user.
     */
    abstract Id createUser(Id accountId, Id profileId, Map registrationAttributes, String password);

    virtual Boolean equals(Object arg0);

    virtual Integer hashCode();

    virtual String toString();
}