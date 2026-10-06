/**
 * Contains the category groups and categories associated with KnowledgeArticleVersion and Question.
 * Usage
 * The describeDataCategoryGroupStructures method returns a list of Schema.DescribeDataCategoryGroupStructureResult objects containing the category groups and categories associated with the specified object.
 * For additional information and code examples, see <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.apexcode.meta/apexcode/apex_dynamic_data_categories.htm" target="_blank">Accessing All Data Categories Associated with an sObject</a>.
 * Example
 * The following is an example of how to instantiate a data category group structure describe result object:
 * List <DataCategoryGroupSobjectTypePair> pairs =
 *       new List<DataCategoryGroupSobjectTypePair>();
 *
 * DataCategoryGroupSobjectTypePair pair1 =
 *       new DataCategoryGroupSobjectTypePair();
 * pair1.setSobject('KnowledgeArticleVersion');
 * pair1.setDataCategoryGroupName('Regions');
 *
 * DataCategoryGroupSobjectTypePair pair2 =
 *       new DataCategoryGroupSobjectTypePair();
 * pair2.setSobject('Questions');
 * pair2.setDataCategoryGroupName('Regions');
 *
 * pairs.add(pair1);
 * pairs.add(pair2);
 *
 * List<Schema.DescribeDataCategoryGroupStructureResult>results =
 *       Schema.describeDataCategoryGroupStructures(pairs, true);
 */
global class DescribeDataCategoryGroupStructureResult {
    global String description { get; }
    global String label { get; }
    global String name { get; }
    global String sobject { get; }
    global List topcategories { get; }

    global Boolean equals(Object obj) { return false; }

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
     * Returns the name of object associated with the data category group.
     */
    global String getSobject() { return null; }

    /**
     * Returns a Schema.DataCategory object, that contains the top categories visible depending on the user's data category group visibility settings.
     * Usage
     * For more information on data category group visibility, see “Data Category Visibility” in the Salesforce online help.
     */
    global List getTopCategories() { return null; }

    global Integer hashCode() { return 0; }

    global String toString() { return null; }
}