/**
 * Contains the commitTestOnly() method that can be called from an @IntegrationMethod to commit data mid-transaction so that it’s visible to service threads such as Agentforce and Data 360.
 */
global with sharing class IntegrationTest {
    /**
     * Commits data to the database mid-transaction so it’s visible to service threads such as Agentforce and Data 360. It resets the uncommitted work checkpoint and mixed DML tracking for the new transaction boundary. The method can only be called from an @IntegrationTest method.
     * Note
     * The Apex Integration Tests feature is available as a developer preview in scratch orgs in Summer ’26 (API version 67.0). The feature isn’t generally available unless or until Salesforce announces its general availability in documentation or in press releases or public statements. All commands, parameters, and other features are subject to change or deprecation at any time, with or without notice. Don't implement functionality developed with these commands or tools in your production package.
     */
    global static void commitTestOnly() { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}