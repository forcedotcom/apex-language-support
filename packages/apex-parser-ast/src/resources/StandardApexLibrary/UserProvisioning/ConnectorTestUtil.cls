/**
 * Enables developers to write Apex test classes for connectors used by the connected app provisioning solution. This class simulates provisioning for the associated app.
 * <p>Usage
 * Use this class for connector-based test accelerators. You can invoke it only from within an Apex test.
 * <p>Example
 * This example creates an instance of a connected app, gets a value, and checks whether the value is correct. The test is simply a row inserted in the database table.
 *         @isTest
 *         private class SCIMCreateUserPluginTest {
 *         public static void callPlugin(Boolean validInputParams) {
 *
 *         //Create an instance of a connected app
 *         ConnectedApplication capp =UserProvisioning.ConnectorTestUtil.createConnectedApp('TestApp');
 *         Profile p = [SELECT Id FROM Profile WHERE Name='Standard User'];
 *         //Create a user
 *         User user = new User(username='testuser1@scimuserprov.test', Firstname= 'Test', Lastname='User1', email='testuser1@testemail.com',
 *         FederationIdentifier='testuser1@testemail.com', profileId= p.Id, communityNickName='tuser1', alias='tuser', TimeZoneSidKey='GMT',
 *         LocaleSidKey='en_US', EmailEncodingKey='ISO-8859-1', LanguageLocaleKey='en_US');
 *         //insert user into a row in the database table
 *         insert user;
 *         //Create a UPR
 *         UserProvisioningRequest upr = new UserProvisioningRequest(appname = capp.name, connectedAppId=capp.id, operation='Create',
 *         state='New', approvalStatus='NotRequired',salesforceUserId=user.id);
 *
 *         //Insert the UPR to test the flow end to end
 *         insert upr;
 *        }}
 */
@IsTest
global class ConnectorTestUtil {
    global ConnectorTestUtil() { }

    /**
     * Creates an instance of a connected app to simulate provisioning.
     * @return The instance of the connected app to test for provisioning.
     */
    global static ConnectedApplication createConnectedApp(String connectedAppName) { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}