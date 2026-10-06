/**
 * Stores the output of the Get User Data from JSON String invocable action, which you can access in Flow Builder..
 * Usage
 * To implement single sign-on (SSO) with the authentication provider framework, you must set up a registration handler that creates and updates users who log in via the identity provider. To create and update users, the registration handler uses user information from the identity provider. Some identity providers return user information in an ID token or in a user info response. The ID token and user info response are formatted as JSON objects that can be deeply nested, which makes them difficult to parse. If you use Flow Builder for your registration handler, the Get User Data from JSON String invocable action makes it easier to get user information from these JSON objects. Use this action to retrieve a specific attribute value from the ID token or user info response.
 * The action takes two input values. The first input value is the ID token or user info response from the identity provider. This input value must be a JSON object that has been serialized into a string. The second input value is the JSON key that corresponds to the attribute value that you want to retrieve. Using these input values, the action parses the ID token or user info response. It outputs the attribute value and stores it in an instance of the Auth.JsonValueOutput class. Each instance of this class stores a single attribute. The attribute is stored in a property that corresponds to its data type in the identity provider response, such as integerValue for an integer.
 * For more information about this action and how you can use it, see these resources in Salesforce Help.
 * <a class="xref" href="http://platform.flow_ref_elements_actions_generate_user_data.htm" target="_blank">Flow Core Action: Get User Data from JSON String</a>
 * <a class="xref" href="https://help.salesforce.com/s/articleView?id=xcloud.sso_flow_registration_handler_example.htm&amp;language=en_US" target="_blank">Example: Authentication Provider Registration Handler Flow</a>
 */
global class JsonValueOutput {
    /**
     * If the attribute returned by the action is a boolean value, it's stored in this property.
     * Boolean
     */
    @AuraEnabled
    global Boolean booleanValue;
    /**
     * If the attribute returned by the action is a Double value, it's stored in this property.
     * Double
     */
    @AuraEnabled
    global Double doubleValue;
    /**
     * If the attribute returned by the action is an integer, it's stored in this property.
     * Integer
     */
    @AuraEnabled
    global Integer integerValue;
    /**
     * If the attribute returned by the action is a JSON array, it's formatted as a string and stored in this property.
     * String
     */
    @AuraEnabled
    global String jsonArrayValue;
    /**
     * If the attribute returned by the action is a JSON string, it's stored in this property.
     * String
     */
    @AuraEnabled
    global String jsonStringValue;
    /**
     * If the attribute returned by the action is a string, it's stored in this property.
     * String
     */
    @AuraEnabled
    global String stringValue;

    /**
     * The Get User Data from JSON String action in Flow Builder uses this constructor to create an instance of the Auth.JsonValueOutput class.
     */
    global JsonValueOutput(String stringValue, Boolean booleanValue, Integer integerValue, Double doubleValue, String jsonStringValue, String jsonArrayValue) { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}