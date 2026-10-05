/**
 * Use the Cache.Org class to add, retrieve, and manage values in the org cache. Unlike the session cache, the org cache is not tied to any session and is available to the organization across requests and to all users.
 * <p>Usage
 * Cache Key Format
 * This table lists the format of the key parameter that some methods in this class take, such as put, get, and contains.
 * Key Format Description
 * namespace.partition.key Fully qualified key name.
 * key Refers to a partition marked as default when the namespace.partition prefix is omitted.
 * local.partition.key Use the local prefix to refer to the org’s namespace when the org doesn’t have a namespace defined. If the org has a namespace defined, the local prefix also refers to that org’s namespace.
 * Note
 * If no default partition is specified in the org, calling a cache method without fully qualifying the key name causes a Cache.Org.OrgCacheException to be thrown.
 * The local prefix in an installed managed package refers to the namespace of the subscriber org and not the package’s namespace. The cache put calls aren’t allowed in a partition that the invoking class doesn’t own.
 * <p>Example
 * This class is the controller for a sample Visualforce page (shown in the subsequent code sample). The cached values are initially added to the cache by the init() method, which the Visualforce page invokes when it loads through the action attribute. The cache keys don’t contain the namespace.partition prefix. They all refer to the default partition in your org. To run this sample, create a partition and mark it as default.
 * The Visualforce page contains four output components. These components call get methods on the controller that returns the following values from the cache: a date, data based on the MyData inner class, a counter, a text value, and a list. The size of the list is also returned.
 * The Visualforce page also contains two buttons. The Rerender button invokes the go() method on the controller. This method increases the values of the counter and the custom data in the cache. When you click Rerender, the two counters increase by one each time. The go() method retrieves the values of these counters from the cache, increments their values by one, and stores them again in the cache.
 * The Remove datetime Key button deletes the date-time value (with key datetime) from the cache. As a result, the value next to Cached datetime: is cleared on the page.
 * Note
 * If another user logs in and runs this sample, this user gets the cache values that were last added or updated by the previous user. For example, if the counter value was five, the next user sees the counter value as increased to six.
 * public with sharing class OrgCacheController {
 *
 *     // Inner class.
 *     // Used as the data type of a cache value.
 *     public with sharing class MyData {
 *         public String value { get; set; }
 *         public Integer counter { get; set; }
 *
 *         public MyData(String value) {
 *             this.value = value;
 *             this.counter = 0;
 *         }
 *
 *         public void inc() {
 *             counter++;
 *         }
 *
 *         override public String toString() {
 *             return this.value + ':' + this.counter;
 *         }
 *     }
 *
 *     // Apex List.
 *     // Used as the data type of a cached value.
 *     private List<String> numbers =
 *             new List<String> { 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE' };
 *
 *     // Constructor of the controller for the Visualforce page.
 *     public OrgCacheController() {
 *     }
 *
 *     // Adds various values to the cache.
 *     // This method is called when the Visualforce page loads.
 *     public void init() {
 *         // All key values are not qualified by the namespace.partition
 *         // prefix because they use the default partition.
 *
 *         // Add counter to the cache with initial value of 0
 *         //  or increment it if it's already there.
 *         if (!Cache.Org.contains('counter')) {
 *             Cache.Org.put('counter', 0);
 *         } else {
 *             Cache.Org.put('counter', getCounter() + 1);
 *         }
 *
 *         // Add the datetime value to the cache only if it's not already there.
 *         if (!Cache.Org.contains('datetime')) {
 *             DateTime dt = DateTime.now();
 *             Cache.Org.put('datetime', dt);
 *         }
 *
 *         // Add the custom data to the cache only if it's not already there.
 *         if (!Cache.Org.contains('data')) {
 *             Cache.Org.put('data', new MyData('Some custom value'));
 *         }
 *
 *         // Add a list of number to the cache if not already there.
 *         if (!Cache.Org.contains('list')) {
 *             Cache.Org.put('list', numbers);
 *         }
 *
 *         // Add a string value to the cache if not already there.
 *         if (!Cache.Org.contains('output')) {
 *             Cache.Org.put('output', 'Cached text value');
 *         }
 *     }
 *
 *     // Return counter from the cache.
 *     public Integer getCounter() {
 *         return (Integer)Cache.Org.get('counter');
 *     }
 *
 *     // Return datetime value from the cache.
 *     public String getCachedDatetime() {
 *         DateTime dt = (DateTime)Cache.Org.get('datetime');
 *         return dt != null ? dt.format() : null;
 *     }
 *
 *     // Return cached value whose type is the inner class MyData.
 *     public String getCachedData() {
 *         MyData mydata = (MyData)Cache.Org.get('data');
 *         return mydata != null ? mydata.toString() : null;
 *     }
 *
 *     // Return output from the cache.
 *     public String getOutput() {
 *         return (String)Cache.Org.get('output');
 *     }
 *
 *     // Return list from the cache.
 *     public List<String> getList() {
 *         return (List<String>)Cache.Org.get('list');
 *     }
 *
 *     // Method invoked by the Rerender button on the Visualforce page.
 *     // Updates the values of various cached values.
 *     // Increases the values of counter and the MyData counter if those
 *     //   cache values are still in the cache.
 *     public PageReference go() {
 *         // Increase the cached counter value or set it to 0
 *         //  if it's not cached.
 *         if (Cache.Org.contains('counter')) {
 *             Cache.Org.put('counter', getCounter() + 1);
 *         } else {
 *             Cache.Org.put('counter', 0);
 *         }
 *
 *         // Get the custom data value from the cache.
 *         MyData d = (MyData)Cache.Org.get('data');
 *         // Only if the data is already in the cache, update it.
 *         if (Cache.Org.contains('data')) {
 *             d.inc();
 *             Cache.Org.put('data', d);
 *         }
 *
 *         return null;
 *     }
 *
 *     // Method invoked by the Remove button on the Visualforce page.
 *     // Removes the datetime cached value from the org cache.
 *     public PageReference remove() {
 *         Cache.Org.remove('datetime');
 *
 *         return null;
 *     }
 * }
 * This is the Visualforce page that corresponds to the OrgCacheController class.
 * <apex:page controller="OrgCacheController" action="{!init}">
 *
 *     <apex:outputPanel id="output">
 *         <br/>Cached datetime: <apex:outputText value="{!cachedDatetime}"/>
 *         <br/>Cached data: <apex:outputText value="{!cachedData}"/>
 *         <br/>Cached counter: <apex:outputText value="{!counter}"/>
 *         <br/>Output: <apex:outputText value="{!output}"/>
 *         <br/>Repeat: <apex:repeat var="item" value="{!list}">
 *             <apex:outputText value="{!item}"/>&nbsp;
 *         </apex:repeat>
 *         <br/>List size: <apex:outputText value="{!list.size}"/>
 *     </apex:outputPanel>
 *
 *     <br/><br/>
 *     <apex:form >
 *         <apex:commandButton id="go" action="{!go}" value="Rerender" rerender="output"/>
 *         <apex:commandButton id="remove" action="{!remove}" value="Remove datetime Key" rerender="output"/>
 *     </apex:form>
 *
 * </apex:page>
 * This is the output of the page after clicking the Rerender button twice. The counter value could differ in your case if a key named counter was already in the cache before running this sample.
 * Cached datetime:8/11/2015 1:58 PM
 * Cached data:Some custom value:2
 * Cached counter:2
 * Output:Cached text value
 * Repeat:ONE TWO THREE FOUR FIVE
 * List size:5
 */
global class Org {
    global final static Integer MAX_TTL_SECS;

    global Org() { }

    /**
     * Returns true if the org cache contains a cached value corresponding to the specified key.
     * @return true if a cache entry is found. Othewise, false.
     */
    global static Boolean contains(String key) { return false; }

    /**
     * Returns true if the org cache contains values for the specified key entries.
     * @return true if the key entries are found. Othewise, false.
     */
    global static List contains(List keys) { return null; }

    /**
     * Returns true if the org cache contains values for a specified set of keys.
     * <p>Usage
     * The number of input keys cannot exceed the maximum limit of 10.
     * <p>Example
     * In this example, the code checks for the presence of multiple keys on the default partition. It fetches the cache key and the corresponding Boolean value for the key entry from the org cache of the default partition.
     * Set<String> keys = new Set<String>{'key1','key2','key3','key4','key5'};
     * Map<String,Boolean> result = Cache.Org.contains(keys);
     * for(String key : result.keySet()) {
     *     system.debug('key: ' + key);
     *     system.debug('Is Key Present in the cache : ' +  result.get(key));
     * }
     * In this example, the code checks for the presence of multiple keys on different partitions. It fetches the cache key and the corresponding Boolean value for the key entry from the org cache of different partitions.
     * // Assuming there are three partitions p1, p2, p3 with default 'local' namespace
     *
     * Set<String> keys = new Set<String>{'local.p1.key','local.p2.key', 'local.p3.key'};
     * Map<String,Boolean> result = Cache.Org.contains(keys);
     * for(String key : result.keySet()) {
     *     system.debug('key: ' + key);
     *     system.debug('Is Key Present in the cache : +  result.get(key));
     * }
     * @return Returns the cache key and corresponding Boolean value indicating that the key entry exists. The Boolean value is false if the key entry doesn't exist.
     */
    global static Map contains(Set keys) { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global static List get(List keys) { return null; }

    /**
     * Returns the cached values corresponding to the specified set of keys from the org cache.
     * <p>Usage
     * The number of input keys cannot exceed the maximum limit of 10.
     * <p>Examples
     * Fetch multiple keys from the org cache of the default partition.
     * Set<String> keys = new Set<String>{'key1','key2','key3','key4','key5'};
     * Map<String,Object> result = Cache.Org.get(keys);
     * for(String key : result.keySet()) {
     *     system.debug('key: ' + key);
     *     system.debug('value: ' +  result.get(key));
     * }
     * Fetch multiple keys from the org cache of different partitions.
     * // Assuming there are three partitions p1, p2, p3 with default 'local' namespace
     *
     * Set<String> keys = new Set<String>{'local.p1.key','local.p2.key', 'local.p3.key'};
     * Map<String,Object> result = Cache.Org.get(keys);
     * for(String key : result.keySet()) {
     *     system.debug('key: ' + key);
     *     system.debug('value: ' +  result.get(key));
     * }
     * @return Returns the cache key and corresponding value. Returns null when no corresponding value is found for an input key.
     */
    global static Map get(Set keys) { return null; }

    /**
     * Returns the cached value corresponding to the specified key from the org cache.
     * <p>Usage
     * Because Cache.Org.get() returns an object, cast the returned value to a specific type to facilitate use of the returned value.
     * // Get a cached value
     * Object obj = Cache.Org.get('ns1.partition1.orderDate');
     * // Cast return value to a specific data type
     * DateTime dt2 = (DateTime)obj;
     *
     *
     * If a Cache.Org.get() call doesn’t find the referenced key, it returns null.
     * @return Object The cached value as a generic object type. Cast the returned value to the appropriate type.
     */
    global static Object get(String key) { return null; }

    /**
     * Returns the cached value corresponding to the specified key from the org cache. Use this method if your cached value is a class that implements the CacheBuilder interface.
     * <p>Usage
     * Because Cache.Org.get(cacheBuilder, key) returns an object, cast the returned value to a specific type to facilitate use of the returned value.
     * return ((DateTime)Cache.Org.get(DateCache.class, 'datetime')).format();
     * @return Object The cached value as a generic object type. Cast the returned value to the appropriate type.
     */
    global static Object get(System.Type cacheBuilder, String key) { return null; }

    /**
     * Returns the average item size of all the keys fetched from the org cache, in bytes.
     * <p>Example
     * In this example the following keys and their corresponding value sizes are inserted. The code then fetches the keys: key 1, key 2, key 3 and key 4 and returns the average item size of the fetched keys.
     * Key Key Value Size
     * key 1 42
     * key 2 42
     * key 3 58
     * key 4 36
     * key 5 36
     * // Inserting keys key1, key2, key3, key4, key5
     * Cache.Org.put('key1', 'value1');
     * Cache.Org.put('key2', 'value2');
     * Cache.Org.put('key3', 'this is a big value !!!');
     * Cache.Org.put('key4', 4);
     * Cache.Org.put('key5', 5);
     *
     *
     * // Fetching keys - key1, key2, key3, key4
     * Object v1 = Cache.Org.get('key1');
     * Object v2 = Cache.Org.get('key2');
     * Object v3 = Cache.Org.get('key3');
     * Object v4 = Cache.Org.get('key4');
     *
     * // Fetching average get size
     * Long val = Cache.Org.getAvgGetSize();
     * // Avg item size returned is 44 ( average of 42(key1), 42(key2), 58(key3) and 36(key4) keys that were fetched )
     * System.debug('Avg Get Size :' + val);
     */
    global static Long getAvgGetSize() { return 0L; }

    /**
     * Returns the average time taken to get a key from the org cache, in nanoseconds.
     */
    global static Long getAvgGetTime() { return 0L; }

    /**
     * Deprecated and available only in API versions 49.0 and earlier. Returns the average item size for keys in the org cache, in bytes.
     */
    global static Long getAvgValueSize() { return 0L; }

    /**
     * Returns the percentage of org cache capacity that has been used.
     * @return Used cache as a percentage number.
     */
    global static Double getCapacity() { return 0.0; }

    /**
     * Returns a set of all keys that are stored in the org cache and visible to the invoking namespace.
     * @return A set containing all cache keys.
     */
    global static Set getKeys() { return null; }

    /**
     * Returns the maximum item size of all the keys fetched from the org cache, in bytes.
     * <p>Example
     * In this example the following keys and their corresponding value sizes are inserted. The code fetches the keys: key 1, key 2 and key 4 and returns the maximum key value size from the fetched keys.
     * Key Key Value Size
     * key 1 42
     * key 2 42
     * key 3 58
     * key 4 36
     * key 5 36
     * // Inserting keys key1, key2, key3, key4, key5
     * Cache.Org.put('key1', 'value1');
     * Cache.Org.put('key2', 'value2');
     * Cache.Org.put('key3', 'this is a big value !!!');
     * Cache.Org.put('key4', 4);
     * Cache.Org.put('key5', 5);
     *
     *
     * // Fetching keys - key1, key2, key4
     * Object v1 = Cache.Org.get('key1');
     * Object v2 = Cache.Org.get('key2');
     * Object v4 = Cache.Org.get('key4');
     *
     * // Fetching max get size
     * Long val = Cache.Org.getMaxGetSize();
     * // Max item size returned is 42 ( max of 42(key1), 42(key2), and 36(key4) keys that were fetched )
     * System.debug('Max Get Size :' + val);
     */
    global static Long getMaxGetSize() { return 0L; }

    /**
     * Returns the maximum time taken to get a key from the org cache, in nanoseconds.
     */
    global static Long getMaxGetTime() { return 0L; }

    /**
     * Deprecated and available only in API versions 49.0 and earlier. Returns the maximum item size for keys in the org cache, in bytes.
     */
    global static Long getMaxValueSize() { return 0L; }

    /**
     * Returns the miss rate in the org cache.
     */
    global static Double getMissRate() { return 0.0; }

    /**
     * Returns the name of the default cache partition.
     * @return The name of the default cache partition.
     */
    global static String getName() { return null; }

    /**
     * Returns the total number of keys in the org cache.
     */
    global static Long getNumKeys() { return 0L; }

    /**
     * Returns a partition from the org cache that corresponds to the specified partition name.
     * <p>Example
     * After you get the org partition, you can add and retrieve the partition’s cache values.
     * // Get partition
     * Cache.OrgPartition orgPart = Cache.Org.getPartition('myNs.myPartition');
     * // Retrieve cache value from the partition
     * if (orgPart.contains('BookTitle')) {
     *     String cachedTitle = (String)orgPart.get('BookTitle');
     * }
     *
     * // Add cache value to the partition
     * orgPart.put('OrderDate', Date.today());
     *
     * // Or use dot notation to call partition methods
     * String cachedAuthor = (String)Cache.Org.getPartition('myNs.myPartition').get('BookAuthor');
     */
    global static cache.OrgPartition getPartition(String partitionName) { return null; }

    global virtual Integer hashCode() { return 0; }

    /**
     * Stores the specified key/value pair as a cached entry in the org cache. The put method can write only to the cache in your org’s namespace.
     */
    global static void put(String key, Object value) { }

    /**
     * Stores the specified key/value pair as a cached entry in the org cache and sets the cached value’s lifetime.
     */
    global static void put(String key, Object value, Integer ttlSecs) { }

    /**
     * Stores the specified key/value pair as a cached entry in the org cache and sets the cached value’s visibility.
     */
    global static void put(String key, Object value, cache.Visibility visibility) { }

    /**
     * Stores the specified key/value pair as a cached entry in the org cache. This method also sets the cached value’s lifetime, visibility, and whether it can be overwritten by another namespace.
     */
    global static void put(String key, Object value, Integer ttlSecs, cache.Visibility visibility, Boolean immutable) { }

    /**
     * Deletes the cached value corresponding to the specified key from the org cache.
     * @return true if the cache value was successfully removed. Otherwise, false.
     */
    global static Boolean remove(String key) { return false; }

    /**
     * Deletes the cached value corresponding to the specified key from the org cache. Use this method if your cached value is a class that implements the CacheBuilder interface.
     * @return true if the cache value was successfully removed. Otherwise, false.
     */
    global static Boolean remove(System.Type cacheBuilder, String key) { return false; }

    global static List remove(List keys) { return null; }

    global override virtual String toString() { return null; }

    /**
     * An attempt is made to access a partition that doesn’t exist or whose name is invalid.
     */
    global virtual class OrgCacheException extends Exception {
        global OrgCacheException() { }

        global OrgCacheException(Exception null) { }

        global OrgCacheException(String msg) { }

        global OrgCacheException(String null, Exception null) { }

        global cache.Org.OrgCacheException clone() { return null; }

        global override virtual Boolean equals(Object o) { return false; }

        /**
         * Returns the cause of the exception as an exception object.
         */
        global override virtual Exception getCause() { return null; }

        global override virtual List getDmlFieldNames(Integer index) { return null; }

        global override virtual List getDmlFields(Integer index) { return null; }

        global override virtual String getDmlId(Integer index) { return null; }

        global override virtual Integer getDmlIndex(Integer index) { return 0; }

        global override virtual String getDmlMessage(Integer index) { return null; }

        global override virtual String getDmlStatusCode(Integer index) { return null; }

        global override virtual System.StatusCode getDmlType(Integer index) { return null; }

        global virtual Map getInaccessibleFields() { return null; }

        global virtual Map getInaccessibleFields(Integer index) { return null; }

        /**
         * Returns the line number from where the exception was thrown.
         */
        global override virtual Integer getLineNumber() { return 0; }

        /**
         * Returns the error message that displays for the user.
         */
        global override virtual String getMessage() { return null; }

        global override virtual Integer getNumDml() { return 0; }

        /**
         * Returns the stack trace of a thrown exception as a string.
         */
        global override virtual String getStackTraceString() { return null; }

        /**
         * Returns the type of exception, such as DmlException, ListException, MathException, and so on.
         */
        global override virtual String getTypeName() { return null; }

        global override virtual Integer hashCode() { return 0; }

        /**
         * Sets the cause for this exception, if one hasn’t already been set.
         */
        global override virtual void initCause(Exception cause) { }

        /**
         * Sets the error message that displays for the user.
         */
        global override virtual void setMessage(String message) { }

        global virtual String toString() { return null; }
    }
}