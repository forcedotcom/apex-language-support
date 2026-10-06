/**
 * Contains the list of the category groups associated with KnowledgeArticleVersion and Question.
 * Usage
 * The describeDataCategoryGroups method returns a Schema.DescribeDataCategoryGroupResult object containing the list of the category groups associated with the specified object.
 * For additional information and code examples using describeDataCategoryGroups, see <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.apexcode.meta/apexcode/apex_dynamic_data_categories.htm" target="_blank">Accessing All Data Categories Associated with an sObject</a>.
 * Example
 * The following is an example of how to instantiate a data category group describe result object:
 * List <String> objType = new List<String>();
 * objType.add('KnowledgeArticleVersion');
 * objType.add('Question');
 *
 * List<Schema.DescribeDataCategoryGroupResult> describeCategoryResult =
 *    Schema.describeDataCategoryGroups(objType);
 */
global class DescribeDataCategoryGroupResult {
    global Integer categorycount { get; }
    global String description { get; }
    global String label { get; }
    global String name { get; }
    global String sobject { get; }

    global Boolean equals(Object obj) { return false; }

    /**
     * Returns the number of visible data categories in the data category group.
     */
    global Integer getCategoryCount() { return 0; }

    /**
     * Returns the description of the data category group.
     */
    global String getDescription() { return null; }

    /**
     * Returns the label for the data category group used in the Salesforce user interface.
     */
    global String getLabel() { return null; }

    /**
     * Returns the unique name used by the API to access to the data category group.
     */
    global String getName() { return null; }

    /**
     * Returns the object name associated with the data category group.
     */
    global String getSobject() { return null; }

    global Integer hashCode() { return 0; }

    global String toString() { return null; }
}