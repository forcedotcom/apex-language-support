/**
 * The QueryBuilder class provides methods for constructing well-formed SAQL queries to pass to CRM Analytics.
 * Usage
 * Use QueryBuilder and its associated classes, Wave.ProjectionNode and Wave.QueryNode, to incrementally build your SAQL statement. For example:
 * public static void executeApexQuery(String name){
 *   Wave.ProjectionNode[] projs = new Wave.ProjectionNode[]{
 *     Wave.QueryBuilder.get('State').alias('State'),
 *     Wave.QueryBuilder.get('City').alias('City'),
 *     Wave.QueryBuilder.get('Revenue').avg().alias('avg_Revenue'),
 *     Wave.QueryBuilder.get('Revenue').sum().alias('sum_Revenue'),
 *     Wave.QueryBuilder.count().alias('count')};
 *
 *   ConnectApi.LiteralJson result = Wave.QueryBuilder.load('0FbD00000004DSzKAM', '0FcD00000004FEZKA2')
 *     .group(new String[]{'State', 'City'})
 *     .foreach(projs)
 *     .execute('q');
 *   String response = result.json;
 * }
 * Examples
 * QueryBuilder is the core of this first phase of the CRM Analytics Apex SDK, so let’s take a closer look. Here’s a simple count query.
 * Wave.ProjectionNode[] projs = new Wave.ProjectionNode[]{Wave.QueryBuilder.count().alias('c')};
 * String query = Wave.QueryBuilder.load('datasetId', 'datasetVersionId').group().foreach(projs).build('q');
 * The resulting SAQL query looks like this:
 * q = load "datasetId/datasetVersionId";
 * q = group q by all;
 * q = foreach q generate count as c;
 * Here’s a more complex example that uses a union statement.
 * Wave.ProjectionNode[] projs = new Wave.ProjectionNode[]{Wave.QueryBuilder.get('Name'), Wave.QueryBuilder.get('AnnualRevenue').alias('Revenue')};
 * Wave.QueryNode nodeOne = Wave.QueryBuilder.load('datasetOne','datasetVersionOne').foreach(projs);
 * Wave.QueryNode nodeTwo = Wave.QueryBuilder.load('datasetTwo', 'datasetVersionTwo').foreach(projs);
 * String query = Wave.QueryBuilder.union(new List<Wave.QueryNode>{nodeOne, nodeTwo}).build('q');
 * The resulting SAQL query has two projection streams, qa and qb.
 * qa = load "datasetOne/datasetVersionOne";
 * qa = foreach q generate Name,AnnualRevenue as Revenue;
 * qb = load "datasetTwo/datasetVersionTwo";
 * qb = foreach q generate Name,AnnualRevenue as Revenue;
 * q = union qa, qb;
 */
global class QueryBuilder {
    global QueryBuilder() { }

    /**
     * Cogrouping means that two input streams are grouped independently and arranged side by side. Only data that exists in both groups appears in the results.
     */
    global static wave.QueryNode cogroup(List cogroupNodes, List groups) { return null; }

    /**
     * Calculate the number of rows that match the query criteria.
     */
    global static wave.ProjectionNode count() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    /**
     * Query by selecting specific attributes.
     */
    global static wave.ProjectionNode get(String projection) { return null; }

    global virtual Integer hashCode() { return 0; }

    /**
     * Load a stream from a dataset.
     */
    global static wave.QueryNode load(String datasetId, String datasetVersionId) { return null; }

    global static wave.QueryNode loadByDeveloperName(String fullyQualifiedName) { return null; }

    global override virtual String toString() { return null; }

    /**
     * Combine multiple result sets into one result set.
     */
    global static wave.QueryNode union(List unionNodes) { return null; }
}