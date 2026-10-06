/**
 * Use the methods in the System.FeatureManagement class to check and modify the values of feature parameters, and to show or hide custom objects and custom permissions in your subscribers’ orgs.
 * Usage
 * For information about feature parameters, see <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.pkg2_dev.meta/pkg2_dev/sfdx_dev_dev2gp_fma_manage_features.htm" target="_blank">Manage Features in Second Generation Managed Packages</a> in the Second-Generation Managed Packaging Developer Guide, or <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.pkg1_dev.meta/pkg1_dev/fma_manage_features.htm" target="_blank">Manage Features in First-Generation Managed Packages</a> in the First-Generation Managed Packaging Developer Guide.
 * The set methods (setPackageBooleanValue, setPackageDateValue, setPackageIntegerValue) use DML operations on setup sObjects. To learn more about mixing operations in a test, see <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.apexcode.meta/apexcode/apex_dml_non_mix_sobjects_test_methods.htm" target="_blank">Mixed DML Operations in Test Methods</a>.
 */
global class FeatureManagement {
    global FeatureManagement() { }

    /**
     * Hides or reveals custom permissions, or reveals custom objects, in your subscriber’s org.
     * Usage
     * Warning
     * For custom permissions, you can toggle the protected value indefinitely. However, after you’ve released unprotected objects to subscribers, you can’t set visibility to Protected. Be sure to protect any custom objects that you want to hide before you release the first package version that contains them.
     * To hide custom permissions in released packages:
     * FeatureManagement.changeProtection('YourCustomPermissionName', 'CustomPermission',
     *     'Protected');
     * To unhide custom permissions and custom objects in released packages:
     * FeatureManagement.changeProtection('YourCustomPermissionName', 'CustomPermission',
     *     'Unprotected');
     * FeatureManagement.changeProtection('YourCustomObjectName__c', 'CustomObject',
     *     'Unprotected');
     */
    global static void changeProtection(String apiName, String typeApiName, String protection) { }

    /**
     * Checks the value__c value of the FeatureParameterBoolean__c record for a feature parameter in your subscriber’s org. You set the record’s value using setPackageBooleanValue(apiName, value).
     * @return The value that’s currently assigned to the value__c field on the FeatureParameterBoolean__c record that associates the feature parameter with its related license.
     */
    global static Boolean checkPackageBooleanValue(String apiName) { return false; }

    /**
     * Checks the value__c value of the FeatureParameterDate__c record for a feature parameter in your subscriber’s org. You can set the record’s value using setPackageDateValue(apiName, value).
     * @return The value that’s currently assigned to the value__c field on the FeatureParameterDate__c record that associates the feature parameter with its related license.
     */
    global static Date checkPackageDateValue(String apiName) { return null; }

    /**
     * Checks the value__c value of the FeatureParameterInteger__c record for a feature parameter in your subscriber’s org. You can set the record’s value using setPackageIntegerValue(apiName, value).
     * @return The value that’s currently assigned to the value__c field on the FeatureParameterInteger__c record that associates the feature parameter with its related license.
     */
    global static Integer checkPackageIntegerValue(String apiName) { return 0; }

    /**
     * Checks whether a custom permission is enabled.
     * @return Shows whether the permission is enabled (true) or disabled (false).
     */
    global static Boolean checkPermission(String apiName) { return false; }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    /**
     * Sets the value__c value of the FeatureParameterBoolean__c record for a subscriber-to-LMO feature parameter in your subscriber’s org. You can check the record’s value using checkPackageBooleanValue(apiName).
     */
    global static void setPackageBooleanValue(String apiName, Boolean value) { }

    /**
     * Sets the value__c value of the FeatureParameterDate__c record for a subscriber-to-LMO feature parameter in your subscriber’s org. You can check the record’s value using checkPackageDateValue(apiName).
     */
    global static void setPackageDateValue(String apiName, Date value) { }

    /**
     * Sets the value__c value of the FeatureParameterInteger__c record for a subscriber-to-LMO feature parameter in your subscriber’s org. You can check the record’s value using checkPackageIntegerValue(apiName).
     */
    global static void setPackageIntegerValue(String apiName, Integer value) { }

    global override virtual String toString() { return null; }
}