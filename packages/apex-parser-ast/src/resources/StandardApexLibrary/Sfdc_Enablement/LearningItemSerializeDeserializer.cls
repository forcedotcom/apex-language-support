/**
 * Serializes and deserializes the content associated with a custom exercise when migrating an Enablement program from one org to another.
 * Usage
 * The class contains methods to serialize and deserialize custom exercise content between orgs when an Enablement program that includes a custom exercise is migrated from one org to another through change sets or packaging.
 * Extend the sfdc_enablement.LearningItemSerializeDeserializer Apex abstract class and add the class name to the ApexSerializerDeserializer field of the <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.api_meta.meta/api_meta/meta_learningitemtype.htm" target="_blank">LearningItemType metadata record</a>. If you don’t add the class name to the LearningItemType metadata record, the customContent property for the custom exercise is empty in the destination org and no corresponding LearningItem record is created for the exercise’s <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.object_reference.meta/object_reference/sforce_api_objects_enblprogramtaskdefinition.htm" target="_blank">EnblProgramTaskDefinition record</a>.
 * The serialize method serializes the custom content of the learning item from the source org. This method is called when you retrieve custom content from the source org.
 * The deserialize method is called during the deployment of a program. This method takes the serialized custom content, recreates the custom object record in the target org, and returns a new learning item record ID.
 * Example
 * The sample code serializes and deserializes the custom content for a given learning item of a custom screen flow exercise in an Enablement program. For this example to work, make sure the screen flow exists in the target org.
 * global class ScreenFlowSerializerDeserializer extends Sfdc_enablement.LearningItemSerializeDeserializer {
 *     // The serialize method returns the serialized output of the
 *     // learning item’s custom content.
 *     global override String serialize(String learningItemId) {
 *         // Get the screen flow record ID associated with the learning item.
 *         LearningItem learningItem = [SELECT ScreenFlow_Field__c from LearningItem where Id =: learningItemId LIMIT 1];
 *         String screenFlowRecordId = learningItem.ScreenFlow_Field__c;
 *
 *         // Get the flow version ID associated with that screen flow.
 *         ScreenFlow_Object__c screenFlowRecord = [SELECT FlowVersionId__c from ScreenFlow_Object__c where Id =: screenFlowRecordId LIMIT 1];
 *         String flowVersionId = screenFlowRecord.FlowVersionId__c;
 *
 *         // Query the flow definition associated with that flow version.
 *         // Get the information you need to recreate the custom object
 *         // record in the destination org.
 *         // In this example, we're only getting the API name of the
 *         // flow version.
 *         FlowDefinitionView flowDefinitionView = [SELECT ApiName from FlowDefinitionView where ActiveVersionId =: flowVersionId LIMIT 1];
 *
 *         // Return the serialized string.
 *         // In this example, we're only returning the API name of the flow
 *         // definition in the string.
 *         return flowDefinitionView.ApiName;
 *     }
 *
 *     // The deserialize method deserializes the string containing the custom
 *     // content. In the method, you recreate the custom object record
 *     // for the destination org and populate it with the custom content.
 *     // Then insert the record in the destination org and return the new
 *     // custom object record ID.
 *     global override String deserialize(String serializedOutput) {
 *         // Find the flow active version ID of the same screen flow in the
 *         // destination org.
 *         FlowDefinitionView flowDefinitionView = [SELECT ActiveVersionId from FlowDefinitionView where ApiName =: serializedOutput LIMIT 1];
 *         String flowActiveVersionId = flowDefinitionView.ActiveVersionId;
 *
 *         // Create the screen flow custom object record using the
 *         // information you passed to the string in the serialize method.
 *         // In this example, we only passed the API name of the screen flow
 *         // to the string.
 *         ScreenFlow_Object__c screenFlowRecord = new ScreenFlow_Object__c();
 *         screenFlowRecord.Name = serializedOutput;
 *         screenFlowRecord.FlowVersionId__c = flowActiveVersionId;
 *
 *         // Insert the custom object record into the destination org.
 *         insert screenFlowRecord;
 *
 *         // Return the new screen flow record ID for the new learning item
 *         // in the destination org.
 *         return screenFlowRecord.Id;
 *     }
 * }
 */
global abstract class LearningItemSerializeDeserializer {
    global LearningItemSerializeDeserializer() { }

    /**
     * Deserializes the provided custom content string and returns the record ID of the learning item.
     * @return The ID of the learning item created for the target org.
     */
    global abstract String deserialize(String metaData);

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    /**
     * Serializes the custom content associated with the specified learning item. The serialized string represents the metadata of the custom content and is used to recreate the custom content in the target Salesforce org during deployment.
     * @return The serialized information of the custom content of the specified learning item. The format is a string that’s less than or equal to 250 characters long.
     */
    global abstract String serialize(String learningItemId);

    global override virtual String toString() { return null; }
}