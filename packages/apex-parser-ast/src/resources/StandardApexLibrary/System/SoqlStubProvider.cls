/**
 * Contains a method to create a mock test class for handling SOQL query responses for Data 360 data model objects (DMOs).
 * <p>Usage
 * To create mock test classes, extend the SoqlStubProvider class and override the handleSoqlQuery() class method.
 * Note
 * <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.apexcode.meta/apexcode/langCon_apex_loops_for_SOQL.htm" target="_blank">SOQL For Loops</a> in Apex aren't supported for SOQL stubs in static or dynamic SOQL queries against DMOs.
 * See <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.apexcode.meta/apexcode/MockSOQLTestsForDMOs.htm" target="_blank" title="HTML (New Window)">Mock SOQL Tests for Data 360 Data Model Objects</a> in the Apex Developer Guide.
 * <p>Example
 * This example shows a mock test class for the SkyMilesForBusinessOptInController class.
 * @IsTest
 * public class SkyMilesForBusinessOptInController_Test {
 *
 *     @IsTest
 *     public static void mockSoql() {
 *
 *         SoqlStubProvider stub = new UnifiedIndividualSoqlStub();
 *         Test.createSoqlStub(UnifiedIndividual__dlm.sObjectType, stub);
 *
 *         Assert.isTrue(Test.isSoqlStubDefined(UnifiedIndividual__dlm.sObjectType));
 *
 *         Test.startTest();
 *         string companyId = 'SampleCompanyId';
 *         // Performs SOQL query against Data Model Object
 *         List<SkyMilesMember> members = SkyMilesForBusinessOptInController.getSkyMilesProfilesFromDataCloud(companyId);
 *
 *         Test.stopTest();
 *
 *         Assert.areEqual(1, members.size());
 *
 *         SkyMilesMember member = members[0];
 *
 *         Assert.areEqual(companyId, member.CompanyId);
 *         Assert.areEqual(5000, member.SkyMilesBalance);
 *     }
 *
 *     class UnifiedIndividualSoqlStub extends SoqlStubProvider {
 *         public override List<sObject> handleSoqlQuery(sObjectType sot, string stubbedQuery, Map<string, object> bindVars) {
 *
 *             Assert.areEqual(UnifiedIndividual__dlm.sObjectType, sot);
 *
 *             // Stub assumes that the SOQL query is searching for a single record by company id
 *
 *             string companyId = 'Default';
 *             if(bindVars.containsKey('tmpVar1')) {
 *                 companyId = (string)bindVars.get('tmpVar1');
 *             }
 *
 *             UnifiedIndividual__dlm dmo = (UnifiedIndividual__dlm)Test.createStubQueryRow(
 *                 sot,
 *                 new Map<string, object> {
 *                     'ssot__FirstName__c' => 'Codey',
 *                     'ssot__LastName__c' => 'Bear',
 *                     'ssot__Email__c' => 'developer@example.com',
 *                     'ssot__SkyMilesBalance__c' => 5000,
 *                     'ssot__MedallionStatus__c' => 'Gold',
 *                     'ssot__CompanyId__c' => companyId
 *                   }
 *             );
 *             return new List<sObject> { dmo };
 *
 *         }
 *     }
 * }
 * public with sharing class SkyMilesForBusinessOptInController {
 *     public static List<SkyMilesMember> getSkyMilesProfilesFromDataCloud(String companyId) {
 *         List<UnifiedIndividual__dlm> unifiedIndividuals = [
 *           SELECT
 *             Id,
 *             ssot__FirstName__c,
 *             ssot__LastName__c,
 *             ssot__Email__c,
 *             ssot__SkyMilesBalance__c,
 *             ssot__MedallionStatus__c,
 *             ssot__CompanyId__c
 *           FROM UnifiedIndividual__dlm
 *           WHERE ssot__CompanyId__c = :companyId
 *         ];
 *         List<SkyMilesMember> skyMilesMembers = new List<SkyMilesMember>();
 *         for (UnifiedIndividual__dlm individual : unifiedIndividuals) {
 *           skyMilesMembers.add(
 *             new SkyMilesMember(
 *               individual.Id,
 *               individual.ssot__FirstName__c,
 *               individual.ssot__LastName__c,
 *               individual.ssot__Email__c,
 *               individual.ssot__SkyMilesBalance__c,
 *               individual.ssot__MedallionStatus__c,
 *               individual.ssot__CompanyId__c
 *             )
 *           );
 *         }
 *         return skyMilesMembers;
 *     }
 * }
 */
global abstract class SoqlStubProvider {
    global SoqlStubProvider() { }

    global virtual Boolean equals(Object o) { return false; }

    /**
     * Defines a mocked response for a SOQL query executed against the specified SObject type.
     * @return The list of stubbed SObjects resulting from the SOQL query.
     */
    global abstract List handleSoqlQuery(Schema.SObjectType stubbedObject, String soqlQuery, Map binds);

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}