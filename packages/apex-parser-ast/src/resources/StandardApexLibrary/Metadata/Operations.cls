/**
 * Represents a class to execute metadata operations, such as retrieving or deploying custom metadata.
 * Usage
 * Use the Metadata.Operations class to execute metadata operations. For more information on use cases and restrictions of metadata operations in Apex, see Metadata.
 * Example: Retrieve Metadata
 * The following example retrieves the “MyTestCustomMDType” custom metadata record from the subscriber org, and inspects the custom fields.
 * public class ReadMetadata {
 *   public void retrieveMetadata () {
 *     // List fullnames of components we want to retrieve
 *     List<String> componentNameList =
 * new List<String>{'ISVNamespace__TestCustomMDType.MyTestCustomMDType'};
 *
 *     // Retrieve components that are records of custom metadata types
 *     // based on name
 *     List<Metadata.Metadata> components = Metadata.Operations.retrieve(
 * Metadata.MetadataType.CustomMetadata, componentNameList);
 *     Metadata.CustomMetadata customMetadataRecord = (Metadata.CustomMetadata) components.get(0);
 *
 *     // Check fields of retrieved component
 *     List<Metadata.CustomMetadataValue> values = customMetadataRecord.values;
 *     for (integer i = 0; i < values.size(); i++) {
 *       if (values.get(i).field == 'testField__c' &&
 *           values.get(i).value == 'desired value') {
 *         // ...process accordingly...
 *       }
 *     }
 *   }
 * }
 * Example: Deploy Metadata
 * The following example uses the Metadata API in Apex to update the customField custom field value of the MetadataRecordName custom metadata record and deploy this change into the subscriber org. Because the deployment is asynchronous, you must provide a callback class that implements the Metadata.DeployCallback interface, which is then used when the queued deployment completes.
 * public class CreateMetadata{
 *   public void updateAndDeployMetadata() {
 *     // Setup custom metadata to be created in the subscriber org.
 *     Metadata.CustomMetadata customMetadata =  new Metadata.CustomMetadata();
 *     customMetadata.fullName = 'ISVNamespace__MetadataTypeName.MetadataRecordName';
 *
 *     Metadata.CustomMetadataValue customField = new Metadata.CustomMetadataValue();
 *     customField.field = 'customField__c';
 *     customField.value = 'New value';
 *
 *     customMetadata.values.add(customField);
 *
 *     Metadata.DeployContainer mdContainer = new Metadata.DeployContainer();
 *     mdContainer.addMetadata(customMetadata);
 *
 *     // Setup deploy callback, MyDeployCallback implements
 *     // the Metadata.DeployCallback interface (code for
 *     // this class not shown in this example)
 *     MyDeployCallback callback = new MyDeployCallback();
 *
 *     // Enqueue custom metadata deployment
 *     Id jobId = Metadata.Operations.enqueueDeployment(mdContainer, callback);
 *   }
 * }
 * Example: Create Two Metadata Records Synchronously
 * Create a metadata record along with another one that references it in the same transaction. If the parent record was installed with a namespace, prefix the developer name with recordNs__.
 * Note
 * No custom metadata relationship can relate records of the same type to each other.
 * public class CreateMetadata {
 *
 *     public Id doCreate(
 *         String parentRecDevName,
 *         String parentRecLabel,
 *         String childRecDevName,
 *         String childRecLabel) {
 *
 *         Metadata.DeployContainer mdContainer = new Metadata.DeployContainer();
 *
 *         Metadata.CustomMetadata parentRecord = new Metadata.CustomMetadata();
 *         parentRecord.fullName = 'ParentType.' + parentRecDevName;
 *         parentRecord.label = parentRecLabel;
 *         mdContainer.addMetadata(parentRecord);
 *
 *         Metadata.CustomMetadata childRecord = new Metadata.CustomMetadata();
 *         childRecord.fullName = 'ChildType.' + childRecDevName;
 *         childRecord.label = childRecLabel;
 *         Metadata.CustomMetadataValue relValue = new Metadata.CustomMetadataValue();
 *         relValue.field = 'Parent__c';
 *         relValue.value = parentRecDevName;
 *         childRecord.values.add(relValue);
 *         mdContainer.addMetadata(childRecord);
 *
 *         Id jobId = Metadata.Operations.enqueueDeployment(mdContainer, null);
 *         return jobId;
 *     }
 *
 * }
 */
global class Operations {
    global Operations() { }

    /**
     * Deploys custom metadata components asynchronously.
     * @return ID of deployment request.
     */
    global static Id enqueueDeployment(Metadata.DeployContainer container, Metadata.DeployCallback callback) { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    /**
     * Retrieves a list of custom metadata components.
     */
    global static List retrieve(Metadata.MetadataType type, List fullNames) { return null; }

    global override virtual String toString() { return null; }
}