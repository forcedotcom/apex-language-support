/**
 * The UserProvisioningPlugin base class implements Process.Plugin for programmatic customization of the user provisioning process for connected apps.
 * Usage
 * Extending this class gives you a plug-in that can be used Flow Builder as a legacy Apex action, with the following input and output parameters.
 * Input Parameter Name Description
 * userProvisioningRequestId The unique ID of the request for the plug-in to process.
 * userId The ID of the associated user for the request.
 * NamedCredDevName The unique API name for the named credential to use for a request. The named credential identifies the third-party system and the third-party authentication settings.
 * When the named credential is set in the User Provisioning Wizard, Salesforce stores the value in the UserProvisioningConfig.NamedCredentialId field.
 * reconFilter When collecting and analyzing users on a third-party system, the plug-in uses this filter to limit the scope of the collection.
 * When the filter is set in the User Provisioning Wizard, Salesforce stores the value in the UserProvisioningConfig.ReconFilter field.
 * reconOffset When collecting and analyzing users on a third-party system, the plug-in uses this value as the starting point for the collection.
 * Output Parameter Name Description
 * Status
 * The vendor-specific status of the provisioning operation on the third-party system.
 * Details The vendor-specific message related to the status of the provisioning operation on the third-party system.
 * ExternalUserId The vendor-specific ID for the associated user on the third-party system.
 * ExternalUsername The vendor-specific username for the associated user on the third-party system.
 * ExternalEmail The email address assigned to the user on the third-party system.
 * ExternalFirstName The first name assigned to the user on the third-party system.
 * ExternalLastName The last name assigned to the user on the third-party system.
 * reconState The state of the collecting and analyzing process on the third-party system. When the value is complete, the process is finished and a subsequent call to the plug-in is no longer needed, nor made.
 * nextReconOffset When collecting and analyzing users on a third-party system, the process may encounter a transaction limit and have to stop before finishing. The value specified here initiates a call to the plug-in with a new quota limit.
 * If you want to add more custom parameters, use the buildDescribeCall() method.
 * Example
 * The following example uses the buildDescribeCall() method to add a new input parameter and a new output parameter. The example also demonstrates how to bypass the limit of the 10,000 records processed in DML statements in an Apex transaction.
 * global class SampleConnector extends UserProvisioning.UserProvisioningPlugin {
 *
 *     // Example of adding more input and output parameters to those defined in the base class
 *     global override Process.PluginDescribeResult buildDescribeCall() {
 *         Process.PluginDescribeResult describeResult = new Process.PluginDescribeResult();
 *         describeResult.inputParameters = new
 *             List<Process.PluginDescribeResult.InputParameter>{
 *                new Process.PluginDescribeResult.InputParameter('testInputParam',
 *                        Process.PluginDescribeResult.ParameterType.STRING, false)
 *             };
 *
 *         describeResult.outputParameters = new
 *             List<Process.PluginDescribeResult.OutputParameter>{
 *                new Process.PluginDescribeResult.OutputParameter('testOutputParam',
 *                        Process.PluginDescribeResult.ParameterType.STRING)
 *             };
 *
 *         return describeResult;
 *     }
 *
 *     // Example Plugin that demonstrates how to leverage the reconOffset/nextReconOffset/reconState
 *     // parameters to create more than 10,000 users. (i.e. go beyond the 10,000 DML limit per transaction)
 *
 *     global override Process.PluginResult invoke(Process.PluginRequest request) {
 *         Map<String,String> result = new Map<String,String>();
 *         String uprId = (String) request.inputParameters.get('userProvisioningRequestId');
 *         UserProvisioning.UserProvisioningLog.log(uprId, 'Inserting Log from test Apex connector');
 *         UserProvisioningRequest upr = [SELECT id, operation, connectedAppId, state
 *                    FROM userprovisioningrequest WHERE id = :uprId];
 *         if (upr.operation.equals('Reconcile')) {
 *             String reconOffsetStr = (String) request.inputParameters.get('reconOffset');
 *             Integer reconOffset = 0;
 *             if (reconOffsetStr != null) {
 *                 reconOffset = Integer.valueOf(reconOffsetStr);
 *             }
 *
 *             if (reconOffset > 44999) {
 *                 result.put('reconState', 'Completed');
 *             }
 *
 *             Integer i = 0;
 *             List<UserProvAccountStaging> upasList = new List<UserProvAccountStaging>();
 *             for (i = 0; i < 5000; i++) {
 *                 UserProvAccountStaging upas = new UserProvAccountStaging();
 *                 upas.Name = i + reconOffset + '';
 *                 upas.ExternalFirstName = upas.Name;
 *                 upas.ExternalEmail = 'externaluser@externalsystem.com';
 *                 upas.LinkState = 'Orphaned';
 *                 upas.Status = 'Active';
 *                 upas.connectedAppId = upr.connectedAppId;
 *                 upasList.add(upas);
 *             }
 *             insert upasList;
 *             result.put('nextReconOffset', reconOffset + 5000 + '');
 *         }
 *
 *         return new Process.PluginResult(result);
 *     }
 * }
 */
global abstract class UserProvisioningPlugin implements Process.Plugin {
    global UserProvisioningPlugin() { }

    /**
     * Use this method to add more input and output parameters to those defined in the base class.
     */
    global abstract Process.PluginDescribeResult buildDescribeCall();

    /**
     * Returns a Process.PluginDescribeResult object that describes this method call.
     */
    global Process.PluginDescribeResult describe() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    /**
     * Returns the name of the class implementing the plugin.
     */
    global String getPluginClassName() { return null; }

    global virtual Integer hashCode() { return 0; }

    /**
     * Primary method that the system invokes when the class that implements the interface is instantiated.
     */
    global abstract Process.PluginResult invoke(Process.PluginRequest request);

    global override virtual String toString() { return null; }
}