/**
 * Stores the output of the Generate User Data invocable action, which you can access in Flow Builder.
 * Usage
 * For single sign-on (SSO) implementations that use the authentication provider framework, you must set up a registration handler that creates and updates users who log in via the identity provider. In some cases, the identity provider doesn't return enough information to create a user record in Salesforce. If you use Flow Builder for your registration handler, you can use the Generate User Data invocable action to help you create complete user records. This action generates placeholder data for all required fields for the User object.
 * The Auth.GeneratedUserData class stores the output of this action. Use the output as an Apex-defined variable in the flow. When you create a user, reference specific properties from this class to set values for required fields.
 * For more information, see these resources in Salesforce Help.
 * <a class="xref" href="http://platform.flow_ref_elements_actions_generate_user_data.htm" target="_blank">Flow Core Action: Generate User Data</a>
 * <a class="xref" href="https://help.salesforce.com/s/articleView?id=xcloud.sso_flow_registration_handler_example.htm&amp;language=en_US" target="_blank">Example: Authentication Provider Registration Handler Flow</a>
 */
global class GeneratedUserData {
    /**
     * Stores a generated placeholder value for the user's alias. The placeholder value is alias.
     * String
     */
    @AuraEnabled
    global String alias;
    /**
     * Stores a generated placeholder value for the user's email address. The placeholder value is placeholder-email@example.com.
     * String
     */
    @AuraEnabled
    global String email;
    /**
     * Stores the default value for the email encoding type for the user, such as UTF-8. The email encoding type determines how Salesforce encodes characters in outgoing emails. The default value is the email encoding key for the execution user specified in the Run As field in the authentication provider definition.
     * String
     */
    @AuraEnabled
    global String emailEncodingKey;
    /**
     * Stores a generated placeholder value for the user's first name. The placeholder value is placeholder-first-name.
     * String
     */
    @AuraEnabled
    global String firstName;
    /**
     * Stores the default value for the user's language, such as en_US for English. The default value is the language for the registration handler execution user. The execution user is specified in the Run As field in the authentication provider definition.
     * String
     */
    @AuraEnabled
    global String languageLocaleKey;
    /**
     * Stores a generated placeholder value for the user's last name, also known as family name. The placeholder value is placeholder-last-name.
     * String
     */
    @AuraEnabled
    global String lastName;
    /**
     * Stores the default value for the user's locale, defined using two-letter International Organization for Standardization (ISO) codes. For example, en_US indicates English (United States). The default value is the language for the registration handler execution user. The execution user is specified in the Run As field in the authentication provider definition.
     * String
     */
    @AuraEnabled
    global String localesIdKey;
    /**
     * Stores the default value for the user's time zone, such as (GMT-07:00) Pacific Daylight Time (America/Los_Angeles). The time zone is defined using region and key city according to ISO standards. The default value is the time zone for the registration handler execution user. The execution user is specified in the Run As field in the authentication provider definition.
     * String
     */
    @AuraEnabled
    global String timeZoneSidKey;
    /**
     * Stores a generated placeholder value for the user's username. The placeholder value is placeholder-username<unique 14-character number>@example com, such as placeholder-username17370000000000@example com.
     * String
     */
    @AuraEnabled
    global String username;

    /**
     * The Generate User Data action in Flow Builder uses this constructor to create an instance of the Auth.GeneratedUserData class.
     */
    global GeneratedUserData(String firstName, String lastName, String email, String username, String alias, String languageLocaleKey, String localesIdKey, String emailEncodingKey, String timeZoneSidKey) { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}