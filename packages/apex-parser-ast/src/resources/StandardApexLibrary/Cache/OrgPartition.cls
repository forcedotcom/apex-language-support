/**
 * Contains methods to manage cache values in the org cache of a specific partition. Unlike the session cache, the org cache is not tied to any session. It’s available to the org across requests and to all users.
 * Usage
 * This class extends Cache.Partition and inherits all its non-static methods. Utility methods for creating and validating keys aren’t supported and can be called only from the Cache.Partition parent class. For a list of Cache.Partition methods, see Partition Methods.
 * To get an org partition, call Cache.Org.getPartition and pass in a fully qualified partition name, as follows.
 * Cache.OrgPartition orgPartition = Cache.Org.getPartition('namespace.myPartition');
 * See Cache Key Format for Partition Methods.
 * The org cache supports concurrent reads and writes across multiple simultaneous Apex transactions, but the results can be indeterminate. See <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.apexcode.meta/apexcode/apex_platform_cache_limitations.htm" target="_blank">Platform Cache Considerations</a> in the Apex Developer Guide.
 * Org cache operations are atomic transactions. If the Apex request that the cache operations run in fails, then all cache operations in that request are rolled back. See <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.apexcode.meta/apexcode/apex_platform_cache_internals.htm" target="_blank">Platform Cache Internals</a> in the Apex Developer Guide.
 * Example
 * This class is the controller for a sample Visualforce page (shown in the subsequent code sample). The controller shows how to use the methods of Cache.OrgPartition to manage a cache value on a particular partition. The controller takes inputs from the Visualforce page for the partition name, key name for a counter, and initial counter value. The controller contains default values for these inputs. When you click Rerender on the Visualforce page, the go() method is invoked and increases the counter by one. When you click Remove Key, the counter key is removed from the cache. The counter value gets reset to its initial value when it’s re-added to the cache.
 * Note
 * If another user logs in and runs this sample, the user gets the cache values that were last added or updated by the previous user. For example, if the counter value was five, the next user sees the counter value as increased to six.
 * public class OrgPartitionController {
 *
 *     // Name of a partition
 *     String partitionInput = 'local.myPartition';
 *     // Name of the key
 *     String counterKeyInput = 'counter';
 *     // Key initial value
 *     Integer counterInitValue = 0;
 *     // Org partition object
 *     Cache.OrgPartition orgPartition;
 *
 *     // Constructor of the controller for the Visualforce page.
 *     public OrgPartitionController() {
 *     }
 *
 *     // Adds counter value to the cache.
 *     // This method is called when the Visualforce page loads.
 *     public void init() {
 *         // Create the partition instance based on the partition name
 *         orgPartition = getPartition();
 *
 *         // Create the partition instance based on the partition name
 *         // given in the Visualforce page or the default value.
 *         orgPartition = Cache.Org.getPartition(partitionInput);
 *
 *         // Add counter to the cache with an initial value
 *         //  or increment it if it's already there.
 *         if (!orgPartition.contains(counterKeyInput)) {
 *             orgPartition.put(counterKeyInput, counterInitValue);
 *         } else {
 *             orgPartition.put(counterKeyInput, getCounter() + 1);
 *         }
 *     }
 *
 *     // Returns the org partition based on the partition name
 *     // given in the Visualforce page or the default value.
 *     private Cache.OrgPartition getPartition() {
 *        if (orgPartition == null) {
 *             orgPartition = Cache.Org.getPartition(partitionInput);
 *        }
 *
 *        return orgPartition;
 *      }
 *
 *
 *     // Return counter from the cache.
 *     public Integer getCounter() {
 *         return (Integer)getPartition().get(counterKeyInput);
 *     }
 *
 *     // Invoked by the Submit button to save input values
 *     //  supplied by the user.
 *     public PageReference save() {
 *         // Reset the initial key value in the cache
 *         getPartition().put(counterKeyInput, counterInitValue);
 *
 *         return null;
 *     }
 *
 *     // Method invoked by the Rerender button on the Visualforce page.
 *     // Updates the values of various cached values.
 *     // Increases the values of counter and the MyData counter if those
 *     //   cache values are still in the cache.
 *     public PageReference go() {
 *         // Get the org partition object
 *         orgPartition = getPartition();
 *         // Increase the cached counter value or set it to 0
 *         //  if it's not cached.
 *         if (orgPartition.contains(counterKeyInput)) {
 *             orgPartition.put(counterKeyInput, getCounter() + 1);
 *         } else {
 *             orgPartition.put(counterKeyInput, counterInitValue);
 *         }
 *
 *         return null;
 *     }
 *
 *     // Method invoked by the Remove button on the Visualforce page.
 *     // Removes the datetime cached value from the org cache.
 *     public PageReference remove() {
 *         getPartition().remove(counterKeyInput);
 *
 *         return null;
 *     }
 *
 *     // Get and set methods for accessing variables
 *     // that correspond to the input text fields on
 *     // the Visualforce page.
 *     public String getPartitionInput() {
 *         return partitionInput;
 *     }
 *
 *     public String getCounterKeyInput() {
 *         return counterKeyInput;
 *     }
 *
 *     public Integer getCounterInitValue() {
 *         return counterInitValue;
 *     }
 *
 *     public void setPartitionInput(String partition) {
 *         this.partitionInput = partition;
 *     }
 *
 *     public void setCounterKeyInput(String keyName) {
 *         this.counterKeyInput = keyName;
 *     }
 *
 *     public void setCounterInitValue(Integer counterValue) {
 *         this.counterInitValue = counterValue;
 *     }
 * }
 * This is the Visualforce page that corresponds to the OrgPartitionController class.
 * <apex:page controller="OrgPartitionController" action="{!init}">
 *
 *     <apex:form >
 *         <br/>Partition with Namespace Prefix: <apex:inputText value="{!partitionInput}"/>
 *         <br/>Counter Key Name: <apex:inputText value="{!counterKeyInput}"/>
 *         <br/>Counter Initial Value: <apex:inputText value="{!counterInitValue}"/>
 *         <apex:commandButton action="{!save}" value="Save Key Input Values"/>
 *     </apex:form>
 *
 *     <apex:outputPanel id="output">
 *         <br/>Cached Counter: <apex:outputText value="{!counter}"/>
 *     </apex:outputPanel>
 *
 *     <br/>
 *     <apex:form >
 *         <apex:commandButton id="go" action="{!go}" value="Rerender" rerender="output"/>
 *         <apex:commandButton id="remove" action="{!remove}" value="Remove Key" rerender="output"/>
 *     </apex:form>
 *
 * </apex:page>
 */
global virtual class OrgPartition extends cache.Partition {
    global OrgPartition(String fullyQualifiedPartitionName) { }

    global Boolean contains(String key) { return false; }

    global Map contains(Set keys) { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global Map get(Set keys) { return null; }

    global Object get(String key) { return null; }

    global Object get(System.Type cacheBuilder, String key) { return null; }

    global Long getAvgGetSize() { return 0L; }

    global Long getAvgGetTime() { return 0L; }

    global Long getAvgValueSize() { return 0L; }

    global Double getCapacity() { return 0.0; }

    global Set getKeys() { return null; }

    global Long getMaxGetSize() { return 0L; }

    global Long getMaxGetTime() { return 0L; }

    global Long getMaxValueSize() { return 0L; }

    global Double getMissRate() { return 0.0; }

    global String getName() { return null; }

    global Long getNumKeys() { return 0L; }

    global virtual Integer hashCode() { return 0; }

    global Boolean isAvailable() { return false; }

    global void put(String key, Object value) { }

    global void put(String key, Object value, Integer ttlSecs) { }

    global void put(String key, Object value, cache.Visibility visibility) { }

    global void put(String key, Object value, Integer ttlSecs, cache.Visibility visibility, Boolean immutable) { }

    global Boolean remove(String key) { return false; }

    global Boolean remove(System.Type cacheBuilder, String key) { return false; }

    global override virtual String toString() { return null; }
}